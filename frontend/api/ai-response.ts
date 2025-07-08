import OpenAI from 'openai';

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side environment variable
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

const FALLBACK_RESPONSES = {
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

// Changed from 'export default function handler' to 'export default async function'
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const context = req.body;
    const { transcript, sentiment, emotions, conversationHistory, personality } = context;

    // Validate required fields
    if (!transcript || !personality) {
      return res.status(400).json({ error: 'Missing required fields: transcript and personality' });
    }

    let response;

    // Try OpenAI first if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        const systemPrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.supportive;
        
        const emotionContext = emotions ? `
        Detected emotions: Primary emotion is "${emotions.primary_emotion}" (${emotions.category}, ${emotions.intensity} intensity).
        Top emotions: ${emotions.top_emotions?.map((e) => `${e.emotion} (${(e.score * 100).toFixed(1)}%)`).join(', ') || 'None'}
        ` : '';

        const messages = [
          {
            role: 'system',
            content: `${systemPrompt}

            You are responding to someone who just spoke to you. Here's the context:
            - What they said: "${transcript}"
            - Overall sentiment: ${sentiment}
            ${emotionContext}
            
            Respond naturally and appropriately to their emotional state. Keep responses conversational and under 150 words unless they specifically ask for detailed advice. Show that you understand their emotional state through your response tone and content.`
          },
          ...conversationHistory.slice(-10), // Keep last 10 messages for context
          {
            role: 'user',
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

        response = {
          content: content.trim()
        };

      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        // Fall back to predefined responses
        response = getFallbackResponse(context);
      }
    } else {
      // No API key available, use fallback responses
      response = getFallbackResponse(context);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in AI response handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      content: "I'm here to listen and support you. What would you like to talk about today?"
    });
  }
}

function getFallbackResponse(context) {
  const { sentiment, personality } = context;
  
  const personalityResponses = FALLBACK_RESPONSES[personality] || FALLBACK_RESPONSES.supportive;
  const sentimentKey = sentiment;
  const content = personalityResponses[sentimentKey] || personalityResponses.neutral;
  
  return { content };
}