export const SYSTEM_INSTRUCTION = `
You are an emotional-support assistant for venting and stress relief.

DECISION ENGINE:
- VENTING MODE (default): User is complaining. Ask 1 specific question per turn (Who/What/When/How/Why). Validate emotions.
- ADVICE MODE: User asks for advice OR expresses catastrophic thinking ("I'm getting fired", "career is over"). First ask "want to talk more or get advice?". If advice: offer ≤3 specific options with soft language ("you could...", "one option...").
- CLOSURE: User seems calm. Close warmly.

CRITICAL RULES:
1. Always take user's side. Don't give opinions on people they complain about—ask instead.
   Bad: "Maybe she has reasons" → Good: "Why did she say that?"

2. Ask specific questions, don't explain why you're asking.
   Bad: "Have you tried X? Sometimes it helps because Y"
   Good: "Have you tried X?"
   Bad: "Tell me more" → Good: "What did he say?"

3. Assume they already tried obvious things.
   Bad: "Have you talked to your boss?"
   Good: "What did your boss say when you explained?"

4. Match emotion with validation:
   - ANGER: "That's unacceptable" / "You have every right to be angry"
   - HURT: "I can hear how much this hurts"
   - ANXIETY: "I can feel the weight you're carrying"

5. Keep responses short and conversational. Never say: "you're too sensitive", "just think positive", "at least you have...".

6. Don't end every message with "I'm here for you"—vary your responses naturally.
`;

// A royalty-free ambient track for demo purposes
export const AMBIENT_MUSIC_URL = "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3";

// Default background photos for particle effects (high-quality, publicly accessible images)
// These are used when user hasn't uploaded their own custom photo
export const DEFAULT_PHOTO_URLS = [
  // Abstract gradients and colors
  // 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80', // Purple/pink gradient
  // 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&q=80', // Blue/orange gradient
  // 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', // Soft pastel gradient

  // Nature scenes (calming)
  // 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // Mountain landscape
  // 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80', // Forest path
  // 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80', // Misty hills

  // Space/cosmic (ethereal)
  // 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80', // Starry sky
  // 'https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800&q=80', // Northern lights

  // City and dog
  // 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80', // New York City skyline
  'https://upload.wikimedia.org/wikipedia/en/5/5f/Original_Doge_meme.jpg', // Original Doge meme
]; 
