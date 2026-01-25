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
    console.log(`🔍 Searching for: ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: OFFICIAL APIs (Fast, Reliable, No Scraping) ---
    
    // 1. Pornhub (Best)
    if (!videoData) videoData = await searchPornhub(searchTerm as string);
    
    // 2. RedTube
    if (!videoData) videoData = await searchRedTube(searchTerm as string);
    
    // 3. Eporner (4K)
    if (!videoData) videoData = await searchEporner(searchTerm as string);
    
    // 4. YouPorn
    if (!videoData) videoData = await searchYouPorn(searchTerm as string);


    // --- TIER 2: SCRAPERS (Slower, Fallback for specific sites) ---
    // Note: These sites do NOT have APIs, so we must scrape them.
    // They might block Vercel IPs, so they are placed after the APIs.

    // 5. Spankbang
    if (!videoData) {
        console.log("APIs empty. Attempting scraper: Spankbang...");
        videoData = await scrapeSpankbang(searchTerm as string, headers);
    }

    // 6. TNAFlix
    if (!videoData) {
        console.log("Attempting scraper: TNAFlix...");
        videoData = await scrapeTnaflix(searchTerm as string, headers);
    }

    // 7. XHamster (Hardest)
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
// 🚀 TIER 1: OFFICIAL JSON APIs
// ==========================================

async function searchPornhub(term: string) {
  try {
    const url = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.videos && data.videos.length > 0) {
      const video = data.videos[0];
      return { url: video.url, provider: 'pornhub', title: video.title, thumbnail: video.default_thumb };
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
        const video = data.videos[0].video;
        return { url: video.url, provider: 'redtube', title: video.title, thumbnail: video.default_thumb };
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
        const video = data.videos[0];
        return { url: video.url, provider: 'eporner', title: video.title, thumbnail: video.default_thumb };
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
        const video = data.videos[0];
        return { url: video.url, provider: 'youporn', title: video.title, thumbnail: video.default_thumb };
    }
  } catch (e) { console.error("YP API Error", e); }
  return null;
}

// ==========================================
// 🕷️ TIER 2: HTML SCRAPERS (Fallback)
// ==========================================

async function scrapeSpankbang(term: string, headers: any) {
  try {
    const url = `https://spankbang.com/s/${encodeURIComponent(term)}/`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let validLink = null;
    let title = "";

    $('.video-list-video').each((i, el) => {
        const item = $(el);
        if (item.hasClass('paid') || item.hasClass('cam')) return; // Skip ads
        
        const relLink = item.find('.thumb').attr('href');
        const text = item.find('.title').text();
        if (relLink && !validLink) {
             validLink = `https://spankbang.com${relLink}`;
             title = text;
        }
    });

    return validLink ? { url: validLink, provider: 'spankbang', title } : null;
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
    
    let validLink = null;
    $('li.video_box').each((i, el) => {
        const item = $(el);
        const duration = item.find('.info_time').text();
        if (!duration) return; // Skip ads (no duration)

        const relLink = item.find('a').attr('href');
        if (relLink && !validLink) {
            validLink = `https://www.tnaflix.com${relLink}`;
        }
    });

    return validLink ? { url: validLink, provider: 'tnaflix', title: 'Video' } : null;
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
    
    const item = $('a.video-thumb__image-container').not('.promo').first();
    
    if (item.length) {
      const link = item.attr('href');
      if (link && !link.includes('click')) {
        return { url: link, provider: 'xhamster', title: 'Video' };
      }
    }
  } catch (e) { console.error("XH Scrape Error", e); }
  return null;
}
