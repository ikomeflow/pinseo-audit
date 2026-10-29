import test from 'node:test';
import assert from 'node:assert/strict';
import {platformGuide,platformKey} from '../lib/platform-guidance.mjs';
import {reportHtml,reportCsv} from '../lib/report-export.mjs';
const finding={id:'title',title:'Page title',status:'review',group:'On-page',evidence:'Missing title',action:'Review the title.'};
const report={version:1,finalUrl:'https://site.org/',requestedUrl:'https://site.org/',checkedAt:'2026-10-28T12:00:00Z',source:'HTML',redirects:[],checks:[finding]};
test('platform instructions are selected explicitly and never alter findings or successful observations',()=>{
  const before=JSON.stringify(finding);
  assert.equal(platformGuide(finding,'general'),null);assert.equal(platformKey('__proto__'),'general');
  assert.match(platformGuide(finding,'wordpress').steps.join(' '),/SEO plugin/);
  assert.match(platformGuide(finding,'shopify').steps.join(' '),/Shopify admin/);
  assert.match(platformGuide(finding,'custom').steps.join(' '),/<title>/);
  assert.equal(platformGuide({...finding,status:'observed'},'shopify'),null);
  assert.equal(platformGuide({...finding,id:'unknown'},'wordpress'),null);
  assert.equal(JSON.stringify(finding),before);
});
test('print and CSV exports retain the chosen platform without mixing other platform instructions',()=>{
  const shopify=reportHtml(report,[],'shopify');assert.match(shopify,/Shopify instructions/);assert.doesNotMatch(shopify,/WordPress instructions/);
  const wordpress=reportHtml(report,[],'wordpress');assert.match(wordpress,/WordPress instructions/);assert.doesNotMatch(wordpress,/Shopify instructions/);
  const custom=reportHtml(report,[],'custom');assert.match(custom,/&lt;title&gt;/);assert.doesNotMatch(custom,/<title> output/);
  assert.match(reportCsv(report,[],'shopify'),/Shopify admin/);assert.doesNotMatch(reportHtml(report),/WordPress instructions/);
});
