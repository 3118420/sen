# app/__init__.py
"""
Speech-to-Text Sentiment Analysis API

A FastAPI-based service for converting speech to text and analyzing sentiment.
"""

__version__ = "1.0.0"
__author__ = "Your Name"
__description__ = "Speech-to-Text Sentiment Analysis API"

# app/services/__init__.py
"""
Services module for speech-to-text and sentiment analysis functionality.
"""

from .speech_to_text import SpeechToTextService
from .sentiment_analysis import SentimentAnalysisService

__all__ = ["SpeechToTextService", "SentimentAnalysisService"]

# app/models/__init__.py
"""
Data models and schemas for the API.
"""

from .schemas import (
    HealthResponse,
    TranscriptResponse,
    SentimentResponse,
    AudioProcessResponse,
    SentimentScores
)

__all__ = [
    "HealthResponse",
    "TranscriptResponse", 
    "SentimentResponse",
    "AudioProcessResponse",
    "SentimentScores"
]

# app/utils/__init__.py
"""
Utility functions and classes.
"""

from .audio_processing import AudioProcessor

__all__ = ["AudioProcessor"]

# app/routes/__init__.py
"""
API routes module.
"""

# This file can be empty for now since we're keeping routes in main.py
# In a larger application, you would organize routes here like:
# from .audio import router as audio_router
# from .sentiment import router as sentiment_router