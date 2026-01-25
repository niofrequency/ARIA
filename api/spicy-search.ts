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

  // 2. Real Browser Headers (CRITICAL to avoid 403 Forbidden blocking)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    console.log(`🔍 Searching for: ${searchTerm}`);
    
    // 3. Smart Provider Logic (Try one, then fallback if it fails)
    let videoData = await searchSpankbang(searchTerm as string, headers);
    
    if (!videoData) {
        console.log("Spankbang empty/failed, failing over to XHamster...");
        videoData = await searchXhamster(searchTerm as string, headers);
    }
    
    if (!videoData) {
        console.log("XHamster empty/failed, failing over to TNAFlix...");
        videoData = await searchTnaflix(searchTerm as string, headers);
    }

    // 4. Response
    if (videoData) {
      return res.status(200).json({ found: true, ...videoData });
    } else {
      return res.status(404).json({ found: false, error: 'No videos found on any provider' });
    }

  } catch (error: any) {
    console.error("API Main Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// --- SCRAPING FUNCTIONS ---

async function searchSpankbang(term: string, headers: any) {
  try {
    const url = `https://spankbang.com/s/${encodeURIComponent(term)}/`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const item = $('.video-list-video').first(); // Get the first video result
    
    if (item.length) {
      const relLink = item.find('.thumb').attr('href');
      const title = item.find('.title').text();
      // Spankbang links are relative, prepend domain
      return relLink ? { url: `https://spankbang.com${relLink}`, provider: 'spankbang', title } : null;
    }
  } catch (e) { console.error("SB Error", e); }
  return null;
}

async function searchXhamster(term: string, headers: any) {
  try {
    const url = `https://xhamster.com/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    // Selector strategy: look for the main video link class
    const item = $('a.video-thumb__image-container').first();
    
    if (item.length) {
      const link = item.attr('href');
      return link ? { url: link, provider: 'xhamster', title: 'Video' } : null;
    }
  } catch (e) { console.error("XH Error", e); }
  return null;
}

async function searchTnaflix(term: string, headers: any) {
  try {
    const url = `https://www.tnaflix.com/search.php?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    const item = $('li.video_box').first();
    
    if (item.length) {
      const relLink = item.find('a').attr('href');
      return relLink ? { url: `https://www.tnaflix.com${relLink}`, provider: 'tnaflix', title: 'Video' } : null;
    }
  } catch (e) { console.error("TNA Error", e); }
  return null;
}
