export interface TTSSettings {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}

class TextToSpeechService {
  private synth: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
    this.loadVoices();
    
    // Load voices when they become available
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  private loadVoices() {
    this.voices = this.synth.getVoices();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getVoicesByLanguage(language: string): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => 
      voice.lang.toLowerCase().startsWith(language.toLowerCase())
    );
  }

  speak(text: string, settings: Partial<TTSSettings> = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!text.trim()) {
        resolve();
        return;
      }

      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply settings
      if (settings.voice) {
        const voice = this.voices.find(v => v.name === settings.voice);
        if (voice) utterance.voice = voice;
      }
      
      utterance.rate = settings.rate || 1;
      utterance.pitch = settings.pitch || 1;
      utterance.volume = settings.volume || 1;

      // Set up event handlers
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }

  pause() {
    if (this.synth.speaking) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth.paused) {
      this.synth.resume();
    }
  }

  isSpeaking(): boolean {
    return this.synth.speaking;
  }

  isPaused(): boolean {
    return this.synth.paused;
  }

  // Get recommended voice based on detected emotion
  getEmotionalVoice(emotion: string, availableVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // Prefer female voices for comforting emotions, male for authoritative
    const comfortingEmotions = ['sad', 'anxious', 'fear', 'distress', 'shame'];
    const authoritativeEmotions = ['pride', 'anger', 'reproach'];
    
    if (comfortingEmotions.includes(emotion)) {
      return availableVoices.find(v => v.name.toLowerCase().includes('female')) || 
             availableVoices.find(v => v.name.toLowerCase().includes('zira')) ||
             availableVoices[0];
    }
    
    if (authoritativeEmotions.includes(emotion)) {
      return availableVoices.find(v => v.name.toLowerCase().includes('male')) ||
             availableVoices.find(v => v.name.toLowerCase().includes('david')) ||
             availableVoices[0];
    }
    
    return availableVoices[0];
  }

  // Adjust speech parameters based on emotion
  getEmotionalSettings(emotion: string): Partial<TTSSettings> {
    const emotionSettings: { [key: string]: Partial<TTSSettings> } = {
      happy: { rate: 1.1, pitch: 1.2 },
      sad: { rate: 0.8, pitch: 0.8 },
      angry: { rate: 1.2, pitch: 0.9 },
      anxious: { rate: 0.9, pitch: 1.1 },
      fear: { rate: 0.9, pitch: 1.3 },
      love: { rate: 0.9, pitch: 1.1 },
      pride: { rate: 1.0, pitch: 0.9 },
      relief: { rate: 0.9, pitch: 1.0 },
      hope: { rate: 1.0, pitch: 1.1 }
    };

    return emotionSettings[emotion] || { rate: 1.0, pitch: 1.0 };
  }
}

export const ttsService = new TextToSpeechService();