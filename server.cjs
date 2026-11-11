const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PORT || 3000);
const page = path.join(__dirname, 'index.html');
http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const assetTypes = {'/assets/city-scene.js':'text/javascript; charset=utf-8','/assets/ikea-city-extended.png':'image/png','/assets/ikea-city.jpg':'image/jpeg','/assets/ikea-building.jpg':'image/jpeg','/assets/ikea-building-isolated.png':'image/png','/assets/ikea-building-bare.png':'image/png','/assets/ikea-trees-only.png':'image/png','/assets/tree-parts.js':'text/javascript; charset=utf-8','/assets/hero.css':'text/css; charset=utf-8','/assets/hero.js':'text/javascript; charset=utf-8','/assets/architect-plans.js':'text/javascript; charset=utf-8','/assets/concept-plans.js':'text/javascript; charset=utf-8','/assets/building-model.js':'text/javascript; charset=utf-8','/assets/building-traces.js':'text/javascript; charset=utf-8','/assets/interior-scene.js':'text/javascript; charset=utf-8','/assets/foliage-regions.js':'text/javascript; charset=utf-8','/assets/growing-render.js':'text/javascript; charset=utf-8','/assets/ikea-logo.svg':'image/svg+xml','/assets/brand-header.css':'text/css; charset=utf-8','/assets/fonts/PretendardVariable.woff2':'font/woff2','/compare.html':'text/html; charset=utf-8','/assets/compare.js':'text/javascript; charset=utf-8','/assets/compare.css':'text/css; charset=utf-8'};
  const asset = Object.hasOwn(assetTypes, pathname);
  if (pathname !== '/' && pathname !== '/index.html' && !asset) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  fs.readFile(asset ? path.join(__dirname, pathname.slice(1)) : page, (error, content) => {
    if (error) {
      res.writeHead(500).end('Unable to load the demo');
      return;
    }
    res.writeHead(200, {
      'Content-Type': asset ? assetTypes[pathname] : 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }).end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`IKEA demo: http://localhost:${port}`));



