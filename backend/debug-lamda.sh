#!/bin/bash
# debug-lambda.sh - Quick debug script for Lambda issues

FUNCTION_NAME="voice-insight-api"
REGION="us-east-1"

echo "🔍 Debugging Lambda function: ${FUNCTION_NAME}"
echo ""

# Get function configuration
echo "📋 Function Configuration:"
aws lambda get-function-configuration --function-name ${FUNCTION_NAME} --region ${REGION} || exit 1
echo ""

# Get the latest log stream
echo "📝 Getting latest logs..."
LOG_STREAM=$(aws logs describe-log-streams \
    --log-group-name "/aws/lambda/${FUNCTION_NAME}" \
    --order-by LastEventTime \
    --descending \
    --limit 1 \
    --region ${REGION} \
    --query 'logStreams[0].logStreamName' \
    --output text)

if [ "$LOG_STREAM" = "None" ] || [ -z "$LOG_STREAM" ]; then
    echo "❌ No log streams found. Function might not have been invoked yet."
    echo "Try testing the function first:"
    echo "   curl https://11treu6p055.execute-api.us-east-1.amazonaws.com/prod/health"
    exit 1
fi

echo "📄 Latest log stream: $LOG_STREAM"
echo ""

# Get recent log events
echo "🔍 Recent log events:"
aws logs get-log-events \
    --log-group-name "/aws/lambda/${FUNCTION_NAME}" \
    --log-stream-name "$LOG_STREAM" \
    --region ${REGION} \
    --query 'events[*].[timestamp,message]' \
    --output table

echo ""
echo "🧪 Test your function directly:"
echo "   aws lambda invoke --function-name ${FUNCTION_NAME} --region ${REGION} --payload '{}' response.json && cat response.json"
echo ""
echo "🌐 Test via API Gateway:"
echo "   curl -v https://11treu6p055.execute-api.us-east-1.amazonaws.com/prod/health"