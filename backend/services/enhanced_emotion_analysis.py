import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import time
from typing import Dict, Any, Optional, List
import re
import numpy as np
from textblob import TextBlob
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedEmotionAnalysisService:
    def __init__(self):
        """
        Initialize enhanced emotion analysis service with improved accuracy
        """
        self.emotion_analyzer = None
        self.backup_analyzer = None
        self.text_analyzer = None
        
        # Enhanced 23 precise emotions with better mapping
        self.precise_emotions = {
            'anxious': {'category': 'negative', 'intensity': 'medium', 'keywords': ['worried', 'nervous', 'uneasy', 'concerned', 'restless', 'tense']},
            'angry': {'category': 'negative', 'intensity': 'high', 'keywords': ['furious', 'mad', 'rage', 'outraged', 'livid', 'irritated']},
            'sad': {'category': 'negative', 'intensity': 'medium', 'keywords': ['depressed', 'down', 'blue', 'melancholy', 'sorrowful', 'dejected']},
            'happy': {'category': 'positive', 'intensity': 'high', 'keywords': ['joyful', 'cheerful', 'delighted', 'elated', 'ecstatic', 'pleased']},
            'hate': {'category': 'negative', 'intensity': 'high', 'keywords': ['despise', 'loathe', 'detest', 'abhor', 'resent']},
            'satisfaction': {'category': 'positive', 'intensity': 'medium', 'keywords': ['content', 'pleased', 'fulfilled', 'gratified']},
            'gratitude': {'category': 'positive', 'intensity': 'medium', 'keywords': ['thankful', 'appreciate', 'blessed', 'grateful']},
            'reproach': {'category': 'negative', 'intensity': 'medium', 'keywords': ['blame', 'criticize', 'condemn', 'disapprove']},
            'distress': {'category': 'negative', 'intensity': 'high', 'keywords': ['troubled', 'anguished', 'tormented', 'suffering']},
            'pride': {'category': 'positive', 'intensity': 'medium', 'keywords': ['proud', 'accomplished', 'successful', 'confident']},
            'fear': {'category': 'negative', 'intensity': 'high', 'keywords': ['afraid', 'scared', 'terrified', 'frightened', 'fearful']},
            'mildness': {'category': 'neutral', 'intensity': 'low', 'keywords': ['calm', 'peaceful', 'gentle', 'mild', 'serene']},
            'pity': {'category': 'negative', 'intensity': 'low', 'keywords': ['sympathy', 'compassion', 'sorry for', 'feel bad']},
            'boredom': {'category': 'neutral', 'intensity': 'low', 'keywords': ['bored', 'dull', 'tedious', 'monotonous', 'uninteresting']},
            'shame': {'category': 'negative', 'intensity': 'medium', 'keywords': ['ashamed', 'embarrassed', 'humiliated', 'guilty']},
            'disappointment': {'category': 'negative', 'intensity': 'medium', 'keywords': ['disappointed', 'let down', 'frustrated', 'disillusioned']},
            'hope': {'category': 'positive', 'intensity': 'medium', 'keywords': ['hopeful', 'optimistic', 'confident', 'expecting']},
            'resentment': {'category': 'negative', 'intensity': 'medium', 'keywords': ['resentful', 'bitter', 'grudge', 'indignant']},
            'love': {'category': 'positive', 'intensity': 'high', 'keywords': ['love', 'adore', 'cherish', 'treasure', 'devoted']},
            'gloating': {'category': 'negative', 'intensity': 'low', 'keywords': ['gloating', 'smug', 'self-satisfied', 'triumphant']},
            'anger': {'category': 'negative', 'intensity': 'high', 'keywords': ['anger', 'wrath', 'fury', 'irritated', 'annoyed']},
            'relief': {'category': 'positive', 'intensity': 'medium', 'keywords': ['relieved', 'reassured', 'comforted', 'eased']},
            'admiration': {'category': 'positive', 'intensity': 'medium', 'keywords': ['admire', 'respect', 'impressed', 'amazed', 'wonderful']}
        }
        
        self._load_enhanced_analyzers()
    
    def _load_enhanced_analyzers(self):
        """Load multiple emotion analysis models for better accuracy"""
        try:
            logger.info("Loading enhanced emotion analysis models...")
            
            # Primary model - GoEmotions (Google's emotion dataset)
            try:
                self.emotion_analyzer = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                logger.info("Primary GoEmotions model loaded successfully!")
            except Exception as e:
                logger.warning(f"Could not load primary emotion model: {e}")
            
            # Backup model - RoBERTa emotion
            try:
                self.backup_analyzer = pipeline(
                    "text-classification",
                    model="cardiffnlp/twitter-roberta-base-emotion",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                logger.info("Backup emotion model loaded successfully!")
            except Exception as e:
                logger.warning(f"Could not load backup emotion model: {e}")
                
            # Text analysis for linguistic features
            self.text_analyzer = TextBlob
            logger.info("Text analysis tools loaded successfully!")
                
        except Exception as e:
            logger.error(f"Error loading emotion analyzers: {e}")
    
    def _enhanced_keyword_analysis(self, text: str) -> Dict[str, float]:
        """
        Enhanced keyword-based emotion detection with context awareness
        """
        text_lower = text.lower()
        emotion_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        # Analyze each sentence for context
        sentences = re.split(r'[.!?]+', text)
        total_weight = 0
        
        for sentence in sentences:
            if not sentence.strip():
                continue
                
            sentence_lower = sentence.lower().strip()
            sentence_weight = len(sentence.split()) / 10  # Weight by sentence length
            
            # Check for emotion keywords with context
            for emotion, data in self.precise_emotions.items():
                keywords = data['keywords']
                matches = 0
                
                for keyword in keywords:
                    if keyword in sentence_lower:
                        # Context-aware scoring
                        if any(neg in sentence_lower for neg in ['not', 'never', 'no', "don't", "can't", "won't"]):
                            # Negative context - reduce score
                            matches += 0.3
                        elif any(amp in sentence_lower for amp in ['very', 'extremely', 'really', 'so', 'quite']):
                            # Amplified context - increase score
                            matches += 1.5
                        else:
                            matches += 1.0
                
                if matches > 0:
                    # Apply intensity multiplier
                    intensity_multiplier = {'low': 0.7, 'medium': 1.0, 'high': 1.3}[data['intensity']]
                    emotion_scores[emotion] += (matches * sentence_weight * intensity_multiplier)
                    total_weight += sentence_weight
        
        # Normalize scores
        if total_weight > 0:
            emotion_scores = {k: v / total_weight for k, v in emotion_scores.items()}
        
        # Apply linguistic features
        try:
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            
            # Adjust scores based on polarity
            if polarity > 0.1:  # Positive text
                for emotion in ['happy', 'satisfaction', 'gratitude', 'love', 'pride', 'hope', 'relief', 'admiration']:
                    emotion_scores[emotion] *= (1 + polarity)
            elif polarity < -0.1:  # Negative text
                for emotion in ['sad', 'angry', 'anxious', 'fear', 'hate', 'distress', 'shame', 'disappointment']:
                    emotion_scores[emotion] *= (1 + abs(polarity))
            
            # Adjust for subjectivity
            if subjectivity > 0.5:  # Highly subjective
                for emotion in ['love', 'hate', 'pride', 'shame', 'admiration']:
                    emotion_scores[emotion] *= (1 + subjectivity * 0.5)
                    
        except Exception as e:
            logger.warning(f"TextBlob analysis failed: {e}")
        
        return emotion_scores
    
    def _map_model_emotions_enhanced(self, model_emotions: List[Dict]) -> Dict[str, float]:
        """
        Enhanced mapping from model emotions to our 23 precise emotions
        """
        # Comprehensive emotion mapping with confidence weights
        emotion_mapping = {
            # GoEmotions mappings
            'admiration': [('admiration', 0.9), ('gratitude', 0.3)],
            'amusement': [('happy', 0.8), ('satisfaction', 0.4)],
            'anger': [('angry', 0.9), ('anger', 0.9), ('hate', 0.6)],
            'annoyance': [('resentment', 0.8), ('reproach', 0.6), ('angry', 0.4)],
            'approval': [('satisfaction', 0.8), ('pride', 0.5)],
            'caring': [('love', 0.8), ('gratitude', 0.5)],
            'confusion': [('anxious', 0.6), ('distress', 0.4)],
            'curiosity': [('hope', 0.6), ('admiration', 0.4)],
            'desire': [('love', 0.7), ('hope', 0.5)],
            'disappointment': [('disappointment', 0.9), ('sad', 0.6)],
            'disapproval': [('reproach', 0.8), ('resentment', 0.6)],
            'disgust': [('hate', 0.8), ('reproach', 0.6)],
            'embarrassment': [('shame', 0.9), ('distress', 0.5)],
            'excitement': [('happy', 0.8), ('satisfaction', 0.6)],
            'fear': [('fear', 0.9), ('anxious', 0.7)],
            'gratitude': [('gratitude', 0.9), ('admiration', 0.4)],
            'grief': [('sad', 0.9), ('distress', 0.7)],
            'joy': [('happy', 0.9), ('satisfaction', 0.6)],
            'love': [('love', 0.9), ('gratitude', 0.4)],
            'nervousness': [('anxious', 0.9), ('fear', 0.6)],
            'optimism': [('hope', 0.8), ('satisfaction', 0.5)],
            'pride': [('pride', 0.9), ('satisfaction', 0.5)],
            'realization': [('relief', 0.7), ('satisfaction', 0.4)],
            'relief': [('relief', 0.9), ('satisfaction', 0.5)],
            'remorse': [('shame', 0.8), ('disappointment', 0.6)],
            'sadness': [('sad', 0.9), ('disappointment', 0.5)],
            'surprise': [('relief', 0.5), ('hope', 0.4)],
            'neutral': [('mildness', 0.8), ('boredom', 0.3)],
            
            # Twitter RoBERTa mappings
            'anger': [('angry', 0.9), ('anger', 0.9)],
            'fear': [('fear', 0.9), ('anxious', 0.7)],
            'joy': [('happy', 0.9), ('satisfaction', 0.6)],
            'sadness': [('sad', 0.9), ('disappointment', 0.6)],
            'surprise': [('relief', 0.6), ('hope', 0.4)],
            'disgust': [('hate', 0.8), ('reproach', 0.6)]
        }
        
        precise_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        for emotion_result in model_emotions:
            emotion_label = emotion_result['label'].lower()
            score = emotion_result['score']
            
            # Find mapping for this emotion
            if emotion_label in emotion_mapping:
                mappings = emotion_mapping[emotion_label]
                for mapped_emotion, weight in mappings:
                    if mapped_emotion in precise_scores:
                        precise_scores[mapped_emotion] += score * weight
        
        return precise_scores
    
    def _combine_analysis_methods(self, text: str) -> Dict[str, float]:
        """
        Combine multiple analysis methods with weighted scoring
        """
        results = []
        
        # Method 1: Primary emotion model
        if self.emotion_analyzer:
            try:
                model_result = self.emotion_analyzer(text)
                precise_scores = self._map_model_emotions_enhanced(model_result)
                results.append({
                    "scores": precise_scores,
                    "method": "primary_model",
                    "weight": 0.5,
                    "confidence": max(precise_scores.values()) if precise_scores else 0
                })
            except Exception as e:
                logger.warning(f"Primary model analysis failed: {e}")
        
        # Method 2: Backup emotion model
        if self.backup_analyzer:
            try:
                model_result = self.backup_analyzer(text)
                precise_scores = self._map_model_emotions_enhanced(model_result)
                results.append({
                    "scores": precise_scores,
                    "method": "backup_model",
                    "weight": 0.3,
                    "confidence": max(precise_scores.values()) if precise_scores else 0
                })
            except Exception as e:
                logger.warning(f"Backup model analysis failed: {e}")
        
        # Method 3: Enhanced keyword analysis
        try:
            keyword_scores = self._enhanced_keyword_analysis(text)
            results.append({
                "scores": keyword_scores,
                "method": "enhanced_keywords",
                "weight": 0.2,
                "confidence": max(keyword_scores.values()) if keyword_scores else 0
            })
        except Exception as e:
            logger.warning(f"Keyword analysis failed: {e}")
        
        # Combine results with adaptive weighting
        if not results:
            return {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        # Adjust weights based on confidence
        total_confidence = sum(r["confidence"] for r in results)
        if total_confidence > 0:
            for result in results:
                confidence_boost = result["confidence"] / total_confidence
                result["weight"] *= (1 + confidence_boost)
        
        # Weighted combination
        final_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        total_weight = sum(r["weight"] for r in results)
        
        for result in results:
            weight = result["weight"] / total_weight if total_weight > 0 else 1.0 / len(results)
            for emotion, score in result["scores"].items():
                final_scores[emotion] += score * weight
        
        return final_scores
    
    async def analyze_emotions(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze emotions with enhanced accuracy and 23 precise emotions
        """
        if not text or not text.strip():
            return self._get_default_response(language)
        
        start_time = time.time()
        
        try:
            # Get combined emotion scores
            emotion_scores = self._combine_analysis_methods(text)
            
            # Determine primary emotion with confidence threshold
            primary_emotion = max(emotion_scores, key=emotion_scores.get)
            confidence = emotion_scores[primary_emotion]
            
            # Apply minimum confidence threshold
            if confidence < 0.1:
                primary_emotion = 'mildness'
                confidence = 0.5
            
            # Get emotion metadata
            emotion_info = self.precise_emotions[primary_emotion]
            
            # Get top emotions (excluding very low scores)
            top_emotions = self._get_top_emotions(emotion_scores, 5)
            
            processing_time = time.time() - start_time
            
            return {
                "primary_emotion": primary_emotion,
                "emotion_scores": emotion_scores,
                "confidence": confidence,
                "category": emotion_info["category"],
                "intensity": emotion_info["intensity"],
                "processing_time": processing_time,
                "language": language or "unknown",
                "method": "enhanced_multi_model_analysis",
                "top_emotions": top_emotions,
                "analysis_quality": "high" if confidence > 0.7 else "medium" if confidence > 0.4 else "low"
            }
            
        except Exception as e:
            logger.error(f"Error in enhanced emotion analysis: {e}")
            return self._get_error_response(str(e), language, time.time() - start_time)
    
    def _get_top_emotions(self, scores: Dict[str, float], top_n: int = 5) -> List[Dict[str, Any]]:
        """Get top N emotions with their scores and metadata"""
        sorted_emotions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        top_emotions = []
        for emotion, score in sorted_emotions[:top_n]:
            if score > 0.05:  # Only include emotions with meaningful scores
                emotion_info = self.precise_emotions[emotion]
                top_emotions.append({
                    "emotion": emotion,
                    "score": score,
                    "category": emotion_info["category"],
                    "intensity": emotion_info["intensity"]
                })
        
        return top_emotions
    
    def _get_default_response(self, language: Optional[str] = None) -> Dict[str, Any]:
        """Get default response for empty text"""
        return {
            "primary_emotion": "mildness",
            "emotion_scores": {emotion: 0.0 for emotion in self.precise_emotions.keys()},
            "confidence": 0.0,
            "category": "neutral",
            "intensity": "low",
            "processing_time": 0.0,
            "language": language or "unknown",
            "method": "default",
            "top_emotions": [],
            "analysis_quality": "low"
        }
    
    def _get_error_response(self, error: str, language: Optional[str] = None, processing_time: float = 0.0) -> Dict[str, Any]:
        """Get error response"""
        return {
            "primary_emotion": "mildness",
            "emotion_scores": {emotion: 0.0 for emotion in self.precise_emotions.keys()},
            "confidence": 0.0,
            "category": "neutral",
            "intensity": "low",
            "processing_time": processing_time,
            "language": language or "unknown",
            "method": "error_fallback",
            "top_emotions": [],
            "analysis_quality": "low",
            "error": error
        }
    
    def get_analyzer_info(self) -> Dict[str, Any]:
        """Get information about the enhanced emotion analyzer"""
        return {
            "supported_emotions": list(self.precise_emotions.keys()),
            "emotion_categories": {
                "positive": [e for e, info in self.precise_emotions.items() if info["category"] == "positive"],
                "negative": [e for e, info in self.precise_emotions.items() if info["category"] == "negative"],
                "neutral": [e for e, info in self.precise_emotions.items() if info["category"] == "neutral"]
            },
            "intensity_levels": ["low", "medium", "high"],
            "models_loaded": {
                "primary_emotion": self.emotion_analyzer is not None,
                "backup_emotion": self.backup_analyzer is not None,
                "text_analysis": self.text_analyzer is not None
            },
            "features": [
                "23 precise emotions",
                "Multi-model ensemble analysis",
                "Enhanced keyword detection",
                "Context-aware scoring",
                "Linguistic feature analysis",
                "Confidence-based weighting",
                "Real-time processing"
            ],
            "accuracy_improvements": [
                "GoEmotions dataset integration",
                "Context-aware keyword analysis",
                "Sentiment polarity adjustment",
                "Confidence-based model weighting",
                "Enhanced emotion mapping"
            ]
        }
    
    def get_supported_emotions(self) -> Dict[str, Dict[str, str]]:
        """Get list of all supported emotions with metadata"""
        return self.precise_emotions.copy()