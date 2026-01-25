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

  // Browser Headers (Crucial for Scrapers & Validation)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    console.log(`🔍 Searching with VALIDATION: ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: OFFICIAL APIs ---
    if (!videoData) videoData = await searchPornhub(searchTerm as string);
    if (!videoData) videoData = await searchRedTube(searchTerm as string);
    if (!videoData) videoData = await searchEporner(searchTerm as string);
    if (!videoData) videoData = await searchYouPorn(searchTerm as string);

    // --- TIER 2: SCRAPERS ---
    if (!videoData) {
        console.log("APIs empty/failed. Attempting scraper: Spankbang...");
        videoData = await scrapeSpankbang(searchTerm as string, headers);
    }
    if (!videoData) {
        console.log("Attempting scraper: TNAFlix...");
        videoData = await scrapeTnaflix(searchTerm as string, headers);
    }
    if (!videoData) {
        console.log("Attempting scraper: XHamster...");
        videoData = await scrapeXhamster(searchTerm as string, headers);
    }

    // RESPONSE
    if (videoData) {
      return res.status(200).json({ found: true, ...videoData });
    } else {
      return res.status(404).json({ found: false, error: 'No working videos found' });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 🛡️ HELPER: LIVE LINK VALIDATOR
// ==========================================
async function getWorkingVideo(candidates: any[]): Promise<any | null> {
  if (!candidates || candidates.length === 0) return null;

  // 1. Shuffle the list to avoid duplicates (Fisher-Yates Shuffle)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 2. Check up to 5 candidates until one works
  // We limit to 5 checks to keep the API fast.
  const checkLimit = Math.min(candidates.length, 5);

  for (let i = 0; i < checkLimit; i++) {
    const video = candidates[i];
    console.log(`Testing URL [${i+1}/${checkLimit}]: ${video.url}`);
    
    try {
      // Send a quick HEAD request to see if the link is alive (200 OK)
      const response = await fetch(video.url, { 
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      
      if (response.ok) {
        console.log("✅ Verified Working!");
        return video;
      } else {
        console.warn(`❌ Broken Link (${response.status}): ${video.url}`);
      }
    } catch (e) {
      console.warn(`❌ Network Error for: ${video.url}`);
    }
  }

  return null; // All 5 failed
}

// ==========================================
// 🚀 TIER 1: OFFICIAL APIs
// ==========================================

async function searchPornhub(term: string) {
  try {
    const url = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
      const candidates = data.videos.map((v: any) => {
          const viewKey = v.url.split('viewkey=')[1];
          return viewKey ? { url: `https://www.pornhub.com/embed/${viewKey}`, provider: 'pornhub', title: v.title } : null;
      }).filter(Boolean);
      
      return await getWorkingVideo(candidates);
    }
  } catch (e) { console.error("PH Error", e); }
  return null;
}

async function searchRedTube(term: string) {
  try {
    const url = `https://api.redtube.com/?data=redtube.Videos.searchVideos&output=json&search=${encodeURIComponent(term)}&thumbsize=medium`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const candidates = data.videos.map((v: any) => ({
             url: `https://embed.redtube.com/?id=${v.video.video_id}`, 
             provider: 'redtube', 
             title: v.video.title 
        }));
        return await getWorkingVideo(candidates);
    }
  } catch (e) { console.error("RT Error", e); }
  return null;
}

async function searchEporner(term: string) {
  try {
    const url = `https://www.eporner.com/api/v2/webmasters/search?query=${encodeURIComponent(term)}&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const candidates = data.videos.map((v: any) => ({
             url: v.embed, 
             provider: 'eporner', 
             title: v.title 
        }));
        return await getWorkingVideo(candidates);
    }
  } catch (e) { console.error("EP Error", e); }
  return null;
}

async function searchYouPorn(term: string) {
  try {
    const url = `https://www.youporn.com/api/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const candidates = [];
        for (const v of data.videos) {
            const match = v.url.match(/\/watch\/(\d+)/);
            if (match && match[1]) {
                candidates.push({ 
                    url: `https://www.youporn.com/embed/${match[1]}`, 
                    provider: 'youporn', 
                    title: v.title 
                });
            }
        }
        return await getWorkingVideo(candidates);
    }
  } catch (e) { console.error("YP Error", e); }
  return null;
}

// ==========================================
// 🕷️ TIER 2: SCRAPERS
// ==========================================

async function scrapeSpankbang(term: string, headers: any) {
  try {
    const url = `https://spankbang.com/s/${encodeURIComponent(term)}/`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
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
                 title: text,
                 provider: 'spankbang'
             });
        }
    });

    return await getWorkingVideo(candidates);
  } catch (e) { console.error("SB Error", e); }
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
                title: 'Video',
                provider: 'tnaflix'
            });
        }
    });

    return await getWorkingVideo(candidates);
  } catch (e) { console.error("TNA Error", e); }
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

    $('a.video-thumb__image-container').not('.promo').slice(0, 20).each((i, el) => {
        const link = $(el).attr('href');
        const idMatch = link?.match(/-(\d+)$/);
        
        if (idMatch && idMatch[1] && link && !link.includes('click')) {
            candidates.push({
                url: `https://xhamster.com/embed/${idMatch[1]}`,
                title: 'Video',
                provider: 'xhamster'
            });
        }
    });

    return await getWorkingVideo(candidates);
  } catch (e) { console.error("XH Error", e); }
  return null;
}
