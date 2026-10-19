const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(__dirname, 'images');

// Ensure necessary directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

// Helper: send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: Read request body
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 50MB max upload size
      if (body.length > 50 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // -------------------------------------------------------------
  // API ROUTING
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    try {
      // 1. GET /api/content
      if (pathname === '/api/content' && req.method === 'GET') {
        const filePath = path.join(DATA_DIR, 'content.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          return sendJSON(res, 200, JSON.parse(raw));
        }
        return sendJSON(res, 404, { error: 'Content not found' });
      }

      // 2. POST /api/content (Save entire content)
      if (pathname === '/api/content' && req.method === 'POST') {
        const body = await readRequestBody(req);
        const filePath = path.join(DATA_DIR, 'content.json');
        fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');
        return sendJSON(res, 200, { success: true, message: 'Content saved successfully' });
      }

      // 3. POST /api/upload (Upload image file as base64)
      if (pathname === '/api/upload' && req.method === 'POST') {
        const body = await readRequestBody(req);
        if (!body.data) {
          return sendJSON(res, 400, { error: 'Missing image data' });
        }

        let base64Data = body.data;
        let ext = '.png';

        // Detect MIME and strip header
        const match = base64Data.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          const subType = match[1].toLowerCase();
          ext = subType === 'jpeg' ? '.jpg' : `.${subType}`;
          base64Data = match[2];
        }

        // Clean user filename if provided
        let rawName = (body.name || 'image').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        if (rawName.endsWith('.png') || rawName.endsWith('.jpg') || rawName.endsWith('.jpeg') || rawName.endsWith('.webp')) {
          rawName = rawName.substring(0, rawName.lastIndexOf('.'));
        }

        const filename = `${rawName}_${Date.now()}${ext}`;
        const savePath = path.join(IMAGES_DIR, filename);

        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(savePath, buffer);

        const relativeUrl = `images/${filename}`;
        return sendJSON(res, 200, {
          success: true,
          url: relativeUrl,
          filename: filename
        });
      }

      // 4. GET /api/admissions (Get all student admission submissions)
      if (pathname === '/api/admissions' && req.method === 'GET') {
        const filePath = path.join(DATA_DIR, 'admissions.json');
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf-8');
          return sendJSON(res, 200, JSON.parse(raw));
        }
        return sendJSON(res, 200, []);
      }

      // 5. POST /api/admissions (Submit new application from website)
      if (pathname === '/api/admissions' && req.method === 'POST') {
        const item = await readRequestBody(req);
        const filePath = path.join(DATA_DIR, 'admissions.json');
        let admissions = [];
        if (fs.existsSync(filePath)) {
          try {
            admissions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch (e) {
            admissions = [];
          }
        }

        if (!item.id) {
          item.id = 'HMS-' + Date.now().toString().slice(-4);
        }
        if (!item.submittedAt) {
          item.submittedAt = new Date().toISOString();
        }
        if (!item.status) {
          item.status = 'Pending';
        }

        // Add to front of list
        admissions.unshift(item);
        fs.writeFileSync(filePath, JSON.stringify(admissions, null, 2), 'utf-8');
        return sendJSON(res, 200, { success: true, item });
      }

      // 6. DELETE /api/admissions/:id
      if (pathname.startsWith('/api/admissions/') && req.method === 'DELETE') {
        const id = decodeURIComponent(pathname.replace('/api/admissions/', ''));
        const filePath = path.join(DATA_DIR, 'admissions.json');
        if (fs.existsSync(filePath)) {
          let list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          list = list.filter(a => a.id !== id && a.regNo !== id);
          fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
          return sendJSON(res, 200, { success: true, message: 'Deleted application' });
        }
        return sendJSON(res, 404, { error: 'Not found' });
      }

      // 7. PUT /api/admissions/:id (Status update)
      if (pathname.startsWith('/api/admissions/') && req.method === 'PUT') {
        const id = decodeURIComponent(pathname.replace('/api/admissions/', ''));
        const updates = await readRequestBody(req);
        const filePath = path.join(DATA_DIR, 'admissions.json');
        if (fs.existsSync(filePath)) {
          let list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const idx = list.findIndex(a => a.id === id || a.regNo === id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updates };
            fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
            return sendJSON(res, 200, { success: true, item: list[idx] });
          }
        }
        return sendJSON(res, 404, { error: 'Application not found' });
      }

      // 8. POST /api/auth/login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await readRequestBody(req);
        const filePath = path.join(DATA_DIR, 'auth.json');
        let auth = { username: 'admin', password: 'admin123' };
        if (fs.existsSync(filePath)) {
          try {
            auth = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch (e) {}
        }

        if (username === auth.username && password === auth.password) {
          return sendJSON(res, 200, {
            success: true,
            token: 'hms_token_' + Date.now(),
            user: { username: auth.username, role: 'Administrator' }
          });
        }
        return sendJSON(res, 401, { error: 'Invalid username or password' });
      }

      // 9. POST /api/auth/change-credentials
      if (pathname === '/api/auth/change-credentials' && req.method === 'POST') {
        const { currentPassword, newUsername, newPassword } = await readRequestBody(req);
        const filePath = path.join(DATA_DIR, 'auth.json');
        let auth = { username: 'admin', password: 'admin123' };
        if (fs.existsSync(filePath)) {
          auth = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }

        if (currentPassword !== auth.password) {
          return sendJSON(res, 400, { error: 'Current password is incorrect' });
        }

        auth.username = newUsername || auth.username;
        if (newPassword) auth.password = newPassword;
        auth.updatedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(auth, null, 2), 'utf-8');

        return sendJSON(res, 200, { success: true, message: 'Credentials updated successfully' });
      }

      // Fallback API 404
      return sendJSON(res, 404, { error: 'API route not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, 500, { error: err.message || 'Internal Server Error' });
    }
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING
  // -------------------------------------------------------------
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin' || reqPath === '/admin/' || reqPath === '/admin.html') reqPath = '/admin.html';

  const fullPath = path.join(__dirname, reqPath);

  // Security check: ensure inside workspace
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access Denied');
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(fullPath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n⚠️  Port ${PORT} is already in use by another process.`);
    console.log(`👉 The server is already running! Open in browser:`);
    console.log(`   Website:    http://localhost:${PORT}`);
    console.log(`   Admin CMS:  http://localhost:${PORT}/admin\n`);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`HMS Website:  http://localhost:${PORT}`);
  console.log(`HMS CMS Admin: http://localhost:${PORT}/admin`);
  console.log(`===================================================`);
});
