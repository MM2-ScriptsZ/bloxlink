export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url, method = 'GET', body } = req.body || req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let targetUrl;
    try {
      targetUrl = new URL(decodeURIComponent(url));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const options = {
      method: method.toUpperCase(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      timeout: 15000,
    };

    // Add body for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(targetUrl.toString(), options);
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

    res.status(response.status).send(content);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
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
