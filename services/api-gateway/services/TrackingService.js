const Shipment = require('../models/Shipment');
const MasterOrder = require('../models/MasterOrder');
const VendorOrder = require('../models/VendorOrder');
const mongoose = require('mongoose');

class TrackingService {
  /**
   * Generates a new Shipment with initial intake events when an order is confirmed.
   */
  static async createShipmentForOrder({ masterOrder, vendorOrder, carrier = 'PALEO Express Direct Fleet' }) {
    if (!masterOrder) {
      throw new Error('masterOrder is required to create a shipment');
    }

    const shortId = Math.floor(10000 + Math.random() * 90000).toString();
    const shipmentNumber = `SHP-${shortId}`;
    const trackingNumber = `PALEO-TRK-${shortId}`;

    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h default

    const buyerAddress = masterOrder.deliveryAddress?.label || 'Addis Ababa, Ethiopia';
    const buyerCoords = masterOrder.deliveryAddress?.coordinates || [38.7620, 9.0120];
    const vendorCoords = vendorOrder?.vendorLocation?.coordinates || [38.7896, 8.9974];
    const vendorLabel = vendorOrder?.vendorLocation?.label || 'Studio Workshop, Addis Ababa';

    const initialEvents = [
      {
        status: 'LABEL_CREATED',
        location: 'PALEO Central Logistics Hub, Bole',
        description: 'Electronic shipping label generated & order confirmed by PALEO Escrow.',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000),
        coordinates: [38.7896, 8.9974]
      },
      {
        status: 'PICKED_UP',
        location: vendorLabel,
        description: 'Artisan curation verified. Package sealed in tamper-evident PALEO archival packaging.',
        timestamp: now,
        coordinates: vendorCoords
      }
    ];

    const shipment = await Shipment.create({
      orderId: masterOrder._id,
      vendorOrderId: vendorOrder ? vendorOrder._id : undefined,
      shipmentNumber,
      trackingNumber,
      carrier,
      serviceLevel: 'Curated White-Glove Escrow Delivery',
      status: 'PICKED_UP',
      origin: {
        label: vendorLabel,
        coordinates: vendorCoords
      },
      destination: {
        label: buyerAddress,
        coordinates: buyerCoords
      },
      currentLocation: {
        label: 'In transit to PALEO Sorting Hub, Bole',
        coordinates: [38.7750, 9.0050],
        updatedAt: now
      },
      driver: {
        name: 'Abebe Tessema',
        phone: '+251 91 148 2910',
        vehicle: 'PALEO Eco-Electric Courier #04',
        rating: 4.96
      },
      estimatedDelivery,
      shippedAt: now,
      trackingEvents: initialEvents
    });

    return shipment;
  }

  /**
   * Appends a new tracking checkpoint event and updates status
   */
  static async addTrackingEvent({ trackingNumberOrId, status, location, description, coordinates, io }) {
    const isObjectId = mongoose.Types.ObjectId.isValid(trackingNumberOrId);
    const query = isObjectId
      ? { $or: [{ _id: trackingNumberOrId }, { trackingNumber: trackingNumberOrId }] }
      : { trackingNumber: { $regex: new RegExp(`^${trackingNumberOrId}$`, 'i') } };

    const shipment = await Shipment.findOne(query);
    if (!shipment) {
      throw new Error(`Shipment not found for identifier: ${trackingNumberOrId}`);
    }

    const event = {
      status,
      location: location || shipment.currentLocation.label,
      description: description || `Package status updated to ${status}`,
      timestamp: new Date(),
      coordinates: coordinates || shipment.currentLocation.coordinates
    };

    shipment.trackingEvents.push(event);
    shipment.status = status;
    if (location) {
      shipment.currentLocation = {
        label: location,
        coordinates: coordinates || shipment.currentLocation.coordinates,
        updatedAt: new Date()
      };
    }

    if (status === 'OUT_FOR_DELIVERY') {
      shipment.currentLocation.label = 'Out for final delivery with courier';
    } else if (status === 'DELIVERED') {
      shipment.deliveredAt = new Date();
      if (shipment.vendorOrderId) {
        await VendorOrder.findByIdAndUpdate(shipment.vendorOrderId, {
          fulfillmentStatus: 'DELIVERED',
          escrowStatus: 'DELIVERED'
        });
      }
    }

    await shipment.save();

    // Broadcast real-time Socket update if io instance is provided
    if (io) {
      try {
        io.to(`tracking:${shipment.trackingNumber}`).emit('tracking:update', {
          shipmentId: shipment._id,
          trackingNumber: shipment.trackingNumber,
          status: shipment.status,
          currentLocation: shipment.currentLocation,
          latestEvent: event
        });
      } catch (err) {
        console.warn('[TrackingService] Socket broadcast skipped:', err.message);
      }
    }

    return shipment;
  }

  /**
   * Resolves tracking details by Order ID, Tracking Number, or Shipment Number
   */
  static async getTrackingDetails(identifier) {
    if (!identifier) {
      throw new Error('Order ID or Tracking Number is required');
    }

    const cleanId = String(identifier).trim();
    const isObjectId = mongoose.Types.ObjectId.isValid(cleanId);

    // 1. Try finding Shipment directly
    let shipment = await Shipment.findOne({
      $or: [
        ...(isObjectId ? [{ _id: cleanId }, { orderId: cleanId }, { vendorOrderId: cleanId }] : []),
        { trackingNumber: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
        { shipmentNumber: { $regex: new RegExp(`^${cleanId}$`, 'i') } }
      ]
    })
      .populate('orderId')
      .populate('vendorOrderId');

    // 2. If no shipment found yet, check if identifier matches MasterOrder (by ObjectId, txRef, or receiptRef)
    if (!shipment) {
      const masterOrder = await MasterOrder.findOne({
        $or: [
          ...(isObjectId ? [{ _id: cleanId }] : []),
          { receiptRef: { $regex: new RegExp(`^${cleanId}$`, 'i') } },
          { 'paymentProviderMeta.txRef': { $regex: new RegExp(`^${cleanId}$`, 'i') } }
        ]
      }).populate('vendorOrderIds');

      if (masterOrder) {
        // Auto-provision a tracked shipment for this order if one doesn't exist
        const vendorOrder = masterOrder.vendorOrderIds?.[0] || null;
        shipment = await this.createShipmentForOrder({ masterOrder, vendorOrder });
        shipment = await Shipment.findById(shipment._id).populate('orderId').populate('vendorOrderId');
      }
    }

    if (!shipment) {
      return null;
    }

    // Derive comprehensive customer tracking timeline & status breakdown
    const masterOrder = shipment.orderId;
    const vendorOrder = shipment.vendorOrderId;

    const STATUS_FLOW = [
      { key: 'CONFIRMED', label: 'Order Confirmed', description: 'Payment verified & escrow locked' },
      { key: 'PROCESSING', label: 'Studio Preparation', description: 'Curated item packed & inspected' },
      { key: 'IN_TRANSIT', label: 'In Transit', description: 'Moving through PALEO logistics hub' },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', description: 'With courier on final route' },
      { key: 'DELIVERED', label: 'Delivered', description: 'Delivered · 48h Inspection window active' }
    ];

    let currentStep = 1;
    switch (shipment.status) {
      case 'LABEL_CREATED':
        currentStep = 1;
        break;
      case 'PICKED_UP':
      case 'IN_SORTING_HUB':
        currentStep = 2;
        break;
      case 'IN_TRANSIT':
        currentStep = 3;
        break;
      case 'OUT_FOR_DELIVERY':
        currentStep = 4;
        break;
      case 'DELIVERED':
        currentStep = 5;
        break;
      default:
        currentStep = 2;
    }

    return {
      success: true,
      shipment: {
        id: shipment._id,
        trackingNumber: shipment.trackingNumber,
        shipmentNumber: shipment.shipmentNumber,
        carrier: shipment.carrier,
        serviceLevel: shipment.serviceLevel,
        status: shipment.status,
        currentStep,
        totalSteps: 5,
        estimatedDelivery: shipment.estimatedDelivery,
        shippedAt: shipment.shippedAt,
        deliveredAt: shipment.deliveredAt,
        origin: shipment.origin,
        destination: shipment.destination,
        currentLocation: shipment.currentLocation,
        driver: shipment.driver,
        events: shipment.trackingEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      },
      order: masterOrder ? {
        id: masterOrder._id,
        orderNumber: `ORD-${String(masterOrder._id).slice(-6).toUpperCase()}`,
        status: masterOrder.paymentStatus === 'PAID' ? 'PAID' : masterOrder.paymentStatus,
        escrowStatus: masterOrder.escrowStatus,
        totalAmount: masterOrder.totalAmount,
        financials: masterOrder.financials,
        items: vendorOrder?.items || [],
        createdAt: masterOrder.createdAt
      } : null,
      timelineFlow: STATUS_FLOW
    };
  }
}

module.exports = TrackingService;
