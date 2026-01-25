// src/services/spicyService.ts

export const fetchSpicyLink = async (searchTerm: string): Promise<string | null> => {
  try {
    // 1. ATTEMPT: Try the Vercel Scraper API (Direct Video Link)
    // This attempts to get a specific video URL via your backend
    const response = await fetch(`/api/spicy-search?term=${encodeURIComponent(searchTerm)}`);
    
    // Safety Check: Ensure the API actually returned JSON (and not an HTML error page)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();

      if (data.found && data.url) {
        console.log(`🔥 Spicy Content Found via ${data.provider}:`, data.url);
        return data.url;
      }
    }

    // If we reach here, the API didn't find a video or returned HTML (404/500)
    console.warn("⚠️ Spicy API returned no results or failed. Switching to Fallback.");
    throw new Error("API request failed or empty");

  } catch (error) {
    // 2. FALLBACK: Direct Search Links (Guaranteed to Work)
    // If the scraper fails, we construct a direct search URL for one of the providers.
    // This ensures the user ALWAYS sees a clickable link instead of nothing.
    
    console.log(`⚠️ Using Fallback Search Link for: "${searchTerm}"`);

    const providers = [
      { name: 'spankbang', url: `https://spankbang.com/s/${encodeURIComponent(searchTerm)}/` },
      { name: 'xhamster', url: `https://xhamster.com/search?q=${encodeURIComponent(searchTerm)}` },
      { name: 'tnaflix', url: `https://www.tnaflix.com/search.php?q=${encodeURIComponent(searchTerm)}` }
    ];

    // Pick a random provider for variety
    const randomProvider = providers[Math.floor(Math.random() * providers.length)];
    
    return randomProvider.url;
  }
};
