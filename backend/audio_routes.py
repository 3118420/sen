"""
Additional routes for audio file handling in API Gateway
Add these to your main.py or create as a separate module
"""

from fastapi import HTTPException, Response
from fastapi.responses import StreamingResponse
import os
import mimetypes
from pathlib import Path

# Add these routes to your main FastAPI app

@app.get("/api/audio/{file_id}")
async def get_audio_file(file_id: str):
    """
    Serve audio files by ID
    Route: GET /api/audio/{file_id}
    """
    try:
        # Define upload directory (use /tmp for Lambda)
        upload_dir = "/tmp" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "uploads"
        file_path = os.path.join(upload_dir, file_id)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Get file info
        file_size = os.path.getsize(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type or not mime_type.startswith('audio/'):
            mime_type = 'audio/mpeg'  # Default to MP3
        
        # Stream the file
        def file_generator():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    yield chunk
        
        return StreamingResponse(
            file_generator(),
            media_type=mime_type,
            headers={
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving audio file: {str(e)}")

@app.get("/api/audio/{file_id}/download")
async def download_audio_file(file_id: str):
    """
    Download audio files with proper headers
    Route: GET /api/audio/{file_id}/download
    """
    try:
        upload_dir = "/tmp" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "uploads"
        file_path = os.path.join(upload_dir, file_id)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        file_size = os.path.getsize(file_path)
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'
        
        def file_generator():
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    yield chunk
        
        return StreamingResponse(
            file_generator(),
            media_type=mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={file_id}",
                "Content-Length": str(file_size),
                "Access-Control-Allow-Origin": "*"
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading audio file: {str(e)}")

@app.delete("/api/audio/{file_id}")
async def delete_audio_file(file_id: str):
    """
    Delete audio files
    Route: DELETE /api/audio/{file_id}
    """
    try:
        upload_dir = "/tmp" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "uploads"
        file_path = os.path.join(upload_dir, file_id)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        os.remove(file_path)
        
        return {
            "message": "Audio file deleted successfully",
            "file_id": file_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting audio file: {str(e)}")

@app.get("/api/audio")
async def list_audio_files():
    """
    List available audio files
    Route: GET /api/audio
    """
    try:
        upload_dir = "/tmp" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "uploads"
        
        if not os.path.exists(upload_dir):
            return {"files": []}
        
        files = []
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            if os.path.isfile(file_path):
                file_size = os.path.getsize(file_path)
                mime_type, _ = mimetypes.guess_type(file_path)
                
                files.append({
                    "id": filename,
                    "name": filename,
                    "size": file_size,
                    "mime_type": mime_type,
                    "url": f"/api/audio/{filename}"
                })
        
        return {"files": files}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing audio files: {str(e)}")