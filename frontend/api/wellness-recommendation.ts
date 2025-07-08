import OpenAI from 'openai';

// Initialize OpenAI client with server-side API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const FALLBACK_WELLNESS_TIPS: { [key: string]: string } = {
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emotions } = req.body;

    if (!emotions) {
      return res.status(400).json({ error: 'Missing emotions data' });
    }

    let recommendation = '';

    // Try OpenAI first if API key is available
    if (process.env.OPENAI_API_KEY) {
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

        recommendation = completion.choices[0]?.message?.content || '';
      } catch (openaiError) {
        console.error('OpenAI API error for wellness:', openaiError);
        // Fall back to predefined tips
        recommendation = FALLBACK_WELLNESS_TIPS[emotions.primary_emotion] || "Take a moment to breathe deeply and be present with yourself.";
      }
    } else {
      // No API key available, use fallback tips
      recommendation = FALLBACK_WELLNESS_TIPS[emotions.primary_emotion] || "Take a moment to breathe deeply and be present with yourself.";
    }

    return res.status(200).json({ recommendation });

  } catch (error) {
    console.error('Error in wellness recommendation handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      recommendation: "Take a moment to breathe deeply and be present with yourself."
    });
  }
}