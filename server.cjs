const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 3000);
const page = path.join(__dirname, 'index.html');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  fs.readFile(page, (error, content) => {
    if (error) {
      res.writeHead(500).end('Unable to load the demo');
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }).end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`IKEA demo: http://localhost:${port}`));
