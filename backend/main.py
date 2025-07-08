from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import tempfile
import logging
from typing import Optional

from services.speech_to_text import transcribe_audio
from services.enhanced_emotion_analysis import analyze_emotion_enhanced
from services.sentiment_analysis import analyze_sentiment
from models.schemas import AudioProcessingResponse, HealthResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Voice Emotion Analysis API",
    description="API for processing audio files and analyzing emotions",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", message="API is running")

@app.post("/process-audio", response_model=AudioProcessingResponse)
async def process_audio(
    audio_file: UploadFile = File(...),
    language: Optional[str] = Form("en")
):
    """
    Process audio file and return transcription with emotion analysis
    """
    try:
        logger.info(f"Processing audio file: {audio_file.filename}")
        
        # Validate file type
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid file type. Please upload an audio file.")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Transcribe audio
            transcription = transcribe_audio(temp_file_path, language)
            
            if not transcription:
                raise HTTPException(status_code=400, detail="Could not transcribe audio. Please try again.")
            
            # Analyze emotions
            emotion_analysis = analyze_emotion_enhanced(transcription)
            
            # Analyze sentiment
            sentiment_analysis = analyze_sentiment(transcription)
            
            response = AudioProcessingResponse(
                transcription=transcription,
                emotion_analysis=emotion_analysis,
                sentiment_analysis=sentiment_analysis
            )
            
            logger.info("Audio processing completed successfully")
            return response
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)