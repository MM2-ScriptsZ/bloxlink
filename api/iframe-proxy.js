export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let targetUrl;
    try {
      targetUrl = new URL(decodeURIComponent(url));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      timeout: 10000,
    });

    const contentType = response.headers.get('content-type') || 'text/html';

    if (contentType.includes('application/json')) {
      const json = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-Frame-Options', 'ALLOWALL');
      return res.status(response.status).json(json);
    }

    let content = await response.text();

    if (contentType.includes('text/html')) {
      content = removeFrameRestrictions(content);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.status(response.status).send(content);
  } catch (error) {
    console.error('Proxy error:', error);
    
    let errorMessage = 'Proxy request failed';
    let statusCode = 500;

    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout';
      statusCode = 504;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Domain not found';
      statusCode = 404;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused';
      statusCode = 503;
    }

    res.status(statusCode).json({ 
      error: errorMessage, 
      message: error.message
    });
  }
}

function removeFrameRestrictions(html) {
  html = html.replace(
    /<meta\s+http-equiv=["']X-Frame-Options["']\s+content=["'][^"']*["']\s*\/?>/gi,
    ''
  );
  html = html.replace(
    /<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["'][^"']*["']\s*\/?>/gi,
    ''
  );
  return html;
}
