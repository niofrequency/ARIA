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

  // 2. Real Browser Headers (Bypasses basic anti-bot checks)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  };

  try {
    console.log(`🔍 Searching for: ${searchTerm}`);
    
    // 3. Provider Waterfall (Try one, then the others)
    let videoData = await searchSpankbang(searchTerm as string, headers);
    
    if (!videoData) {
        console.log("Spankbang failed/empty, trying TNAFlix...");
        videoData = await searchTnaflix(searchTerm as string, headers);
    }
    
    // XHamster is the hardest to scrape (heavy protection), so we try it last
    if (!videoData) {
        console.log("TNAFlix failed, trying XHamster...");
        videoData = await searchXhamster(searchTerm as string, headers);
    }

    // 4. Response
    if (videoData) {
      return res.status(200).json({ found: true, ...videoData });
    } else {
      return res.status(404).json({ found: false, error: 'No videos found' });
    }

  } catch (error: any) {
    console.error("API Main Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

// --- IMPROVED SCRAPERS (Ad-Block Logic) ---

async function searchSpankbang(term: string, headers: any) {
  try {
    const url = `https://spankbang.com/s/${encodeURIComponent(term)}/`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // ✅ FIX: Filter out 'paid' or 'ad' classes to stop fake videos
    // We loop through results until we find a REAL video
    let validLink = null;
    let title = "";

    $('.video-list-video').each((i, el) => {
        const item = $(el);
        // Skip if it looks like an ad
        if (item.hasClass('paid') || item.hasClass('cam')) return;
        
        const relLink = item.find('.thumb').attr('href');
        const text = item.find('.title').text();

        // Valid links usually start with /video/ or /s/
        if (relLink && !validLink) {
             validLink = `https://spankbang.com${relLink}`;
             title = text;
        }
    });

    return validLink ? { url: validLink, provider: 'spankbang', title } : null;
  } catch (e) { console.error("SB Error", e); }
  return null;
}

async function searchTnaflix(term: string, headers: any) {
  try {
    const url = `https://www.tnaflix.com/search.php?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let validLink = null;
    
    // TNAFlix lists videos in 'li.video_box'
    $('li.video_box').each((i, el) => {
        const item = $(el);
        // Ads often don't have a duration timestamp
        const duration = item.find('.info_time').text();
        if (!duration) return; 

        const relLink = item.find('a').attr('href');
        if (relLink && !validLink) {
            validLink = `https://www.tnaflix.com${relLink}`;
        }
    });

    return validLink ? { url: validLink, provider: 'tnaflix', title: 'Video' } : null;
  } catch (e) { console.error("TNA Error", e); }
  return null;
}

async function searchXhamster(term: string, headers: any) {
  try {
    const url = `https://xhamster.com/search?q=${encodeURIComponent(term)}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // ✅ FIX: XHamster ads often have 'promo' in the class
    const item = $('a.video-thumb__image-container').not('.promo').first();
    
    if (item.length) {
      const link = item.attr('href');
      // If link is valid and doesn't contain 'click.php' (ad tracker)
      if (link && !link.includes('click')) {
        return { url: link, provider: 'xhamster', title: 'Video' };
      }
    }
  } catch (e) { console.error("XH Error", e); }
  return null;
}
