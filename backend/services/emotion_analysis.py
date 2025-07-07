import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import time
from typing import Dict, Any, Optional, List
import re
import numpy as np

class EmotionAnalysisService:
    def __init__(self):
        """
        Initialize emotion analysis service with precise emotion detection
        """
        self.emotion_analyzer = None
        self.multilingual_analyzer = None
        self.south_indian_languages = {
            'ta': 'Tamil',
            'te': 'Telugu', 
            'kn': 'Kannada',
            'ml': 'Malayalam'
        }
        
        # Define the 23 precise emotions
        self.precise_emotions = {
            'anxious': {'category': 'negative', 'intensity': 'medium'},
            'angry': {'category': 'negative', 'intensity': 'high'},
            'sad': {'category': 'negative', 'intensity': 'medium'},
            'happy': {'category': 'positive', 'intensity': 'high'},
            'hate': {'category': 'negative', 'intensity': 'high'},
            'satisfaction': {'category': 'positive', 'intensity': 'medium'},
            'gratitude': {'category': 'positive', 'intensity': 'medium'},
            'reproach': {'category': 'negative', 'intensity': 'medium'},
            'distress': {'category': 'negative', 'intensity': 'high'},
            'pride': {'category': 'positive', 'intensity': 'medium'},
            'fear': {'category': 'negative', 'intensity': 'high'},
            'mildness': {'category': 'neutral', 'intensity': 'low'},
            'pity': {'category': 'negative', 'intensity': 'low'},
            'boredom': {'category': 'neutral', 'intensity': 'low'},
            'shame': {'category': 'negative', 'intensity': 'medium'},
            'disappointment': {'category': 'negative', 'intensity': 'medium'},
            'hope': {'category': 'positive', 'intensity': 'medium'},
            'resentment': {'category': 'negative', 'intensity': 'medium'},
            'love': {'category': 'positive', 'intensity': 'high'},
            'gloating': {'category': 'negative', 'intensity': 'low'},
            'anger': {'category': 'negative', 'intensity': 'high'},
            'relief': {'category': 'positive', 'intensity': 'medium'},
            'admiration': {'category': 'positive', 'intensity': 'medium'}
        }
        
        self._load_analyzers()
    
    def _load_analyzers(self):
        """Load emotion analysis models"""
        try:
            print("Loading emotion analysis models...")
            
            # Primary emotion model - GoEmotions dataset (27 emotions)
            try:
                self.emotion_analyzer = pipeline(
                    "text-classification",
                    model="j-hartmann/emotion-english-distilroberta-base",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                print("Primary emotion model loaded successfully!")
            except Exception as e:
                print(f"Could not load primary emotion model: {e}")
            
            # Fallback: Use a more general emotion model
            try:
                self.multilingual_analyzer = pipeline(
                    "text-classification",
                    model="cardiffnlp/twitter-roberta-base-emotion",
                    device=0 if torch.cuda.is_available() else -1,
                    return_all_scores=True
                )
                print("Multilingual emotion model loaded successfully!")
            except Exception as e:
                print(f"Could not load multilingual emotion model: {e}")
                
        except Exception as e:
            print(f"Error loading emotion analyzers: {e}")
    
    def _map_to_precise_emotions(self, model_emotions: List[Dict]) -> Dict[str, float]:
        """
        Map model emotions to our 23 precise emotions
        """
        # Mapping from common model emotions to our precise emotions
        emotion_mapping = {
            # Direct mappings
            'anger': ['angry', 'anger', 'resentment'],
            'fear': ['fear', 'anxious', 'distress'],
            'joy': ['happy', 'satisfaction', 'relief'],
            'sadness': ['sad', 'disappointment', 'shame'],
            'love': ['love', 'gratitude', 'admiration'],
            'surprise': ['hope', 'relief'],
            'disgust': ['hate', 'reproach'],
            
            # Extended mappings for GoEmotions model
            'admiration': ['admiration', 'gratitude'],
            'amusement': ['happy', 'satisfaction'],
            'anger': ['angry', 'anger', 'hate'],
            'annoyance': ['resentment', 'reproach'],
            'approval': ['satisfaction', 'pride'],
            'caring': ['love', 'gratitude'],
            'confusion': ['anxious', 'distress'],
            'curiosity': ['hope', 'admiration'],
            'desire': ['love', 'hope'],
            'disappointment': ['disappointment', 'sad'],
            'disapproval': ['reproach', 'resentment'],
            'disgust': ['hate', 'reproach'],
            'embarrassment': ['shame', 'distress'],
            'excitement': ['happy', 'satisfaction'],
            'fear': ['fear', 'anxious'],
            'gratitude': ['gratitude', 'admiration'],
            'grief': ['sad', 'distress'],
            'joy': ['happy', 'satisfaction'],
            'love': ['love', 'gratitude'],
            'nervousness': ['anxious', 'fear'],
            'optimism': ['hope', 'satisfaction'],
            'pride': ['pride', 'satisfaction'],
            'realization': ['relief', 'satisfaction'],
            'relief': ['relief', 'satisfaction'],
            'remorse': ['shame', 'disappointment'],
            'sadness': ['sad', 'disappointment'],
            'surprise': ['relief', 'hope'],
            'neutral': ['mildness', 'boredom']
        }
        
        precise_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        for emotion_result in model_emotions:
            emotion_label = emotion_result['label'].lower()
            score = emotion_result['score']
            
            # Find mapping for this emotion
            mapped_emotions = []
            for key, values in emotion_mapping.items():
                if emotion_label in key or key in emotion_label:
                    mapped_emotions = values
                    break
            
            # Distribute score among mapped emotions
            if mapped_emotions:
                score_per_emotion = score / len(mapped_emotions)
                for mapped_emotion in mapped_emotions:
                    if mapped_emotion in precise_scores:
                        precise_scores[mapped_emotion] += score_per_emotion
        
        # Normalize scores
        total_score = sum(precise_scores.values())
        if total_score > 0:
            precise_scores = {k: v / total_score for k, v in precise_scores.items()}
        
        return precise_scores
    
    def _analyze_text_patterns(self, text: str) -> Dict[str, float]:
        """
        Analyze text patterns for emotion keywords and phrases
        """
        text_lower = text.lower()
        pattern_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        # Emotion keyword patterns
        emotion_keywords = {
            'anxious': ['worried', 'nervous', 'anxious', 'concerned', 'uneasy', 'restless'],
            'angry': ['angry', 'furious', 'mad', 'rage', 'outraged', 'livid'],
            'sad': ['sad', 'depressed', 'down', 'blue', 'melancholy', 'sorrowful'],
            'happy': ['happy', 'joyful', 'cheerful', 'delighted', 'elated', 'ecstatic'],
            'hate': ['hate', 'despise', 'loathe', 'detest', 'abhor'],
            'satisfaction': ['satisfied', 'content', 'pleased', 'fulfilled'],
            'gratitude': ['grateful', 'thankful', 'appreciate', 'blessed'],
            'reproach': ['blame', 'criticize', 'condemn', 'reproach'],
            'distress': ['distressed', 'troubled', 'anguished', 'tormented'],
            'pride': ['proud', 'accomplished', 'achieved', 'successful'],
            'fear': ['afraid', 'scared', 'terrified', 'frightened', 'fearful'],
            'mildness': ['calm', 'peaceful', 'gentle', 'mild', 'serene'],
            'pity': ['pity', 'sympathy', 'compassion', 'sorry for'],
            'boredom': ['bored', 'dull', 'tedious', 'monotonous', 'uninteresting'],
            'shame': ['ashamed', 'embarrassed', 'humiliated', 'guilty'],
            'disappointment': ['disappointed', 'let down', 'frustrated', 'disillusioned'],
            'hope': ['hopeful', 'optimistic', 'confident', 'expecting'],
            'resentment': ['resentful', 'bitter', 'grudge', 'indignant'],
            'love': ['love', 'adore', 'cherish', 'treasure', 'devoted'],
            'gloating': ['gloating', 'smug', 'self-satisfied', 'triumphant'],
            'anger': ['anger', 'wrath', 'fury', 'irritated', 'annoyed'],
            'relief': ['relieved', 'reassured', 'comforted', 'eased'],
            'admiration': ['admire', 'respect', 'impressed', 'amazed', 'wonderful']
        }
        
        # Count keyword matches
        total_matches = 0
        for emotion, keywords in emotion_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            pattern_scores[emotion] = matches
            total_matches += matches
        
        # Normalize scores
        if total_matches > 0:
            pattern_scores = {k: v / total_matches for k, v in pattern_scores.items()}
        
        return pattern_scores
    
    async def analyze_emotions(self, text: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze emotions with precise 23-emotion categorization
        """
        if not text or not text.strip():
            return {
                "primary_emotion": "mildness",
                "emotion_scores": {emotion: 0.0 for emotion in self.precise_emotions.keys()},
                "confidence": 0.0,
                "category": "neutral",
                "intensity": "low",
                "processing_time": 0.0,
                "language": language or "unknown"
            }
        
        start_time = time.time()
        
        try:
            emotion_results = []
            
            # Method 1: Primary emotion model
            if self.emotion_analyzer:
                try:
                    model_result = self.emotion_analyzer(text)
                    precise_scores = self._map_to_precise_emotions(model_result)
                    emotion_results.append({
                        "scores": precise_scores,
                        "method": "primary_emotion_model",
                        "weight": 0.6
                    })
                except Exception as e:
                    print(f"Primary emotion analysis failed: {e}")
            
            # Method 2: Multilingual model
            if self.multilingual_analyzer:
                try:
                    model_result = self.multilingual_analyzer(text)
                    precise_scores = self._map_to_precise_emotions(model_result)
                    emotion_results.append({
                        "scores": precise_scores,
                        "method": "multilingual_model",
                        "weight": 0.3
                    })
                except Exception as e:
                    print(f"Multilingual emotion analysis failed: {e}")
            
            # Method 3: Pattern-based analysis
            try:
                pattern_scores = self._analyze_text_patterns(text)
                emotion_results.append({
                    "scores": pattern_scores,
                    "method": "pattern_analysis",
                    "weight": 0.1
                })
            except Exception as e:
                print(f"Pattern analysis failed: {e}")
            
            # Combine results
            final_scores = self._combine_emotion_results(emotion_results)
            
            # Determine primary emotion
            primary_emotion = max(final_scores, key=final_scores.get)
            confidence = final_scores[primary_emotion]
            
            # Get emotion metadata
            emotion_info = self.precise_emotions[primary_emotion]
            
            processing_time = time.time() - start_time
            
            return {
                "primary_emotion": primary_emotion,
                "emotion_scores": final_scores,
                "confidence": confidence,
                "category": emotion_info["category"],
                "intensity": emotion_info["intensity"],
                "processing_time": processing_time,
                "language": language or "unknown",
                "method": "combined_emotion_analysis",
                "top_emotions": self._get_top_emotions(final_scores, 5)
            }
            
        except Exception as e:
            print(f"Error in emotion analysis: {e}")
            return {
                "primary_emotion": "mildness",
                "emotion_scores": {emotion: 0.0 for emotion in self.precise_emotions.keys()},
                "confidence": 0.0,
                "category": "neutral",
                "intensity": "low",
                "processing_time": time.time() - start_time,
                "language": language or "unknown",
                "error": str(e)
            }
    
    def _combine_emotion_results(self, results: List[Dict]) -> Dict[str, float]:
        """
        Combine multiple emotion analysis results using weighted averaging
        """
        if not results:
            return {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        
        combined_scores = {emotion: 0.0 for emotion in self.precise_emotions.keys()}
        total_weight = 0.0
        
        for result in results:
            weight = result.get("weight", 1.0)
            scores = result.get("scores", {})
            
            for emotion in combined_scores:
                combined_scores[emotion] += scores.get(emotion, 0.0) * weight
            
            total_weight += weight
        
        # Normalize by total weight
        if total_weight > 0:
            combined_scores = {k: v / total_weight for k, v in combined_scores.items()}
        
        return combined_scores
    
    def _get_top_emotions(self, scores: Dict[str, float], top_n: int = 5) -> List[Dict[str, Any]]:
        """
        Get top N emotions with their scores and metadata
        """
        sorted_emotions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        top_emotions = []
        for emotion, score in sorted_emotions[:top_n]:
            if score > 0.01:  # Only include emotions with meaningful scores
                emotion_info = self.precise_emotions[emotion]
                top_emotions.append({
                    "emotion": emotion,
                    "score": score,
                    "category": emotion_info["category"],
                    "intensity": emotion_info["intensity"]
                })
        
        return top_emotions
    
    def get_analyzer_info(self) -> Dict[str, Any]:
        """Get information about the emotion analyzer"""
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
                "multilingual": self.multilingual_analyzer is not None
            },
            "features": [
                "23 precise emotions",
                "Multi-model analysis",
                "Pattern-based detection",
                "Confidence scoring",
                "Category classification",
                "Intensity levels"
            ]
        }
    
    def get_supported_emotions(self) -> Dict[str, Dict[str, str]]:
        """Get list of all supported emotions with metadata"""
        return self.precise_emotions.copy()