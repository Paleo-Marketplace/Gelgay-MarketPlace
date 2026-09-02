const express = require('express');
const TrackingService = require('../services/TrackingService');
const Shipment = require('../models/Shipment');
const MasterOrder = require('../models/MasterOrder');
const asyncHandler = require('../middleware/asyncHandler');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { authenticateJWT } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// ---------------- Public Tracking Lookup Portal ----------------
router.get(
  '/:query',
  asyncHandler(async (req, res) => {
    try {
      const data = await TrackingService.getTrackingDetails(req.params.query);
      if (!data) {
        return errorResponse(res, `No shipment or order found matching identifier: ${req.params.query}`, 404);
      }
      return res.json(data);
    } catch (err) {
      return errorResponse(res, err.message, 400);
    }
  })
);

// ---------------- Sample Tracking IDs for Instant Portal Testing ----------------
router.get(
  '/sample/latest',
  asyncHandler(async (req, res) => {
    try {
      let shipment = await Shipment.findOne().sort({ updatedAt: -1 });
      if (!shipment) {
        const masterOrder = await MasterOrder.findOne().populate('vendorOrderIds').sort({ createdAt: -1 });
        if (masterOrder) {
          shipment = await TrackingService.createShipmentForOrder({
            masterOrder,
            vendorOrder: masterOrder.vendorOrderIds?.[0]
          });
        }
      }

      if (!shipment) {
        return res.json({
          success: true,
          sampleTrackingNumber: 'PALEO-TRK-10293',
          sampleOrderNumber: 'ORD-849201'
        });
      }

      return res.json({
        success: true,
        sampleTrackingNumber: shipment.trackingNumber,
        sampleShipmentNumber: shipment.shipmentNumber,
        sampleOrderId: shipment.orderId ? shipment.orderId.toString() : 'ORD-10293'
      });
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  })
);

// ---------------- Dispatch / Add Tracking Checkpoint Event (Admin / Courier) ----------------
router.post(
  '/event',
  authenticateJWT,
  requireRole('admin', 'vendor'),
  asyncHandler(async (req, res) => {
    const { trackingNumber, status, location, description, coordinates } = req.body;
    if (!trackingNumber || !status) {
      return errorResponse(res, 'trackingNumber and status are required', 400);
    }

    try {
      const io = req.app.get('io');
      const updatedShipment = await TrackingService.addTrackingEvent({
        trackingNumberOrId: trackingNumber,
        status,
        location,
        description,
        coordinates,
        io
      });
      return successResponse(res, { shipment: updatedShipment, message: 'Tracking event recorded successfully' });
    } catch (err) {
      return errorResponse(res, err.message, 400);
    }
  })
);

// ---------------- Carrier Webhook Integration (e.g. DHL, EMS, Third-Party Carriers) ----------------
router.post(
  '/webhooks/carrier',
  asyncHandler(async (req, res) => {
    const { trackingNumber, status, location, description, timestamp, coordinates } = req.body;
    if (!trackingNumber || !status) {
      return errorResponse(res, 'Webhook payload missing trackingNumber or status', 400);
    }

    try {
      const io = req.app.get('io');
      const updatedShipment = await TrackingService.addTrackingEvent({
        trackingNumberOrId: trackingNumber,
        status,
        location: location || 'Carrier Transit Hub',
        description: description || `Status updated by carrier: ${status}`,
        coordinates,
        io
      });
      return successResponse(res, { received: true, trackingNumber: updatedShipment.trackingNumber });
    } catch (err) {
      console.warn('[Carrier Webhook Warning]:', err.message);
      return errorResponse(res, err.message, 400);
    }
  })
);

module.exports = router;
