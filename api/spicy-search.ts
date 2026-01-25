// api/spicy-search.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS Headers (Allows your React app to talk to this function)
  res.setHeader('Access-Control-Allow-Credentials', "true");
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { term } = req.query;
  const searchTerm = Array.isArray(term) ? term[0] : term;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term required' });
  }

  // 2. RANDOMIZER: Pick a random provider for variety
  const providers = ['spankbang', 'xhamster', 'tnaflix'];
  const provider = providers[Math.floor(Math.random() * providers.length)];

  console.log(`🔍 Searching ${provider} for: ${searchTerm}`);

  try {
    let videoUrl = null;
    let title = null;
    let thumb = null;

    // 3. PROVIDER LOGIC
    if (provider === 'spankbang') {
      const targetUrl = `https://spankbang.com/s/${encodeURIComponent(searchTerm)}/`;
      const response = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract first video
      const firstVideo = $('.video-list-video').first();
      const relativeLink = firstVideo.find('.thumb').attr('href');
      
      if (relativeLink) {
        videoUrl = `https://spankbang.com${relativeLink}`;
        title = firstVideo.find('.title').text();
        thumb = firstVideo.find('img').attr('data-src');
      }
    } 
    
    else if (provider === 'xhamster') {
      const targetUrl = `https://xhamster.com/search?q=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract first video
      const firstVideo = $('a.video-thumb__image-container').first();
      const relativeLink = firstVideo.attr('href');
      
      if (relativeLink) {
        videoUrl = relativeLink; // XHamster usually gives full URL or relative
        if (videoUrl.startsWith('/')) videoUrl = `https://xhamster.com${videoUrl}`;
      }
    } 
    
    else if (provider === 'tnaflix') {
      const targetUrl = `https://www.tnaflix.com/search.php?q=${encodeURIComponent(searchTerm)}`;
      const response = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract first video
      const firstVideo = $('li.video_box').first();
      const relativeLink = firstVideo.find('a').attr('href');
      
      if (relativeLink) {
         videoUrl = `https://www.tnaflix.com${relativeLink}`;
      }
    }

    // 4. RESPONSE
    if (videoUrl) {
      res.status(200).json({ 
        url: videoUrl, 
        provider: provider,
        found: true 
      });
    } else {
      res.status(404).json({ found: false, error: 'No videos found' });
    }

  } catch (error) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: 'Failed to fetch spicy content' });
  }
}
