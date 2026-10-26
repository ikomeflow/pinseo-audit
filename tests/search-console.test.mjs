import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyContainsPage,searchWindow,searchMetrics,googleRead,readSearchData} from '../lib/search-console.mjs';

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
