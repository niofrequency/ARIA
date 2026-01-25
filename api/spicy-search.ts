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
    console.log(`🔍 Searching for Embeds: ${searchTerm}`);
    let videoData = null;

    // --- TIER 1: OFFICIAL APIs (Best Quality Embeds) ---
    
    // 1. Pornhub
    if (!videoData) videoData = await searchPornhub(searchTerm as string);
    
    // 2. RedTube
    if (!videoData) videoData = await searchRedTube(searchTerm as string);
    
    // 3. Eporner
    if (!videoData) videoData = await searchEporner(searchTerm as string);
    
    // 4. YouPorn
    if (!videoData) videoData = await searchYouPorn(searchTerm as string);


    // --- TIER 2: SCRAPERS (Constructing Embeds from IDs) ---

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

    // 7. XHamster
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
// 🚀 TIER 1: OFFICIAL APIs (Returning Embeds)
// ==========================================

async function searchPornhub(term: string) {
  try {
    const url = `https://www.pornhub.com/webmasters/search?search=${encodeURIComponent(term)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.videos && data.videos.length > 0) {
      const video = data.videos[0];
      // Convert View URL to Embed: pornhub.com/view_video.php?viewkey=ph5... -> pornhub.com/embed/ph5...
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
        const video = data.videos[0].video;
        // RedTube provides ID directly
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
        const video = data.videos[0];
        // Eporner provides .embed directly
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
        const video = data.videos[0];
        // Extract ID: https://www.youporn.com/watch/123456/title... -> 123456
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
    
    let validLink = null;
    let title = "";

    $('.video-list-video').each((i, el) => {
        const item = $(el);
        if (item.hasClass('paid') || item.hasClass('cam')) return; 
        
        const relLink = item.find('.thumb').attr('href'); // /7a3b/video/title
        const text = item.find('.title').text();
        
        // Extract ID: /7a3b/video... -> 7a3b
        const idMatch = relLink?.match(/^\/([a-zA-Z0-9]+)\/video/);

        if (idMatch && idMatch[1] && !validLink) {
             validLink = `https://spankbang.com/${idMatch[1]}/embed/`;
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
        if (!item.find('.info_time').text()) return;

        const relLink = item.find('a').attr('href'); // /porn/Title/video123456
        // Extract ID: video(\d+)
        const idMatch = relLink?.match(/video(\d+)$/);

        if (idMatch && idMatch[1] && !validLink) {
            validLink = `https://www.tnaflix.com/embed/${idMatch[1]}`;
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
      const link = item.attr('href'); // https://xhamster.com/videos/title-12345
      // Extract ID: last numbers in URL
      const idMatch = link?.match(/-(\d+)$/);

      if (idMatch && idMatch[1]) {
        return { url: `https://xhamster.com/embed/${idMatch[1]}`, provider: 'xhamster', title: 'Video' };
      }
    }
  } catch (e) { console.error("XH Scrape Error", e); }
  return null;
}
