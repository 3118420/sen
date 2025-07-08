import json
import time
import boto3
from mangum import Mangum
import os
from typing import Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_lambda_environment():
    """Setup Lambda environment for ML model caching"""
    try:
        # Create cache directories in /tmp (writable in Lambda)
        cache_dirs = [
            '/tmp/.cache',
            '/tmp/.cache/whisper',
            '/tmp/.cache/huggingface',
            '/tmp/.cache/huggingface/hub',
            '/tmp/.cache/torch',
            '/tmp/.cache/transformers'
        ]
        
        for cache_dir in cache_dirs:
            os.makedirs(cache_dir, exist_ok=True)
            logger.info(f"Created cache directory: {cache_dir}")
        
        # Set environment variables for various caching systems
        env_vars = {
            'WHISPER_CACHE': '/tmp/.cache/whisper',
            'TRANSFORMERS_CACHE': '/tmp/.cache/huggingface/hub',
            'HF_HOME': '/tmp/.cache/huggingface',
            'TORCH_HOME': '/tmp/.cache/torch',
            'XDG_CACHE_HOME': '/tmp/.cache',
            'WHISPER_MODEL_PATH': '/tmp/.cache/whisper',
            'HUGGINGFACE_HUB_CACHE': '/tmp/.cache/huggingface/hub',
            'TRANSFORMERS_OFFLINE': '0',  # Allow downloads
            'HF_DATASETS_CACHE': '/tmp/.cache/huggingface/datasets'
        }
        
        for key, value in env_vars.items():
            os.environ[key] = value
            logger.info(f"Set environment variable: {key}={value}")
        
        logger.info("Cache directories and environment variables set successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error setting up Lambda environment: {e}")
        return False

# Setup environment before initializing other components
setup_lambda_environment()

# Initialize AWS clients
try:
    cloudwatch = boto3.client('cloudwatch')
    logger.info("CloudWatch client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize CloudWatch client: {e}")
    cloudwatch = None

# Import FastAPI app after environment setup
try:
    from main import app
    logger.info("FastAPI app imported successfully")
except ImportError as e:
    logger.error(f"Failed to import FastAPI app: {e}")
    # Create a minimal FastAPI app as fallback
    from fastapi import FastAPI
    app = FastAPI()
    
    @app.get("/health")
    async def health():
        return {"status": "healthy", "message": "Fallback app is running"}
    
    @app.post("/api/process-audio")
    async def process_audio(request: dict):
        return {"error": "Main app failed to import", "fallback": True}

# Create Lambda handler with enhanced configuration
try:
    handler = Mangum(
        app,
        lifespan="off",  # Disable lifespan for Lambda
        api_gateway_base_path="/",  # Set base path explicitly
        text_mime_types=[
            "application/json",
            "application/javascript",
            "application/xml",
            "application/vnd.api+json",
            "text/plain",
            "text/html",
            "text/css",
            "text/csv"
        ],
        binary_mime_types=[
            "audio/*",
            "application/octet-stream",
            "multipart/form-data"
        ],
        custom_headers=None,
        exclude_headers=None,
    )
    logger.info("Mangum handler created successfully")
except Exception as e:
    logger.error(f"Failed to create Mangum handler: {e}")
    # Create a fallback handler
    def fallback_handler(event, context):
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Handler initialization failed', 'message': str(e)})
        }
    handler = fallback_handler

def send_cloudwatch_metric(metric_name: str, value: float, unit: str = 'Count', dimensions: Dict[str, str] = None):
    """Send custom metrics to CloudWatch with enhanced error handling"""
    if not cloudwatch:
        logger.warning("CloudWatch client not available, skipping metric")
        return
        
    try:
        metric_data = {
            'MetricName': metric_name,
            'Value': value,
            'Unit': unit,
            'Timestamp': time.time()
        }
        
        if dimensions:
            metric_data['Dimensions'] = [
                {'Name': key, 'Value': str(value)} for key, value in dimensions.items()
            ]
        
        cloudwatch.put_metric_data(
            Namespace='VoiceInsight',
            MetricData=[metric_data]
        )
        logger.info(f"Sent CloudWatch metric: {metric_name}={value} {unit}")
    except Exception as e:
        logger.error(f"Failed to send CloudWatch metric {metric_name}: {e}")

def create_api_gateway_v2_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Convert direct invocation or test event to API Gateway v2 format"""
    logger.info(f"Converting event to API Gateway v2 format")
    
    # Extract path and method from event, with defaults
    path = event.get('path', '/api/process-audio')
    method = event.get('httpMethod', event.get('method', 'POST'))
    
    # Handle test events that might have different structures
    if 'body' in event and isinstance(event['body'], dict):
        body = json.dumps(event['body'])
    elif 'body' in event and isinstance(event['body'], str):
        body = event['body']
    else:
        body = json.dumps(event)
    
    # Create API Gateway v2 format
    api_gateway_event = {
        'version': '2.0',
        'routeKey': f'{method} {path}',
        'rawPath': path,
        'rawQueryString': event.get('queryStringParameters', ''),
        'cookies': event.get('cookies', []),
        'headers': event.get('headers', {
            'content-type': 'application/json',
            'accept': 'application/json'
        }),
        'queryStringParameters': event.get('queryStringParameters', {}),
        'requestContext': {
            'accountId': '123456789012',
            'apiId': 'test-api',
            'domainName': 'test.execute-api.us-east-1.amazonaws.com',
            'domainPrefix': 'test',
            'http': {
                'method': method,
                'path': path,
                'protocol': 'HTTP/1.1',
                'sourceIp': '127.0.0.1',
                'userAgent': 'aws-lambda-python/3.11'
            },
            'requestId': f'test-{int(time.time())}-{int(time.time() * 1000) % 1000}',
            'routeKey': f'{method} {path}',
            'stage': '$default',
            'time': time.strftime('%d/%b/%Y:%H:%M:%S +0000', time.gmtime()),
            'timeEpoch': int(time.time() * 1000)
        },
        'body': body,
        'pathParameters': event.get('pathParameters', {}),
        'isBase64Encoded': event.get('isBase64Encoded', False),
        'stageVariables': event.get('stageVariables', {})
    }
    
    logger.info(f"Created API Gateway v2 event: {json.dumps(api_gateway_event, default=str)}")
    return api_gateway_event

def detect_event_type(event: Dict[str, Any]) -> str:
    """Detect the type of AWS event"""
    # API Gateway v2
    if 'version' in event and event['version'] == '2.0':
        return 'api_gateway_v2'
    
    # API Gateway v1
    if 'requestContext' in event and 'httpMethod' in event:
        return 'api_gateway_v1'
    
    # ALB
    if 'requestContext' in event and 'elb' in event['requestContext']:
        return 'alb'
    
    # Lambda Function URL
    if 'requestContext' in event and 'http' in event['requestContext']:
        return 'lambda_function_url'
    
    # Direct invocation or test event
    return 'direct_invocation'

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler with comprehensive event handling
    """
    start_time = time.time()
    request_id = context.aws_request_id if context else 'unknown'
    
    try:
        # Log the raw event for debugging
        logger.info(f"Request {request_id} - Raw event: {json.dumps(event, default=str)}")
        
        # Detect event type
        event_type = detect_event_type(event)
        logger.info(f"Detected event type: {event_type}")
        
        # Handle different event types
        if event_type == 'direct_invocation':
            # Convert direct invocation to API Gateway v2 format
            processed_event = create_api_gateway_v2_event(event)
        elif event_type == 'api_gateway_v1':
            # Convert API Gateway v1 to v2 format
            processed_event = {
                'version': '2.0',
                'routeKey': f"{event['httpMethod']} {event['path']}",
                'rawPath': event['path'],
                'rawQueryString': event.get('queryStringParameters', ''),
                'headers': event.get('headers', {}),
                'queryStringParameters': event.get('queryStringParameters', {}),
                'requestContext': {
                    'http': {
                        'method': event['httpMethod'],
                        'path': event['path'],
                        'protocol': 'HTTP/1.1',
                        'sourceIp': event['requestContext'].get('identity', {}).get('sourceIp', '127.0.0.1'),
                        'userAgent': event['requestContext'].get('identity', {}).get('userAgent', 'unknown')
                    },
                    'requestId': event['requestContext'].get('requestId', 'unknown'),
                    'stage': event['requestContext'].get('stage', '$default'),
                    'time': event['requestContext'].get('requestTime', time.strftime('%d/%b/%Y:%H:%M:%S +0000', time.gmtime())),
                    'timeEpoch': event['requestContext'].get('requestTimeEpoch', int(time.time() * 1000))
                },
                'body': event.get('body', ''),
                'pathParameters': event.get('pathParameters', {}),
                'isBase64Encoded': event.get('isBase64Encoded', False)
            }
        else:
            # Use event as-is for other types
            processed_event = event
        
        # Extract request details
        if 'requestContext' in processed_event and 'http' in processed_event['requestContext']:
            http_method = processed_event['requestContext']['http']['method']
            path = processed_event['requestContext']['http']['path']
        else:
            http_method = processed_event.get('httpMethod', 'POST')
            path = processed_event.get('path', '/api/process-audio')
        
        logger.info(f"Processing request {request_id}: {http_method} {path}")
        
        # Log cache directory status
        logger.info(f"Cache directories status:")
        for cache_dir in ['/tmp/.cache/whisper', '/tmp/.cache/huggingface/hub', '/tmp/.cache/torch']:
            if os.path.exists(cache_dir):
                try:
                    files = os.listdir(cache_dir)
                    logger.info(f"  {cache_dir}: {files}")
                except Exception as e:
                    logger.info(f"  {cache_dir}: exists but cannot list contents - {e}")
            else:
                logger.info(f"  {cache_dir}: does not exist")
        
        # Send request start metric
        send_cloudwatch_metric('RequestStarted', 1, 'Count', {
            'Method': http_method,
            'Path': path.split('/')[-1] if path != '/' else 'root',
            'EventType': event_type
        })
        
        # Handle health check directly for better performance
        if path == '/health' or path == '/':
            return health_check()
        
        # Process the request through Mangum
        logger.info(f"Passing processed event to Mangum handler...")
        
        if callable(handler):
            response = handler(processed_event, context)
        else:
            raise Exception("Handler is not callable")
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # milliseconds
        
        # Determine if request was successful
        status_code = response.get('statusCode', 500)
        is_success = 200 <= status_code < 400
        
        # Send success metrics
        if is_success:
            send_cloudwatch_metric('APISuccess', 1, 'Count', {
                'Method': http_method,
                'StatusCode': str(status_code),
                'EventType': event_type
            })
        else:
            send_cloudwatch_metric('APIError', 1, 'Count', {
                'Method': http_method,
                'StatusCode': str(status_code),
                'EventType': event_type
            })
        
        # Send processing time metric
        send_cloudwatch_metric('ProcessingTime', processing_time, 'Milliseconds', {
            'Method': http_method,
            'Success': str(is_success),
            'EventType': event_type
        })
        
        # Track specific endpoints
        if '/emotion' in path or '/process-audio' in path:
            send_cloudwatch_metric('EmotionAnalysisRequests', 1, 'Count')
        elif '/speech' in path or '/transcribe' in path:
            send_cloudwatch_metric('SpeechToTextRequests', 1, 'Count')
        elif '/wellness' in path:
            send_cloudwatch_metric('WellnessRequests', 1, 'Count')
        elif '/health' in path:
            send_cloudwatch_metric('HealthCheckRequests', 1, 'Count')
        
        # Track memory usage if available
        if context and hasattr(context, 'memory_limit_in_mb'):
            send_cloudwatch_metric('MemoryLimit', float(context.memory_limit_in_mb), 'Megabytes')
        
        # Track remaining time
        if context and hasattr(context, 'get_remaining_time_in_millis'):
            remaining_time = context.get_remaining_time_in_millis()
            send_cloudwatch_metric('RemainingTime', float(remaining_time), 'Milliseconds')
        
        logger.info(f"Request {request_id} completed successfully in {processing_time:.2f}ms with status {status_code}")
        return response
        
    except Exception as e:
        # Calculate error time
        error_time = (time.time() - start_time) * 1000
        
        # Send error metrics
        send_cloudwatch_metric('APIError', 1, 'Count', {
            'Method': locals().get('http_method', 'UNKNOWN'),
            'ErrorType': type(e).__name__,
            'EventType': locals().get('event_type', 'unknown')
        })
        send_cloudwatch_metric('ErrorTime', error_time, 'Milliseconds')
        
        # Enhanced error logging
        logger.error(f"Request {request_id} failed after {error_time:.2f}ms: {str(e)}")
        logger.error(f"Event that caused the error: {json.dumps(event, default=str, indent=2)}")
        logger.error(f"Full error details:", exc_info=True)
        
        # Return error response
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e) if os.getenv('DEBUG') else 'An error occurred',
                'requestId': request_id,
                'errorType': type(e).__name__,
                'eventType': locals().get('event_type', 'unknown')
            })
        }

def health_check():
    """Simple health check with metrics and cache directory status"""
    send_cloudwatch_metric('HealthCheck', 1, 'Count')
    
    # Check cache directory status
    cache_status = {}
    for cache_dir in ['/tmp/.cache/whisper', '/tmp/.cache/huggingface/hub', '/tmp/.cache/torch']:
        cache_status[cache_dir] = {
            'exists': os.path.exists(cache_dir),
            'writable': os.access(cache_dir, os.W_OK) if os.path.exists(cache_dir) else False
        }
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'status': 'healthy',
            'timestamp': time.time(),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'version': '1.0.0',
            'cache_directories': cache_status,
            'environment_variables': {
                'WHISPER_CACHE': os.getenv('WHISPER_CACHE', 'not set'),
                'TRANSFORMERS_CACHE': os.getenv('TRANSFORMERS_CACHE', 'not set'),
                'HF_HOME': os.getenv('HF_HOME', 'not set'),
                'TORCH_HOME': os.getenv('TORCH_HOME', 'not set')
            }
        })
    }

# Create a simple test handler for debugging
def test_handler(event, context):
    """Simple test handler to verify basic functionality"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'message': 'Test handler working',
            'event_type': detect_event_type(event),
            'timestamp': time.time()
        })
    }