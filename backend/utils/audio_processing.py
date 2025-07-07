import librosa
import soundfile as sf
from pydub import AudioSegment
import os
import tempfile
from typing import Dict, Any, Tuple
import numpy as np

class AudioProcessor:
    def __init__(self):
        """Initialize audio processor"""
        self.supported_formats = ['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.wma']
        self.target_sample_rate = 16000  # Common sample rate for speech recognition
    
    def get_audio_info(self, file_path: str) -> Dict[str, Any]:
        """
        Get information about an audio file
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Dictionary with audio file information
        """
        try:
            # Try with librosa first (more comprehensive)
            try:
                y, sr = librosa.load(file_path, sr=None)
                duration = len(y) / sr
                return {
                    "duration": duration,
                    "sample_rate": sr,
                    "channels": 1 if len(y.shape) == 1 else y.shape[0],
                    "samples": len(y),
                    "format": os.path.splitext(file_path)[1],
                    "file_size": os.path.getsize(file_path)
                }
            except:
                # Fallback to pydub
                audio = AudioSegment.from_file(file_path)
                return {
                    "duration": len(audio) / 1000.0,  # Convert ms to seconds
                    "sample_rate": audio.frame_rate,
                    "channels": audio.channels,
                    "samples": len(audio.raw_data),
                    "format": os.path.splitext(file_path)[1],
                    "file_size": os.path.getsize(file_path)
                }
        except Exception as e:
            raise Exception(f"Error getting audio info: {str(e)}")
    
    def convert_to_wav(self, input_path: str, output_path: str = None) -> str:
        """
        Convert audio file to WAV format
        
        Args:
            input_path: Path to input audio file
            output_path: Path for output WAV file (optional)
            
        Returns:
            Path to converted WAV file
        """
        try:
            if output_path is None:
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_path = os.path.join(os.path.dirname(input_path), f"{base_name}.wav")
            
            # Load and convert using pydub
            audio = AudioSegment.from_file(input_path)
            audio.export(output_path, format="wav")
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error converting audio to WAV: {str(e)}")
    
    def normalize_audio(self, input_path: str, output_path: str = None) -> str:
        """
        Normalize audio for better speech recognition
        
        Args:
            input_path: Path to input audio file
            output_path: Path for output file (optional)
            
        Returns:
            Path to normalized audio file
        """
        try:
            if output_path is None:
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_path = os.path.join(os.path.dirname(input_path), f"{base_name}_normalized.wav")
            
            # Load audio
            y, sr = librosa.load(input_path, sr=self.target_sample_rate)
            
            # Normalize volume
            y = librosa.util.normalize(y)
            
            # Remove silence from beginning and end
            y_trimmed, _ = librosa.effects.trim(y, top_db=20)
            
            # Save normalized audio
            sf.write(output_path, y_trimmed, self.target_sample_rate)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error normalizing audio: {str(e)}")
    
    def enhance_audio_for_speech(self, input_path: str, output_path: str = None) -> str:
        """
        Enhance audio specifically for speech recognition
        
        Args:
            input_path: Path to input audio file
            output_path: Path for output file (optional)
            
        Returns:
            Path to enhanced audio file
        """
        try:
            if output_path is None:
                base_name = os.path.splitext(os.path.basename(input_path))[0]
                output_path = os.path.join(os.path.dirname(input_path), f"{base_name}_enhanced.wav")
            
            # Load audio at target sample rate
            y, sr = librosa.load(input_path, sr=self.target_sample_rate)
            
            # Apply noise reduction (simple spectral gating)
            y_denoised = self._simple_noise_reduction(y, sr)
            
            # Normalize
            y_normalized = librosa.util.normalize(y_denoised)
            
            # Trim silence
            y_trimmed, _ = librosa.effects.trim(y_normalized, top_db=20)
            
            # Apply gentle high-pass filter to remove low-frequency noise
            y_filtered = librosa.effects.preemphasis(y_trimmed)
            
            # Save enhanced audio
            sf.write(output_path, y_filtered, self.target_sample_rate)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error enhancing audio: {str(e)}")
    
    def _simple_noise_reduction(self, y: np.ndarray, sr: int) -> np.ndarray:
        """
        Simple noise reduction using spectral gating
        
        Args:
            y: Audio signal
            sr: Sample rate
            
        Returns:
            Denoised audio signal
        """
        try:
            # Compute short-time Fourier transform
            stft = librosa.stft(y)
            magnitude = np.abs(stft)
            
            # Estimate noise floor from quieter parts
            noise_floor = np.percentile(magnitude, 20, axis=1, keepdims=True)
            
            # Create mask to suppress noise
            mask = magnitude > (noise_floor * 2)  # Simple threshold
            
            # Apply mask
            stft_denoised = stft * mask
            
            # Convert back to time domain
            y_denoised = librosa.istft(stft_denoised)
            
            return y_denoised
            
        except:
            # If denoising fails, return original
            return y
    
    def split_audio_by_silence(self, input_path: str, min_silence_len: int = 1000, 
                              silence_thresh: int = -40) -> list:
        """
        Split audio file by silence periods
        
        Args:
            input_path: Path to input audio file
            min_silence_len: Minimum silence length in ms
            silence_thresh: Silence threshold in dB
            
        Returns:
            List of audio chunks
        """
        try:
            audio = AudioSegment.from_file(input_path)
            
            # Split on silence
            chunks = AudioSegment.split_on_silence(
                audio,
                min_silence_len=min_silence_len,
                silence_thresh=silence_thresh,
                keep_silence=100  # Keep some silence
            )
            
            return chunks
            
        except Exception as e:
            raise Exception(f"Error splitting audio: {str(e)}")
    
    def validate_audio_file(self, file_path: str) -> Dict[str, Any]:
        """
        Validate audio file for processing
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Validation results
        """
        results = {
            "valid": False,
            "errors": [],
            "warnings": [],
            "info": {}
        }
        
        try:
            # Check if file exists
            if not os.path.exists(file_path):
                results["errors"].append("File does not exist")
                return results
            
            # Check file extension
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in self.supported_formats:
                results["errors"].append(f"Unsupported format: {ext}")
                return results
            
            # Get audio info
            info = self.get_audio_info(file_path)
            results["info"] = info
            
            # Check duration
            if info["duration"] < 0.1:
                results["errors"].append("Audio too short (< 0.1 seconds)")
            elif info["duration"] > 300:  # 5 minutes
                results["warnings"].append("Audio is very long (> 5 minutes)")
            
            # Check sample rate
            if info["sample_rate"] < 8000:
                results["warnings"].append("Low sample rate may affect quality")
            
            # Check file size
            if info["file_size"] > 50 * 1024 * 1024:  # 50MB
                results["warnings"].append("Large file size (> 50MB)")
            
            # If no errors, mark as valid
            if not results["errors"]:
                results["valid"] = True
            
            return results
            
        except Exception as e:
            results["errors"].append(f"Error validating file: {str(e)}")
            return results
    
    def convert_for_whisper(self, input_path: str) -> str:
        """
        Convert and optimize audio file specifically for OpenAI Whisper
        
        Args:
            input_path: Path to input audio file
            
        Returns:
            Path to optimized audio file
        """
        try:
            # Create temporary file for optimized audio
            temp_dir = tempfile.gettempdir()
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            output_path = os.path.join(temp_dir, f"{base_name}_whisper.wav")
            
            # Load audio at 16kHz (Whisper's preferred sample rate)
            y, sr = librosa.load(input_path, sr=16000)
            
            # Ensure mono audio
            if len(y.shape) > 1:
                y = librosa.to_mono(y)
            
            # Normalize
            y = librosa.util.normalize(y)
            
            # Trim silence
            y, _ = librosa.effects.trim(y, top_db=20)
            
            # Save as 16-bit WAV
            sf.write(output_path, y, 16000, subtype='PCM_16')
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error preparing audio for Whisper: {str(e)}")
    
    def cleanup_temp_files(self, file_paths: list):
        """
        Clean up temporary audio files
        
        Args:
            file_paths: List of file paths to delete
        """
        for file_path in file_paths:
            try:
                if os.path.exists(file_path) and 'temp' in os.path.basename(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {file_path}: {e}")
    
    def get_supported_formats(self) -> list:
        """Get list of supported audio formats"""
        return self.supported_formats.copy()
    
    def estimate_processing_time(self, file_path: str) -> float:
        """
        Estimate processing time based on audio duration
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Estimated processing time in seconds
        """
        try:
            info = self.get_audio_info(file_path)
            duration = info["duration"]
            
            # Rough estimates (actual time varies by hardware)
            # Whisper typically processes at 10-20x real-time on CPU
            # Sentiment analysis is very fast
            base_time = duration * 0.1  # 10x real-time estimate
            overhead = 2.0  # Model loading and I/O overhead
            
            return base_time + overhead
            
        except Exception as e:
            return 30.0  # Default estimate if can't determine