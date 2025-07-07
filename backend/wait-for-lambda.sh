#!/bin/bash
# wait-for-lambda.sh - Wait for Lambda function to finish updating

FUNCTION_NAME="voice-insight-api"
REGION="us-east-1"

echo "⏳ Waiting for Lambda function update to complete..."
echo "Function: ${FUNCTION_NAME}"
echo "Region: ${REGION}"
echo ""

# Check current function state
echo "🔍 Current function state:"
aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --query 'Configuration.State' --output text

echo ""
echo "⏳ Waiting for function to be ready..."

# Wait for function to be updated
if aws lambda wait function-updated --function-name ${FUNCTION_NAME} --region ${REGION}; then
    echo "✅ Function update completed successfully!"
    
    # Check final state
    echo ""
    echo "📋 Final function state:"
    aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --query 'Configuration.{State:State,LastUpdateStatus:LastUpdateStatus,LastUpdateStatusReason:LastUpdateStatusReason}' --output table
    
    # Test the function
    echo ""
    echo "🧪 Testing function..."
    API_ENDPOINT="https://11treu6p055.execute-api.us-east-1.amazonaws.com/prod"
    
    if curl -s "${API_ENDPOINT}/health" > /dev/null; then
        echo "✅ Function is responding!"
        echo "🔗 API Endpoint: ${API_ENDPOINT}"
    else
        echo "⚠️  Function might still be warming up or have runtime issues."
        echo "Check logs with: aws logs tail /aws/lambda/${FUNCTION_NAME} --region ${REGION}"
    fi
else
    echo "❌ Function update failed or timed out."
    echo "Check function status:"
    aws lambda get-function --function-name ${FUNCTION_NAME} --region ${REGION} --query 'Configuration.{State:State,LastUpdateStatus:LastUpdateStatus,LastUpdateStatusReason:LastUpdateStatusReason}' --output table
fi