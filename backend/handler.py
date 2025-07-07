"""
Serverless Framework Handler for AWS Lambda with ML Model Caching
"""
import json
import os
import logging
from mangum import Mangum
from main import app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_lambda_cache_environment():
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
        
        logger.info("Lambda cache environment setup completed successfully")
        
    except Exception as e:
        logger.error(f"Error setting up Lambda cache environment: {e}")
        # Don't raise exception, let the handler continue

# Setup cache environment before importing the app
setup_lambda_cache_environment()

# Create the handler for serverless with binary media types
handler = Mangum(
    app, 
    lifespan="off",
    binary_media_types=[
        "audio/*",
        "application/octet-stream",
        "multipart/form-data"
    ]
)

def lambda_handler(event, context):
    """
    AWS Lambda handler function for serverless framework with enhanced caching
    """
    try:
        # Log cache directory status for debugging
        logger.info("Cache directory status:")
        for cache_dir in ['/tmp/.cache/whisper', '/tmp/.cache/huggingface/hub', '/tmp/.cache/torch']:
            exists = os.path.exists(cache_dir)
            writable = os.access(cache_dir, os.W_OK) if exists else False
            logger.info(f"  {cache_dir}: exists={exists}, writable={writable}")
        
        # Process the request
        return handler(event, context)
        
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}", exc_info=True)
        
        # Log additional debug info
        logger.error("Environment variables:")
        for key in ['WHISPER_CACHE', 'TRANSFORMERS_CACHE', 'HF_HOME', 'TORCH_HOME']:
            logger.error(f"  {key}: {os.getenv(key, 'not set')}")
        
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
                'requestId': getattr(context, 'aws_request_id', 'unknown')
            })
        }