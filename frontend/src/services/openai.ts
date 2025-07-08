// Updated OpenAI service to use Vercel serverless functions
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

export const generateAIResponse = async (context: ConversationContext): Promise<AIResponse> => {
  try {
    const response = await fetch('/api/ai-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error calling AI response API:', error);
    
    // Fallback responses based on sentiment
    const fallbackResponses = {
      positive: "That sounds wonderful! I'm glad to hear you're feeling good. Tell me more about what's making you happy.",
      negative: "I can hear that you're going through something difficult. I'm here to listen and support you. Would you like to talk about what's bothering you?",
      neutral: "I'm listening. What's on your mind today? Feel free to share whatever you'd like to talk about."
    };

    return {
      content: fallbackResponses[context.sentiment as keyof typeof fallbackResponses] || fallbackResponses.neutral
    };
  }
};

export const generateWellnessRecommendation = async (emotions: any): Promise<string> => {
  if (!emotions) return '';

  try {
    const response = await fetch('/api/wellness-recommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emotions }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.recommendation || '';

  } catch (error) {
    console.error('Error calling wellness recommendation API:', error);
    
    // Fallback wellness tips
    const fallbackTips: { [key: string]: string } = {
      anxious: "Try deep breathing: Inhale for 4 counts, hold for 4, exhale for 6. This can help calm your nervous system.",
      sad: "Be gentle with yourself. Consider doing something nurturing like listening to music or calling a friend.",
      angry: "Try the STOP technique: Stop, Take a breath, Observe your feelings, Proceed mindfully.",
      happy: "Savor this positive moment! Consider sharing your joy with someone you care about.",
      fear: "Ground yourself with the 5-4-3-2-1 technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste."
    };
    
    return fallbackTips[emotions.primary_emotion] || "Take a moment to breathe deeply and be present with yourself.";
  }
};