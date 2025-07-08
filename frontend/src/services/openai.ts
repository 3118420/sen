// Disabled OpenAI for production - using fallback responses only
export interface AIResponse {
  content: string;
  reasoning?: string;
}

export interface ConversationContext {
  transcript: string;
  sentiment: string;
  emotions: any;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  personality: string;
}

const PERSONALITY_RESPONSES = {
  supportive: {
    positive: "That's wonderful to hear! I'm so glad you're feeling good. Your positive energy is really coming through. What's been bringing you joy lately?",
    negative: "I can hear that you're going through a tough time, and I want you to know that your feelings are completely valid. I'm here to listen and support you through this. Would you like to share more about what's been weighing on you?",
    neutral: "I'm here and ready to listen to whatever is on your mind. Sometimes it helps just to have someone who cares. What would you like to talk about today?"
  },
  professional: {
    positive: "Excellent! It's great to see you in a positive mindset. This is an ideal time to build on these good feelings. What goals or aspirations are you thinking about right now?",
    negative: "I understand you're facing some challenges. Let's work together to identify what's causing these feelings and develop some strategies to help you move forward. What specific situation is troubling you most?",
    neutral: "I'm here to help you explore your thoughts and feelings. What's been on your mind lately? Let's work together to gain some clarity."
  },
  casual: {
    positive: "Hey, that's awesome! Love hearing the good vibes. What's got you feeling so great today?",
    negative: "Ah man, sounds like you're having a rough time. That really sucks. Want to talk about what's going on? I'm here for you.",
    neutral: "What's up? How are you doing today? Just let me know what's on your mind."
  },
  therapist: {
    positive: "I can sense the positive energy in your voice, and that's beautiful to witness. How does it feel in your body to experience these positive emotions? What do you think has contributed to this feeling?",
    negative: "I hear the pain in your words, and I want to acknowledge how difficult this must be for you. Your feelings are important and valid. Can you tell me more about what you're experiencing right now?",
    neutral: "I'm present with you in this moment. Whatever you're feeling or thinking about is welcome here. What would feel most helpful to explore together today?"
  }
};

const EMOTION_RESPONSES: { [key: string]: string } = {
  anxious: "I can sense the anxiety in your voice. It's completely normal to feel this way sometimes. Let's take this one step at a time. What's making you feel most anxious right now?",
  sad: "I hear the sadness, and I want you to know it's okay to feel this way. Sadness is a natural part of being human. What's been making you feel sad?",
  angry: "I can feel the frustration and anger in your words. Those are valid emotions. What's been making you feel this way? Sometimes talking about it can help.",
  happy: "I love hearing the happiness in your voice! It's wonderful when we feel joy. What's been bringing you this happiness?",
  fear: "I understand you might be feeling scared or worried. Fear can be overwhelming, but you're not alone. What's causing these feelings of fear?",
  love: "There's such warmth in your voice. Love is a beautiful emotion to experience. What or who is bringing this feeling of love into your life?",
  pride: "I can hear the pride and accomplishment in your voice. That's wonderful! What achievement or moment are you feeling proud about?",
  relief: "I sense a feeling of relief. It sounds like something positive has happened or a burden has been lifted. What's bringing you this sense of relief?",
  gratitude: "There's such appreciation in your voice. Gratitude is a powerful emotion. What are you feeling thankful for today?",
  disappointment: "I can hear the disappointment, and that must be really hard to deal with. It's natural to feel let down sometimes. What happened that left you feeling this way?"
};

export const generateAIResponse = async (context: ConversationContext): Promise<AIResponse> => {
  const { transcript, sentiment, emotions, personality } = context;

  try {
    // Get personality-based response
    const personalityResponses = PERSONALITY_RESPONSES[personality as keyof typeof PERSONALITY_RESPONSES] || PERSONALITY_RESPONSES.supportive;
    
    // Check for specific emotion first
    if (emotions?.primary_emotion && EMOTION_RESPONSES[emotions.primary_emotion]) {
      return {
        content: EMOTION_RESPONSES[emotions.primary_emotion]
      };
    }
    
    // Fall back to sentiment-based response
    const sentimentKey = sentiment as keyof typeof personalityResponses;
    const response = personalityResponses[sentimentKey] || personalityResponses.neutral;
    
    return {
      content: response
    };

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    return {
      content: "I'm here to listen and support you. What would you like to talk about today?"
    };
  }
};

export const generateWellnessRecommendation = async (emotions: any): Promise<string> => {
  if (!emotions) return '';

  const wellnessTips: { [key: string]: string } = {
    anxious: "Try the 4-7-8 breathing technique: Inhale for 4 counts, hold for 7, exhale for 8. This can help calm your nervous system.",
    sad: "It's okay to feel sad. Consider doing something gentle for yourself - maybe listening to music, taking a warm bath, or calling a friend.",
    angry: "When feeling angry, try the STOP technique: Stop what you're doing, Take a breath, Observe your feelings, Proceed mindfully.",
    happy: "Savor this positive moment! Consider writing down what made you happy today, or share your joy with someone you care about.",
    fear: "Ground yourself with the 5-4-3-2-1 technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
    love: "Love is beautiful! Consider expressing gratitude for the people or things you love, or do something kind for someone special.",
    pride: "Celebrate your accomplishment! Take a moment to acknowledge your hard work and consider sharing your success with others.",
    relief: "Enjoy this feeling of relief. Take some deep breaths and allow yourself to fully experience this positive shift.",
    gratitude: "Gratitude is powerful for wellbeing. Consider keeping a gratitude journal or telling someone how much they mean to you.",
    disappointment: "Disappointment is tough. Be gentle with yourself and remember that setbacks are part of growth. What can you learn from this experience?"
  };
  
  return wellnessTips[emotions.primary_emotion] || "Take a moment to breathe deeply and be present with yourself.";
};