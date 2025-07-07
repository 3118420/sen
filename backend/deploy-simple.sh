#!/bin/bash
# Simple deployment script for serverless

set -e

echo "🚀 Starting Serverless deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and fill in your values."
    exit 1
fi

# Check if OpenAI API key is set
if ! grep -q "OPENAI_API_KEY=" .env || grep -q "your_openai_api_key_here" .env; then
    echo "❌ Please set your OPENAI_API_KEY in the .env file"
    exit 1
fi

# Install serverless if not present
if ! command -v serverless &> /dev/null; then
    echo "📦 Installing Serverless Framework..."
    npm install -g serverless
fi

# Install plugins
echo "📦 Installing Serverless plugins..."
npm install

# Deploy
echo "🚀 Deploying to AWS..."
serverless deploy --verbose

echo "✅ Deployment completed!"
echo ""
echo "Next steps:"
echo "1. Copy the API endpoint URL from above"
echo "2. Update your frontend .env file with: VITE_API_URL=<your-api-endpoint>"
echo "3. Deploy your frontend to Vercel"