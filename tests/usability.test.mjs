import test from 'node:test';
import assert from 'node:assert/strict';
import {addressError} from '../lib/report-tools.mjs';
import {readAuditResponse} from '../lib/audit-stream.mjs';
import {readBounded,safeFetch} from '../lib/audit.mjs';
import {handleAudit} from '../lib/handler.mjs';
import {reportHtml,reportCsv} from '../lib/report-export.mjs';

const checks=[{id:'h1',title:'Main heading',status:'review',group:'On-page',evidence:'2 H1 elements. Café | 日本語',action:'Review the page outline.'},{id:'https',title:'HTTPS address',status:'observed',group:'Technical',evidence:'https://example.org/',action:'Observe the page address.'}];
const report={version:1,requestedUrl:'https://example.org/',finalUrl:'https://example.org/',source:'Fetched HTML (JavaScript not executed)',checkedAt:'2026-10-27T12:00:00Z',redirects:[],checks};

test('client validation catches invalid and unsupported addresses before a request',()=>{
  for(const input of ['','not a website','http://example.org','https://localhost','https://127.0.0.1','https://[::1]','https://a:b@example.org','https://example.org:8443'])assert.ok(addressError(input),input);
  for(const input of ['example.org',' https://example.org/page?q=one#section ','https://sub.example.org'])assert.equal(addressError(input),'',input);
});

test('incremental reader handles split Unicode packets and waits for the completed result',async()=>{
  const packets=[{type:'progress',step:1,label:'Reading page'},{type:'page',report},{type:'result',report}];
  const bytes=new TextEncoder().encode(packets.map(p=>JSON.stringify(p)).join('\n')+'\n');let at=0;
  const body=new ReadableStream({pull(c){if(at>=bytes.length){c.close();return}c.enqueue(bytes.slice(at,at+7));at+=7}});
  const updates=[];assert.deepEqual(await readAuditResponse(new Response(body,{headers:{'content-type':'application/x-ndjson'}}),p=>updates.push(p)),report);
  assert.equal(updates.length,2);assert.match(updates[1].report.checks[0].evidence,/日本語/);
});

test('partial, interrupted and error streams never become successful reports',async()=>{
  const response=text=>new Response(text,{headers:{'content-type':'application/x-ndjson'}});
  await assert.rejects(readAuditResponse(response(JSON.stringify({type:'page',report})+'\n')),/before all checks finished/);
  await assert.rejects(readAuditResponse(response(JSON.stringify({type:'page',report})+'\n'+JSON.stringify({type:'error',message:'Connection failed'})+'\n')),/Connection failed/);
  await assert.rejects(readAuditResponse(Response.json({error:'Wait one minute.'},{status:429})),/Wait one minute/);
  assert.deepEqual(await readAuditResponse(Response.json(report)),report);
});

test('cancelling a body read cancels its source and does not accept truncated HTML',async()=>{
  let started,cancelled=false;const reading=new Promise(resolve=>started=resolve),abort=new AbortController();
  const body=new ReadableStream({pull(){started()},cancel(){cancelled=true}});
  const pending=readBounded(new Response(body),1000,abort.signal);await reading;abort.abort();
  await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(cancelled,true);
  let requests=0;await assert.rejects(safeFetch('https://example.org',{signal:abort.signal,verify:async()=>{},fetcher:async()=>{requests++;return new Response('')}}),e=>e.name==='AbortError');assert.equal(requests,0);
});

test('stream API sends real page findings before resource checks and preserves all final checks',async t=>{
  const visited=[];
  t.mock.method(globalThis,'fetch',async url=>{const u=new URL(url);if(u.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:u.searchParams.get('type')==='A'?[{type:1,data:'8.8.8.8'}]:[]});visited.push(u.pathname);
    if(u.pathname==='/robots.txt')return new Response('User-agent: *\nSitemap: https://example.org/sitemap.xml');
    if(u.pathname==='/sitemap.xml')return new Response('<urlset></urlset>');
    return new Response('<html lang="en"><title>A page</title><h1>A page</h1></html>',{headers:{'content-type':'text/html'}});
  });
  const response=await handleAudit(new Request('https://audit.example.org/api/audit',{method:'POST',headers:{'content-type':'application/json',accept:'application/x-ndjson','cf-connecting-ip':'stream-test'},body:JSON.stringify({url:'https://example.org/'})}));
  const packets=(await response.text()).trim().split('\n').map(s=>JSON.parse(s));
  assert.deepEqual(packets.filter(p=>p.type==='progress').map(p=>p.step),[1,2,3,4]);
  const partial=packets.find(p=>p.type==='page').report,complete=packets.at(-1);
  assert.equal(partial.checks.length,14);assert.equal(complete.type,'result');assert.equal(complete.report.checks.length,16);
  assert.ok(packets.findIndex(p=>p.type==='page')<packets.findIndex(p=>p.type==='progress'&&p.step===3));
  assert.deepEqual(visited,['/','/robots.txt','/sitemap.xml']);
  const invalid=await handleAudit(new Request('https://audit.example.org/api/audit',{method:'POST',headers:{'content-type':'application/json',accept:'application/x-ndjson','cf-connecting-ip':'stream-invalid'},body:JSON.stringify({url:'https://127.0.0.1'})}));assert.equal(invalid.status,400);
});

test('complete printable report retains Unicode and all findings while escaping user evidence and notes',()=>{
  const notes=[{id:'h1',status:'reviewed',note:'<img src=x onerror=alert(1)> & "my notes"',evidenceChanged:true}];
  const hostile={...report,checks:[{...checks[0],evidence:checks[0].evidence+' <script>alert(1)</script>'},checks[1]]};
  const html=reportHtml(hostile,notes,'wordpress');
  assert.match(html,/HTTPS address/);assert.match(html,/WordPress instructions/);assert.match(html,/日本語/);assert.match(html,/Findings:<\/strong> 2/);
  assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.match(html,/Evidence changed/);
});

test('CSV export includes every finding and neutralizes spreadsheet formula injection',()=>{
  for(const note of ['=HYPERLINK("https://bad.example")',' +SUM(1,2)','\t@SUM(1,2)','-1+2']){
    const csv=reportCsv(report,[{id:'h1',status:'reviewed',note}]);assert.match(csv,/HTTPS address/);assert.ok(csv.includes('"\''+note.replaceAll('"','""')+'"'));assert.match(csv,/日本語/);
  }
});
