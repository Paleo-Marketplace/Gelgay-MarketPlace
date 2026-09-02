# ገልጋይ (Gelgay) — Curated Ethiopian Marketplace

<div align="center">
  <img src="apps/buyer-storefront/public/assets/gelgay_logo_lockup.png" alt="ገልጋይ (Gelgay) Logo" width="280" />
  <p><strong>"Good things deserve second life"</strong></p>
  <p><em>An Architectural, Escrow-Protected Multi-Vendor Marketplace for Second-Life Objects & Curated Design Artifacts in Ethiopia.</em></p>
</div>

---

## 📖 Overview

**ገልጋይ (Gelgay)** is an enterprise multi-vendor marketplace built for the Ethiopian second-life and curated vintage economy. It bridges local buyers and vetted neighborhood merchants across Adama (Posta Bet, Geda, Boku Shenen) and Addis Ababa with:

- **100% ACID Escrow Buyer Protection** with a 48-hour physical inspection window.
- **Automated Ethiopian Bank Receipt OCR** (Commercial Bank of Ethiopia, Telebirr, Dashen, Awash) powered by a Python FastAPI engine.
- **Dual Identity Authentication** supporting standard Email/Password, Google OAuth 2.0, and zero-cost Telegram Bot authentication.
- **Full-Page Adaptive Editorial Theme Engine** supporting seamless Light and Dark modes.
- **Hyperlocal Real-time Courier Dispatch & Live GPS Handoffs** with OpenStreetMap Leaflet integration.

---

## 🏛 System Architecture & Workspaces

The platform is engineered as an **npm workspaces monorepo** with dedicated microservices and independent frontend applications:

```
paleo-marketplace/
├── apps/
│   ├── buyer-storefront/      # Next.js 14 App Router (Editorial Storefront & Escrow Checkout)
│   │   ├── app/               # Routes: /, /shop, /categories, /buyer-protection, /track, /checkout, /products/[id]
│   │   ├── components/        # Bento grids, multi-angle carousels, OCR drawers, identity portal, dark theme engine
│   │   └── public/            # High-DPI Leaflet pins, brand lockups & background atmosphere assets
│   ├── vendor-dashboard/      # React 18 + Vite (Port 5173: Inventory CRUD, Sub-Orders, Payout Ledger)
│   ├── admin-console/         # React 18 + Vite (Port 5174: Escrow Vault, KYC Review, Dispute Arbitration)
│   └── courier-web-view/      # React 18 + Vite + Leaflet (Port 5175: Real-time Adama Neighborhood Handoff GPS)
├── services/
│   ├── api-gateway/           # Node.js Express 4 (Port 5000: RBAC, Google OAuth, Telegram Bot Daemon, Order Splitting)
│   │   ├── middleware/        # JWT auth, Idempotency-Key cache, Role Guards, Rate Limiters
│   │   ├── models/            # Mongoose Schemas (User, Vendor, Product, MasterOrder, VendorSubOrder, TelegramSession)
│   │   ├── routes/            # /api/auth, /api/products, /api/checkout, /api/orders, /api/vendor, /api/admin
│   │   └── services/          # CommissionService, TrackingService, PaymentOrchestrator, TelegramPollingService
│   └── receipt-parser/        # Python FastAPI + Tesseract OCR Engine (Port 8000: CBE/Telebirr Bank Receipt Parser)
├── deploy/                    # Nginx Edge Proxy configuration & SSL termination
├── docker-compose.yml         # Containerized production orchestration
└── package.json               # Monorepo scripts & unified dependencies
```

---

## ⚡ Quickstart & Local Development

### Prerequisites
- **Node.js** v18.0.0+ (Tested on Node.js v24 LTS)
- **npm** v9.0.0+
- **Python** 3.10+ (for receipt-parser microservice)
- **Google Chrome** (for browser interactions and UI verification)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/paleo-marketplace.git
cd paleo-marketplace

# Install all workspace dependencies across storefront, dashboards, and API gateway
npm install

# Setup Python virtual environment for OCR receipt parser
cd services/receipt-parser
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cd ../..
```

### 2. Environment Configuration
Copy `.env.example` into `.env` at the root and update your credentials:
```bash
cp .env.example .env
```

### 3. Start Development Servers
Start all frontend applications, the API Gateway, and the OCR receipt parser concurrently:
```bash
npm run dev
```

### 🌐 Service Port Mapping & URLs

| Application / Microservice | URL | Description | Default Dev Credentials |
| :--- | :--- | :--- | :--- |
| **Buyer Storefront** | [http://localhost:3000](http://localhost:3000) | Next.js 14 Storefront, Catalog & Checkout | Guest / Buyer Sign-in |
| **Vendor Studio** | [http://localhost:5173/vendor/](http://localhost:5173/vendor/) | Merchant Inventory & Payout Dashboard | Auto-linked on Vendor login |
| **Admin Console** | [http://localhost:5174/admin/](http://localhost:5174/admin/) | Platform Escrow Vault & KYC Review | `admin@paleo.market` / `admin123` |
| **Courier Web View** | [http://localhost:5175/courier/](http://localhost:5175/courier/) | Live Leaflet Handoff & GPS Tracking | Courier Dispatch |
| **API Gateway** | [http://localhost:5000](http://localhost:5000) | Central REST API & WebSockets | Backend Core |
| **Receipt OCR Parser** | [http://localhost:8000](http://localhost:8000) | Python FastAPI Receipt Engine | `/docs` OpenAPI Spec |

---

## ✨ Core Features & Technical Highlights

### 1. 🛡️ Multi-Vendor Atomic Order Splitting & Escrow Protocol
* **Zero-Rounding Commission Invariants**: When a buyer purchases items across multiple vendors in a single checkout, the system atomically splits the transaction into 1 **Master Order** and $N$ **Vendor Sub-Orders**. Platform commission (2.5%) and payouts are calculated using exact arithmetic with zero floating-point leakage.
* **Deterministic Escrow State Machine**:
  $$\text{PENDING} \longrightarrow \text{FUNDS\_HELD\_IN\_ESCROW} \longrightarrow \text{DISPATCHED} \longrightarrow \text{DELIVERED} \longrightarrow \text{FUNDS\_RELEASED}$$
  *(With strict branching into $\text{DISPUTED}$ and automated admin arbitration).*

### 2. 🧾 Automated Ethiopian Bank Receipt OCR
* Native integration with **Commercial Bank of Ethiopia (CBE Birr)**, **Telebirr**, **Dashen Bank**, and **Awash Bank**.
* Uploaded receipt screenshots are processed via Python FastAPI + Tesseract OCR to extract reference transaction IDs, transferred amounts, timestamps, and confidence scores ($\ge 95\%$) in under 4 seconds.

### 3. 🔐 Multi-Tiered Authentication & In-Place Seller KYC
* **Google OAuth 2.0**: Cryptographically verified server-side via `google-auth-library` and secured with `HttpOnly`, `SameSite=Strict` session cookies.
* **Zero-Cost Telegram Bot Identity**: Deep-link token sessions via [`@GelgayMarketBot`](https://t.me/GelgayMarketBot) eliminating SMS gateway costs.
* **Seamless Role Upgrade**: A registered buyer can upgrade to a seller by submitting their Studio KYC details (Store Name, Legal Full Name, TIN/National ID, and CBE/Telebirr payout bank account) directly within their existing account.

### 4. 🎨 Adaptive Theme Engine (Light & Dark Mode)
* Full-page Tailwind `dark:` variants paired with an inline pre-hydration script in `<head>` to guarantee **zero theme flashing**.
* Synchronized across `document.documentElement`, `document.body`, and `localStorage` with dynamic **☀️ / 🌙** indicators.

---

## 🤖 Telegram Bot Commands (`@GelgayMarketBot`)

The API Gateway runs an asynchronous Telegram daemon for bot-based marketplace browsing and administrative operations:

| Command | Description |
| :--- | :--- |
| `/start [token]` | Welcome interactive menu or single-tap browser token authentication |
| `/catalog` | Browse curated second-life archives and collections |
| `/orders` | View active orders, escrow vaults, and delivery statuses |
| `/track` | Real-time Adama courier GPS handoff tracking |
| `/sell` | Merchant KYC onboarding guide & Studio application |
| `/admin [passcode]` | Unlock administrative operations and receipt verification directly in Telegram |
| `/help` | Complete command reference and escrow protection guide |

---

## 🧪 Quality Assurance & Security Test Suite

The platform includes a test suite covering commerce invariants, multi-vendor fee calculations, and security defenses:

```bash
# Run complete test suite (Commerce Invariants + Security Defenses)
npm test

# Run dedicated backend unit tests
cd services/api-gateway && npm test
```

### 🛡️ Test Suite Highlights (41/41 Passed)
- **Frontend Security**: XSS input sanitization, CSRF rejection, `SameSite=Strict` cookie enforcement, Frameguard clickjacking protection.
- **Backend Business Logic**: Price manipulation defense (strictly derived from database catalog), negative quantity rejection, coupon abuse & race condition prevention, IDOR isolation.
- **Database Security**: NoSQL operator injection sanitization (`$gt`, `$ne`, `$where`), PBKDF2 password hashing (100,000 rounds sha512), and RBAC access control guards.

---

## 🚀 Production Deployment

### Option A: Complete Docker Compose Stack
Launches the entire containerized architecture with unified networking:

```bash
# Build and run containers in detached mode
docker compose up -d --build

# View real-time cluster logs
docker compose logs -f
```

### Option B: PM2 Process Manager
```bash
# Start all microservices and apps using the ecosystem configuration
npx pm2 start ecosystem.config.cjs

# Monitor system health
npx pm2 status
```

---

## 📄 License & Attribution

- **Brand**: **ገልጋይ (Gelgay)**
- **Tagline**: *"Good things deserve second life"*
- **Marketplace Focus**: Adama & Addis Ababa, Ethiopia
- **License**: MIT License. All rights reserved.

