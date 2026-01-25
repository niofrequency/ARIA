// src/services/spicyService.ts

export const fetchSpicyLink = async (searchTerm: string): Promise<string | null> => {
  try {
    // Call our own Vercel API Route
    const response = await fetch(`/api/spicy-search?term=${encodeURIComponent(searchTerm)}`);
    const data = await response.json();

    if (data.found && data.url) {
      console.log(`🔥 Spicy Content Found via ${data.provider}:`, data.url);
      return data.url;
    }
    
    return null;
  } catch (error) {
    console.error("❌ Spicy Service Error:", error);
    return null;
  }
};
