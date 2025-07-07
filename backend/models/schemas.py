from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class HealthResponse(BaseModel):
    message: str
    status: str
    version: str

class TranscriptRequest(BaseModel):
    audio_file_path: str
    language_code: Optional[str] = None
    auto_detect: Optional[bool] = True

class TranscriptResponse(BaseModel):
    transcript: str
    original_transcript: Optional[str] = None
    language: str
    language_name: Optional[str] = None
    is_south_indian_language: Optional[bool] = False
    confidence: float
    processing_time: float
    detected_language_info: Optional[Dict[str, Any]] = None

class SentimentRequest(BaseModel):
    text: str
    language: Optional[str] = None

class SentimentScores(BaseModel):
    positive: float
    negative: float
    neutral: float

class EmotionAnalysis(BaseModel):
    primary_emotion: str
    emotion_scores: Dict[str, float]
    confidence: float
    category: str  # positive, negative, neutral
    intensity: str  # low, medium, high
    top_emotions: Optional[List[Dict[str, Any]]] = None

class SentimentResponse(BaseModel):
    sentiment: str  # "positive", "negative", "neutral"
    confidence: float
    scores: SentimentScores
    processing_time: Optional[float] = 0.0
    language: Optional[str] = None
    language_name: Optional[str] = None
    method: Optional[str] = None
    emotions: Optional[EmotionAnalysis] = None

class AudioUploadResponse(BaseModel):
    message: str
    filename: str
    file_path: str
    file_size: int

class AudioProcessResponse(BaseModel):
    transcript: str
    original_transcript: Optional[str] = None
    transcript_confidence: float
    language: str
    language_name: Optional[str] = None
    is_south_indian_language: Optional[bool] = False
    sentiment: str
    sentiment_confidence: float
    sentiment_scores: SentimentScores
    processing_time: float
    detected_language_info: Optional[Dict[str, Any]] = None
    sentiment_method: Optional[str] = None
    emotions: Optional[EmotionAnalysis] = None

class LanguageDetectionResponse(BaseModel):
    detected_language: str
    confidence: float
    language_name: str
    is_south_indian: bool
    top_languages: Dict[str, float]

class SupportedLanguagesResponse(BaseModel):
    speech_to_text: Dict[str, Any]
    sentiment_analysis: Dict[str, Any]

class ErrorResponse(BaseModel):
    error: str
    detail: str
    timestamp: datetime

class AudioFileInfo(BaseModel):
    filename: str
    duration: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    format: Optional[str] = None
    language: Optional[str] = None
    is_south_indian_language: Optional[bool] = False

class ModelInfo(BaseModel):
    speech_to_text: Dict[str, Any]
    sentiment_analysis: Dict[str, Any]
    audio_processor: Dict[str, Any]

class LanguageSupport(BaseModel):
    code: str
    name: str
    script: Optional[str] = None
    enhanced_support: bool = False
    confidence_threshold: Optional[float] = None

class EmotionInfo(BaseModel):
    emotion: str
    score: float
    category: str
    intensity: str

class PreciseEmotionsResponse(BaseModel):
    supported_emotions: List[str]
    emotion_categories: Dict[str, List[str]]
    intensity_levels: List[str]
    models_loaded: Dict[str, bool]