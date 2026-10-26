import { html, css, icon, client } from '../.sites-runtime/assets.mjs';
import { handleAudit } from '../lib/handler.mjs';
import {privacy,terms} from '../lib/legal.mjs';
const security = {
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'self'; script-src 'self' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data:; connect-src 'self' https://www.googleapis.com https://searchconsole.googleapis.com https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Cross-Origin-Opener-Policy':'same-origin-allow-popups'
};
export default { async fetch(request,env={}) {
  const u=new URL(request.url);
  if(u.pathname==='/api/config'){
    if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET'}});
    const value=env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID||'';
    const clientId=/^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value)?value:'';
    return Response.json({clientId,testing:env.GOOGLE_SEARCH_CONSOLE_MODE!=='live'},{headers:{...security,'Cache-Control':'no-store'}});
  }
  if(u.pathname==='/api/audit') {
    if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers:{...security,Allow:'POST'}});
    const response=await handleAudit(request);for(const [k,v] of Object.entries(security))response.headers.set(k,v);return response;
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD'}});
  const assets={'/':[html,'text/html; charset=utf-8'],'/privacy':[privacy,'text/html; charset=utf-8'],'/terms':[terms,'text/html; charset=utf-8'],'/app.css':[css,'text/css; charset=utf-8'],'/app.js':[client,'text/javascript; charset=utf-8'],'/favicon.svg':[icon,'image/svg+xml'],'/robots.txt':['User-agent: *\nAllow: /\nDisallow: /api/\n','text/plain; charset=utf-8']};
  const asset=assets[u.pathname];if(!asset)return new Response('Not found',{status:404,headers:security});
  return new Response(request.method==='HEAD'?null:asset[0],{headers:{...security,'Content-Type':asset[1],'Cache-Control':'no-cache'}});
} };
