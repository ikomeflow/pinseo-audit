import test from 'node:test';
import assert from 'node:assert/strict';
import {collectHtml,buildChecks,decodeNativeData} from '../lib/audit.mjs';
import {MAX_HEADING_ITEMS,MAX_IMAGE_ITEMS,imageSourceText} from '../lib/finding-details.mjs';
import {updateAction,checklist} from '../lib/action-insights.mjs';
import {compareReports,selectFindings} from '../lib/report-tools.mjs';
import {reportHtml,reportCsv} from '../lib/report-export.mjs';
const page={url:'https://site.org/path/',status:200,headers:new Headers(),redirects:[]};
const report=checks=>({version:1,finalUrl:page.url,requestedUrl:page.url,source:'Fetched HTML',checkedAt:'2026-10-27T12:00:00Z',redirects:[],checks});

test('headings retain HTML order, nested text, levels and identifying IDs',async()=>{
  const data=await collectHtml('<html><h1 id="hero">Main &amp; <span>useful</span></h1><h3 id="a&amp;b">Details</h3><h2>Next</h2><h1>Theme heading</h1></html>');
  assert.deepEqual(data.headings.map(h=>[h.number,h.level,h.text,h.id]),[[1,1,'Main & useful','hero'],[2,3,'Details','a&b'],[3,2,'Next',''],[4,1,'Theme heading','']]);
  const h=buildChecks(data,page).find(c=>c.id==='h1');assert.equal(h.details.total,4);assert.match(h.details.items[0].detail,/ID: hero/);assert.match(h.details.items[3].label,/#4 · H1/);
});

test('missing-alt list identifies actual image positions and resolves relative source addresses without fetching',async()=>{
  const data=await collectHtml('<img src="ok.jpg" alt="A useful photo"><img src="decor.jpg" alt=""><img id="product" src="../product.jpg?a=1&amp;b=2"><img data-src="/lazy.jpg"><img srcset="/small.jpg 1x, /large.jpg 2x">');
  assert.equal(data.missingAlt,3);assert.equal(data.emptyAlt,1);assert.deepEqual(data.imageIssues.map(i=>i.number),[3,4,5]);
  const item=buildChecks(data,page).find(c=>c.id==='alt');assert.match(item.details.items[0].detail,/https:\/\/site.org\/product.jpg\?a=1&b=2/);assert.match(item.details.items[1].detail,/https:\/\/site.org\/lazy.jpg/);assert.match(item.details.items[2].detail,/srcset:/);assert.match(item.details.note,/Empty alt text can be intentional/);
  assert.match(imageSourceText({source:'data:image/png;base64,abc',attribute:'src'},page.url),/Embedded image/);assert.doesNotMatch(imageSourceText({source:'javascript:alert(1)',attribute:'src'},page.url),/javascript:/);
});

test('long pages cap item lists while retaining actual totals',async()=>{
  const data=await collectHtml('<h2>Heading</h2>'.repeat(MAX_HEADING_ITEMS+7)+'<img src="a.jpg">'.repeat(MAX_IMAGE_ITEMS+11));
  assert.equal(data.headingCount,107);assert.equal(data.headings.length,100);assert.equal(data.missingAlt,41);assert.equal(data.imageIssues.length,30);
  const checks=buildChecks(data,page);assert.equal(checks.find(c=>c.id==='h1').details.total,107);assert.equal(checks.find(c=>c.id==='alt').details.total,41);
});

test('native extraction decodes new item attributes and text once',()=>{
  const data={titles:[],h1:[],descriptions:[],canonicals:[],robots:[],viewport:[],links:[],lang:'en',social:{},headings:[{text:'A &amp;lt; B',id:'a&amp;b'}],imageIssues:[{id:'x&amp;y',source:'a.jpg?a=1&amp;b=2'}]};
  decodeNativeData(data);assert.equal(data.headings[0].text,'A &lt; B');assert.equal(data.headings[0].id,'a&b');assert.equal(data.imageIssues[0].source,'a.jpg?a=1&b=2');
});

test('changed affected items invalidate manual review and appear in repeat comparisons even when counts match',async()=>{
  const first=buildChecks(await collectHtml('<h1>Main</h1><img src="first.jpg">'),page),next=buildChecks(await collectHtml('<h1>Main</h1><img src="second.jpg">'),page);
  const before=first.find(c=>c.id==='alt'),after=next.find(c=>c.id==='alt');assert.equal(before.evidence,after.evidence);
  const actions=updateAction({},page.url,before,{status:'reviewed',note:'Checked this image'});assert.equal(checklist(report(next),actions).find(c=>c.id==='alt').evidenceChanged,true);
  assert.ok(compareReports(report(first),report(next)).changes.some(c=>c.id==='alt'));
  assert.deepEqual(selectFindings(next,{query:'second.jpg'}).map(c=>c.id),['alt']);
});

test('all report formats include affected items and escape hostile source text',async()=>{
  const checks=buildChecks(await collectHtml('<h1>&lt;script&gt;bad&lt;/script&gt;</h1><img src="/item.jpg">'),page),r=report(checks);
  const html=reportHtml(r),csv=reportCsv(r);assert.match(html,/Heading outline/);assert.match(html,/Images missing alt text/);assert.match(html,/https:\/\/site.org\/item.jpg/);assert.doesNotMatch(html,/<script>bad/);assert.match(html,/&lt;script&gt;bad/);assert.match(csv,/Affected items/);assert.match(csv,/Image #1/);
});
