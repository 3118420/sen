import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Play, Square } from 'lucide-react';
import { VoiceSettings as VoiceSettingsType } from '../types';
import { ttsService } from '../services/textToSpeech';

interface VoiceSettingsProps {
  settings: VoiceSettingsType;
  onSettingsChange: (settings: VoiceSettingsType) => void;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ settings, onSettingsChange }) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTestPlaying, setIsTestPlaying] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = ttsService.getAvailableVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Load voices when they become available
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleTestVoice = async () => {
    if (isTestPlaying) {
      ttsService.stop();
      setIsTestPlaying(false);
      return;
    }

    setIsTestPlaying(true);
    try {
      await ttsService.speak("Hello! This is how I sound with these settings.", settings);
    } catch (error) {
      console.error('Error testing voice:', error);
    } finally {
      setIsTestPlaying(false);
    }
  };

  const updateSetting = (key: keyof VoiceSettingsType, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white">Voice Settings</h3>
        <motion.button
          onClick={handleTestVoice}
          className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isTestPlaying ? <Square size={16} /> : <Play size={16} />}
          <span className="ml-2">{isTestPlaying ? 'Stop' : 'Test'}</span>
        </motion.button>
      </div>

      {/* Enable/Disable */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Enable Text-to-Speech
        </label>
        <button
          onClick={() => updateSetting('enabled', !settings.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voice
            </label>
            <select
              value={settings.voice}
              onChange={(e) => updateSetting('voice', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
            >
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Speaking Rate: {settings.rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.rate}
              onChange={(e) => updateSetting('rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Pitch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pitch: {settings.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.pitch}
              onChange={(e) => updateSetting('pitch', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Volume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Volume: {Math.round(settings.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceSettings;