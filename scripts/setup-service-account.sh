#!/bin/bash

# Setup Firebase Service Account Key in .env.local
# Usage: ./scripts/setup-service-account.sh path/to/service-account.json

set -e

if [ -z "$1" ]; then
  echo "❌ Error: No service account file provided"
  echo ""
  echo "Usage: ./scripts/setup-service-account.sh path/to/service-account.json"
  echo ""
  echo "Example:"
  echo "  ./scripts/setup-service-account.sh ~/Downloads/seth-production-xxxxx.json"
  echo ""
  exit 1
fi

SERVICE_ACCOUNT_FILE="$1"

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
  echo "❌ Error: File not found: $SERVICE_ACCOUNT_FILE"
  exit 1
fi

echo "📁 Reading service account file..."

# Read and minify JSON (remove newlines and extra spaces)
SERVICE_ACCOUNT_JSON=$(cat "$SERVICE_ACCOUNT_FILE" | tr -d '\n' | tr -s ' ')

echo "✅ Service account file loaded"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "📝 Creating .env.local file..."
  touch .env.local
fi

# Check if FIREBASE_SERVICE_ACCOUNT_KEY already exists
if grep -q "FIREBASE_SERVICE_ACCOUNT_KEY" .env.local; then
  echo "⚠️  Warning: FIREBASE_SERVICE_ACCOUNT_KEY already exists in .env.local"
  echo ""
  read -p "Do you want to replace it? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove old key
    sed -i.bak '/FIREBASE_SERVICE_ACCOUNT_KEY/d' .env.local
    echo "🗑️  Removed old key"
  else
    echo "❌ Cancelled"
    exit 0
  fi
fi

# Add new key
echo "" >> .env.local
echo "# Firebase Admin SDK Service Account (for server-side operations)" >> .env.local
echo "FIREBASE_SERVICE_ACCOUNT_KEY='$SERVICE_ACCOUNT_JSON'" >> .env.local

echo "✅ Added FIREBASE_SERVICE_ACCOUNT_KEY to .env.local"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "You can now run:"
echo "  npx tsx scripts/create-super-admin.ts"
echo ""
