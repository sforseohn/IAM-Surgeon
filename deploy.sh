#!/bin/bash
set -e

# IAM Surgeon Cloud Run Deployment Helper Script
# This script builds the local Docker container and deploys it to Google Cloud Run.

echo "=================================================="
echo "🚀 Deploying 'Optimal Cutting Edge' (IAM Surgeon) to Cloud Run..."
echo "=================================================="

# Ensure gcloud CLI is authenticated (optional safeguard)
if ! command -v gcloud &> /dev/null; then
    echo "⚠️ Error: gcloud CLI is not installed. Please install the Google Cloud SDK and try again."
    exit 1
fi

echo "📦 Running build and deployment command..."
gcloud run deploy iam-surgeon \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY

echo "=================================================="
echo "🎉 Deployment initiated! Once completed, you will receive a public Cloud Run URL."
echo "=================================================="
