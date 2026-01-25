import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import { URL } from 'url';

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

  // 2. FAKE BROWSER HEADERS
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  };

  try {
    console.log(`🔍 Searching (Priority Mode): ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: THE "RELIABLE" APIs (Least likely to block) ---
    
    // 1. Eporner (Very bot friendly, usually 4K)
    if (!videoData) videoData = await searchEporner(searchTerm as string, headers);

    // 2. Spankbang (Scraper - usually reliable)
    if (!videoData) {
        console.log("Eporner empty. Trying Spankbang...");
        videoData = await scrapeSpankbang(searchTerm as string, headers);
    }

    // --- TIER 2: THE "STRICT" APIs (Often block Vercel) ---
    
    // 3. RedTube
    if (!videoData) videoData = await searchRedTube(searchTerm as string, headers);

    // 4. Pornhub (Most likely to block, so we try it last to save time)
    if (!videoData) videoData = await searchPornhub(searchTerm as string, headers);

    // 5. YouPorn
    if (!videoData) videoData = await searchYouPorn(searchTerm as string, headers);

    // --- TIER 3: FALLBACK SCRAPERS ---
    if (!videoData) videoData = await scrapeTnaflix(searchTerm as string, headers);
    if (!videoData) videoData = await scrapeXhamster(searchTerm as string, headers);

    // RESPONSE
    if (videoData) {
      return res.status(200).json({ found: true, ...videoData });
    } else {
      // ✅ FAIL-SAFE: If everything blocked, return a Direct Search Link
      // This ensures the User Interface never shows an error, just a button.
      console.log("⚠️ All providers blocked/empty. Returning Fail-Safe Link.");
      return res.status(200).json({ 
          found: true, 
          url: `https://www.pornhub.com/video/search?search=${encodeURIComponent(searchTerm as string)}`,
          provider: 'external_link',
          title: `Search Results: ${searchTerm}`
      });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    // Even on crash, return a valid link so the chat doesn't break
    return res.status(200).json({ 
        found: true, 
        url: `https://www.pornhub.com/video/search?search=${encodeURIComponent(searchTerm as string)}`,
        provider: 'external_link',
        title: `Search Results: ${searchTerm}`
    });
  }
}

// ==========================================
// 🎲 HELPER: RANDOM PICKER
// ==========================================
function pickRandom<T>(arr: T[], limit: number = 20): T | null {
  if (!arr || arr.length === 0) return null;
  const pool = arr.slice(0, limit); 
  return pool[Math.floor(Math.random() * pool.length)];
}

// ==========================================
// 🚀 APIs
// ==========================================

async function searchEporner(term: string, headers: any) {
  try {
    const url = new URL('https://www.eporner.com/api/v2/webmasters/search');
    url.searchParams.append('query', term);
    url.searchParams.append('format', 'json');

    const response = await fetch(url.toString(), { headers });
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos);
        if (video) {
            return { url: video.embed, provider: 'eporner', title: video.title };
        }
    }
  } catch (e) { console.error("EP Error", e); }
  return null;
}

async function searchPornhub(term: string, headers: any) {
  try {
    const url = new URL('https://www.pornhub.com/webmasters/search');
    url.searchParams.append('search', term);
    
    const response = await fetch(url.toString(), { headers });
    
    // Safety: Check if we got HTML (blocked) instead of JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
        return null; 
    }

    const data = await response.json();
    if (data.videos && data.videos.length > 0) {
      const candidates = data.videos.filter((v: any) => v.url && v.url.includes('viewkey='));
      const video = pickRandom(candidates);
      if (video) {
          const viewKey = video.url.split('viewkey=')[1];
          return { url: `https://www.pornhub.com/embed/${viewKey}`, provider: 'pornhub', title: video.title };
      }
    }
  } catch (e) { console.error("PH Error", e); }
  return null;
}

async function searchRedTube(term: string, headers: any) {
  try {
    const url = new URL('https://api.redtube.com/');
    url.searchParams.append('data', 'redtube.Videos.searchVideos');
    url.searchParams.append('output', 'json');
    url.searchParams.append('search', term);
    url.searchParams.append('thumbsize', 'medium');

    const response = await fetch(url.toString(), { headers });
    
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
        return null;
    }

    const data = await response.json();
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos);
        if (video && video.video && video.video.video_id) {
             return { url: `https://embed.redtube.com/?id=${video.video.video_id}`, provider: 'redtube', title: video.video.title };
        }
    }
  } catch (e) { console.error("RT Error", e); }
  return null;
}

async function searchYouPorn(term: string, headers: any) {
  try {
    const url = new URL('https://www.youporn.com/api/webmasters/search');
    url.searchParams.append('search', term);
    const response = await fetch(url.toString(), { headers });
    
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) return null;

    const data = await response.json();
    if (data.videos && data.videos.length > 0) {
        const video = pickRandom(data.videos);
        if (video) {
            const match = video.url.match(/\/watch\/(\d+)/);
            if (match && match[1]) {
                return { url: `https://www.youporn.com/embed/${match[1]}`, provider: 'youporn', title: video.title };
            }
        }
    }
  } catch (e) { console.error("YP Error", e); }
  return null;
}

// ==========================================
// 🕷️ SCRAPERS
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
                 title: text
             });
        }
    });

    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'spankbang' } : null;
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

    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'tnaflix' } : null;
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

    const selected = pickRandom(candidates);
    return selected ? { ...selected, provider: 'xhamster' } : null;
  } catch (e) { console.error("XH Error", e); }
  return null;
}
