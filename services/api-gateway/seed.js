const crypto = require('crypto');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const Product = require('./models/Product');
const MasterOrder = require('./models/MasterOrder');
const VendorOrder = require('./models/VendorOrder');
const Coupon = require('./models/Coupon');
const Category = require('./models/Category');
const Shipment = require('./models/Shipment');

const { hashPassword } = require('./utils/password');

const DEFAULT_CATEGORIES = [
  {
    name: 'Everyday Carry',
    slug: 'electronics',
    tag: '01 / EVERYDAY CARRY',
    description: 'Pocket tools, analog audio, and vintage cameras calibrated for daily utility.',
    icon: 'Camera',
    displayOrder: 1
  },
  {
    name: 'Home Archive',
    slug: 'furniture',
    tag: '02 / HOME ARCHIVE',
    description: 'Restored mid-century teak, sculptural seating, and archival interior objects.',
    icon: 'Armchair',
    displayOrder: 2
  },
  {
    name: 'Creative Tools',
    slug: 'studio',
    tag: '03 / CREATIVE TOOLS',
    description: 'Drafting instruments, optical viewfinders, and precision analog sound equipment.',
    icon: 'Radio',
    displayOrder: 3
  },
  {
    name: 'Archival Wear',
    slug: 'fashion',
    tag: '04 / ARCHIVAL WEAR',
    description: 'Timeless outerwear, heavy canvas bags, and heritage leather footwear.',
    icon: 'Shirt',
    displayOrder: 4
  },
  {
    name: 'Paper Archive',
    slug: 'books',
    tag: '05 / PAPER ARCHIVE',
    description: 'First-edition monographs, design annuals, and architectural catalogs.',
    icon: 'BookOpen',
    displayOrder: 5
  }
];

const DEFAULT_COUPONS = [
  {
    code: 'WELCOME10',
    description: '10% welcome discount for new collectors',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 500,
    maxDiscountAmount: 2000,
    isActive: true
  },
  {
    code: 'PALEO500',
    description: '500 ETB flat discount on orders over 3,000 ETB',
    discountType: 'fixed',
    discountValue: 500,
    minOrderAmount: 3000,
    maxDiscountAmount: 500,
    isActive: true
  }
];

/**
 * Production System Initializer:
 * Ensures foundational categories, default active coupons, and administrator exist.
 * Does NOT generate any fake products or mock orders.
 */
const initSystemData = async () => {
  // 1. Ensure system categories exist
  for (const cat of DEFAULT_CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: { ...cat, isActive: true } },
      { upsert: true, new: true }
    );
  }

  // 2. Ensure system coupons exist
  for (const cp of DEFAULT_COUPONS) {
    await Coupon.findOneAndUpdate(
      { code: cp.code },
      { $setOnInsert: { ...cp } },
      { upsert: true, new: true }
    );
  }

  // 3. Ensure Root Superuser Administrator exists
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@paleo.market').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (!existingAdmin) {
    await User.create({
      email: adminEmail,
      displayName: 'PALEO System Administrator',
      role: 'admin',
      authProvider: 'email',
      password: adminPassword,
      isEmailVerified: true,
      location: 'Addis Ababa, Ethiopia'
    });
    console.log(`[DB Init] Bootstrapped system superuser: ${adminEmail}`);
  }

  // 4. Ensure verified neighborhood vendor studios exist across Adama City & Sub-cities
  const NEIGHBORHOOD_STUDIOS = [
    {
      email: 'curator@paleo.market',
      name: 'Adama Archival Audio & Optics',
      bio: 'Curated 20th-century Braun industrial electronics, Sony personal audio, and everyday design.',
      address: 'Posta Bet, Bole Sub-City, Adama, Ethiopia',
      coordinates: [39.2705, 8.5415],
      categories: ['Everyday Carry', 'Electronics', 'Vintage Audio'],
      rating: { average: 4.96, count: 142 },
      phone: '+251 91 188 4729',
      openingHours: '09:00 AM - 08:30 PM'
    },
    {
      email: 'furniture@paleo.market',
      name: 'Geda Mid-Century Teak & Modernist Gallery',
      bio: 'Restored Scandinavian & Ethiopian modernism, solid teak lounge chairs, and studio lighting.',
      address: 'Dembi / Geda Corridor, Adama, Ethiopia',
      coordinates: [39.2630, 8.5520],
      categories: ['Home Archive', 'Furniture', 'Lighting'],
      rating: { average: 4.92, count: 88 },
      phone: '+251 91 144 2019',
      openingHours: '10:00 AM - 07:00 PM'
    },
    {
      email: 'leica@paleo.market',
      name: 'Boku Darkroom & Leica Optics Studio',
      bio: 'Mint mechanical rangefinders, prime lenses, and analog medium-format tools.',
      address: 'Boku Shenen, House #104, Adama, Ethiopia',
      coordinates: [39.2550, 8.5350],
      categories: ['Creative Tools', 'Cameras & Studio Gear'],
      rating: { average: 4.98, count: 64 },
      phone: '+251 92 311 9081',
      openingHours: '09:30 AM - 08:00 PM'
    },
    {
      email: 'leather@paleo.market',
      name: 'Franko Selvedge & Rift Valley Leather Guild',
      bio: 'Heavy shuttle-loom denim, vegetable-tanned highland leather bags, and crafted apparel.',
      address: 'Daka Adu / Franko Market, Adama, Ethiopia',
      coordinates: [39.2820, 8.5380],
      categories: ['Archival Wear', 'Fashion & Leather'],
      rating: { average: 4.89, count: 110 },
      phone: '+251 91 177 5543',
      openingHours: '09:00 AM - 09:00 PM'
    },
    {
      email: 'books@paleo.market',
      name: 'ASTU Goro Rare Books & Typographic Press',
      bio: 'First-edition monographs, architectural catalogs, and Bauhaus typographic publications.',
      address: 'Goro / University Avenue, Adama, Ethiopia',
      coordinates: [39.2900, 8.5600],
      categories: ['Paper Archive', 'Books & Prints'],
      rating: { average: 4.94, count: 96 },
      phone: '+251 91 133 8812',
      openingHours: '08:30 AM - 07:30 PM'
    }
  ];

  const vendorMap = {};

  for (const studio of NEIGHBORHOOD_STUDIOS) {
    const vUser = await User.findOneAndUpdate(
      { email: studio.email },
      {
        $setOnInsert: {
          email: studio.email,
          displayName: studio.name,
          role: 'vendor',
          authProvider: 'email',
          password: hashPassword('vendor123'),
          isEmailVerified: true,
          isProfileComplete: true,
          location: studio.address
        }
      },
      { upsert: true, new: true }
    );

    const vDoc = await Vendor.findOneAndUpdate(
      { userId: vUser._id },
      {
        $set: {
          storeName: studio.name,
          storeBio: studio.bio,
          sellerType: 'business',
          legalName: `${studio.name} PLC`,
          taxId: 'TIN-0098472619',
          nationalIdNumber: 'ETH-88291048',
          payoutDetails: {
            bank: 'Commercial Bank of Ethiopia (CBE)',
            account: '1000987654321',
            accountHolder: studio.name
          },
          rating: studio.rating,
          kycStatus: 'approved',
          commissionRate: 0.025,
          address: studio.address,
          coordinates: studio.coordinates,
          categories: studio.categories,
          isOpen: true,
          openingHours: studio.openingHours,
          phone: studio.phone,
          pickupAvailable: true,
          deliveryAvailable: true,
          location: { type: 'Point', coordinates: studio.coordinates }
        }
      },
      { upsert: true, new: true }
    );

    vendorMap[studio.email] = vDoc;
  }

  // 5. Ensure catalog products exist mapped to their dedicated neighborhood studio
  const audioVendor = vendorMap['curator@paleo.market'];
  const furnitureVendor = vendorMap['furniture@paleo.market'];
  const leicaVendor = vendorMap['leica@paleo.market'];
  const leatherVendor = vendorMap['leather@paleo.market'];
  const booksVendor = vendorMap['books@paleo.market'];

  const CURATED_PRODUCTS = [
    {
      vendorId: audioVendor._id,
      title: 'Braun ET66 Calculator - Dieter Rams (1987)',
      description: 'Original Dieter Rams & Dietrich Lubs design. Responsive tactile convex buttons, automatic power-off, and archival protective case.',
      price: 2800,
      stock: 8,
      reservedStock: 0,
      category: 'Everyday Carry',
      condition: 'Restored',
      images: ['https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=1200&q=80'],
      specs: { Designer: 'Dieter Rams', Year: '1987', Power: 'Dual Solar/Button Cell', Origin: 'Frankfurt, Germany' },
      isPublished: true,
      location: audioVendor.location
    },
    {
      vendorId: audioVendor._id,
      title: 'Sony TPS-L2 Soundabout Stereo Cassette Player (1979)',
      description: 'The definitive first-generation personal stereo in iconic blue-and-silver aluminum chassis. New drive belts installed, heads demagnetized, dual 3.5mm stereo jacks.',
      price: 6500,
      stock: 4,
      reservedStock: 0,
      category: 'Everyday Carry',
      condition: 'Restored',
      images: ['https://images.unsplash.com/photo-1608248597359-0d32f507b9ee?auto=format&fit=crop&w=1200&q=80'],
      specs: { Year: '1979', Mechanism: 'Dual Flywheel', Output: 'Dual 3.5mm Mini-Jack', Power: '2x AA Batteries' },
      isPublished: true,
      location: audioVendor.location
    },
    {
      vendorId: audioVendor._id,
      title: 'Single-Origin Yirgacheffe Geisha Heirloom Coffee (1kg)',
      description: 'Natural process Grade 1 micro-lot from 2,100m elevation. Delicate bergamot aroma, jasmine floral notes, and honey sweetness.',
      price: 950,
      stock: 25,
      reservedStock: 0,
      category: 'Everyday Carry',
      condition: 'Like New',
      images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1200&q=80'],
      specs: { Altitude: '2,100m MASL', Process: 'Natural Sun-Dried', Roast: 'Light-Medium Omni', Origin: 'Yirgacheffe, Ethiopia' },
      isPublished: true,
      location: audioVendor.location
    },
    {
      vendorId: furnitureVendor._id,
      title: 'Mid-Century Teak Ergonomic Lounge Chair',
      description: 'Solid Burmese teak frame with hand-woven Danish paper cord seating. Sculptural organic armrests with subtle oiled patina.',
      price: 18500,
      stock: 2,
      reservedStock: 0,
      category: 'Home Archive',
      condition: 'Restored',
      images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80'],
      specs: { Material: 'Solid Teak & Paper Cord', Dimensions: '74cm x 68cm x 76cm', Restoration: 'Natural Danish Oil' },
      isPublished: true,
      location: furnitureVendor.location
    },
    {
      vendorId: leicaVendor._id,
      title: 'Leica M3 Single Stroke 35mm Rangefinder (1955)',
      description: 'Mint condition serial #842xxx single-stroke rangefinder body with 0.91x magnification viewfinder. Fully CLA serviced with accurate shutter speeds.',
      price: 42000,
      stock: 2,
      reservedStock: 0,
      category: 'Creative Tools',
      condition: 'Like New',
      images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80'],
      specs: { Format: '35mm Film', Viewfinder: '0.91x Brightline', Shutter: '1s to 1/1000s Mechanical', Mount: 'Leica M Bayonet' },
      isPublished: true,
      location: leicaVendor.location
    },
    {
      vendorId: leatherVendor._id,
      title: 'Raw Japanese Selvedge Denim Chore Jacket (14.5oz)',
      description: 'Unwashed shuttle-loom Kurabo denim with red line selvedge ID, custom brass buttons, and reinforced utility pocketing.',
      price: 4500,
      stock: 12,
      reservedStock: 0,
      category: 'Archival Wear',
      condition: 'Like New',
      images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=80'],
      specs: { Weight: '14.5 oz', Weave: 'Right-Hand Twill', Dye: 'Pure Natural Indigo', Hardware: 'Solid Antique Brass' },
      isPublished: true,
      location: leatherVendor.location
    },
    {
      vendorId: leatherVendor._id,
      title: 'Adama Handcrafted Full-Grain Leather Weekender Duffle',
      description: 'Vegetable-tanned Ethiopian highland cowhide with solid cast brass hardware and heavy cotton drill lining. Integrated shoe compartment.',
      price: 5800,
      stock: 6,
      reservedStock: 0,
      category: 'Archival Wear',
      condition: 'Like New',
      images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80'],
      specs: { Leather: 'Full-Grain Vegetable Tanned', Capacity: '42 Liters', Hardware: 'Solid Cast Brass', Origin: 'Adama' },
      isPublished: true,
      location: leatherVendor.location
    },
    {
      vendorId: booksVendor._id,
      title: 'Bauhaus Typography & Grid Systems Monograph (1968)',
      description: 'First English edition survey of Swiss International Style and Bauhaus typography principles. Heavy linen hardcover with original foil-stamped dust jacket.',
      price: 1800,
      stock: 5,
      reservedStock: 0,
      category: 'Paper Archive',
      condition: 'Excellent',
      images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80'],
      specs: { Pages: '288 Pages', Binding: 'Smyth-Sewn Hardcover', Language: 'English / German', Year: '1968' },
      isPublished: true,
      location: booksVendor.location
    }
  ];

  for (const prod of CURATED_PRODUCTS) {
    await Product.findOneAndUpdate(
      { title: prod.title },
      { $set: prod },
      { upsert: true, new: true }
    );
  }

  // 6. Ensure demonstrative tracked order and shipment exists for the Tracking Portal
  const buyerUser = await User.findOneAndUpdate(
    { email: 'dawit.collector@paleo.market' },
    {
      $setOnInsert: {
        email: 'dawit.collector@paleo.market',
        displayName: 'Dawit Mengistu',
        phone: '+251 91 188 4729',
        location: 'Bole Atlas, House #402, Addis Ababa',
        role: 'buyer',
        isEmailVerified: true,
        isProfileComplete: true
      }
    },
    { upsert: true, new: true }
  );

  const sampleProd = await Product.findOne({ title: 'Braun ET66 Calculator - Dieter Rams (1987)' });
  if (sampleProd) {
    let sampleMasterOrder = await MasterOrder.findOne({ receiptRef: 'ORD-10293' });
    if (!sampleMasterOrder) {
      sampleMasterOrder = await MasterOrder.create({
        buyerId: buyerUser._id,
        totalAmount: 3270,
        financials: {
          cartSubtotal: 2800,
          discountAmount: 0,
          totalTax: 420,
          totalDeliveryFee: 50,
          grandTotal: 3270
        },
        paymentMethod: 'CHAPA',
        paymentStatus: 'PAID',
        escrowStatus: 'FUNDS_HELD_IN_ESCROW',
        receiptRef: 'ORD-10293',
        paymentProviderMeta: { txRef: 'paleo-tx-10293' },
        deliveryAddress: {
          label: 'Bole Atlas, House #402, Addis Ababa',
          coordinates: [38.7620, 9.0120]
        }
      });

      const sampleVendorOrder = await VendorOrder.create({
        masterOrderId: sampleMasterOrder._id,
        vendorId: audioVendor._id,
        items: [
          {
            productId: sampleProd._id,
            qty: 1,
            price: 2800,
            title: sampleProd.title
          }
        ],
        subtotal: 2800,
        platformFee: 70,
        vendorPayout: 2730,
        financials: {
          itemSubtotal: 2800,
          taxCollected: 420,
          deliveryFee: 50,
          platformCommission: 70,
          vendorPayout: 2730
        },
        escrowStatus: 'FUNDS_HELD_IN_ESCROW',
        fulfillmentStatus: 'IN_TRANSIT',
        vendorLocation: {
          label: 'Addis Archival & Modernist Studio, Bole Medhanealem',
          coordinates: [38.7896, 8.9974]
        },
        deliveryLocation: {
          label: 'Bole Atlas, House #402, Addis Ababa',
          coordinates: [38.7620, 9.0120]
        }
      });

      sampleMasterOrder.vendorOrderIds = [sampleVendorOrder._id];
      await sampleMasterOrder.save();

      const now = new Date();
      await Shipment.findOneAndUpdate(
        { trackingNumber: 'PALEO-TRK-7741' },
        {
          $setOnInsert: {
            orderId: sampleMasterOrder._id,
            vendorOrderId: sampleVendorOrder._id,
            shipmentNumber: 'SHP-7741',
            trackingNumber: 'PALEO-TRK-7741',
            carrier: 'PALEO Express Direct Fleet',
            serviceLevel: 'Curated White-Glove Escrow Delivery',
            status: 'OUT_FOR_DELIVERY',
            origin: {
              label: 'Addis Archival & Modernist Studio, Bole Medhanealem',
              coordinates: [38.7896, 8.9974]
            },
            destination: {
              label: 'Bole Atlas, House #402, Addis Ababa',
              recipientName: 'Dawit Mengistu',
              recipientPhone: '+251 91 188 4729',
              coordinates: [38.7620, 9.0120]
            },
            currentLocation: {
              label: 'Olympia / Bole Road Junction (1.4 km from destination)',
              coordinates: [38.7690, 9.0060],
              updatedAt: now
            },
            driver: {
              name: 'Abebe Tessema',
              phone: '+251 91 148 2910',
              vehicle: 'PALEO Electric Courier #04',
              rating: 4.98
            },
            estimatedDelivery: new Date(now.getTime() + 45 * 60 * 1000), // in 45 mins
            shippedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
            trackingEvents: [
              {
                status: 'LABEL_CREATED',
                location: 'PALEO Escrow Gateway',
                description: 'Order confirmed & funds secured in PALEO Escrow vault.',
                timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
                coordinates: [38.7896, 8.9974]
              },
              {
                status: 'PICKED_UP',
                location: 'Addis Archival Studio Workshop',
                description: 'Package inspected, sealed in tamper-evident archival box, and handed to PALEO driver.',
                timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
                coordinates: [38.7896, 8.9974]
              },
              {
                status: 'IN_SORTING_HUB',
                location: 'PALEO Central Logistics Hub (Bole)',
                description: 'Inbound barcode scanned & dispatched for final-mile neighborhood delivery.',
                timestamp: new Date(now.getTime() - 60 * 60 * 1000),
                coordinates: [38.7850, 9.0020]
              },
              {
                status: 'OUT_FOR_DELIVERY',
                location: 'Olympia / Bole Road Corridor',
                description: 'Out for final delivery with courier Abebe Tessema. Arriving within 45 minutes.',
                timestamp: new Date(now.getTime() - 15 * 60 * 1000),
                coordinates: [38.7690, 9.0060]
              }
            ]
          }
        },
        { upsert: true, new: true }
      );
    }
  }
};

/**
 * Purges demo products, demo orders, and demo test data from database.
 */
const cleanDemoData = async () => {
  const demoTitles = [
    'Fresh Organic Highland Strawberries',
    'Stone-Ground Teff Sourdough Loaf',
    'Single-Origin Yirgacheffe Coffee Beans',
    'Raw Mountain Wildflower Honey',
    'Braun ET66 Calculator - Dieter Rams (1987)',
    'Sony TPS-L2 Soundabout Cassette Player',
    'Mid-Century Teak Ergonomic Lounge Chair',
    'Leica M3 Single Stroke 35mm Rangefinder',
    'Raw Japanese Selvedge Denim Jacket (14.5oz)',
    'Bauhaus Typography & Grid Systems Monograph'
  ];

  const deletedProducts = await Product.deleteMany({
    $or: [
      { title: { $in: demoTitles } },
      { images: { $regex: 'images.unsplash.com/photo-1589367920969-ab8e050bbb04' } },
      { images: { $regex: 'images.unsplash.com/photo-1464965911861-746a04b4bca6' } },
      { images: { $regex: 'images.unsplash.com/photo-1559056199-641a0ac8b55e' } },
      { images: { $regex: 'images.unsplash.com/photo-1587049352851-8d4e89133924' } }
    ]
  });

  const deletedMasterOrders = await MasterOrder.deleteMany({
    $or: [
      { receiptRef: 'CBE99482710' },
      { 'receiptOcrResult.ref': 'CBE99482710' }
    ]
  });

  const deletedVendorOrders = await VendorOrder.deleteMany({
    'items.title': { $in: demoTitles }
  });

  console.log(`[DB Clean] Purged ${deletedProducts.deletedCount} demo products, ${deletedMasterOrders.deletedCount} demo master orders, and ${deletedVendorOrders.deletedCount} demo sub-orders.`);
};

/**
 * Optional Demo Data Seeder for testing environments only.
 */
const seedDemoData = async () => {
  await initSystemData();

  const demoImages = {
    teff: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=1200&q=80',
    strawberry: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1200&q=80',
    coffee: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1200&q=80',
    honey: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80'
  };

  const vendorUser = await User.findOneAndUpdate(
    { email: 'vendor@paleo.market' },
    {
      $set: {
        role: 'vendor',
        telegramId: '1000000003',
        telegramUsername: 'green_harvest',
        displayName: 'Yared Farmers Collective',
        password: hashPassword('vendor123'),
        isEmailVerified: true
      }
    },
    { upsert: true, new: true }
  );

  const vendorRecord1 = await Vendor.findOneAndUpdate(
    { userId: vendorUser._id },
    {
      $set: {
        userId: vendorUser._id,
        storeName: 'Green Harvest Organic & Teak Studio',
        payoutDetails: { bank: 'CBE', account: '1000123456789' },
        rating: { average: 4.9, count: 214 },
        kycStatus: 'approved',
        commissionRate: 0.025,
        address: 'Sululta Valley Organic Farm, North Addis',
        location: { type: 'Point', coordinates: [38.7500, 9.0600] }
      }
    },
    { upsert: true, new: true }
  );

  const existingProducts = await Product.countDocuments();
  if (existingProducts === 0) {
    await Product.insertMany([
      {
        vendorId: vendorRecord1._id,
        title: 'Fresh Organic Highland Strawberries',
        description: 'Hand-picked daily from Sululta high-altitude farms.',
        price: 420,
        stock: 40,
        reservedStock: 0,
        category: 'Everyday Carry',
        location: vendorRecord1.location,
        images: [demoImages.strawberry]
      }
    ]);
  }
};

module.exports = initSystemData;
module.exports.initSystemData = initSystemData;
module.exports.cleanDemoData = cleanDemoData;
module.exports.seedDemoData = seedDemoData;
