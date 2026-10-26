import { html, css, icon, client } from '../.sites-runtime/assets.mjs';
import { handleAudit } from '../lib/handler.mjs';
const security = {
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://www.googleapis.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
export default { async fetch(request) {
  const u=new URL(request.url);
  if(u.pathname==='/api/audit') {
    if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{...security,Allow:'POST'}});
    const response=await handleAudit(request);for(const [k,v] of Object.entries(security))response.headers.set(k,v);return response;
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD'}});
  const assets={'/':[html,'text/html; charset=utf-8'],'/app.css':[css,'text/css; charset=utf-8'],'/app.js':[client,'text/javascript; charset=utf-8'],'/favicon.svg':[icon,'image/svg+xml'],'/robots.txt':['User-agent: *\nAllow: /\nDisallow: /api/\n','text/plain; charset=utf-8']};
  const asset=assets[u.pathname];if(!asset)return new Response('Not found',{status:404,headers:security});
  return new Response(request.method==='HEAD'?null:asset[0],{headers:{...security,'Content-Type':asset[1],'Cache-Control':'no-cache'}});
} };
