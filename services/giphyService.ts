// src/services/giphyService.ts

// ⚠️ SECURITY NOTE: In production, move this to .env (e.g. import.meta.env.VITE_GIPHY_KEY)
const VITE_GIPHY_API_KEY = "daemmJlqZqA0L3Zteol5DBOyGx98NDPt"; 

export const fetchGiphyUrl = async (searchTerm: string): Promise<string | null> => {
  try {
    // 1. RATING ADJUSTMENT: Changed 'pg-13' to 'r' to allow mature/spicy reactions
    // 2. LIMIT: Kept at 1
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=1&rating=r`);
    
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      // ✅ OPTIMIZATION: Use 'downsized_medium' (lighter) instead of 'original' (heavy)
      // If downsized isn't available, fallback to original.
      const image = data.data[0].images.downsized_medium || data.data[0].images.original;
      return image.url;
    }
    return null;
  } catch (err) {
    console.error("Giphy Error:", err);
    return null;
  }
};
