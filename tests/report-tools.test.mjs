import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareAddress,selectFindings,findingPriority,compareReports} from '../lib/report-tools.mjs';
const finding=(id,status='review',evidence=id)=>({id,status,evidence,title:id,action:'Inspect page',group:'Technical'});
const report=(checks,url='https://site.org/page?lang=en')=>({checks,finalUrl:url,source:'HTML response',checkedAt:'2026-10-26T12:00:00Z'});
test('domain entry trims whitespace, preserves explicit protocols for server validation',()=>{
  assert.equal(prepareAddress(' site.org/path?q=a '),'https://site.org/path?q=a');
  assert.equal(prepareAddress('http://site.org'),'http://site.org');
  assert.equal(prepareAddress('javascript:alert(1)'),'javascript:alert(1)');
  assert.equal(prepareAddress('  '),'');
});
test('search combines words across evidence and titles, filters status and orders review prompts',()=>{
  const checks=[finding('social'),finding('alt','review','image missing'),finding('indexing'),finding('title','observed')];
  assert.deepEqual(selectFindings(checks,{status:'review'}).map(c=>c.id),['indexing','alt','social']);
  assert.deepEqual(selectFindings(checks,{query:'IMAGE inspect',priority:'next'}).map(c=>c.id),['alt']);
  assert.equal(findingPriority(finding('indexing','observed')),'info');
  assert.equal(selectFindings(checks,{status:'observed',query:'missing'}).length,0);
  assert.equal(checks[0].id,'social');
});
test('comparison requires identical final URL, query and source',()=>{
  const old=report([finding('title')]);
  assert.equal(compareReports(old,report([], 'https://site.org/page?lang=fr')),null);
  assert.equal(compareReports(old,{...report([]),source:'Rendered HTML'}),null);
});
test('unavailable and missing checks are not labelled fixed, evidence changes remain visible',()=>{
  const old=report([finding('title'),finding('alt'),finding('schema'),finding('http','observed')]);
  const next=report([finding('title','observed','New title'),finding('alt','not_checked'),finding('http','review')]);
  const result=compareReports(old,next);
  assert.equal(result.noLongerFlagged,1);
  assert.equal(result.newReview,1);
  assert.equal(result.nowUnchecked,1);
  assert.equal(result.changes.length,3);
  assert.equal(compareReports(next,next).changes.length,0);
});
