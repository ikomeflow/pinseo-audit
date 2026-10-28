import { parse } from 'parse5';
import { decodeHTML, decodeHTMLAttribute } from 'entities';
// Public-page checks only. Never return fetched HTML or execute target scripts.
export const MAX_BYTES = 1_000_000;
export class AuditError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
export function normalizeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.trim()) throw new AuditError('Enter a public website address.', 400);
  let u;
  try { u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value.trim()) ? value.trim() : 'https://' + value.trim()); }
  catch { throw new AuditError('Enter a valid website address.', 400); }
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (u.protocol !== 'https:' || u.port || u.username || u.password || !host.includes('.') ||
      !/^[a-z0-9.-]+$/.test(host) || /^[\d.]+$/.test(host) ||
      /(^|\.)(localhost|local|internal|test|invalid|example|onion|home|lan|arpa)$/.test(host)) {
    throw new AuditError('Use a public HTTPS website with a domain name. IP addresses, private hosts, credentials, and custom ports are not supported.', 400);
  }
  u.hostname = host; u.hash = '';
  return u;
}

export function isPublicIp(ip) {
  // Restrict IPv6 to global unicast; reject transition/embedded IPv4 ranges.
  if (ip.includes(':')) {
    const parts=ip.toLowerCase().split(':');
    return /^2[0-9a-f]{3}:/i.test(ip) && !(parts[0]==='2001' && (parseInt(parts[1]||'0',16)<=0x1ff || parts[1]==='db8')) && parts[0]!=='2002';
  }
  const a = ip.split('.').map(Number);
  if (a.length !== 4 || a.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [x,y,z] = a;
  return !(x === 0 || x === 10 || x === 127 || x >= 224 || (x === 100 && y >= 64 && y <= 127) ||
    (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) || (x === 192 && (y === 168 || y === 0 || (y === 88 && z === 99))) ||
    (x === 198 && (y === 18 || y === 19 || (y === 51 && z === 100))) || (x === 203 && y === 0 && z === 113));
}

function checkCancelled(signal) { signal?.throwIfAborted(); }
async function timedFetch(url, init, timeout = 12000, fetcher = fetch, signal) {
  checkCancelled(signal);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetcher(url, { ...init, signal: signal ? AbortSignal.any([signal,controller.signal]) : controller.signal }); }
  catch { checkCancelled(signal); throw new AuditError('The website did not respond in time or could not be reached. Try again later.'); }
  finally { clearTimeout(timer); }
}
export async function verifyPublicHost(host, fetcher = fetch, signal) {
  const records = await Promise.all(['A','AAAA'].map(async type => {
    const endpoint = new URL('https://cloudflare-dns.com/dns-query');
    endpoint.searchParams.set('name', host); endpoint.searchParams.set('type', type);
    const r = await timedFetch(endpoint, { headers: { accept: 'application/dns-json' } }, 5000, fetcher, signal);
    if (!r.ok) throw new AuditError('Public DNS validation is unavailable. Please try again later.');
    const data = await r.json();
    if (data.Status !== 0) throw new AuditError('This domain could not be resolved in public DNS.');
    return (data.Answer || []).filter(x => x.type === 1 || x.type === 28).map(x => x.data);
  }));
  const ips = records.flat();
  if (!ips.length || ips.some(ip => !isPublicIp(ip))) throw new AuditError('Only domains resolving to public internet addresses can be checked.', 400);
}
export async function readBounded(response, max = MAX_BYTES, signal) {
  checkCancelled(signal);
  if (Number(response.headers.get('content-length')) > max) { await response.body?.cancel(); throw new AuditError('The response is too large to check safely (1 MB page limit).'); }
  if (!response.body) return '';
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  let timedOut = false;
  const cancel = () => { reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort',cancel,{once:true});
  const deadline = setTimeout(() => { timedOut = true; reader.cancel().catch(() => {}); }, 12000);
  let complete = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) { complete = true; break; }
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new AuditError('The response is too large to check safely (1 MB page limit).'); }
      chunks.push(value);
    }
  } finally { clearTimeout(deadline); signal?.removeEventListener('abort',cancel); reader.releaseLock(); }
  checkCancelled(signal);
  // Cancellation is tracked separately so a truncated body cannot become a successful audit.
  if (!complete || timedOut) throw new AuditError('The response could not be fully read.');
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(all);
}
export async function safeFetch(value, { fetcher = fetch, verify = verifyPublicHost, max = MAX_BYTES, signal } = {}) {
  let u = normalizeUrl(String(value)); const redirects = [];
  for (let i = 0; i <= 4; i++) {
    checkCancelled(signal);
    await verify(u.hostname, fetcher, signal);
    const r = await timedFetch(u, { redirect: 'manual', headers: { accept: 'text/html,application/xhtml+xml,text/plain,application/xml;q=0.8', 'user-agent': 'PINSEOAudit/1.0 (+https://audit.ikomeflow.com/)' } }, 12000, fetcher, signal);
    if ([301,302,303,307,308].includes(r.status)) {
      await r.body?.cancel();
      const location = r.headers.get('location');
      if (!location || i === 4) throw new AuditError('The page has too many redirects or a redirect without a destination.');
      const next = normalizeUrl(new URL(location, u).href);
      redirects.push({ from: u.href, to: next.href, status: r.status }); u = next; continue;
    }
    return { url: u.href, status: r.status, headers: r.headers, redirects, text: await readBounded(r, max, signal) };
  }
}

export async function collectHtml(html) {
  if (typeof HTMLRewriter === 'undefined') return collectPortable(html);
  const data = { titles: [], descriptions: [], h1: [], canonicals: [], robots: [], viewport: [], lang: '', images: 0, missingAlt: 0, emptyAlt: 0, links: [], social: {}, jsonLd: [] };
  const textHandler = (selector, list) => ({
    element() { list.push(''); },
    text(t) { if (list.length) list[list.length - 1] += t.text; }
  });
  const rewriter = new HTMLRewriter()
    .on('head title', textHandler('title', data.titles))
    .on('h1', textHandler('h1', data.h1))
    .on('html', { element(e) { data.lang = e.getAttribute('lang') || ''; } })
    .on('head meta', { element(e) {
      const name = (e.getAttribute('name') || '').toLowerCase();
      const property = (e.getAttribute('property') || name).toLowerCase();
      const content = e.getAttribute('content') || '';
      if (name === 'description') data.descriptions.push(content);
      if (name === 'viewport') data.viewport.push(content);
      if (['robots','googlebot'].includes(name)) data.robots.push(name + ': ' + content);
      if (['og:title','og:description','og:image','twitter:card'].includes(property)) data.social[property] = content;
    } })
    .on('head link', { element(e) {
      if ((e.getAttribute('rel') || '').toLowerCase().split(/\s+/).includes('canonical')) data.canonicals.push(e.getAttribute('href') || '');
    } })
    .on('img', { element(e) {
      data.images++;
      const alt = e.getAttribute('alt');
      if (alt === null) data.missingAlt++; else if (!alt.trim()) data.emptyAlt++;
    } })
    .on('a[href]', { element(e) { if (data.links.length < 2000) data.links.push(e.getAttribute('href')); } })
    .on('script[type="application/ld+json"]', textHandler('script', data.jsonLd));
  await rewriter.transform(new Response(html)).text();
  decodeNativeData(data);
  for (const key of ['titles','descriptions','h1']) data[key] = data[key].map(s => s.replace(/\s+/g, ' ').trim());
  return data;
}
export function decodeNativeData(data) {
  for (const key of ['titles','h1']) data[key] = data[key].map(s => decodeHTML(s));
  for (const key of ['descriptions','canonicals','robots','viewport','links']) data[key] = data[key].map(s => decodeHTMLAttribute(s));
  data.lang = decodeHTMLAttribute(data.lang);
  for (const key of Object.keys(data.social)) data.social[key] = decodeHTMLAttribute(data.social[key]);
  return data;
}
function collectPortable(html) {
  const data = { titles: [], descriptions: [], h1: [], canonicals: [], robots: [], viewport: [], lang: '', images: 0, missingAlt: 0, emptyAlt: 0, links: [], social: {}, jsonLd: [] };
  const text = node => { const pending = [node], parts = []; while (pending.length) { const n = pending.pop(); if (n.nodeName === '#text') parts.push(n.value); if (n.childNodes) pending.push(...[...n.childNodes].reverse()); } return parts.join(''); };
  const nodes = [[parse(html), false]];
  while (nodes.length) {
    const [node, insideHead] = nodes.pop(); const tag = node.tagName; const head = insideHead || tag === 'head';
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    if (tag === 'title' && head) data.titles.push(text(node));
    if (tag === 'h1') data.h1.push(text(node));
    if (tag === 'html') data.lang = attrs.lang || '';
    if (tag === 'meta' && head) {
      const name = (attrs.name || '').toLowerCase(), property = (attrs.property || name).toLowerCase(), content = attrs.content || '';
      if (name === 'description') data.descriptions.push(content);
      if (name === 'viewport') data.viewport.push(content);
      if (['robots','googlebot'].includes(name)) data.robots.push(name + ': ' + content);
      if (['og:title','og:description','og:image','twitter:card'].includes(property)) data.social[property] = content;
    }
    if (tag === 'link' && head && (attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical')) data.canonicals.push(attrs.href || '');
    if (tag === 'img') { data.images++; if (!Object.hasOwn(attrs,'alt')) data.missingAlt++; else if (!attrs.alt.trim()) data.emptyAlt++; }
    if (tag === 'a' && attrs.href && data.links.length < 2000) data.links.push(attrs.href);
    if (tag === 'script' && attrs.type === 'application/ld+json') data.jsonLd.push(text(node));
    if (node.childNodes) for (const child of [...node.childNodes].reverse()) nodes.push([child, head]);
  }
  for (const key of ['titles','descriptions','h1']) data[key] = data[key].map(s => s.replace(/\s+/g, ' ').trim());
  return data;
}
const snippet = s => String(s).slice(0, 600);
export function buildChecks(data, page, resources = {}) {
  const checks = [];
  const add = (id, title, status, evidence, action, group = 'On-page') => checks.push({ id, title, status, evidence: snippet(evidence), action, group });
  add('http','Page response',page.status === 200 ? 'observed' : 'review',`HTTP ${page.status}; final URL: ${page.url}`, 'A public page should return HTTP 200. A block or error response can hide the intended page.', 'Technical');
  add('https','HTTPS address','observed',page.url,'The fetched address uses HTTPS. Certificate quality and every page resource were not audited.', 'Technical');
  add('redirects','Redirect chain',page.redirects.length > 1 ? 'review' : 'observed',`${page.redirects.length} redirect(s) followed.`, 'Keep links pointed at the final URL; avoid unnecessary redirect chains.', 'Technical');
  const title = data.titles[0] || '';
  add('title','Page title',data.titles.length === 1 && title ? 'observed' : 'review',`${data.titles.length} title element(s); ${Array.from(title).length} characters. ${title || 'No non-empty title found.'}`, 'Use one clear, descriptive title. Character count is context, not a Google ranking rule.');
  const description = data.descriptions[0] || '';
  add('description','Meta description',data.descriptions.length === 1 && description ? 'observed' : 'review',`${data.descriptions.length} description tag(s); ${Array.from(description).length} characters. ${description || 'No non-empty description found.'}`, 'Write one useful page summary. Google may choose different snippet text; length alone is not a pass/fail rule.');
  add('h1','Main heading',data.h1.length === 1 && data.h1[0] ? 'observed' : 'review',`${data.h1.length} H1 element(s). ${data.h1.join(' | ')}`, 'Check that the primary heading describes the page. Multiple H1s are a review prompt, not an automatic ranking penalty.');
  let canonical = ''; let validCanonical = false;
  try { if (data.canonicals[0]?.trim()) { canonical = new URL(data.canonicals[0], page.url).href; validCanonical = ['http:','https:'].includes(new URL(canonical).protocol); } } catch {}
  add('canonical','Canonical declaration',data.canonicals.length === 1 && validCanonical ? 'observed' : 'review',`${data.canonicals.length} canonical link(s). ${canonical || 'None found.'}`, 'Use one intentional canonical URL for duplicate versions. A declaration is a hint; Google’s selected canonical and destination availability were not checked.');
  const directives = [...data.robots, page.headers.get('x-robots-tag') ? 'X-Robots-Tag: ' + page.headers.get('x-robots-tag') : ''].filter(Boolean).join(' | ');
  add('indexing','Indexing directives',/\b(noindex|none)\b/i.test(directives) ? 'review' : 'observed', directives || 'No robots/googlebot meta directive or X-Robots-Tag was found in this response.', 'Confirm noindex is intentional if present. Absence does not prove crawlability, indexability, or Google indexing.', 'Technical');
  add('viewport','Mobile viewport',data.viewport.length === 1 && /width\s*=\s*device-width/i.test(data.viewport[0]) ? 'observed' : 'review',data.viewport.join(' | ') || 'No viewport meta tag found.', 'Use a device-width viewport and test the layout on a phone. This only checks the tag, not mobile usability.', 'Technical');
  add('lang','Document language',data.lang.trim() ? 'observed' : 'review',data.lang || 'No html lang attribute found.', 'Declare the document’s actual language. This check does not validate the language code or translation.');
  add('alt','Image alt attributes',data.images === 0 ? 'not_checked' : data.missingAlt ? 'review' : 'observed',`${data.images} img element(s); ${data.missingAlt} missing alt; ${data.emptyAlt} empty alt.`, 'Describe meaningful images and use empty alt for decorative images. Presence does not prove text quality; CSS images are not counted.');
  const missingSocial = ['og:title','og:description','og:image'].filter(key => !data.social[key]?.trim());
  add('social','Social sharing metadata',missingSocial.length ? 'review' : 'observed',missingSocial.length ? `Not found or empty: ${missingSocial.join(', ')}` : 'og:title, og:description, and og:image are present.', 'Add relevant sharing metadata. This helps link previews; image URLs and social preview rendering were not tested.', 'Sharing');
  let invalidJson = 0; for (const json of data.jsonLd) { try { JSON.parse(json); } catch { invalidJson++; } }
  add('schema','Structured data syntax',!data.jsonLd.length ? 'not_checked' : invalidJson ? 'review' : 'observed',`${data.jsonLd.length} JSON-LD block(s); ${invalidJson} with invalid JSON syntax.`, 'Check eligibility and meaning in Google’s Rich Results Test. Valid JSON does not establish schema validity or rich-result eligibility.');
  for (const [id, title] of [['robots','robots.txt response'],['sitemap','Sitemap candidate']]) {
    const r = resources[id];
    add(id,title,!r || r.error ? 'not_checked' : r.status === 200 && r.looksLike ? 'observed' : 'review',r?.error || `${r?.url || ''} — HTTP ${r?.status ?? 'not requested'}. ${r?.note || ''}`,id === 'robots' ? 'Inspect crawler-specific rules yourself. File presence is not permission to crawl or a proof of Google indexing.' : 'Only one same-origin sitemap candidate is requested. Its response shape is checked; XML validity, listed URLs, and Search Console submission are not verified.', 'Technical');
  }
  add('rankings','Rankings and Google indexing','not_checked','Search Console, search positions, backlinks, and traffic are not connected.', 'Use your own Google Search Console to verify actual indexing and search performance.', 'Scope');
  return checks;
}

export async function audit(value, {signal,onProgress=()=>{},onPage=()=>{}} = {}) {
  const requestedUrl = normalizeUrl(value).href;
  checkCancelled(signal); onProgress({step:1,total:4,label:'Reading page'});
  const page = await safeFetch(requestedUrl,{signal});
  const contentType = page.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new AuditError(`The address returned ${contentType || 'an unknown content type'}, rather than an HTML page.`);
  // Challenge/error pages can carry misleading metadata, so do not audit them as the intended document.
  if (page.status !== 200) throw new AuditError(`The website returned HTTP ${page.status}. Its intended page could not be audited. No SEO findings were generated.`);
  checkCancelled(signal); onProgress({step:2,total:4,label:'Checking headings and page details'});
  const data = await collectHtml(page.text);
  const base = {version:1,requestedUrl,finalUrl:page.url,checkedAt:new Date().toISOString(),source:'Fetched HTML (JavaScript not executed)',redirects:page.redirects};
  onPage({...base,checks:buildChecks(data,page,{}).filter(c=>!['robots','sitemap'].includes(c.id))});
  const origin = new URL(page.url).origin;
  const resources = {};
  onProgress({step:3,total:4,label:'Checking robots.txt'});
  try {
    const r = await safeFetch(origin + '/robots.txt', { max: 128000,signal });
    const looksLike = !/<(?:!doctype|html)\b/i.test(r.text) && /^(?:user-agent|disallow|allow|sitemap)\s*:/im.test(r.text);
    resources.robots = { url: r.url, status: r.status, looksLike, note: looksLike ? 'Robots-style directives found; rules are not evaluated.' : 'No recognizable robots directives found.' };
    const candidates = [...r.text.matchAll(/^sitemap:\s*(\S+)/gim)].map(m => m[1]);
    resources.candidate = candidates.find(candidate => { try { return new URL(candidate).origin === origin; } catch { return false; } });
  } catch (e) { checkCancelled(signal); resources.robots = { error: e.message }; }
  onProgress({step:4,total:4,label:'Checking sitemap'});
  try {
    const r = await safeFetch(resources.candidate || origin + '/sitemap.xml', { max: 256000,signal });
    const looksLike = /<(?:[\w.-]+:)?(?:urlset|sitemapindex)(?:\s|>)/i.test(r.text) && !/<html\b/i.test(r.text);
    resources.sitemap = { url: r.url, status: r.status, looksLike, note: looksLike ? 'Sitemap root element found; full XML and URL validation not performed.' : 'No sitemap root element found.' };
  } catch (e) { checkCancelled(signal); resources.sitemap = { error: e.message }; }
  checkCancelled(signal);
  return {...base,checkedAt:new Date().toISOString(),checks:buildChecks(data,page,resources)};
}
