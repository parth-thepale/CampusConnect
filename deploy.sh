#!/usr/bin/env bash
# ==============================================================================
# CampusConnect - Turnkey Zero-Effort Deployment to Google Cloud Run & AI Studio
# ==============================================================================
set -e

echo ""
echo "=========================================================="
echo " CampusConnect - Turnkey Google Cloud Run Deployment     "
echo "=========================================================="
echo ""

# 1. Detect or prompt for Google Cloud Project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  read -p "Enter your Google Cloud Project ID: " PROJECT_ID
  gcloud config set project "$PROJECT_ID"
fi
echo "==> Using Google Cloud Project: $PROJECT_ID"

# 2. Check for Google AI Studio API Key
KEY="${GEMINI_API_KEY:-}"
if [ -z "$KEY" ]; then
  read -p "Enter your Google AI Studio GEMINI_API_KEY (optional, press Enter to skip): " KEY
fi

ENV_VARS="GEMINI_MODEL=gemini-2.5-flash-lite,NODE_ENV=production"
if [ -n "$KEY" ]; then
  ENV_VARS="${ENV_VARS},GEMINI_API_KEY=${KEY}"
fi

echo "==> Deploying container directly from source to Cloud Run..."
gcloud run deploy campusconnect \
  --source . \
  --project "$PROJECT_ID" \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS" \
  --memory 512Mi \
  --cpu 1 \
  --quiet

echo ""
echo "=========================================================="
echo " Deployment successful! Your CampusConnect app is live.   "
echo "=========================================================="
