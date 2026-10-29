import test from 'node:test';
import assert from 'node:assert/strict';
import {findingLabel,otherChecksLabel} from '../lib/report-tools.mjs';
import {actionIsSaved,hasUnsavedWork,filterDescription} from '../lib/workspace-state.mjs';
import {reportHtml,reportCsv} from '../lib/report-export.mjs';
import {encodeSavedAudit,decodeSavedAudit} from '../lib/saved-audit.mjs';

const page='https://site.org/';
const action={status:'working',note:'Check the template heading.',evidence:'Two headings'};
const saved=(url=page,value=action)=>({report:{finalUrl:url},actions:{[url]:{h1:{...value}}}});
const checks=['rankings','robots','sitemap','alt','schema','future-check'].map(id=>({id,title:id,status:'not_checked',group:'Scope',evidence:'Source observation',action:'Review evidence'}));
const report={version:1,requestedUrl:page,finalUrl:page,checkedAt:'2026-10-28T12:00:00Z',source:'HTML',redirects:[],checks};

test('unchecked labels distinguish scope, failed requests, absent elements and non-applicable checks',()=>{
  assert.deepEqual(checks.map(findingLabel),['Outside this audit','Couldn’t load','Couldn’t load','Not applicable','Not found','Not checked']);
  assert.equal(findingLabel({...checks[0],status:'review'}),'Needs review');
  assert.equal(findingLabel({...checks[1],status:'observed'}),'Checks recorded');
  assert.equal(otherChecksLabel(checks),'Other checks');
  assert.equal(otherChecksLabel([checks[0]]),'Outside this audit');
  assert.equal(otherChecksLabel([checks[1],checks[2]]),'Couldn’t load');
  assert.equal(otherChecksLabel([]),'Other checks');
  assert.ok(checks.every(c=>c.status==='not_checked'));
});

test('older saved reports and exports receive precise labels without changing raw statuses',()=>{
  const restored=decodeSavedAudit(encodeSavedAudit(report,null,{}));
  assert.deepEqual(restored.report,report);
  for(const format of [reportHtml(restored.report),reportCsv(restored.report)]){
    for(const label of ['Outside this audit','Couldn’t load','Not applicable','Not found'])assert.ok(format.includes(label));
  }
});

test('unsaved work ignores untouched fields but protects notes and progress before any successful save',()=>{
  assert.equal(hasUnsavedWork({}),false);
  assert.equal(hasUnsavedWork({[page]:{h1:{status:'todo',note:'',evidence:'x'}}}),false);
  assert.equal(hasUnsavedWork({[page]:{h1:action}}),true);
  assert.equal(hasUnsavedWork({[page]:{h1:{...action,note:'',status:'reviewed'}}}),true);
  assert.equal(hasUnsavedWork({[page]:{h1:{...action,status:'todo'}}}),true);
});

test('saved state requires the same page, finding, note, progress and evidence snapshot',()=>{
  const actions={[page]:{h1:action}};
  assert.equal(hasUnsavedWork(actions,[saved()]),false);
  assert.equal(hasUnsavedWork(actions,[saved('https://other.org/')]),true);
  for(const patch of [{note:'Updated'},{status:'reviewed'},{evidence:'Three headings'}]){
    assert.equal(hasUnsavedWork({[page]:{h1:{...action,...patch}}},[saved()]),true);
    assert.equal(actionIsSaved({...action,...patch},action),false);
  }
  assert.equal(actionIsSaved({...action},action),true);
});

test('failed writes, clearing a saved note and notes on other pages remain protected',()=>{
  const cleared={status:'todo',note:'',evidence:action.evidence};
  assert.equal(hasUnsavedWork({[page]:{h1:cleared}},[saved()]),true);
  assert.equal(hasUnsavedWork({[page]:{h1:action}},[]),true);
  const other='https://other.org/';
  assert.equal(hasUnsavedWork({[page]:{h1:action},[other]:{h1:action}},[saved()]),true);
  assert.equal(hasUnsavedWork({[page]:{h1:action},[other]:{h1:action}},[saved(),saved(other)]),false);
  assert.equal(actionIsSaved(undefined,undefined),true);
});

test('filter description exposes every active restriction and becomes empty after a full reset',()=>{
  assert.equal(filterDescription({status:'review'}),'Needs review');
  assert.equal(filterDescription({status:'not_checked'},'Outside this audit'),'Outside this audit');
  assert.equal(filterDescription({status:'all',topic:'On-page',priority:'next',query:'  heading  '}),'On-page · Review next · “heading”');
  assert.equal(filterDescription({status:'all',topic:'all',priority:'all',query:'  '}),'');
});
