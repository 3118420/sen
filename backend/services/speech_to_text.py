import whisper
import time
import os
from typing import Dict, Any, Optional, List
import torch

class SpeechToTextService:
    def __init__(self, model_size: str = "base"):
        """
        Initialize the Speech-to-Text service using OpenAI Whisper
        
        Args:
            model_size: Whisper model size ("tiny", "base", "small", "medium", "large")
        """
        self.model_size = model_size
        self.model = None
        self.supported_south_indian_languages = {
            'ta': 'Tamil',
            'te': 'Telugu', 
            'kn': 'Kannada',
            'ml': 'Malayalam'
        }
        
        # Set up cache directories for Lambda environment
        self._setup_cache_directories()
        self._load_model()
    
    def _setup_cache_directories(self):
        """Setup cache directories for Lambda environment"""
        try:
            # Create cache directories in /tmp (writable in Lambda)
            cache_dirs = [
                '/tmp/.cache',
                '/tmp/.cache/whisper',
                '/tmp/.cache/huggingface',
                '/tmp/.cache/huggingface/hub',
                '/tmp/.cache/torch'
            ]
            
            for cache_dir in cache_dirs:
                os.makedirs(cache_dir, exist_ok=True)
                print(f"Created cache directory: {cache_dir}")
            
            # Set environment variables for various caching systems
            os.environ['WHISPER_CACHE'] = '/tmp/.cache/whisper'
            os.environ['TRANSFORMERS_CACHE'] = '/tmp/.cache/huggingface/hub'
            os.environ['HF_HOME'] = '/tmp/.cache/huggingface'
            os.environ['TORCH_HOME'] = '/tmp/.cache/torch'
            os.environ['XDG_CACHE_HOME'] = '/tmp/.cache'
            
            # Set Whisper model download path
            os.environ['WHISPER_MODEL_PATH'] = '/tmp/.cache/whisper'
            
            print("Cache directories and environment variables set successfully")
            
        except Exception as e:
            print(f"Warning: Could not setup cache directories: {e}")
            # Fallback to default behavior
    
    def _load_model(self):
        """Load the Whisper model with proper caching"""
        try:
            print(f"Loading Whisper model: {self.model_size}")
            
            # Ensure cache directory exists before loading
            whisper_cache = os.environ.get('WHISPER_CACHE', '/tmp/.cache/whisper')
            os.makedirs(whisper_cache, exist_ok=True)
            
            # Load model with explicit cache handling
            self.model = whisper.load_model(
                self.model_size,
                download_root=whisper_cache  # Specify download location
            )
            print("Model loaded successfully!")
            
        except Exception as e:
            print(f"Error loading Whisper model: {e}")
            # Try loading with different approach
            try:
                print("Attempting to load model with default settings...")
                self.model = whisper.load_model(self.model_size)
                print("Model loaded with default settings!")
            except Exception as e2:
                print(f"Failed to load model with default settings: {e2}")
                raise e2
    
    def detect_language(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Detect the language of the audio file
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Dictionary containing detected language and confidence
        """
        try:
            # Load audio and pad/trim it to fit 30 seconds
            audio = whisper.load_audio(audio_file_path)
            audio = whisper.pad_or_trim(audio)
            
            # Make log-Mel spectrogram and move to the same device as the model
            mel = whisper.log_mel_spectrogram(audio).to(self.model.device)
            
            # Detect the spoken language
            _, probs = self.model.detect_language(mel)
            detected_language = max(probs, key=probs.get)
            confidence = probs[detected_language]
            
            return {
                "language": detected_language,
                "confidence": confidence,
                "all_probabilities": dict(sorted(probs.items(), key=lambda x: x[1], reverse=True)[:5])
            }
        except Exception as e:
            print(f"Error detecting language: {e}")
            return {
                "language": "en",
                "confidence": 0.5,
                "all_probabilities": {"en": 0.5}
            }
    
    async def transcribe_audio(self, audio_file_path: str, language_code: Optional[str] = None, 
                             auto_detect: bool = True) -> Dict[str, Any]:
        """
        Transcribe audio file to text with enhanced South Indian language support
        
        Args:
            audio_file_path: Path to the audio file
            language_code: Optional language code (e.g., 'ta' for Tamil)
            auto_detect: Whether to auto-detect language if not specified
            
        Returns:
            Dictionary containing transcript and metadata
        """
        if not os.path.exists(audio_file_path):
            raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
        
        try:
            start_time = time.time()
            
            # Auto-detect language if not specified
            detected_language_info = None
            if auto_detect and not language_code:
                detected_language_info = self.detect_language(audio_file_path)
                language_code = detected_language_info["language"]
                print(f"Auto-detected language: {language_code} (confidence: {detected_language_info['confidence']:.2f})")
            
            # Use appropriate transcription settings based on language
            transcription_options = self._get_transcription_options(language_code)
            
            # Transcribe using Whisper with optimized settings
            result = self.model.transcribe(
                audio_file_path,
                language=language_code,
                **transcription_options
            )
            
            processing_time = time.time() - start_time
            
            # Post-process text for South Indian languages
            processed_text = self._post_process_text(result["text"], language_code)
            
            return {
                "text": processed_text,
                "original_text": result["text"].strip(),
                "language": result.get("language", language_code or "unknown"),
                "detected_language_info": detected_language_info,
                "confidence": self._calculate_confidence(result),
                "processing_time": processing_time,
                "segments": result.get("segments", []),
                "is_south_indian_language": language_code in self.supported_south_indian_languages,
                "language_name": self.supported_south_indian_languages.get(language_code, "Unknown")
            }
            
        except Exception as e:
            raise Exception(f"Error during transcription: {str(e)}")
    
    def _get_transcription_options(self, language_code: Optional[str]) -> Dict[str, Any]:
        """
        Get optimized transcription options based on language
        
        Args:
            language_code: Language code
            
        Returns:
            Dictionary of transcription options
        """
        base_options = {
            "fp16": torch.cuda.is_available(),
            "task": "transcribe",
            "verbose": False,
            "temperature": 0.0,  # Use deterministic decoding for better consistency
        }
        
        # Enhanced options for South Indian languages
        if language_code in self.supported_south_indian_languages:
            base_options.update({
                "beam_size": 5,  # Use beam search for better quality
                "best_of": 5,    # Generate multiple candidates and pick the best
                "patience": 1.0, # Wait longer for better results
                "length_penalty": 1.0,
                "suppress_tokens": [-1],  # Don't suppress any tokens
                "initial_prompt": self._get_language_prompt(language_code),
            })
        
        return base_options
    
    def _get_language_prompt(self, language_code: str) -> str:
        """
        Get language-specific prompts to improve transcription quality
        
        Args:
            language_code: Language code
            
        Returns:
            Language-specific prompt string
        """
        prompts = {
            'ta': "தமிழ் மொழியில் பேசுகிறார்கள்.",  # "They are speaking in Tamil"
            'te': "తెలుగు భాషలో మాట్లాడుతున్నారు.",      # "They are speaking in Telugu"
            'kn': "ಕನ್ನಡ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡುತ್ತಿದ್ದಾರೆ.",    # "They are speaking in Kannada"
            'ml': "മലയാളം ഭാഷയിൽ സംസാരിക്കുന്നു."      # "They are speaking in Malayalam"
        }
        return prompts.get(language_code, "")
    
    def _post_process_text(self, text: str, language_code: Optional[str]) -> str:
        """
        Post-process transcribed text for better quality
        
        Args:
            text: Raw transcribed text
            language_code: Language code
            
        Returns:
            Post-processed text
        """
        if not text:
            return text
        
        # Basic cleanup
        processed_text = text.strip()
        
        # Language-specific post-processing
        if language_code in self.supported_south_indian_languages:
            # Remove common transcription artifacts
            processed_text = self._clean_south_indian_text(processed_text, language_code)
        
        return processed_text
    
    def _clean_south_indian_text(self, text: str, language_code: str) -> str:
        """
        Clean up common issues in South Indian language transcriptions
        
        Args:
            text: Text to clean
            language_code: Language code
            
        Returns:
            Cleaned text
        """
        # Remove extra spaces
        text = ' '.join(text.split())
        
        # Language-specific cleaning rules
        if language_code == 'ta':  # Tamil
            # Common Tamil transcription fixes
            text = text.replace('ு்', 'ு')  # Fix double vowel marks
            text = text.replace('ி்', 'ி')  # Fix vowel mark issues
        
        elif language_code == 'te':  # Telugu
            # Common Telugu transcription fixes
            text = text.replace('్్', '్')  # Fix double halant
        
        elif language_code == 'kn':  # Kannada
            # Common Kannada transcription fixes
            text = text.replace('್್', '್')  # Fix double halant
        
        elif language_code == 'ml':  # Malayalam
            # Common Malayalam transcription fixes
            text = text.replace('്്', '്')  # Fix double halant
        
        return text
    
    def _calculate_confidence(self, result: Dict[str, Any]) -> float:
        """
        Calculate average confidence from Whisper segments with enhanced logic
        
        Args:
            result: Whisper transcription result
            
        Returns:
            Average confidence score (0.0 to 1.0)
        """
        segments = result.get("segments", [])
        if not segments:
            return 0.5  # Default confidence if no segments
        
        confidences = []
        for segment in segments:
            if "avg_logprob" in segment:
                # Convert log probability to confidence score
                # Whisper's avg_logprob typically ranges from -1 to 0
                confidence = min(1.0, max(0.0, (segment["avg_logprob"] + 1.0)))
                confidences.append(confidence)
            elif "no_speech_prob" in segment:
                # Use inverse of no_speech_prob as confidence
                confidence = 1.0 - segment["no_speech_prob"]
                confidences.append(confidence)
        
        if not confidences:
            return 0.5
        
        # Weight confidence by segment length
        weighted_confidence = 0
        total_duration = 0
        
        for i, segment in enumerate(segments):
            if i < len(confidences):
                duration = segment.get("end", 0) - segment.get("start", 0)
                weighted_confidence += confidences[i] * duration
                total_duration += duration
        
        return weighted_confidence / total_duration if total_duration > 0 else sum(confidences) / len(confidences)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        return {
            "model_size": self.model_size,
            "model_loaded": self.model is not None,
            "cuda_available": torch.cuda.is_available(),
            "cache_directories": {
                "whisper_cache": os.environ.get('WHISPER_CACHE', 'Not set'),
                "transformers_cache": os.environ.get('TRANSFORMERS_CACHE', 'Not set'),
                "hf_home": os.environ.get('HF_HOME', 'Not set'),
                "torch_home": os.environ.get('TORCH_HOME', 'Not set')
            },
            "supported_languages": [
                "en", "zh", "de", "es", "ru", "ko", "fr", "ja", "pt", "tr",
                "pl", "ca", "nl", "ar", "sv", "it", "id", "hi", "fi", "vi",
                "he", "uk", "el", "ms", "cs", "ro", "da", "hu", "ta", "te", 
                "kn", "ml", "no", "th", "ur", "bg", "hr", "lt", "lv", "mi",
                "mk", "mt", "cy", "is", "sl", "sk", "sw", "fa", "ps", "am"
            ],
            "south_indian_languages": self.supported_south_indian_languages,
            "enhanced_features": [
                "Auto language detection",
                "Language-specific optimization",
                "Post-processing for South Indian languages",
                "Confidence scoring",
                "Beam search for quality",
                "Lambda-optimized caching"
            ]
        }
    
    def change_model(self, model_size: str):
        """Change the Whisper model size"""
        if model_size != self.model_size:
            self.model_size = model_size
            self._load_model()
    
    def get_supported_south_indian_languages(self) -> Dict[str, str]:
        """Get list of supported South Indian languages"""
        return self.supported_south_indian_languages.copy()
    
    async def transcribe_with_language_detection(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Transcribe audio with automatic language detection and optimization
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Dictionary containing transcript and detailed language information
        """
        # First detect the language
        language_info = self.detect_language(audio_file_path)
        detected_language = language_info["language"]
        
        # Transcribe with the detected language
        result = await self.transcribe_audio(
            audio_file_path, 
            language_code=detected_language,
            auto_detect=False
        )
        
        # Add detailed language detection info
        result["detailed_language_detection"] = language_info
        
        return result