export interface Product {
  id: string;
  title: string;
  priceETB: number;
  category: 'Electronics' | 'Furniture' | 'Studio' | 'Fashion' | 'Books';
  tag: string;
  condition: 'Like New' | 'Excellent' | 'Good' | 'Restored';
  location: string;
  vendorName: string;
  vendorRating: number;
  image: string;
  description: string;
  specs: Record<string, string>;
  escrowStatus: 'Available' | 'In Escrow' | 'Sold';
}

export interface ArchitectureNode {
  id: string;
  name: string;
  layer: 'Client' | 'Routing' | 'Backend' | 'Database' | 'Integrations';
  type: string;
  description: string;
  tech: string;
  endpoint?: string;
  latency: string;
  status: 'Healthy' | 'Active' | 'Optimal';
  details: string[];
}

export interface WorkflowStep {
  step: number;
  title: string;
  actor: string;
  action: string;
  systemResponse: string;
  dataPayload?: string;
}

export interface Workflow {
  id: 'A' | 'B' | 'C';
  title: string;
  subtitle: string;
  steps: WorkflowStep[];
}

export const CATEGORIES = [
  {
    id: 'electronics',
    filterKey: 'Electronics',
    name: 'Electronics',
    tag: '01 / EVERYDAY CARRY',
    image: '/assets/categories/electronics.jpg',
    itemCount: '342 items',
    description: 'Analog sound, vintage cameras, premium audio & craft devices',
    span: 'col-span-12 md:col-span-7 md:row-span-2 min-h-[340px] md:min-h-[640px]'
  },
  {
    id: 'furniture',
    filterKey: 'Furniture',
    name: 'Furniture',
    tag: '02 / HOME ARCHIVE',
    image: '/assets/categories/furniture.jpg',
    itemCount: '189 items',
    description: 'Mid-century chairs, sculpted oak tables, minimalist lamps',
    span: 'col-span-12 sm:col-span-6 md:col-span-5 min-h-[280px] md:min-h-[305px]'
  },
  {
    id: 'studio',
    filterKey: 'Studio',
    name: 'Studio Gear',
    tag: '03 / CREATIVE TOOLS',
    image: '/assets/categories/studio.jpg',
    itemCount: '115 items',
    description: '35mm film cameras, synthesizer units, mechanical keyboards',
    span: 'col-span-12 sm:col-span-6 md:col-span-5 min-h-[280px] md:min-h-[305px]'
  },
  {
    id: 'fashion',
    filterKey: 'Fashion',
    name: 'Archival Wear',
    tag: '04 / ARCHIVAL WEAR',
    image: '/assets/categories/fashion.jpg',
    itemCount: '420 items',
    description: 'Heavy wool coats, raw denim, hand-crafted leather goods',
    span: 'col-span-12 sm:col-span-6 md:col-span-6 min-h-[280px] md:min-h-[305px]'
  },
  {
    id: 'books',
    filterKey: 'Books',
    name: 'Rare Reads',
    tag: '05 / PAPER ARCHIVE',
    image: '/assets/categories/books.jpg',
    itemCount: '210 items',
    description: 'First edition design books, architectural journals & zines',
    span: 'col-span-12 sm:col-span-6 md:col-span-6 min-h-[280px] md:min-h-[305px]'
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'Braun ET66 Calculator - Dieter Rams (1987)',
    priceETB: 4800,
    category: 'Electronics',
    tag: '01 / EVERYDAY CARRY',
    condition: 'Like New',
    location: 'Kazanchis, Addis Ababa',
    vendorName: 'Yared M.',
    vendorRating: 4.9,
    image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&h=900&fit=crop&auto=format',
    description: 'Iconic industrial design piece in pristine working order. Original protective sliding cover included.',
    specs: { 'Year': '1987', 'Designer': 'Dieter Rams', 'Power': 'LR44 Battery', 'Origin': 'Germany' },
    escrowStatus: 'Available'
  },
  {
    id: 'prod-2',
    title: 'Sony TPS-L2 Soundabout Cassette Player',
    priceETB: 18500,
    category: 'Electronics',
    tag: '01 / EVERYDAY CARRY',
    condition: 'Excellent',
    location: 'Bole Atlas, Addis Ababa',
    vendorName: 'Selam Archival',
    vendorRating: 5.0,
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=900&fit=crop&auto=format',
    description: 'The world’s first personal stereo player. Serviced with new belt drive and calibrated audio heads.',
    specs: { 'Year': '1979', 'Output': 'Dual 3.5mm Headphone Jack', 'Condition': 'Restored & Tested' },
    escrowStatus: 'Available'
  },
  {
    id: 'prod-3',
    title: 'Mid-Century Teak Ergonomic Lounge Chair',
    priceETB: 32000,
    category: 'Furniture',
    tag: '02 / HOME ARCHIVE',
    condition: 'Restored',
    location: 'CMC, Addis Ababa',
    vendorName: 'Makeda Furniture',
    vendorRating: 4.8,
    image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=900&fit=crop&auto=format',
    description: 'Hand-sanded solid teak frame upholstered in warm bouclé wool fabric. Smooth reclining tilt mechanism.',
    specs: { 'Material': 'Danish Teak & Bouclé', 'Dimensions': '78 x 82 x 88 cm', 'Weight': '18 kg' },
    escrowStatus: 'Available'
  },
  {
    id: 'prod-4',
    title: 'Leica M3 Single Stroke 35mm Rangefinder',
    priceETB: 95000,
    category: 'Studio',
    tag: '03 / CREATIVE TOOLS',
    condition: 'Excellent',
    location: 'Lamberet, Addis Ababa',
    vendorName: 'Abebe Film Lab',
    vendorRating: 4.95,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&h=900&fit=crop&auto=format',
    description: 'Precision mechanical camera. Viewfinder clear with zero fungus. Includes Summicron 50mm f/2 lens.',
    specs: { 'Mount': 'Leica M', 'Shutter Speeds': '1s - 1/1000s', 'Lens': 'Summicron 50mm f/2' },
    escrowStatus: 'Available'
  },
  {
    id: 'prod-5',
    title: 'Raw Japanese Selvedge Denim Jacket (14.5oz)',
    priceETB: 8900,
    category: 'Fashion',
    tag: '04 / ARCHIVAL WEAR',
    condition: 'Like New',
    location: 'Sarbet, Addis Ababa',
    vendorName: 'Dawit Crafts',
    vendorRating: 4.85,
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&h=900&fit=crop&auto=format',
    description: 'Unwashed shuttle loom selvedge denim. Copper rivets and custom brass hardware.',
    specs: { 'Size': 'Medium', 'Fabric': '100% Cotton 14.5oz', 'Loom': 'Okayama Shuttle Loom' },
    escrowStatus: 'Available'
  },
  {
    id: 'prod-6',
    title: 'Bauhaus Typography & Grid Systems Monograph',
    priceETB: 3500,
    category: 'Books',
    tag: '05 / PAPER ARCHIVE',
    condition: 'Like New',
    location: 'Kazanchis, Addis Ababa',
    vendorName: 'Tewodros Design Co.',
    vendorRating: 5.0,
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&h=900&fit=crop&auto=format',
    description: 'Hardcover print edition with cloth bookmark. Essential master reference for typography and grids.',
    specs: { 'Pages': '340', 'Binding': 'Hardcover Linen', 'ISBN': '978-3-7757-4123-1' },
    escrowStatus: 'Available'
  }
];

export const SYSTEM_NODES: ArchitectureNode[] = [
  {
    id: 'frontend',
    name: 'React 19 Storefront & Vendor Portal',
    layer: 'Client',
    type: 'SPA Single Page App',
    description: 'Decoupled buyer storefront, natural language search, cart state & vendor management portal.',
    tech: 'React 19 + Vite + Tailwind CSS v4',
    endpoint: 'https://paleo.market',
    latency: '12ms',
    status: 'Optimal',
    details: [
      'Client-side state management for cart & Telegram OAuth',
      'Leaflet OSRM integration for vendor delivery mapping',
      'Optimistic UI state updates with zero full page refreshes'
    ]
  },
  {
    id: 'nginx',
    name: 'Nginx Reverse Proxy & SSL',
    layer: 'Routing',
    type: 'Reverse Proxy & Edge Gateway',
    description: 'SSL termination, HTTP/2 multiplexing, rate limiting, and request routing to Node.js backend.',
    tech: 'Nginx 1.24 + Certbot Let’s Encrypt',
    endpoint: '443 / 80 Port Forwarding',
    latency: '3ms',
    status: 'Healthy',
    details: [
      'SSL/TLS 1.3 termination at edge',
      'Routes /api traffic to PM2 Express Cluster',
      'Serves compressed static assets with immutable cache headers'
    ]
  },
  {
    id: 'pm2-express',
    name: 'Express API Gateway (PM2 Cluster)',
    layer: 'Backend',
    type: 'Node.js Microservice Gateway',
    description: 'Central orchestrator handling RBAC auth, transactional operations, Multer streams, and webhooks.',
    tech: 'Node.js v20 + Express + PM2 Cluster',
    endpoint: '/api/v1/orders, /api/webhooks',
    latency: '22ms',
    status: 'Active',
    details: [
      'PM2 process manager across all CPU cores',
      'RBAC middleware validating JWTs and Telegram Bot session tokens',
      'MongoDB ACID transaction manager for escrow locks'
    ]
  },
  {
    id: 'ocr-service',
    name: 'Python OCR Receipt Microservice',
    layer: 'Backend',
    type: 'Bank Receipt Extraction Microservice',
    description: 'Standalone Python service running ethiobank-receipts OCR to parse bank transfer screenshots.',
    tech: 'Python 3.11 + Tesseract + FastAPI',
    endpoint: 'http://ocr-service.internal:8080/parse',
    latency: '45ms',
    status: 'Optimal',
    details: [
      'Extracts transaction reference number and exact ETB amount',
      'Isolates heavy CPU-bound image recognition away from Node.js event loop',
      'Returns structured JSON response in <50ms'
    ]
  },
  {
    id: 'mongodb',
    name: 'MongoDB Atlas Primary DB',
    layer: 'Database',
    type: 'Document Database',
    description: 'Document store with geospatial indexing ($near) for Bole, Kazanchis, CMC neighborhood queries.',
    tech: 'MongoDB Atlas 7.0 Enterprise',
    endpoint: 'mongodb+srv://cluster.paleo.net',
    latency: '15ms',
    status: 'Healthy',
    details: [
      'Geospatial $near queries for local delivery calculation',
      'ACID transactions for cart lock and split payout commitment',
      'MasterOrder and VendorOrder relational schemas'
    ]
  },
  {
    id: 'redis',
    name: 'Redis Cache Layer',
    layer: 'Database',
    type: 'In-Memory Key-Value Store',
    description: 'Caches frequently accessed product catalog queries ("Recently Listed") and active escrow tokens.',
    tech: 'Redis 7.2 Enterprise Cache',
    endpoint: 'redis://cache.internal:6379',
    latency: '1.8ms',
    status: 'Optimal',
    details: [
      'Sub-2ms response time for trending items and category counts',
      'TTL expiration for temporary escrow cart locks (15 minute reservation)',
      'Session token blacklist and rate-limiting bucket storage'
    ]
  },
  {
    id: 'telegram-api',
    name: 'Telegram Bot API Gateway',
    layer: 'Integrations',
    type: 'Authentication & Notification Bot',
    description: 'Zero-cost identity verification replacing SMS gateways + automated instant seller order updates.',
    tech: 'Telegram Bot API + Webhook Gateway',
    endpoint: 'https://api.telegram.org/bot<TOKEN>',
    latency: '35ms',
    status: 'Active',
    details: [
      'Deep link OAuth authentication flow (@PaleoMarketBot)',
      'Instant push notifications to vendors when item is ordered',
      'Zero SMS costs with 100% delivery reliability'
    ]
  },
  {
    id: 'cloudflare-r2',
    name: 'Cloudflare R2 Object Storage',
    layer: 'Integrations',
    type: 'S3-Compatible Object Store',
    description: 'Stores high-resolution product imagery and bank receipt uploads with zero egress fees.',
    tech: 'Cloudflare R2 + AWS SDK v3',
    endpoint: 'https://assets.paleo.market',
    latency: '18ms',
    status: 'Optimal',
    details: [
      'Zero egress fee image CDN delivery',
      'Multer streaming directly from Express memory buffer',
      'Automatic WebP image compression at edge'
    ]
  },
  {
    id: 'typesense',
    name: 'Typesense Search Engine',
    layer: 'Integrations',
    type: 'Typo-Tolerant Search Index',
    description: 'Powers conversational search with sub-10ms typo tolerance across titles, categories, and tags.',
    tech: 'Typesense 26.0 Cluster',
    endpoint: 'https://search.paleo.market',
    latency: '8ms',
    status: 'Healthy',
    details: [
      'Typo-tolerant search (e.g., finding "desk lamp" even if typed "desklamp")',
      'Real-time sync from MongoDB oplog',
      'Instant faceted filtering by neighborhood and price'
    ]
  }
];

export const WORKFLOWS: Workflow[] = [
  {
    id: 'A',
    title: 'Workflow A: Vendor Verification & Onboarding',
    subtitle: 'Zero-cost Telegram bot identity pairing & vendor role upgrading',
    steps: [
      {
        step: 1,
        title: 'Initiation',
        actor: 'Vendor (React Frontend)',
        action: 'Clicks "Sell an Item" and submits store profile details.',
        systemResponse: 'React dispatches POST /api/vendor/register request.'
      },
      {
        step: 2,
        title: 'Auth Token Generation',
        actor: 'Express API Gateway',
        action: 'Generates temporary JWT token with unverified status.',
        systemResponse: 'Returns deep link: https://t.me/PaleoMarketBot?start=AUTH_982A7',
        dataPayload: '{ "token": "JWT_TEMP_982A7", "deepLink": "t.me/PaleoMarketBot" }'
      },
      {
        step: 3,
        title: 'Telegram Webhook Trigger',
        actor: 'Telegram Bot API',
        action: 'Vendor taps Start in Telegram. Telegram sends webhook event.',
        systemResponse: 'Express receives POST /api/webhooks/telegram payload.',
        dataPayload: '{ "telegramId": "8849102", "startPayload": "AUTH_982A7" }'
      },
      {
        step: 4,
        title: 'Database Role Upgrade',
        actor: 'MongoDB Atlas',
        action: 'Pairs Telegram ID with user profile and updates role.',
        systemResponse: 'Role set to "VENDOR_VERIFIED". Vendor dashboard unlocked.',
        dataPayload: '{ "status": "SUCCESS", "role": "VENDOR_VERIFIED", "vendorId": "V-1092" }'
      }
    ]
  },
  {
    id: 'B',
    title: 'Workflow B: Escrow & Checkout Process',
    subtitle: 'MongoDB Cart Lock, Python Bank Receipt OCR & Order Splitting',
    steps: [
      {
        step: 1,
        title: 'Inventory Cart Lock',
        actor: 'Buyer (React Frontend)',
        action: 'Initiates checkout for MacBook (Vendor A) & Sony Headphone (Vendor B).',
        systemResponse: 'Express starts MongoDB ACID transaction; locks inventory in Redis for 15 min.',
        dataPayload: '{ "cartId": "CART_9042", "status": "LOCKED", "expiresIn": "900s" }'
      },
      {
        step: 2,
        title: 'Bank Transfer Receipt Upload',
        actor: 'Buyer / Cloudflare R2',
        action: 'Buyer transfers funds to central bank account and uploads receipt image.',
        systemResponse: 'Express Multer middleware streams receipt to Cloudflare R2 object bucket.'
      },
      {
        step: 3,
        title: 'Python OCR Extraction',
        actor: 'Python OCR Service',
        action: 'Express forwards image URL to Python ethiobank-receipts microservice.',
        systemResponse: 'Python extracts Ref #: CBE-TRX-88910, Amount: 23,300.00 ETB in 42ms.',
        dataPayload: '{ "refNo": "CBE-TRX-88910", "extractedAmount": 23300, "confidence": 0.985 }'
      },
      {
        step: 4,
        title: 'Order Splitting & Escrow Hold',
        actor: 'Express & MongoDB',
        action: 'Amount matches order total! Commit MongoDB transaction.',
        systemResponse: 'Generates 1 MasterOrder (#MO-8821) and 2 VendorOrders (#VO-A, #VO-B). Funds state: HELD_IN_ESCROW.',
        dataPayload: '{ "masterOrder": "MO-8821", "escrowState": "HELD_IN_ESCROW", "telegramAlertSent": true }'
      }
    ]
  },
  {
    id: 'C',
    title: 'Workflow C: Delivery & Fund Release',
    subtitle: 'Neighborhood OSRM logistics routing, buyer receipt & vendor payout',
    steps: [
      {
        step: 1,
        title: 'Logistics Hand-off',
        actor: 'Leaflet OSRM & Vendor',
        action: 'Item shipped from Kazanchis vendor to Bole Atlas buyer.',
        systemResponse: 'Routing map visualizes delivery coordinates and live delivery status.'
      },
      {
        step: 2,
        title: 'Buyer Confirmation',
        actor: 'Buyer (React)',
        action: 'Buyer inspects item and clicks "Confirm Delivery".',
        systemResponse: 'React sends POST /api/orders/confirm-delivery'
      },
      {
        step: 3,
        title: 'Commission & Escrow Release',
        actor: 'Express API Gateway',
        action: 'Deducts 5% platform commission and updates escrow status.',
        systemResponse: 'VendorOrder status changed to "PAYOUT_RELEASED".',
        dataPayload: '{ "gross": 18500, "commission": 925, "netPayout": 17575, "status": "RELEASED" }'
      },
      {
        step: 4,
        title: 'Admin Payout Notification',
        actor: 'Telegram Bot & Bank Payout',
        action: 'Telegram Bot notifies admin to initiate local bank payout to vendor account.',
        systemResponse: 'Automated bank payout alert logged with reference CBE-PAYOUT-7712.',
        dataPayload: '{ "payoutReference": "CBE-PAYOUT-7712", "bank": "CBE", "account": "1000****492" }'
      }
    ]
  }
];

export const FAQ_ITEMS = [
  {
    q: 'How does ገልጋይ handle seller verification without expensive SMS fees?',
    a: 'Instead of traditional SMS OTP services that charge per message, ገልጋይ leverages the Telegram Bot API (@PaleoMarketBot). When onboarding, sellers launch a deep link that verifies their identity in Telegram in under 2 seconds, providing zero-cost, 100% reliable verification.'
  },
  {
    q: 'How does the Bank Receipt OCR process work during checkout?',
    a: 'When a buyer completes a bank transfer, they upload a screenshot of their transaction confirmation. Our dedicated Python microservice (built on ethiobank-receipts and Tesseract OCR) parses the image in under 50ms, extracting the transaction reference number and exact ETB amount for automated verification.'
  },
  {
    q: 'What happens to the funds while an item is being delivered?',
    a: 'All payments are held in a secure platform Escrow state (HELD_IN_ESCROW). Funds are only released to the vendor after the buyer physically inspects the item upon delivery and taps "Confirm Delivery" on their storefront dashboard.'
  },
  {
    q: 'How is order delivery routed between buyers and vendors?',
    a: 'ገልጋይ uses Leaflet JS combined with Open Source Routing Machine (OSRM) to calculate precision transit routes between neighborhood coordinates (e.g. Posta Bet, Geda, Boku Shenen, Dembi) with zero costly map API fees.'
  },
  {
    q: 'How does Cloudflare R2 replace AWS S3 for media storage?',
    a: 'Cloudflare R2 offers S3 API compatibility with zero bandwidth egress fees. Product imagery uploaded through Multer on our Express gateway streams directly to R2, cutting media hosting costs by over 90% while serving fast WebP images via Cloudflare CDN.'
  }
];

export const TESTIMONIALS = [
  {
    quote: "Selling vintage audio gear on ገልጋይ took less than 5 minutes. The Telegram bot verification was seamless, and the escrow system meant I never worried about getting paid.",
    name: "Yared M.",
    role: "Collector & Vendor",
    location: "Dembi, Adama",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&auto=format"
  },
  {
    quote: "Found an original Dieter Rams Braun calculator in pristine condition. The OCR receipt verification verified my bank transfer in seconds. Best secondhand experience in East Africa.",
    name: "Abebe T.",
    role: "Industrial Designer & Buyer",
    location: "Bole Atlas, Addis Ababa",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format"
  },
  {
    quote: "The system architecture transparency is brilliant. Knowing my funds stay safely in escrow until I inspect my Leica camera gave me total confidence.",
    name: "Bethlehem K.",
    role: "Photographer",
    location: "Sarbet, Addis Ababa",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format"
  }
];
