"""
CloudWatch Metrics Endpoint for Frontend Integration
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import boto3
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Initialize CloudWatch client
try:
    cloudwatch = boto3.client('cloudwatch')
except Exception as e:
    logger.error(f"Failed to initialize CloudWatch client: {e}")
    cloudwatch = None

router = APIRouter()

class MetricData(BaseModel):
    value: float
    dimensions: Dict[str, str] = {}
    timestamp: datetime = None
    unit: str = "Count"

class MetricsRequest(BaseModel):
    metrics: Dict[str, MetricData]
    source: str = "frontend"
    timestamp: str = None

@router.post("/api/metrics")
async def receive_metrics(request: MetricsRequest):
    """
    Receive metrics from frontend and send to CloudWatch
    """
    if not cloudwatch:
        raise HTTPException(status_code=503, detail="CloudWatch not available")
    
    try:
        metric_data = []
        
        for metric_name, metric_info in request.metrics.items():
            # Prepare metric data for CloudWatch
            metric_entry = {
                'MetricName': metric_name,
                'Value': metric_info.value,
                'Unit': metric_info.unit,
                'Timestamp': metric_info.timestamp or datetime.utcnow()
            }
            
            # Add dimensions if provided
            if metric_info.dimensions:
                metric_entry['Dimensions'] = [
                    {'Name': key, 'Value': str(value)} 
                    for key, value in metric_info.dimensions.items()
                ]
            
            # Add source dimension
            if 'Dimensions' not in metric_entry:
                metric_entry['Dimensions'] = []
            metric_entry['Dimensions'].append({
                'Name': 'Source',
                'Value': request.source
            })
            
            metric_data.append(metric_entry)
        
        # Send metrics to CloudWatch in batches (max 20 per request)
        batch_size = 20
        for i in range(0, len(metric_data), batch_size):
            batch = metric_data[i:i + batch_size]
            
            cloudwatch.put_metric_data(
                Namespace='VoiceInsight',
                MetricData=batch
            )
        
        logger.info(f"Successfully sent {len(metric_data)} metrics to CloudWatch from {request.source}")
        
        return {
            "status": "success",
            "metrics_sent": len(metric_data),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending metrics to CloudWatch: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send metrics: {str(e)}")

@router.get("/api/metrics/status")
async def get_metrics_status():
    """
    Get CloudWatch metrics status
    """
    return {
        "cloudwatch_available": cloudwatch is not None,
        "namespace": "VoiceInsight",
        "timestamp": datetime.utcnow().isoformat()
    }