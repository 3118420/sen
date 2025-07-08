#!/usr/bin/env python3
"""
Script to update API Gateway CORS settings via AWS CLI
Run this script to configure CORS settings for your API Gateway
"""

import subprocess
import json
import sys

# Configuration
API_ID = "1treu6p055"  # Your API Gateway ID
REGION = "us-east-1"
ALLOWED_ORIGINS = [
    "https://senlast-eeq6lptbo-mithranxos-projects.vercel.app",
    "https://senlast-*.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173"
]

def run_aws_command(command):
    """Run AWS CLI command and return result"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error running command: {command}")
            print(f"Error: {result.stderr}")
            return None
        return result.stdout
    except Exception as e:
        print(f"Exception running command: {e}")
        return None

def update_cors_configuration():
    """Update CORS configuration for API Gateway"""
    
    # Get current API configuration
    print("📋 Getting current API configuration...")
    api_info = run_aws_command(f"aws apigatewayv2 get-api --api-id {API_ID} --region {REGION}")
    
    if not api_info:
        print("❌ Failed to get API information")
        return False
    
    # Update CORS configuration
    cors_config = {
        "AllowCredentials": False,
        "AllowHeaders": [
            "Content-Type",
            "Authorization", 
            "X-Requested-With",
            "Accept",
            "Origin",
            "User-Agent"
        ],
        "AllowMethods": [
            "GET",
            "POST", 
            "PUT",
            "DELETE",
            "OPTIONS"
        ],
        "AllowOrigins": ["*"],  # Allow all origins for now
        "ExposeHeaders": [],
        "MaxAge": 86400
    }
    
    cors_json = json.dumps(cors_config)
    
    print("🔧 Updating CORS configuration...")
    update_result = run_aws_command(
        f"aws apigatewayv2 update-api --api-id {API_ID} --region {REGION} "
        f"--cors-configuration '{cors_json}'"
    )
    
    if update_result:
        print("✅ CORS configuration updated successfully!")
        return True
    else:
        print("❌ Failed to update CORS configuration")
        return False

def add_options_integration():
    """Add OPTIONS method integration for preflight requests"""
    
    print("🔧 Setting up OPTIONS method integration...")
    
    # Get routes
    routes_result = run_aws_command(f"aws apigatewayv2 get-routes --api-id {API_ID} --region {REGION}")
    
    if not routes_result:
        print("❌ Failed to get routes")
        return False
    
    routes = json.loads(routes_result)
    
    # Check if OPTIONS route exists
    options_route_exists = any(
        route.get('RouteKey') == 'OPTIONS /{proxy+}' 
        for route in routes.get('Items', [])
    )
    
    if not options_route_exists:
        print("➕ Creating OPTIONS route...")
        
        # Create mock integration for OPTIONS
        integration_result = run_aws_command(
            f"aws apigatewayv2 create-integration --api-id {API_ID} --region {REGION} "
            f"--integration-type MOCK --payload-format-version 2.0"
        )
        
        if integration_result:
            integration = json.loads(integration_result)
            integration_id = integration['IntegrationId']
            
            # Create OPTIONS route
            route_result = run_aws_command(
                f"aws apigatewayv2 create-route --api-id {API_ID} --region {REGION} "
                f"--route-key 'OPTIONS /{{proxy+}}' --target integrations/{integration_id}"
            )
            
            if route_result:
                print("✅ OPTIONS route created successfully!")
            else:
                print("❌ Failed to create OPTIONS route")
                return False
        else:
            print("❌ Failed to create integration")
            return False
    else:
        print("ℹ️ OPTIONS route already exists")
    
    return True

def main():
    """Main function"""
    print("🚀 Starting API Gateway CORS configuration...")
    print(f"API ID: {API_ID}")
    print(f"Region: {REGION}")
    print()
    
    # Check if AWS CLI is available
    aws_check = run_aws_command("aws --version")
    if not aws_check:
        print("❌ AWS CLI not found. Please install AWS CLI and configure credentials.")
        sys.exit(1)
    
    print("✅ AWS CLI found")
    
    # Update CORS configuration
    if not update_cors_configuration():
        print("❌ Failed to update CORS configuration")
        sys.exit(1)
    
    # Add OPTIONS integration
    if not add_options_integration():
        print("❌ Failed to set up OPTIONS integration")
        sys.exit(1)
    
    print()
    print("🎉 CORS configuration completed successfully!")
    print()
    print("📝 Next steps:")
    print("1. Deploy your Lambda function with updated CORS headers")
    print("2. Test the API endpoints from your frontend")
    print("3. Monitor CloudWatch logs for any remaining issues")
    print()
    print("🧪 Test your API:")
    print(f"curl -X OPTIONS https://{API_ID}.execute-api.{REGION}.amazonaws.com/prod/api/process-audio")

if __name__ == "__main__":
    main()