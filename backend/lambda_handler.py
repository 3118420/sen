"""
AWS Lambda Handler with Enhanced CloudWatch Integration
Optimized for Speech-to-Text Sentiment Analysis API
"""
import json
import time
import boto3
from mangum import Mangum
from main import app
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
        
        logger.info("Lambda environment setup completed successfully")
        
    except Exception as e:
        logger.error(f"Error setting up Lambda environment: {e}")
        # Don't raise exception, let the handler continue

# Setup environment before initializing other components
setup_lambda_environment()

# Initialize AWS clients
try:
    cloudwatch = boto3.client('cloudwatch')
    logger.info("CloudWatch client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize CloudWatch client: {e}")
    cloudwatch = None

# Create Lambda handler with binary media types for audio files
handler = Mangum(
    app,
    lifespan="off"  # Disable lifespan for Lambda

)

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

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AWS Lambda handler with comprehensive monitoring and ML model caching
    """
    start_time = time.time()
    request_id = context.aws_request_id if context else 'unknown'
    
    # Extract request details
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'UNKNOWN'))
    path = event.get('path', event.get('rawPath', 'UNKNOWN'))
    
    logger.info(f"Processing request {request_id}: {http_method} {path}")
    
    # Log cache directory status
    logger.info(f"Cache directories status:")
    for cache_dir in ['/tmp/.cache/whisper', '/tmp/.cache/huggingface/hub', '/tmp/.cache/torch']:
        exists = os.path.exists(cache_dir)
        logger.info(f"  {cache_dir}: {'exists' if exists else 'missing'}")
    
    # Send request start metric
    send_cloudwatch_metric('RequestStarted', 1, 'Count', {
        'Method': http_method,
        'Path': path.split('/')[-1] if path != 'UNKNOWN' else 'unknown'
    })
    
    try:
        # Process the request
        response = handler(event, context)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # milliseconds
        
        # Determine if request was successful
        status_code = response.get('statusCode', 500)
        is_success = 200 <= status_code < 400
        
        # Send success metrics
        if is_success:
            send_cloudwatch_metric('APISuccess', 1, 'Count', {
                'Method': http_method,
                'StatusCode': str(status_code)
            })
        else:
            send_cloudwatch_metric('APIError', 1, 'Count', {
                'Method': http_method,
                'StatusCode': str(status_code)
            })
        
        # Send processing time metric
        send_cloudwatch_metric('ProcessingTime', processing_time, 'Milliseconds', {
            'Method': http_method,
            'Success': str(is_success)
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
            'Method': http_method,
            'ErrorType': type(e).__name__
        })
        send_cloudwatch_metric('ErrorTime', error_time, 'Milliseconds')
        
        # Log error details with cache directory status
        logger.error(f"Request {request_id} failed after {error_time:.2f}ms: {str(e)}")
        logger.error(f"Cache directory contents:")
        try:
            for cache_dir in ['/tmp/.cache/whisper', '/tmp/.cache/huggingface/hub']:
                if os.path.exists(cache_dir):
                    files = os.listdir(cache_dir)
                    logger.error(f"  {cache_dir}: {files}")
                else:
                    logger.error(f"  {cache_dir}: does not exist")
        except Exception as cache_error:
            logger.error(f"Error checking cache directories: {cache_error}")
        
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
                'requestId': request_id
            })
        }

# Health check endpoint for Lambda
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