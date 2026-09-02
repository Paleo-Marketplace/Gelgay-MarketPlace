#!/usr/bin/env bash
set -euo pipefail

echo "======================================================================"
echo "PALEO Marketplace — Production Deployment Script"
echo "======================================================================"

# 1. Verify Environment Variables
if [ ! -f ".env" ]; then
  echo "⚠️ Notice: .env file missing. Copying .env.production to .env."
  cp .env.production .env || true
fi

echo "🧪 Step 1: Running full commerce and security threat test suites..."
npm run test

echo "🏗️ Step 2: Compiling production frontend and gateway builds..."
npm run build

echo "🐳 Step 3: Launching containerized microservices and edge reverse proxy..."
docker compose up -d --build

echo "======================================================================"
echo "✅ PALEO Marketplace successfully deployed!"
echo "🌐 Buyer Storefront: http://localhost:8080"
echo "🏪 Vendor Dashboard: http://localhost:8080/vendor/"
echo "👑 Admin Operations: http://localhost:8080/admin/"
echo "🛵 Courier Tracking: http://localhost:8080/courier/"
echo "⚙️ API Health:       http://localhost:8080/health"
echo "======================================================================"
