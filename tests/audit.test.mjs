import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl,isPublicIp,safeFetch,readBounded,collectHtml,buildChecks,verifyPublicHost,decodeNativeData } from '../lib/audit.mjs';
import { pageSpeedUrl } from '../lib/pagespeed.mjs';
import { handleAudit } from '../lib/handler.mjs';

test('addresses default to HTTPS, normalize domain and remove fragments',()=>{
  assert.equal(normalizeUrl(' EXAMPLE.com/page?q=1#top ').href,'https://example.com/page?q=1');
});
test('private, credentialed, non-HTTPS, IP-literal and alternate port targets are rejected',()=>{
  for(const url of ['http://example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://name:pass@example.com','https://example.com:8443','https://localhost','https://foo.local','file:///etc/passwd','https://internal.test'])assert.throws(()=>normalizeUrl(url),undefined,url);
});
test('public address classifier rejects reserved and transition ranges',()=>{
  for(const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','172.31.0.1','192.168.1.1','100.64.0.1','198.18.0.1','203.0.113.1','224.0.0.1','::ffff:127.0.0.1','fc00::1','2002:0808:0808::1','2001:db8::1'])assert.equal(isPublicIp(ip),false,ip);
  for(const ip of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicIp(ip),true,ip);
});
test('DNS validation fails closed on private addresses even alongside public answers',async()=>{
  const fetcher=async()=>Response.json({Status:0,Answer:[{type:1,data:'8.8.8.8'},{type:1,data:'10.0.0.1'}]});
  await assert.rejects(verifyPublicHost('example.com',fetcher),/public internet/);
});
test('redirect destination is validated before the next network request',async()=>{
  const called=[];
  await assert.rejects(safeFetch('https://example.com',{verify:async()=>{},fetcher:async u=>{called.push(String(u));return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}})}}),/public HTTPS/);
  assert.equal(called.length,1);
});
test('every redirect host undergoes DNS validation',async()=>{
  const verified=[];let n=0;
  const result=await safeFetch('https://example.com',{verify:async h=>{verified.push(h)},fetcher:async()=>++n===1?new Response(null,{status:301,headers:{location:'https://www.example.com/'}}):new Response('<html></html>',{headers:{'content-type':'text/html'}})});
  assert.deepEqual(verified,['example.com','www.example.com']);assert.equal(result.redirects.length,1);
});
test('oversized advertised and streaming responses are both rejected',async()=>{
  await assert.rejects(readBounded(new Response('x',{headers:{'content-length':'1000001'}})),/too large/);
  await assert.rejects(readBounded(new Response('abcde'),4),/too large/);
});
const fixture='<!doctype html><html lang="en"><head><title>A &amp; B</title><meta name="description" content="Useful &amp; clear"><meta name="robots" content="noindex, follow"><meta name="viewport" content="width=device-width"><link rel="canonical" href="/page"><script type="application/ld+json">{"@type":"WebPage"}</script></head><body><!-- <h1>Fake</h1> --><h1>Real <span>heading</span></h1><img src="a"><img src="b" alt=""><img src="c" alt="Useful"><script>let x="<h1>Fake</h1>";</script></body></html>';
const page={url:'https://example.com/page',status:200,headers:new Headers(),redirects:[]};
test('HTML parser handles entities, comments, scripts and nested headings',async()=>{
  const data=await collectHtml(fixture);assert.deepEqual(data.titles,['A & B']);assert.deepEqual(data.h1,['Real heading']);assert.equal(data.descriptions[0],'Useful & clear');assert.equal(data.images,3);assert.equal(data.missingAlt,1);assert.equal(data.emptyAlt,1);
});
test('native Worker extraction decodes entities exactly once before character counts',()=>{
  const raw={titles:['A &amp; B'],h1:['A &amp;lt; B'],descriptions:['A &quot;quote&quot;'],canonicals:['/page?a=1&amp;b=2'],robots:['robots: no&#105;ndex'],viewport:[],links:[],lang:'en',social:{'og:title':'A &amp; B'},jsonLd:['{"value":"&amp;"}']};
  const decoded=decodeNativeData(raw);assert.equal(decoded.titles[0],'A & B');assert.equal(decoded.h1[0],'A &lt; B');assert.equal(decoded.canonicals[0],'/page?a=1&b=2');assert.equal(decoded.robots[0],'robots: noindex');assert.equal(decoded.jsonLd[0],'{"value":"&amp;"}');
});
test('noindex and missing image alt are review prompts with evidence',async()=>{
  const checks=buildChecks(await collectHtml(fixture),page);
  assert.equal(checks.find(c=>c.id==='indexing').status,'review');assert.equal(checks.find(c=>c.id==='alt').status,'review');assert.match(checks.find(c=>c.id==='canonical').evidence,/https:\/\/example.com\/page/);
});
test('unavailable resources, no JSON-LD, and absent images are not successful checks',async()=>{
  const checks=buildChecks(await collectHtml('<html><head></head><body></body></html>'),page,{robots:{error:'Timed out'}});
  for(const id of ['robots','sitemap','schema','alt','rankings'])assert.equal(checks.find(c=>c.id===id).status,'not_checked',id);
  assert.equal(checks.find(c=>c.id==='canonical').evidence,'0 canonical link(s). None found.');
});
test('title length is informational; duplicate titles trigger review',async()=>{
  const long=buildChecks(await collectHtml('<title>'+('A'.repeat(100))+'</title>'),page);assert.equal(long.find(c=>c.id==='title').status,'observed');
  const duplicate=buildChecks(await collectHtml('<title>First</title><title>Second</title>'),page);assert.equal(duplicate.find(c=>c.id==='title').status,'review');
});
test('X-Robots-Tag noindex is surfaced and malformed JSON-LD is flagged',async()=>{
  const checks=buildChecks(await collectHtml('<script type="application/ld+json">invalid</script>'),{...page,headers:new Headers({'X-Robots-Tag':'googlebot: noindex'})});
  assert.equal(checks.find(c=>c.id==='indexing').status,'review');assert.equal(checks.find(c=>c.id==='schema').status,'review');
});
test('Test speed opens only Google PageSpeed and preserves the audited page query',()=>{
  const original='https://example.com/page?a=1&next=https%3A%2F%2Fexample.org%2F#section';
  const destination=new URL(pageSpeedUrl(original));
  assert.equal(destination.origin,'https://pagespeed.web.dev');
  assert.equal(destination.pathname,'/analysis');
  assert.equal(destination.searchParams.get('url'),'https://example.com/page?a=1&next=https%3A%2F%2Fexample.org%2F');
  assert.equal([...destination.searchParams].length,1);
  for(const target of ['javascript:alert(1)','http://example.com/','https://name:pass@example.com/'])assert.throws(()=>pageSpeedUrl(target));
});
test('cross-origin API requests and invalid targets do not yield findings',async()=>{
  const cross=await handleAudit(new Request('https://audit.example.com/api/audit',{method:'POST',headers:{origin:'https://other.example.com','content-type':'application/json'},body:'{"url":"https://example.com"}'}));assert.equal(cross.status,403);
  const invalid=await handleAudit(new Request('https://audit.example.com/api/audit',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'test-invalid'},body:'{"url":"https://127.0.0.1"}'}));assert.equal(invalid.status,400);assert.equal((await invalid.json()).checks,undefined);
});
test('sixth audit in an IP window is limited with retry guidance',async()=>{
  let response;
  for(let i=0;i<6;i++)response=await handleAudit(new Request('https://audit.example.com/api/audit',{method:'POST',headers:{'content-type':'application/json','cf-connecting-ip':'test-limit'},body:'{"url":"https://127.0.0.1"}'}));
  assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');
});
