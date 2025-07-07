from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import time
from typing import Dict, Any, Optional
import torch
import re
from .enhanced_emotion_analysis import EnhancedEmotionAnalysisService

class SentimentAnalysisService:
    def __init__(self, method: str = "transformers"):
        """
        Initialize sentiment analysis service with enhanced emotion analysis
        
        Args:
            method: "transformers", "textblob", or "vader"
        """
        self.method = method
        self.analyzer = None
        self.multilingual_analyzer = None
        self.emotion_service = EnhancedEmotionAnalysisService()
        self.south_indian_languages = {
            'ta': 'Tamil',
            'te': 'Telugu', 
            'kn': 'Kannada',
            'ml': 'Malayalam'
        }
        self._load_analyzer()
    
    def _load_analyzer(self):
        """Load the sentiment analysis model/analyzer"""
        try:
            if self.method == "transformers":
                print("Loading transformer models for sentiment analysis...")
                
                # Primary English model
                model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
                self.analyzer = pipeline(
                    "sentiment-analysis",
                    model=model_name,
                    tokenizer=model_name,
                    device=0 if torch.cuda.is_available() else -1
                )
                
                # Multilingual model for better cross-language support
                try:
                    multilingual_model = "cardiffnlp/twitter-xlm-roberta-base-sentiment"
                    self.multilingual_analyzer = pipeline(
                        "sentiment-analysis",
                        model=multilingual_model,
                        tokenizer=multilingual_model,
                        device=0 if torch.cuda.is_available() else -1
                    )
                    print("Multilingual sentiment model loaded successfully!")
                except Exception as e:
                    print(f"Could not load multilingual model: {e}")
                    print("Will use English model with translation fallback")
                
                print("Transformer models loaded successfully!")
                
            elif self.method == "vader":
                print("Loading VADER sentiment analyzer...")
                self.analyzer = SentimentIntensityAnalyzer()
                print("VADER analyzer loaded successfully!")
                
            elif self.method == "textblob":
                print("Using TextBlob for sentiment analysis...")
                self.analyzer = "textblob"
                print("TextBlob ready!")
                
        except Exception as e:
            print(f"Error loading sentiment analyzer: {e}")
            # Fallback to VADER if transformers fail
            if self.method == "transformers":
                print("Falling back to VADER...")
                self.method = "vader"
                self.analyzer = SentimentIntensityAnalyzer()
    
    def _detect_language(self, text: str) -> str:
        """
        Simple language detection based on script
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected language code
        """
        if not text:
            return "en"
        
        # Check for South Indian language scripts
        if re.search(r'[\u0B80-\u0BFF]', text):  # Tamil
            return "ta"
        elif re.search(r'[\u0C00-\u0C7F]', text):  # Telugu
            return "te"
        elif re.search(r'[\u0C80-\u0CFF]', text):  # Kannada
            return "kn"
        elif re.search(r'[\u0D00-\u0D7F]', text):  # Malayalam
            return "ml"
        elif re.search(r'[\u0900-\u097F]', text):  # Devanagari (Hindi)
            return "hi"
        else:
            return "en"  # Default to English
    
    def _translate_to_english(self, text: str, source_language: str) -> str:
        """
        Simple translation approach for sentiment analysis
        Note: In production, you might want to use Google Translate API or similar
        
        Args:
            text: Text to translate
            source_language: Source language code
            
        Returns:
            Translated text (or original if translation not available)
        """
        # For now, return original text as Whisper often provides transliterated text
        # In a production environment, you would integrate with translation services
        
        # Basic transliteration cleanup for better sentiment analysis
        if source_language in self.south_indian_languages:
            # Remove common transliteration artifacts
            text = re.sub(r'[^\w\s]', ' ', text)  # Remove special characters
            text = ' '.join(text.split())  # Normalize whitespace
        
        return text
    
    def _analyze_south_indian_sentiment(self, text: str, language: str) -> Dict[str, Any]:
        """
        Analyze sentiment for South Indian languages using multiple approaches
        
        Args:
            text: Text to analyze
            language: Language code
            
        Returns:
            Sentiment analysis results
        """
        results = []
        
        # Approach 1: Use multilingual model if available
        if self.multilingual_analyzer:
            try:
                result = self.multilingual_analyzer(text)[0]
                multilingual_result = self._normalize_transformer_result(result)
                multilingual_result["method"] = "multilingual_transformer"
                results.append(multilingual_result)
            except Exception as e:
                print(f"Multilingual analysis failed: {e}")
        
        # Approach 2: Translate and analyze with English model
        try:
            translated_text = self._translate_to_english(text, language)
            if translated_text != text or language == "en":
                english_result = self._analyze_with_transformers(translated_text)
                english_result["method"] = "english_transformer"
                english_result["translated_text"] = translated_text
                results.append(english_result)
        except Exception as e:
            print(f"English translation analysis failed: {e}")
        
        # Approach 3: VADER as fallback (works reasonably with transliterated text)
        try:
            vader_result = self._analyze_with_vader(text)
            vader_result["method"] = "vader_fallback"
            results.append(vader_result)
        except Exception as e:
            print(f"VADER analysis failed: {e}")
        
        # Combine results using weighted average
        if results:
            return self._combine_sentiment_results(results, language)
        else:
            # Ultimate fallback
            return {
                "sentiment": "neutral",
                "confidence": 0.5,
                "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34},
                "method": "fallback",
                "language": language
            }
    
    def _combine_sentiment_results(self, results: list, language: str) -> Dict[str, Any]:
        """
        Combine multiple sentiment analysis results
        
        Args:
            results: List of sentiment analysis results
            language: Language code
            
        Returns:
            Combined sentiment result
        """
        if not results:
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "scores": {"positive": 0.33, "negative": 0.33, "neutral": 0.34}
            }
        
        if len(results) == 1:
            return results[0]
        
        # Weight different methods
        weights = {
            "multilingual_transformer": 0.5,
            "english_transformer": 0.3,
            "vader_fallback": 0.2
        }
        
        # Calculate weighted averages
        weighted_scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
        total_weight = 0.0
        sentiment_votes = {"positive": 0, "negative": 0, "neutral": 0}
        
        for result in results:
            method = result.get("method", "unknown")
            weight = weights.get(method, 0.1)
            total_weight += weight
            
            # Weight the scores
            for sentiment_type in weighted_scores:
                weighted_scores[sentiment_type] += result["scores"][sentiment_type] * weight
            
            # Count sentiment votes
            sentiment_votes[result["sentiment"]] += weight
        
        # Normalize weighted scores
        if total_weight > 0:
            for sentiment_type in weighted_scores:
                weighted_scores[sentiment_type] /= total_weight
        
        # Determine final sentiment
        final_sentiment = max(sentiment_votes, key=sentiment_votes.get)
        final_confidence = weighted_scores[final_sentiment]
        
        return {
            "sentiment": final_sentiment,
            "confidence": final_confidence,
            "scores": weighted_scores,
            "method": "combined",
            "language": language,
            "individual_results": results
        }
    
    async def analyze_sentiment(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze sentiment of the given text with enhanced emotion analysis
        
        Args:
            text: Text to analyze
            language: Optional language code
            
        Returns:
            Dictionary containing sentiment analysis results with precise emotions
        """
        if not text or not text.strip():
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "scores": {
                    "positive": 0.0,
                    "negative": 0.0,
                    "neutral": 1.0
                },
                "processing_time": 0.0,
                "language": language or "unknown",
                "emotions": {
                    "primary_emotion": "mildness",
                    "emotion_scores": {},
                    "confidence": 0.0,
                    "category": "neutral",
                    "intensity": "low"
                }
            }
        
        start_time = time.time()
        
        try:
            # Detect language if not provided
            if not language:
                language = self._detect_language(text)
            
            # Perform basic sentiment analysis
            if language in self.south_indian_languages:
                sentiment_result = self._analyze_south_indian_sentiment(text, language)
            else:
                # Use standard analysis for English and other languages
                if self.method == "transformers":
                    sentiment_result = self._analyze_with_transformers(text)
                elif self.method == "vader":
                    sentiment_result = self._analyze_with_vader(text)
                elif self.method == "textblob":
                    sentiment_result = self._analyze_with_textblob(text)
                else:
                    raise ValueError(f"Unknown sentiment analysis method: {self.method}")
            
            # Perform enhanced emotion analysis
            emotion_result = await self.emotion_service.analyze_emotions(text, language)
            
            # Combine results
            result = {
                **sentiment_result,
                "processing_time": time.time() - start_time,
                "language": language,
                "language_name": self.south_indian_languages.get(language, language.upper()),
                "emotions": emotion_result
            }
            
            return result
            
        except Exception as e:
            # Fallback to simple analysis
            print(f"Error in sentiment analysis: {e}")
            return {
                "sentiment": "neutral",
                "confidence": 0.0,
                "scores": {
                    "positive": 0.0,
                    "negative": 0.0,
                    "neutral": 1.0
                },
                "processing_time": time.time() - start_time,
                "language": language or "unknown",
                "error": str(e),
                "emotions": {
                    "primary_emotion": "mildness",
                    "emotion_scores": {},
                    "confidence": 0.0,
                    "category": "neutral",
                    "intensity": "low"
                }
            }
    
    def _normalize_transformer_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize transformer result to standard format"""
        # Map labels to standard format
        label_map = {
            "LABEL_0": "negative",  # RoBERTa
            "LABEL_1": "neutral",
            "LABEL_2": "positive",
            "NEGATIVE": "negative",  # Other models
            "NEUTRAL": "neutral",
            "POSITIVE": "positive"
        }
        
        sentiment = label_map.get(result["label"], result["label"].lower())
        confidence = result["score"]
        
        # Create scores dictionary
        scores = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
        scores[sentiment] = confidence
        
        # Distribute remaining confidence
        remaining = 1.0 - confidence
        other_sentiments = [s for s in scores.keys() if s != sentiment]
        for other in other_sentiments:
            scores[other] = remaining / len(other_sentiments)
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "scores": scores
        }
    
    def _analyze_with_transformers(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using transformers pipeline"""
        result = self.analyzer(text)[0]
        return self._normalize_transformer_result(result)
    
    def _analyze_with_vader(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using VADER"""
        scores = self.analyzer.polarity_scores(text)
        
        # Determine primary sentiment
        if scores['compound'] >= 0.05:
            sentiment = "positive"
            confidence = scores['pos']
        elif scores['compound'] <= -0.05:
            sentiment = "negative"
            confidence = scores['neg']
        else:
            sentiment = "neutral"
            confidence = scores['neu']
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "scores": {
                "positive": scores['pos'],
                "negative": scores['neg'],
                "neutral": scores['neu']
            }
        }
    
    def _analyze_with_textblob(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment using TextBlob"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        # Convert polarity to sentiment and confidence
        if polarity > 0.1:
            sentiment = "positive"
            confidence = min(1.0, polarity)
        elif polarity < -0.1:
            sentiment = "negative"
            confidence = min(1.0, abs(polarity))
        else:
            sentiment = "neutral"
            confidence = 1.0 - abs(polarity)
        
        # Create normalized scores
        pos_score = max(0.0, polarity)
        neg_score = max(0.0, -polarity)
        neu_score = 1.0 - abs(polarity)
        
        # Normalize scores to sum to 1
        total = pos_score + neg_score + neu_score
        if total > 0:
            pos_score /= total
            neg_score /= total
            neu_score /= total
        
        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "scores": {
                "positive": pos_score,
                "negative": neg_score,
                "neutral": neu_score
            }
        }
    
    def get_analyzer_info(self) -> Dict[str, Any]:
        """Get information about the current analyzer"""
        emotion_info = self.emotion_service.get_analyzer_info()
        
        return {
            "method": self.method,
            "analyzer_loaded": self.analyzer is not None,
            "multilingual_support": self.multilingual_analyzer is not None,
            "supported_south_indian_languages": self.south_indian_languages,
            "supports_confidence": True,
            "supports_scores": True,
            "emotion_analysis": emotion_info,
            "features": [
                "Multi-language support",
                "South Indian language optimization",
                "Combined analysis methods",
                "Language detection",
                "Confidence scoring",
                "23 precise emotions",
                "Enhanced emotion accuracy",
                "Context-aware analysis"
            ]
        }
    
    def change_method(self, method: str):
        """Change the sentiment analysis method"""
        if method != self.method:
            self.method = method
            self._load_analyzer()
    
    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return {
            **self.south_indian_languages,
            "en": "English",
            "hi": "Hindi",
            "auto": "Auto-detect"
        }
    
    def get_supported_emotions(self) -> Dict[str, Dict[str, str]]:
        """Get list of supported emotions"""
        return self.emotion_service.get_supported_emotions()