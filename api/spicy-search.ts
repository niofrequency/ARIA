import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { term } = req.query;
  const searchTerm = Array.isArray(term) ? term[0] : term;

  if (!searchTerm) return res.status(400).json({ error: 'Term required' });

  // Browser Headers for Scrapers
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    console.log(`🔍 Searching for Embeds (Randomized): ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: OFFICIAL APIs ---
    
    // 1. Pornhub (Randomized)
    if (!videoData) videoData = await searchPornhub(searchTerm as string);
    
    // 2. RedTube (Randomized)
    if (!videoData) videoData = await searchRedTube(searchTerm as string);
    
    // 3. Eporner (Randomized)
    if (!videoData) videoData = await searchEporner(searchTerm as string);
    
    // 4. YouPorn (Randomized)
    if (!videoData) videoData = await searchYouPorn(searchTerm as string);


    // --- TIER 2: SCRAPERS ---

    // 5. Spankbang (Randomized)
    if (!videoData) {
        console.log("APIs empty. Attempting scraper: Spankbang...");
        videoData = await scrapeSpankbang(searchTerm as string, headers);
    }

    // 6. TNAFlix (Randomized)
    if (!videoData) {
        console.log("Attempting scraper: TNAFlix...");
        videoData = await scrapeTnaflix(searchTerm as string, headers);
    }

    // 7. XHamster (Randomized)
    if (!videoData) {
        console.log("Attempting scraper: XHamster...");
        videoData = await scrapeXhamster(searchTerm as string, headers);
    }

    // RESPONSE
    if (videoData) {
      return res.status(200).json({ found: true, ...videoData });
    } else {
      return res.status(404).json({ found: false, error: 'No videos found on any provider' });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 🎲 HELPER: RANDOM PICKER
// ==========================================
function pickRandom<T>(arr: T[], limit: number = 10): T | null {
  if (!arr || arr.length === 0) return null;
  // Pick from the top 'limit' results to ensure relevance + variety
  const pool = arr.slice(0, limit); 
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// 🚀 TIER 1: OFFICIAL APIs (Returning Embeds)
// ==========================================

async function searchPornhub(term: string) {
  try {
    const url = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
      // ✅ RANDOM SELECTION
      const video = pickRandom(data.videos);
      if (!video) return null;

      const viewKey = video.url.split('viewkey=')[1];
      if (viewKey) {
          return { url: `https://www.pornhub.com/embed/${viewKey}`, provider: 'pornhub', title: video.title };
      }
    }
  } catch (e) { console.error("PH API Error", e); }
  return null;
}

async function searchRedTube(term: string) {
  try {
    const url = `https://api.redtube.com/?data=redtube.Videos.searchVideos&output=json&search=${encodeURIComponent(term)}&thumbsize=medium`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        // ✅ RANDOM SELECTION
        const video = pickRandom(data.videos);
        if (!video) return null;

        return { url: `https://embed.redtube.com/?id=${video.video_id}`, provider: 'redtube', title: video.title };
    }
  } catch (e) { console.error("RT API Error", e); }
  return null;
}

async function searchEporner(term: string) {
  try {
    const url = `https://www.eporner.com/api/v2/webmasters/search?query=${encodeURIComponent(term)}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        // ✅ RANDOM SELECTION
        const video = pickRandom(data.videos);
        if (!video) return null;

        return { url: video.embed, provider: 'eporner', title: video.title };
    }
  } catch (e) { console.error("EP API Error", e); }
  return null;
}

async function searchYouPorn(term: string) {
  try {
    const url = `https://www.youporn.com/api/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        // ✅ RANDOM SELECTION
        const video = pickRandom(data.videos);
        if (!video) return null;

        const match = video.url.match(/\/watch\/(\d+)/);
        if (match && match[1]) {
            return { url: `https://www.youporn.com/embed/${match[1]}`, provider: 'youporn', title: video.title };
        }
    }
  } catch (e) { console.error("YP API Error", e); }
  return null;
}

// ==========================================
// 🕷️ TIER 2: SCRAPERS (Constructing Embeds)
// ==========================================

async function scrapeSpankbang(term: string, headers: any) {
  try {
    const url = `https://spankbang.com/s/${encodeURIComponent(term)}/`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Accumulate all valid links first
    const candidates: any[] = [];

    $('.video-list-video').each((i, el) => {
        const item = $(el);
        if (item.hasClass('paid') || item.hasClass('cam')) return; 
        
        const relLink = item.find('.thumb').attr('href');
        const text = item.find('.title').text();
        const idMatch = relLink?.match(/^\/([a-zA-Z0-9]+)\/video/);

        if (idMatch && idMatch[1]) {
             candidates.push({
                 url: `https://spankbang.com/${idMatch[1]}/embed/`,
                 title: text
             });
        }
    });

    // ✅ RANDOM SELECTION
    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'spankbang' } : null;

  } catch (e) { console.error("SB Scrape Error", e); }
  return null;
}

async function scrapeTnaflix(term: string, headers: any) {
  try {
    const url = `https://www.tnaflix.com/search.php?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const candidates: any[] = [];

    $('li.video_box').each((i, el) => {
        const item = $(el);
        if (!item.find('.info_time').text()) return;

        const relLink = item.find('a').attr('href'); 
        const idMatch = relLink?.match(/video(\d+)$/);

        if (idMatch && idMatch[1]) {
            candidates.push({
                url: `https://www.tnaflix.com/embed/${idMatch[1]}`,
                title: 'Video'
            });
        }
    });

    // ✅ RANDOM SELECTION
    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'tnaflix' } : null;

  } catch (e) { console.error("TNA Scrape Error", e); }
  return null;
}

async function scrapeXhamster(term: string, headers: any) {
  try {
    const url = `https://xhamster.com/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const candidates: any[] = [];

    // Select multiple candidates instead of just first
    $('a.video-thumb__image-container').not('.promo').slice(0, 10).each((i, el) => {
        const link = $(el).attr('href');
        const idMatch = link?.match(/-(\d+)$/);
        
        if (idMatch && idMatch[1] && link && !link.includes('click')) {
            candidates.push({
                url: `https://xhamster.com/embed/${idMatch[1]}`,
                title: 'Video'
            });
        }
    });

    // ✅ RANDOM SELECTION
    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'xhamster' } : null;

  } catch (e) { console.error("XH Scrape Error", e); }
  return null;
}
