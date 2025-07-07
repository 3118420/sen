#!/bin/bash
# deploy-lambda.sh - AWS Lambda deployment script with CloudWatch integration

set -e

echo "🚀 Starting AWS Lambda deployment..."

# Check requirements
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is required but not installed."
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed."
    echo "Install: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

# Check if .env file exists and has OpenAI key
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with OPENAI_API_KEY"
    exit 1
fi

if ! grep -q "OPENAI_API_KEY=" .env || grep -q "your_openai_api_key_here" .env; then
    echo "❌ Please set your OPENAI_API_KEY in the .env file"
    exit 1
fi

# Load environment variables
source .env

# Environment variables
FUNCTION_NAME=${FUNCTION_NAME:-"voice-insight-api"}
REGION=${AWS_REGION:-"us-east-1"}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📋 Deployment Configuration:"
echo "   Function Name: ${FUNCTION_NAME}"
echo "   Region: ${REGION}"
echo "   Account ID: ${ACCOUNT_ID}"
echo ""

# Build Docker image with Lambda-compatible settings
echo "📦 Building Docker image (Lambda-compatible)..."
docker build \
    --platform linux/amd64 \
    --provenance=false \
    --tag ${FUNCTION_NAME}:latest \
    --file Dockerfile.lambda \
    .

# Tag for ECR
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${FUNCTION_NAME}"
docker tag ${FUNCTION_NAME}:latest ${ECR_URI}:latest

# Create ECR repository if it doesn't exist
echo "🏗️  Setting up ECR repository..."
aws ecr describe-repositories --repository-names ${FUNCTION_NAME} --region ${REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${FUNCTION_NAME} --region ${REGION}

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_URI}

# Push image
echo "📤 Pushing image to ECR..."
docker push ${ECR_URI}:latest

# Create or update Lambda function
echo "⚡ Creating/updating Lambda function..."
if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} 2>/dev/null; then
    echo "📝 Updating existing function..."
    aws lambda update-function-code \
        --function-name ${FUNCTION_NAME} \
        --image-uri ${ECR_URI}:latest \
        --region ${REGION}
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name ${FUNCTION_NAME} \
        --environment "Variables={OPENAI_API_KEY=${OPENAI_API_KEY},ENVIRONMENT=production,LOG_LEVEL=INFO}" \
        --region ${REGION}
else
    echo "🆕 Creating new function..."
    
    # Create execution role if it doesn't exist
    ROLE_NAME="voice-insight-lambda-role"
    ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
    
    if ! aws iam get-role --role-name ${ROLE_NAME} 2>/dev/null; then
        echo "🔑 Creating IAM role..."
        
        # Create trust policy
        cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
        
        # Create role
        aws iam create-role \
            --role-name ${ROLE_NAME} \
            --assume-role-policy-document file://trust-policy.json
        
        # Attach basic execution policy
        aws iam attach-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        # Create and attach CloudWatch policy
        cat > cloudwatch-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF
        
        aws iam put-role-policy \
            --role-name ${ROLE_NAME} \
            --policy-name CloudWatchMetrics \
            --policy-document file://cloudwatch-policy.json
        
        # Clean up temp files
        rm trust-policy.json cloudwatch-policy.json
        
        echo "⏳ Waiting for role to be ready..."
        sleep 10
    fi
    
    # Create Lambda function with dynamic values
    aws lambda create-function \
        --function-name ${FUNCTION_NAME} \
        --package-type Image \
        --code ImageUri=${ECR_URI}:latest \
        --role ${ROLE_ARN} \
        --timeout 300 \
        --memory-size 3008 \
        --region ${REGION} \
        --environment "Variables={OPENAI_API_KEY=${OPENAI_API_KEY},ENVIRONMENT=production,LOG_LEVEL=INFO}"
fi

# Wait for function to be ready
echo "⏳ Waiting for function to be ready..."
aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${REGION}

# Create API Gateway
echo "🌐 Setting up API Gateway..."
API_NAME="${FUNCTION_NAME}-api"

# Check if API exists
API_ID=$(aws apigatewayv2 get-apis --query "Items[?Name=='${API_NAME}'].ApiId" --output text --region ${REGION} 2>/dev/null)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
    echo "🆕 Creating new API Gateway..."
    API_ID=$(aws apigatewayv2 create-api \
        --name ${API_NAME} \
        --protocol-type HTTP \
        --cors-configuration AllowCredentials=false,AllowHeaders="*",AllowMethods="*",AllowOrigins="*" \
        --query ApiId --output text --region ${REGION})
fi

# Create integration
INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id ${API_ID} \
    --integration-type AWS_PROXY \
    --integration-uri arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME} \
    --payload-format-version 2.0 \
    --query IntegrationId --output text --region ${REGION} 2>/dev/null || echo "exists")

if [ "$INTEGRATION_ID" != "exists" ]; then
    # Create route
    aws apigatewayv2 create-route \
        --api-id ${API_ID} \
        --route-key 'ANY /{proxy+}' \
        --target integrations/${INTEGRATION_ID} \
        --region ${REGION} 2>/dev/null || echo "Route exists"

    # Create default stage
    aws apigatewayv2 create-stage \
        --api-id ${API_ID} \
        --stage-name prod \
        --auto-deploy \
        --region ${REGION} 2>/dev/null || echo "Stage exists"
fi

# Add Lambda permission for API Gateway
aws lambda add-permission \
    --function-name ${FUNCTION_NAME} \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region ${REGION} 2>/dev/null || echo "Permission exists"

# Get API endpoint
API_ENDPOINT="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔗 API Endpoint: ${API_ENDPOINT}"
echo "📊 CloudWatch Logs: /aws/lambda/${FUNCTION_NAME}"
echo "📈 CloudWatch Metrics: VoiceInsight namespace"
echo ""
echo "🧪 Test your API:"
echo "   curl ${API_ENDPOINT}/health"
echo ""
echo "📝 Next steps:"
echo "1. Update your frontend environment variable:"
echo "   VITE_API_URL=${API_ENDPOINT}"
echo "2. Deploy your frontend to Vercel"
echo "3. Monitor in AWS CloudWatch dashboard"
echo ""

# Save endpoint to file for frontend
echo "VITE_API_URL=${API_ENDPOINT}" > .env.production
echo "💾 Saved API endpoint to .env.production"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -s "${API_ENDPOINT}/health" > /dev/null; then
    echo "✅ API is responding correctly!"
else
    echo "⚠️  API might still be warming up. Try again in a few minutes."
fi