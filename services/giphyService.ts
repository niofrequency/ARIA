// src/services/giphyService.ts

/**
 * GIPHY NEURAL LINK
 * logic:
 * 1. Pulls API Key from Vite environment.
 * 2. Filters for 'R' rating to ensure spicy/mature reactions aren't blocked.
 * 3. Returns lightweight 'downsized_medium' to save user data/bandwidth.
 */

// ✅ Use this syntax so it works on Vercel and locally
const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY || "daemmJlqZqA0L3Zteol5DBOyGx98NDPt"; 

export const fetchGiphyUrl = async (searchTerm: string): Promise<string | null> => {
  try {
    if (!GIPHY_KEY) {
      console.warn("⚠️ Giphy API Key missing. Check your .env or Vercel settings.");
      return null;
    }

    // rating=r is crucial for ARIA's personality to not be censored by the API
    const endpoint = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchTerm)}&limit=1&rating=r`;
    
    const res = await fetch(endpoint);
    const data = await res.json();
    
    if (data.data && data.data.length > 0) {
      // ✅ OPTIMIZATION: Use medium size for faster mobile loading
      const image = data.data[0].images.downsized_medium || data.data[0].images.original;
      
      // ✅ CLEANING: Remove tracking pixels/garbage from the end of the URL
      return image.url.split('?')[0]; 
    }
    
    return null;
  } catch (err) {
    console.error("❌ Giphy Neural Link Error:", err);
    return null;
  }
};
