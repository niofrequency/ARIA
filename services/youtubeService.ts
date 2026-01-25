// src/services/youtubeService.ts

// ✅ Key is ready to go. 
// (Best Practice: Move "AIza..." to your .env file as VITE_YOUTUBE_API_KEY when possible)
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || "AIzaSyBwj_-MU9p6bjePYnekrNx621n9P7PmuOs";

export const fetchYoutubeUrl = async (searchTerm: string): Promise<string | null> => {
  try {
    // ✅ FIX: Only trigger fallback if the key is completely missing/empty
    if (!YOUTUBE_API_KEY) {
      console.warn("⚠️ No YouTube API Key provided. Returning search fallback.");
      // Fallback: Returns a "Search Results" embed (list) instead of a specific video
      return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(searchTerm)}`;
    }

    const endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(searchTerm)}&type=video&key=${YOUTUBE_API_KEY}`;
    
    const res = await fetch(endpoint);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      // Returns a specific, playable video link
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    return null;
  } catch (err) {
    console.error("❌ YouTube Search Error:", err);
    return null;
  }
};
