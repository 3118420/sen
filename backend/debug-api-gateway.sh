#!/bin/bash
# debug-api-gateway.sh - Debug API Gateway setup

FUNCTION_NAME="voice-insight-api"
REGION="us-east-1"
API_NAME="${FUNCTION_NAME}-api"

echo "🔍 Debugging API Gateway setup..."
echo ""

# Check if Lambda function exists
echo "1️⃣ Checking Lambda function..."
if aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} >/dev/null 2>&1; then
    echo "✅ Lambda function exists: ${FUNCTION_NAME}"
    FUNCTION_STATE=$(aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --query 'Configuration.State' --output text)
    echo "   State: ${FUNCTION_STATE}"
else
    echo "❌ Lambda function not found: ${FUNCTION_NAME}"
    exit 1
fi

echo ""

# Check for existing API Gateways
echo "2️⃣ Checking API Gateway..."
API_LIST=$(aws apigatewayv2 get-apis --region ${REGION} --query 'Items[*].{Name:Name,ApiId:ApiId,ApiEndpoint:ApiEndpoint}' --output table)

if [ -z "$API_LIST" ]; then
    echo "❌ No API Gateways found"
else
    echo "📋 Found API Gateways:"
    echo "$API_LIST"
fi

echo ""

# Look for our specific API
echo "3️⃣ Looking for our API: ${API_NAME}"
API_ID=$(aws apigatewayv2 get-apis --region ${REGION} --query "Items[?Name=='${API_NAME}'].ApiId" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
    echo "❌ API not found: ${API_NAME}"
    echo "🔧 Creating API Gateway..."
    
    # Create the API
    API_ID=$(aws apigatewayv2 create-api \
        --name ${API_NAME} \
        --protocol-type HTTP \
        --cors-configuration AllowCredentials=false,AllowHeaders="*",AllowMethods="*",AllowOrigins="*" \
        --query ApiId --output text --region ${REGION})
    
    echo "✅ Created API with ID: ${API_ID}"
else
    echo "✅ Found API: ${API_NAME} (ID: ${API_ID})"
fi

# Get API details
echo ""
echo "4️⃣ API Details:"
aws apigatewayv2 get-api --api-id ${API_ID} --region ${REGION} --query '{Name:Name,ApiId:ApiId,ApiEndpoint:ApiEndpoint,CreatedDate:CreatedDate}' --output table

# Check integrations
echo ""
echo "5️⃣ Checking integrations..."
INTEGRATIONS=$(aws apigatewayv2 get-integrations --api-id ${API_ID} --region ${REGION} --query 'Items[*].{IntegrationId:IntegrationId,IntegrationType:IntegrationType,IntegrationUri:IntegrationUri}' --output table)

if [ -z "$INTEGRATIONS" ]; then
    echo "❌ No integrations found"
    echo "🔧 Creating integration..."
    
    # Create integration
    INTEGRATION_ID=$(aws apigatewayv2 create-integration \
        --api-id ${API_ID} \
        --integration-type AWS_PROXY \
        --integration-uri arn:aws:lambda:${REGION}:$(aws sts get-caller-identity --query Account --output text):function:${FUNCTION_NAME} \
        --payload-format-version 2.0 \
        --query IntegrationId --output text --region ${REGION})
    
    echo "✅ Created integration: ${INTEGRATION_ID}"
else
    echo "📋 Found integrations:"
    echo "$INTEGRATIONS"
    INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id ${API_ID} --region ${REGION} --query 'Items[0].IntegrationId' --output text)
fi

# Check routes
echo ""
echo "6️⃣ Checking routes..."
ROUTES=$(aws apigatewayv2 get-routes --api-id ${API_ID} --region ${REGION} --query 'Items[*].{RouteKey:RouteKey,Target:Target}' --output table)

if [ -z "$ROUTES" ]; then
    echo "❌ No routes found"
    echo "🔧 Creating route..."
    
    # Create route
    aws apigatewayv2 create-route \
        --api-id ${API_ID} \
        --route-key 'ANY /{proxy+}' \
        --target integrations/${INTEGRATION_ID} \
        --region ${REGION}
    
    echo "✅ Created route: ANY /{proxy+}"
else
    echo "📋 Found routes:"
    echo "$ROUTES"
fi

# Check stages
echo ""
echo "7️⃣ Checking stages..."
STAGES=$(aws apigatewayv2 get-stages --api-id ${API_ID} --region ${REGION} --query 'Items[*].{StageName:StageName,AutoDeploy:AutoDeploy,CreatedDate:CreatedDate}' --output table)

if [ -z "$STAGES" ]; then
    echo "❌ No stages found"
    echo "🔧 Creating stage..."
    
    # Create stage
    aws apigatewayv2 create-stage \
        --api-id ${API_ID} \
        --stage-name prod \
        --auto-deploy \
        --region ${REGION}
    
    echo "✅ Created stage: prod"
else
    echo "📋 Found stages:"
    echo "$STAGES"
fi

# Check Lambda permissions
echo ""
echo "8️⃣ Checking Lambda permissions..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Add permission if not exists
aws lambda add-permission \
    --function-name ${FUNCTION_NAME} \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" \
    --region ${REGION} 2>/dev/null && echo "✅ Added Lambda permission" || echo "ℹ️  Lambda permission already exists"

# Get the final API endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api --api-id ${API_ID} --region ${REGION} --query 'ApiEndpoint' --output text)

echo ""
echo "🎉 Setup complete!"
echo "🔗 API Endpoint: ${API_ENDPOINT}/prod"
echo ""
echo "🧪 Test your API:"
echo "   curl ${API_ENDPOINT}/prod/health"
echo "   curl ${API_ENDPOINT}/prod/"
echo ""
echo "📝 Save this endpoint for your frontend:"
echo "   VITE_API_URL=${API_ENDPOINT}/prod"