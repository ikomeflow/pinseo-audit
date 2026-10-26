import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyContainsPage,searchWindow,previousWindow,searchMetrics,googleRead,readSearchData,readSearchBreakdown} from '../lib/search-console.mjs';

test('properties match domain boundaries, scheme and URL prefixes',()=>{
  assert.equal(propertyContainsPage('sc-domain:example.com','https://www.example.com/page'),true);
  assert.equal(propertyContainsPage('sc-domain:example.com','https://example.com.evil.com/'),false);
  assert.equal(propertyContainsPage('sc-domain:example.com','https://notexample.com/'),false);
  assert.equal(propertyContainsPage('https://example.com/blog/','https://example.com/blog/post'),true);
  assert.equal(propertyContainsPage('https://example.com/blog/','https://example.com/blogger/'),false);
  assert.equal(propertyContainsPage('https://example.com/','http://example.com/'),false);
  assert.equal(propertyContainsPage('sc-domain:example.com','https://user:pass@example.com/'),false);
});
test('28-day window uses Pacific calendar dates including DST boundaries',()=>{
  assert.deepEqual(searchWindow(new Date('2026-03-09T00:30:00Z')),{startDate:'2026-02-06',endDate:'2026-03-05'});
  assert.deepEqual(searchWindow(new Date('2026-01-01T01:00:00Z')),{startDate:'2025-12-01',endDate:'2025-12-28'});
});
test('missing and invalid metrics never become invented zeros or positions',()=>{
  assert.equal(searchMetrics(undefined),null);
  assert.deepEqual(searchMetrics({clicks:0,impressions:12,ctr:0,position:3.4}),{clicks:0,impressions:12,ctr:0,position:3.4});
  assert.deepEqual(searchMetrics({clicks:'3',impressions:-1,ctr:2,position:0}),{clicks:null,impressions:null,ctr:null,position:null});
});
test('Google bearer token only goes to fixed, allowed read endpoints',async()=>{
  let called=false;
  for(const url of ['https://example.com/','https://www.googleapis.com.evil.com/webmasters/v3/sites','https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fexample.com%2F/sitemaps']){
    await assert.rejects(googleRead('secret',url,undefined,undefined,async()=>{called=true}),/Unsupported/);
  }
  assert.equal(called,false);
});
test('Google errors return clear failures rather than sample data',async()=>{
  for(const [status,pattern] of [[401,/expired/],[403,/denied/],[429,/quota/],[500,/unavailable/]]){
    await assert.rejects(googleRead('secret','https://www.googleapis.com/webmasters/v3/sites',undefined,undefined,async()=>new Response('',{status})),pattern);
  }
});
test('page report uses an exact page filter and separate totals, queries and indexing',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{
    const body=JSON.parse(init.body);calls.push({url,body,init});
    if(url.includes('urlInspection'))return Response.json({inspectionResult:{indexStatusResult:{coverageState:'Submitted and indexed',verdict:'PASS',lastCrawlTime:'2026-10-20T00:00:00Z'}}});
    return Response.json({rows:[{...(body.dimensions?{keys:['some query']} :{}),clicks:7,impressions:100,ctr:.07,position:4.2}]});
  };
  const result=await readSearchData({token:'secret',property:'sc-domain:example.com',page:'https://example.com/page',fetcher});
  assert.equal(calls.length,3);assert.equal(result.metrics.clicks,7);assert.equal(result.queries[0].query,'some query');assert.equal(result.inspection.coverage,'Submitted and indexed');
  assert.equal(calls[0].body.dimensionFilterGroups[0].filters[0].expression,'https://example.com/page');
  assert.equal(calls[0].body.dataState,'final');assert.equal(calls[1].body.rowLimit,5);
  for(const call of calls){assert.equal(call.init.credentials,'omit');assert.equal(call.init.redirect,'error');assert.equal(call.init.headers.Authorization,'Bearer secret')}
});
test('whole-property view is labeled and does not inspect a page or sum query rows',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);return Response.json({rows:body.dimensions?[{keys:['a'],clicks:1,impressions:2,ctr:.5,position:3}]:[{clicks:50,impressions:500,ctr:.1,position:10}]})};
  const result=await readSearchData({token:'secret',property:'sc-domain:example.com',fetcher});
  assert.equal(result.page,null);assert.equal(result.inspection,null);assert.equal(result.metrics.clicks,50);assert.equal(calls.length,2);assert.equal(calls[0].dimensionFilterGroups,undefined);
});
test('no returned rows stays unavailable; partial failures preserve actual successful data',async()=>{
  const fetcher=async(url,init)=>url.includes('urlInspection')?new Response('',{status:403}):Response.json({rows:[]});
  const result=await readSearchData({token:'secret',property:'sc-domain:example.com',page:'https://example.com/',fetcher});
  assert.equal(result.metrics,null);assert.deepEqual(result.queries,[]);assert.equal(result.inspection,null);assert.match(result.inspectionError,/denied/);
});
test('expired authorization discards the result and mismatching properties make no calls',async()=>{
  const fetcher=async(url,init)=>JSON.parse(init.body).dimensions?new Response('',{status:401}):Response.json({rows:[{clicks:9}]});
  await assert.rejects(readSearchData({token:'secret',property:'sc-domain:example.com',fetcher}),/expired/);
  let calls=0;
  await assert.rejects(readSearchData({token:'secret',property:'sc-domain:example.com',page:'https://different.com/',fetcher:async()=>{calls++}}),/includes this page/);
  assert.equal(calls,0);
});

test('selectable periods and comparison dates are inclusive and do not overlap',()=>{
  const now=new Date('2026-10-26T18:00:00Z');
  assert.deepEqual(searchWindow(now,7),{startDate:'2026-10-17',endDate:'2026-10-23'});
  assert.deepEqual(previousWindow(searchWindow(now,7),7),{startDate:'2026-10-10',endDate:'2026-10-16'});
  const range=searchWindow(now,90);
  assert.equal((new Date(range.endDate)-new Date(range.startDate))/86400000,89);
  assert.throws(()=>searchWindow(now,10000),/Choose/);
});

test('all detail dimensions retain exact page filters and use bounded row limits',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{calls.push(JSON.parse(init.body));return Response.json({rows:[{keys:['returned-key'],clicks:0,impressions:8,ctr:0,position:2}]})};
  for(const dimension of ['query','page','country','device','date']){
    const result=await readSearchBreakdown({token:'secret',property:'sc-domain:example.com',page:'https://example.com/a',days:7,dimension,now:new Date('2026-10-26T18:00:00Z'),fetcher});
    assert.equal(result.rows[0].clicks,0);assert.equal(result.rows[0].key,'returned-key');
  }
  assert.deepEqual(calls.map(c=>c.rowLimit),[20,20,20,10,7]);
  for(const call of calls){assert.equal(call.startDate,'2026-10-17');assert.equal(call.endDate,'2026-10-23');assert.equal(call.dataState,'final');assert.equal(call.dimensionFilterGroups[0].filters[0].expression,'https://example.com/a')}
});

test('trend rows omit missing dates and do not invent zero traffic',async()=>{
  const result=await readSearchBreakdown({token:'secret',property:'sc-domain:example.com',dimension:'date',fetcher:async()=>Response.json({rows:[{keys:['2026-10-20'],impressions:5}]})});
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].clicks,null);assert.equal(result.rows[0].position,null);
  let called=false;
  for(const options of [{dimension:'password'},{dimension:'page',page:'https://different.com/'}]){
    await assert.rejects(readSearchBreakdown({token:'secret',property:'sc-domain:example.com',...options,fetcher:async()=>{called=true}}));
  }
  assert.equal(called,false);
});

test('comparison uses a separate aggregate request and preserves current data on previous-period failure',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);if(body.endDate==='2026-10-16')return new Response('',{status:429});return Response.json({rows:[{...(body.dimensions?{keys:['term']} :{}),clicks:20,impressions:100,ctr:.2,position:3}]})};
  const result=await readSearchData({token:'secret',property:'sc-domain:example.com',days:7,compare:true,queryLimit:20,now:new Date('2026-10-26T18:00:00Z'),fetcher});
  assert.equal(calls.length,3);assert.equal(calls[1].rowLimit,20);assert.equal(calls[2].dimensions,undefined);assert.equal(result.metrics.clicks,20);assert.equal(result.previousMetrics,null);assert.match(result.previousError,/quota/);assert.equal(result.previousDates.endDate,'2026-10-16');
});

test('detail and comparison authorization failures never return partial private results',async()=>{
  await assert.rejects(readSearchBreakdown({token:'secret',property:'sc-domain:example.com',dimension:'country',fetcher:async()=>new Response('',{status:401})}),/expired/);
  const fetcher=async(url,init)=>JSON.parse(init.body).endDate==='2026-10-16'?new Response('',{status:401}):Response.json({rows:[{clicks:9}]});
  await assert.rejects(readSearchData({token:'secret',property:'sc-domain:example.com',days:7,compare:true,now:new Date('2026-10-26T18:00:00Z'),fetcher}),/expired/);
});
