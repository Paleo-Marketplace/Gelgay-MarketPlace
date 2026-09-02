# ገልጋይ (Gelgay) · PALEO Marketplace

<div align="center">
  <img src="https://raw.githubusercontent.com/Paleo-Marketplace/Gelgay-MarketPlace/main/apps/buyer-storefront/public/assets/gelgay_logo_lockup.png" alt="ገልጋይ (Gelgay) Marketplace" width="340" />

  <p>
    <strong>"Good things deserve second life" · መልካም ነገሮች ሁለተኛ ሕይወት ይገባቸዋል</strong>
  </p>
  <p>
    <em>An architectural, escrow-protected multi-vendor commerce ecosystem engineered for curated vintage objects, design artifacts, and physical neighborhood handoffs across Ethiopia.</em>
  </p>

  <p>
    <a href="https://github.com/Paleo-Marketplace/Gelgay-MarketPlace"><img src="https://img.shields.io/badge/Repository-Gelgay--MarketPlace-EB5B00?style=for-the-badge&logo=github" alt="Repository" /></a>
    <a href="https://t.me/PaleoMarketBot"><img src="https://img.shields.io/badge/Telegram_Bot-@PaleoMarketBot-229ED9?style=for-the-badge&logo=telegram" alt="Telegram Bot" /></a>
    <img src="https://img.shields.io/badge/Escrow_Security-100%25_ACID_Vault-10261D?style=for-the-badge&logo=shield" alt="Escrow Protection" />
    <img src="https://img.shields.io/badge/Architecture-Full_Stack_Monorepo-d96b43?style=for-the-badge" alt="Architecture" />
  </p>
</div>

---

## 🏛 About the Organization

**Paleo-Marketplace (ገልጋይ)** is an open-technology engineering organization dedicated to revolutionizing peer-to-peer and merchant commerce in Ethiopia. 

In traditional peer-to-peer exchanges across Ethiopia, buyers face significant fraud risks with direct bank transfers, sellers struggle with payment disputes, and delivery logistics lack transparent tracking. **ገልጋይ (Gelgay)** addresses this trust deficit through an integrated tripartite escrow protocol:

1. **100% Vaulted Escrow:** Customer funds (via CBE, Telebirr, or Chapa) are locked securely in escrow before physical dispatch.
2. **48-Hour Inspection Period:** Buyers physically evaluate items in their neighborhood before any merchant payouts are released.
3. **Automated Bank Receipt OCR:** Python FastAPI + Tesseract vision microservice validates CBE and Telebirr transaction screenshots to eliminate fraudulent receipts.

---

## 🌐 The Ecosystem & Applications

The **[Gelgay-MarketPlace](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace)** monorepo contains four specialized client applications and two core microservices:

| Portal / Service | Tech Stack | Role & Capabilities |
| :--- | :--- | :--- |
| **[Buyer Storefront](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/apps/buyer-storefront)** | Next.js 14 (App Router), Tailwind CSS, Zustand | High-performance editorial catalog, bento collection grids, fast escrow checkout, and dual-theme (Light/Dark) adaptive engine. |
| **[Vendor Studio](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/apps/vendor-dashboard)** | React 18, Vite, Lucide | Merchant operations console for real-time inventory CRUD, variant management, courier dispatching, and CBE/Telebirr payout withdrawals. |
| **[Admin Console](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/apps/admin-console)** | React 18, Vite, Lucide | Superuser control center for escrow vault monitoring, automated KYC merchant verification, dispute arbitration, and platform analytics. |
| **[Courier Web View](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/apps/courier-web-view)** | React 18, Leaflet, Socket.io | Real-time GPS delivery tracking across Adama neighborhoods (Posta Bet, Geda, Boku Shenen, Goro ASTU) with camera Proof-of-Delivery (PoD). |
| **[API Gateway & Event Core](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/services/api-gateway)** | Node.js Express, MongoDB Replica Set, Redis | ACID transaction orchestration, order splitting, Google OAuth 2.0, RBAC guards, and background inventory cleanup cron. |
| **[Receipt Parser Microservice](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/tree/main/services/receipt-parser)** | Python 3.11, FastAPI, Tesseract OCR | Computer vision engine parsing Commercial Bank of Ethiopia and Telebirr digital transaction slips in real-time. |

---

## ⚡ Technical Highlights & Architectural Invariants

- 🛡️ **Comprehensive Security Suite:** 50/50 automated test suites verifying XSS sanitization, CSRF tokens, strict cookie boundaries, NoSQL injection defenses, and RBAC isolation.
- ⚡ **Atomic Inventory Engine:** Variant-level stock reservation prevents race conditions and overselling using MongoDB `arrayFilters`.
- 🤖 **Telegram Bot Daemon:** Integrated `@PaleoMarketBot` enables zero-cost user authentication, deep link session bridging, and instant receipt arbitration.
- 📍 **Hyperlocal Geospatial Logistics:** Real-time distance and ETA calculations using the Haversine formula and OSRM routing, tailored specifically for Ethiopian urban hubs.
- 🌓 **Synchronized Adaptive Theme Engine:** Seamless light and dark mode state synchronized across all browser tabs and client portals using custom CSS variables.

---

## 🚀 Quick Repository Access

- **Core Marketplace Monorepo:** [`Paleo-Marketplace/Gelgay-MarketPlace`](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace)
- **Production Architecture Spec:** [`docs/architecture.md`](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/blob/main/docs/architecture.md)
- **Security & Commerce Tests:** [`docs/ecommerce-test-suite.md`](https://github.com/Paleo-Marketplace/Gelgay-MarketPlace/blob/main/docs/ecommerce-test-suite.md)

---

## 🤝 Community & Contact

- **Marketplace Web:** [http://localhost:3000](http://localhost:3000) (Local Development)
- **Telegram Bot Assistant:** [@PaleoMarketBot](https://t.me/PaleoMarketBot)
- **Organization:** Paleo-Marketplace · Adama & Addis Ababa, Ethiopia

<div align="center">
  <sub>Built with care for the Ethiopian circular and curated design economy. © 2026 ገልጋይ (Gelgay). All rights reserved.</sub>
</div>
