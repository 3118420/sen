import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Square, Volume2, VolumeX, Download, Trash2, Upload } from 'lucide-react';
import { useReactMediaRecorder } from 'react-media-recorder';
import { Message, ProcessingResult, AIPersonality } from '../types';
import { processAudio } from '../services/api';
import { generateAIResponse } from '../services/openai';
import { ttsService } from '../services/textToSpeech';
import { conversationManager } from '../services/conversationManager';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useToast } from './ToastNotification';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import AudioVisualizer from './AudioVisualizer';
import MobileOptimizedButton from './MobileOptimizedButton';

interface ChatInterfaceProps {
  personality: AIPersonality;
  autoSpeak: boolean;
  voiceSettings: any;
  onNewMessage?: (message: Message) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  personality,
  autoSpeak,
  voiceSettings,
  onNewMessage
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerId, setTimerId] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { isMobile, isCompact, config } = useResponsiveDesign();
  const { triggerHaptic } = useHapticFeedback();
  const { success, error, warning } = useToast();

  const {
    status,
    startRecording,
    stopRecording,
    mediaBlobUrl,
    clearBlobUrl
  } = useReactMediaRecorder({
    audio: true,
    onStop: (blobUrl, blob) => {
      if (blob) {
        handleAudioProcessing(blob);
      }
    }
  });

  const isRecording = status === 'recording';

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAITyping]);

  useEffect(() => {
    // Load current conversation
    const conversation = conversationManager.getCurrentConversation();
    if (conversation) {
      setMessages(conversation.messages);
    }
  }, []);

  // Handle mobile keyboard
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDiff = windowHeight - viewportHeight;
      
      setKeyboardHeight(heightDiff > 150 ? heightDiff : 0);
    };

    const handleVisualViewportChange = () => {
      handleResize();
      setTimeout(scrollToBottom, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartRecording = () => {
    clearBlobUrl();
    startRecording();
    triggerHaptic('medium');
    
    setRecordingTime(0);
    const id = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    setTimerId(id);
  };

  const handleStopRecording = () => {
    stopRecording();
    triggerHaptic('light');
    
    if (timerId) {
      window.clearInterval(timerId);
      setTimerId(null);
    }
  };

  const handleAudioProcessing = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      const result = await processAudio(audioFile, undefined, true);
      
      // Create user message
      const userMessage = conversationManager.addMessage({
        type: 'user',
        content: result.transcript,
        audioUrl: URL.createObjectURL(audioBlob),
        processingResult: result
      });

      setMessages(prev => [...prev, userMessage]);
      onNewMessage?.(userMessage);

      success('Audio processed successfully', `Detected emotion: ${result.emotions?.primary_emotion || 'unknown'}`);

      // Generate AI response
      await generateAndAddAIResponse(result);
      
    } catch (err) {
      console.error('Error processing audio:', err);
      error('Processing failed', 'Could not process your audio. Please try again.');
      
      const errorMessage = conversationManager.addMessage({
        type: 'ai',
        content: "I'm sorry, I had trouble processing your audio. Could you try again?"
      });
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAndAddAIResponse = async (processingResult: ProcessingResult) => {
    setIsAITyping(true);
    
    try {
      const conversationHistory = conversationManager.getConversationHistory();
      
      const aiResponse = await generateAIResponse({
        transcript: processingResult.transcript,
        sentiment: processingResult.sentiment,
        emotions: processingResult.emotions,
        conversationHistory,
        personality: personality.id
      });

      // Add AI message with typing effect
      const aiMessage = conversationManager.addMessage({
        type: 'ai',
        content: aiResponse.content,
        isTyping: true
      });

      setMessages(prev => [...prev, aiMessage]);

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + aiResponse.content.length * 20));

      // Update message to stop typing
      conversationManager.updateMessage(aiMessage.id, { isTyping: false });
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessage.id ? { ...msg, isTyping: false } : msg
      ));

      // Speak the response if auto-speak is enabled
      if (autoSpeak && voiceSettings.enabled) {
        const emotionalSettings = processingResult.emotions 
          ? ttsService.getEmotionalSettings(processingResult.emotions.primary_emotion)
          : {};
        
        await ttsService.speak(aiResponse.content, {
          ...voiceSettings,
          ...emotionalSettings
        });
      }

      onNewMessage?.(aiMessage);
      
    } catch (err) {
      console.error('Error generating AI response:', err);
      error('AI response failed', 'Could not generate a response. Please try again.');
      
      const fallbackMessage = conversationManager.addMessage({
        type: 'ai',
        content: "I'm here to listen. What would you like to talk about?"
      });
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        warning('Invalid file type', 'Please select an audio file.');
        return;
      }
      handleAudioFile(file);
    }
  };

  const handleAudioFile = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const result = await processAudio(file, undefined, true);
      
      const userMessage = conversationManager.addMessage({
        type: 'user',
        content: result.transcript,
        audioUrl: URL.createObjectURL(file),
        processingResult: result
      });

      setMessages(prev => [...prev, userMessage]);
      onNewMessage?.(userMessage);

      success('File processed successfully', `Detected emotion: ${result.emotions?.primary_emotion || 'unknown'}`);

      await generateAndAddAIResponse(result);
      
    } catch (err) {
      console.error('Error processing audio file:', err);
      error('File processing failed', 'Could not process the audio file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeakMessage = async (content: string, emotion?: string) => {
    if (ttsService.isSpeaking()) {
      ttsService.stop();
      return;
    }

    const emotionalSettings = emotion 
      ? ttsService.getEmotionalSettings(emotion)
      : {};

    try {
      await ttsService.speak(content, {
        ...voiceSettings,
        ...emotionalSettings
      });
    } catch (err) {
      console.error('Error speaking message:', err);
      error('Speech failed', 'Could not speak the message.');
    }
  };

  const handleExportConversation = () => {
    const conversation = conversationManager.getCurrentConversation();
    if (!conversation) return;

    const exportData = conversationManager.exportConversation(conversation.id);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    success('Conversation exported', 'Your conversation has been downloaded.');
  };

  const handleClearConversation = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      const conversation = conversationManager.getCurrentConversation();
      if (conversation) {
        conversationManager.deleteConversation(conversation.id);
        setMessages([]);
        success('Conversation cleared', 'Your conversation has been cleared.');
        triggerHaptic('heavy');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="flex flex-col h-full bg-white/5 dark:bg-black/5 backdrop-blur-lg rounded-lg border border-white/10 dark:border-gray-800/50"
      style={{ 
        paddingBottom: isMobile ? `${keyboardHeight}px` : '0px',
        transition: 'padding-bottom 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-gray-800/50">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${personality.color}`}>
            {personality.icon}
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-gray-800 dark:text-white">{personality.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{personality.description}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <MobileOptimizedButton
            onClick={handleExportConversation}
            variant="ghost"
            size="small"
            icon={<Download size={18} />}
            hapticFeedback="light"
          />
          <MobileOptimizedButton
            onClick={handleClearConversation}
            variant="ghost"
            size="small"
            icon={<Trash2 size={18} />}
            hapticFeedback="heavy"
            className="text-red-500 hover:text-red-600"
          />
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
        style={{ 
          maxHeight: isMobile ? `calc(100vh - 200px - ${keyboardHeight}px)` : 'auto'
        }}
      >
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSpeak={handleSpeakMessage}
              isSpeaking={ttsService.isSpeaking()}
            />
          ))}
        </AnimatePresence>
        
        {isAITyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 dark:border-gray-800/50">
        {isRecording && (
          <motion.div 
            className="mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AudioVisualizer isRecording={true} />
            <div className="text-center text-gray-600 dark:text-gray-400 mt-2">
              Recording: {formatTime(recordingTime)}
            </div>
          </motion.div>
        )}

        <div className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <MobileOptimizedButton
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isRecording}
            variant="secondary"
            size={isMobile ? "large" : "medium"}
            icon={<Upload size={20} />}
            hapticFeedback="light"
          />

          <div className="flex-1 flex justify-center">
            {!isRecording ? (
              <MobileOptimizedButton
                onClick={handleStartRecording}
                disabled={isProcessing}
                variant="primary"
                size={isMobile ? "large" : "medium"}
                loading={isProcessing}
                icon={<Mic size={20} />}
                hapticFeedback="medium"
                fullWidth={isMobile}
              >
                {isProcessing ? 'Processing...' : 'Start Recording'}
              </MobileOptimizedButton>
            ) : (
              <MobileOptimizedButton
                onClick={handleStopRecording}
                variant="danger"
                size={isMobile ? "large" : "medium"}
                icon={<Square size={20} />}
                hapticFeedback="heavy"
                fullWidth={isMobile}
              >
                Stop Recording
              </MobileOptimizedButton>
            )}
          </div>

          <MobileOptimizedButton
            onClick={() => ttsService.isSpeaking() ? ttsService.stop() : null}
            disabled={!ttsService.isSpeaking()}
            variant="secondary"
            size={isMobile ? "large" : "medium"}
            icon={ttsService.isSpeaking() ? <VolumeX size={20} /> : <Volume2 size={20} />}
            hapticFeedback="light"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;