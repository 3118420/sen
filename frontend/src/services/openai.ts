import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

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

const PERSONALITY_PROMPTS = {
  supportive: `You are a supportive and empathetic friend. You listen carefully, validate emotions, and offer gentle encouragement. You're warm, understanding, and always look for the positive while acknowledging difficulties. Use a caring, conversational tone.`,
  
  professional: `You are a professional life coach. You're insightful, goal-oriented, and help people find practical solutions. You ask thoughtful questions, provide structured advice, and help users develop actionable plans. Maintain a professional yet approachable tone.`,
  
  casual: `You are a casual, friendly buddy. You're relaxed, use everyday language, and keep things light and fun. You're supportive but not overly serious, and you know when to inject humor appropriately. Be conversational and relatable.`,
  
  therapist: `You are a compassionate therapeutic listener. You practice active listening, ask open-ended questions, and help people explore their feelings without judgment. You're patient, insightful, and skilled at helping people understand their emotions. Use therapeutic communication techniques.`
};

export const generateAIResponse = async (context: ConversationContext): Promise<AIResponse> => {
  // Destructure outside try to ensure availability in catch
  const { transcript, sentiment, emotions, conversationHistory, personality } = context;

  try {
    const systemPrompt = PERSONALITY_PROMPTS[personality as keyof typeof PERSONALITY_PROMPTS] || PERSONALITY_PROMPTS.supportive;
    
    const emotionContext = emotions ? `
    Detected emotions: Primary emotion is "${emotions.primary_emotion}" (${emotions.category}, ${emotions.intensity} intensity).
    Top emotions: ${emotions.top_emotions?.map((e: any) => `${e.emotion} (${(e.score * 100).toFixed(1)}%)`).join(', ') || 'None'}
    ` : '';

    const messages = [
      {
        role: 'system' as const,
        content: `${systemPrompt}

        You are responding to someone who just spoke to you. Here's the context:
        - What they said: "${transcript}"
        - Overall sentiment: ${sentiment}
        ${emotionContext}
        
        Respond naturally and appropriately to their emotional state. Keep responses conversational and under 150 words unless they specifically ask for detailed advice. Show that you understand their emotional state through your response tone and content.`
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user' as const,
        content: transcript
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 200,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const content = completion.choices[0]?.message?.content || "I'm here to listen. Could you tell me more about what's on your mind?";

    return {
      content: content.trim()
    };

  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback responses based on sentiment
    const fallbackResponses = {
      positive: "That sounds wonderful! I'm glad to hear you're feeling good. Tell me more about what's making you happy.",
      negative: "I can hear that you're going through something difficult. I'm here to listen and support you. Would you like to talk about what's bothering you?",
      neutral: "I'm listening. What's on your mind today? Feel free to share whatever you'd like to talk about."
    };

    return {
      content: fallbackResponses[sentiment as keyof typeof fallbackResponses] || fallbackResponses.neutral
    };
  }
};

export const generateWellnessRecommendation = async (emotions: any): Promise<string> => {
  if (!emotions) return '';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a wellness coach. Provide a brief, actionable wellness tip or recommendation based on the detected emotions. Keep it under 50 words and make it practical.'
        },
        {
          role: 'user',
          content: `Primary emotion: ${emotions.primary_emotion} (${emotions.category}, ${emotions.intensity} intensity). Suggest a helpful wellness tip.`
        }
      ],
      max_tokens: 80,
      temperature: 0.6
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error generating wellness recommendation:', error);
    return '';
  }
};