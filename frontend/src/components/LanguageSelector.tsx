import React from 'react';
import { motion } from 'framer-motion';
import { Globe, ChevronDown } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
}

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  autoDetect: boolean;
  onAutoDetectChange: (autoDetect: boolean) => void;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto Detect', nativeName: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  autoDetect,
  onAutoDetectChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];
  
  const handleLanguageSelect = (langCode: string) => {
    onLanguageChange(langCode);
    onAutoDetectChange(langCode === 'auto');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        className="flex items-center px-4 py-2 bg-white/10 dark:bg-black/10 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe size={18} className="mr-2" />
        <span className="mr-2">{selectedLang.flag}</span>
        <span className="mr-2">{selectedLang.name}</span>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>
      
      {isOpen && (
        <motion.div
          className="absolute top-full left-0 mt-2 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-lg border border-white/20 dark:border-gray-800/50 shadow-lg z-50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-2">
            {SUPPORTED_LANGUAGES.map((language) => (
              <motion.button
                key={language.code}
                className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                  selectedLanguage === language.code
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
                onClick={() => handleLanguageSelect(language.code)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="mr-3 text-lg">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.name}</div>
                  {language.nativeName && language.nativeName !== language.name && (
                    <div className="text-sm opacity-70">{language.nativeName}</div>
                  )}
                </div>
                {language.code === 'auto' && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                    Recommended
                  </span>
                )}
                {['ta', 'te', 'kn', 'ml'].includes(language.code) && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">
                    Enhanced
                  </span>
                )}
              </motion.button>
            ))}
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Enhanced Support:</span> Tamil, Telugu, Kannada, Malayalam
            </p>
          </div>
        </motion.div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSelector;