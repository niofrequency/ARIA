import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { URL } from 'url'; // ✅ Fixes the url.parse() warning

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

  // Browser Headers (Crucial for Scrapers)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    console.log(`🔍 Searching (Fast Mode): ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: OFFICIAL APIs ---
    if (!videoData) videoData = await searchPornhub(searchTerm as string);
    if (!videoData) videoData = await searchRedTube(searchTerm as string);
    if (!videoData) videoData = await searchEporner(searchTerm as string);
    if (!videoData) videoData = await searchYouPorn(searchTerm as string);

    // --- TIER 2: SCRAPERS ---
    if (!videoData) {
        console.log("APIs empty. Attempting scraper: Spankbang...");
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
      return res.status(404).json({ found: false, error: 'No videos found on any provider' });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// ==========================================
// 🎲 HELPER: RANDOM PICKER (No Network Check)
// ==========================================
// Replaces getWorkingVideo to prevent blocking
function pickRandom<T>(arr: T[], limit: number = 20): T | null {
  if (!arr || arr.length === 0) return null;
  // Pick from the top 'limit' results to ensure quality + variety
  const pool = arr.slice(0, limit); 
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// 🚀 TIER 1: OFFICIAL APIs
// ==========================================

async function searchPornhub(term: string) {
  try {
    // ✅ Use URL object to prevent deprecation warnings
    const url = new URL('https://www.pornhub.com/webmasters/search');
    url.searchParams.append('search', term);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
      // Filter candidates that have a valid URL
      const candidates = data.videos.filter((v: any) => v.url && v.url.includes('viewkey='));
      
      const video = pickRandom(candidates); // ✅ Just pick one, don't ping it
      
      if (video) {
          const viewKey = video.url.split('viewkey=')[1];
          return { 
              url: `https://www.pornhub.com/embed/${viewKey}`, 
              provider: 'pornhub', 
              title: video.title 
          };
      }
    }
  } catch (e) { console.error("PH Error", e); }
  return null;
}

async function searchRedTube(term: string) {
  try {
    const url = new URL('https://api.redtube.com/');
    url.searchParams.append('data', 'redtube.Videos.searchVideos');
    url.searchParams.append('output', 'json');
    url.searchParams.append('search', term);
    url.searchParams.append('thumbsize', 'medium');

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos); // ✅ Random pick
        if (video && video.video && video.video.video_id) {
             return { 
                 url: `https://embed.redtube.com/?id=${video.video.video_id}`, 
                 provider: 'redtube', 
                 title: video.video.title 
             };
        }
    }
  } catch (e) { console.error("RT Error", e); }
  return null;
}

async function searchEporner(term: string) {
  try {
    const url = new URL('https://www.eporner.com/api/v2/webmasters/search');
    url.searchParams.append('query', term);
    url.searchParams.append('format', 'json');

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos); // ✅ Random pick
        if (video) {
            return { 
                url: video.embed, 
                provider: 'eporner', 
                title: video.title 
            };
        }
    }
  } catch (e) { console.error("EP Error", e); }
  return null;
}

async function searchYouPorn(term: string) {
  try {
    const url = new URL('https://www.youporn.com/api/webmasters/search');
    url.searchParams.append('search', term);

    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos); // ✅ Random pick
        if (video) {
            const match = video.url.match(/\/watch\/(\d+)/);
            if (match && match[1]) {
                return { 
                    url: `https://www.youporn.com/embed/${match[1]}`, 
                    provider: 'youporn', 
                    title: video.title 
                };
            }
        }
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

    return pickRandom(candidates); // ✅ Random pick
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

    return pickRandom(candidates); // ✅ Random pick
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

    return pickRandom(candidates); // ✅ Random pick
  } catch (e) { console.error("XH Error", e); }
  return null;
}
