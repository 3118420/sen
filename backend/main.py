from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
# Make dotenv optional - only load if available (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not available (e.g., in Lambda), skip loading .env file
    pass

from models.schemas import AudioProcessResponse, HealthResponse, LanguageDetectionResponse, SupportedLanguagesResponse, PreciseEmotionsResponse
from services.speech_to_text import SpeechToTextService
from services.sentiment_analysis import SentimentAnalysisService
from utils.audio_processing import AudioProcessor
from cloudwatch_endpoint import router as cloudwatch_router
from mangum import Mangum
import os
from typing import Optional
# uvicorn is only needed for local development
try:
    import uvicorn
except ImportError:
    uvicorn = None

# Create FastAPI app
app = FastAPI(
    title="Speech-to-Text Sentiment Analysis API",
    description="API for converting speech to text and analyzing sentiment with South Indian language support and precise emotion detection",
    version="3.0.0"
)

# CORS setup for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React (Create React App)
        "http://localhost:5173",  # Vite (React/Vue)
        "http://localhost:8080",  # Vue CLI
        "http://127.0.0.1:3000",  # Alternative localhost
        "http://127.0.0.1:5173",  # Alternative localhost
        "https://*.vercel.app",   # Vercel deployments
        "https://*.netlify.app",  # Netlify deployments
        "https://enhanced-ai-companion.vercel.app",  # Your Vercel domain
        "https://enhanced-ai-companion-*.vercel.app",  # Preview deployments
        "*"  # Allow all origins for now
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include CloudWatch metrics router
app.include_router(cloudwatch_router)

# Initialize services
stt_service = SpeechToTextService()
sentiment_service = SentimentAnalysisService()
audio_processor = AudioProcessor()

# Create upload directory (use /tmp for Lambda)
UPLOAD_DIR = "/tmp" if os.environ.get("AWS_LAMBDA_FUNCTION_NAME") else "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- Endpoints ---

@app.get("/", response_model=HealthResponse)
async def root():
    return HealthResponse(
        message="Speech-to-Text Sentiment Analysis API with South Indian language support and precise emotion detection is running!",
        status="healthy",
        version="3.0.0"
    )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        message="API is healthy",
        status="healthy",
        version="3.0.0"
    )

@app.get("/api/supported-languages")
async def get_supported_languages():
    """Get list of supported languages for transcription and sentiment analysis"""
    stt_info = stt_service.get_model_info()
    sentiment_info = sentiment_service.get_analyzer_info()
    
    return {
        "speech_to_text": {
            "all_languages": stt_info["supported_languages"],
            "south_indian_languages": stt_info["south_indian_languages"],
            "enhanced_support": list(stt_info["south_indian_languages"].keys())
        },
        "sentiment_analysis": {
            "supported_languages": sentiment_service.get_supported_languages(),
            "south_indian_languages": sentiment_info["supported_south_indian_languages"],
            "multilingual_support": sentiment_info["multilingual_support"]
        }
    }

@app.get("/api/supported-emotions")
async def get_supported_emotions():
    """Get list of all 23 supported precise emotions"""
    emotion_info = sentiment_service.get_analyzer_info()["emotion_analysis"]
    
    return PreciseEmotionsResponse(
        supported_emotions=emotion_info["supported_emotions"],
        emotion_categories=emotion_info["emotion_categories"],
        intensity_levels=emotion_info["intensity_levels"],
        models_loaded=emotion_info["models_loaded"]
    )

@app.post("/api/detect-language")
async def detect_language(audio_file: UploadFile = File(...)):
    """Detect the language of an audio file"""
    try:
        file_path = os.path.join(UPLOAD_DIR, f"detect_{audio_file.filename}")
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        detection_result = stt_service.detect_language(file_path)
        os.remove(file_path)
        
        return {
            "detected_language": detection_result["language"],
            "confidence": detection_result["confidence"],
            "language_name": stt_service.supported_south_indian_languages.get(
                detection_result["language"], 
                detection_result["language"].upper()
            ),
            "is_south_indian": detection_result["language"] in stt_service.supported_south_indian_languages,
            "top_languages": detection_result["all_probabilities"]
        }
    except Exception as e:
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error detecting language: {str(e)}")

@app.post("/api/upload-audio")
async def upload_audio(audio_file: UploadFile = File(...)):
    try:
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="File must be an audio file")
        file_path = os.path.join(UPLOAD_DIR, audio_file.filename)
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        return {
            "message": "File uploaded successfully",
            "filename": audio_file.filename,
            "file_path": file_path,
            "file_size": len(content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@app.post("/api/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language: Optional[str] = Query(None, description="Language code (e.g., 'ta', 'te', 'kn', 'ml', 'en')"),
    auto_detect: bool = Query(True, description="Auto-detect language if not specified")
):
    """Transcribe audio with optional language specification"""
    try:
        file_path = os.path.join(UPLOAD_DIR, f"temp_{audio_file.filename}")
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        transcript = await stt_service.transcribe_audio(
            file_path, 
            language_code=language,
            auto_detect=auto_detect
        )
        os.remove(file_path)
        
        return {
            "transcript": transcript["text"],
            "original_transcript": transcript.get("original_text", transcript["text"]),
            "language": transcript["language"],
            "language_name": transcript.get("language_name", "Unknown"),
            "is_south_indian_language": transcript.get("is_south_indian_language", False),
            "confidence": transcript.get("confidence", 0.0),
            "processing_time": transcript.get("processing_time", 0.0),
            "detected_language_info": transcript.get("detected_language_info")
        }
    except Exception as e:
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error transcribing audio: {str(e)}")

@app.post("/api/analyze-sentiment")
async def analyze_sentiment(
    text_data: dict,
    language: Optional[str] = Query(None, description="Language code for better sentiment analysis")
):
    """Analyze sentiment with optional language specification and precise emotions"""
    try:
        if "text" not in text_data:
            raise HTTPException(status_code=400, detail="Text field is required")
        
        result = await sentiment_service.analyze_sentiment(
            text_data["text"], 
            language=language
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sentiment: {str(e)}")

@app.post("/api/process-audio", response_model=AudioProcessResponse)
async def process_audio_complete(
    audio_file: UploadFile = File(...),
    language: Optional[str] = Query(None, description="Language code (e.g., 'ta', 'te', 'kn', 'ml', 'en')"),
    auto_detect: bool = Query(True, description="Auto-detect language if not specified")
):
    """Process audio with transcription and sentiment analysis including precise emotions"""
    try:
        file_path = os.path.join(UPLOAD_DIR, f"temp_{audio_file.filename}")
        with open(file_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)

        # Transcribe with language support
        transcript_result = await stt_service.transcribe_audio(
            file_path, 
            language_code=language,
            auto_detect=auto_detect
        )
        
        # Analyze sentiment with detected/specified language
        detected_language = transcript_result.get("language", language)
        sentiment_result = await sentiment_service.analyze_sentiment(
            transcript_result["text"], 
            language=detected_language
        )
        
        os.remove(file_path)

        # Extract emotion data for response
        emotions = sentiment_result.get("emotions", {})
        
        return AudioProcessResponse(
            transcript=transcript_result["text"],
            original_transcript=transcript_result.get("original_text", transcript_result["text"]),
            transcript_confidence=transcript_result.get("confidence", 0.0),
            language=detected_language,
            language_name=transcript_result.get("language_name", "Unknown"),
            is_south_indian_language=transcript_result.get("is_south_indian_language", False),
            sentiment=sentiment_result["sentiment"],
            sentiment_confidence=sentiment_result["confidence"],
            sentiment_scores=sentiment_result["scores"],
            processing_time=transcript_result.get("processing_time", 0.0) + sentiment_result.get("processing_time", 0.0),
            detected_language_info=transcript_result.get("detected_language_info"),
            sentiment_method=sentiment_result.get("method", "unknown"),
            emotions=emotions
        )
    except Exception as e:
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

@app.get("/api/model-info")
async def get_model_info():
    """Get information about loaded models and capabilities"""
    return {
        "speech_to_text": stt_service.get_model_info(),
        "sentiment_analysis": sentiment_service.get_analyzer_info(),
        "audio_processor": {
            "supported_formats": audio_processor.get_supported_formats(),
            "target_sample_rate": audio_processor.target_sample_rate
        }
    }

# Create Mangum handler for AWS Lambda
handler = Mangum(app, lifespan="off")

# --- Main entry point for local development ---
if __name__ == "__main__":
    if uvicorn is not None:
        uvicorn.run(
            "main:app",
            host="127.0.0.1",  # Use this for local testing
            port=8000,
            reload=True
        )
    else:
        print("uvicorn not available - this is expected in Lambda environment")