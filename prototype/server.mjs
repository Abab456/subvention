import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const prototypeRoot = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const appFiles = new Set(['index.html', 'styles.css', 'app.mjs', 'model.mjs']);
const engineFiles = new Set(['index.mjs', 'catalog.mjs']);

export function createPrototypeServer({ engineRoot = null } = {}) {
  const optionalEngine = engineRoot ? resolve(engineRoot) : null;
  return createServer(async (request, response) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'Referrer-Policy': 'strict-origin-when-cross-origin' };
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { ...headers, Allow: 'GET, HEAD' }); response.end('Read-only validation server'); return; }
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname.includes('\\') || pathname.includes('\0')) throw new Error('Invalid path');
      let file;
      if (pathname.startsWith('/engine/') && optionalEngine) {
        const relative = pathname.slice('/engine/'.length);
        if (!engineFiles.has(relative)) throw new Error('Not a browser runtime module');
        file = resolve(optionalEngine, relative);
        if (!file.startsWith(optionalEngine + sep) || !['.mjs', '.json'].includes(extname(file)) || relative.split('/').some(p => p.startsWith('.')) || /(^|\/)(test|tests|node_modules)(\/|$)/.test(relative)) throw new Error('Not allowed');
      } else {
        const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
        if (!appFiles.has(relative)) throw new Error('Not allowed');
        file = resolve(prototypeRoot, relative);
      }
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
      const data = await readFile(file);
      response.writeHead(200, { ...headers, 'Content-Type': types[extname(file)] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
  const port = Number(option('--port') || 4173);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid --port');
  const engineRoot = option('--engine-root');
  const server = createPrototypeServer({ engineRoot });
  server.listen(port, '127.0.0.1', () => console.log(`Local validation prototype: http://127.0.0.1:${port}/${engineRoot ? '?engine=1' : ''}\nNo live intake, payments, uploads or government submissions.`));
}
