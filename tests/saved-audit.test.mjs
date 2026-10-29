import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeSavedAudit,decodeSavedAudit} from '../lib/saved-audit.mjs';
import {updateAction,checklist} from '../lib/action-insights.mjs';
import {compareReports} from '../lib/report-tools.mjs';
const finding={id:'h1',title:'Main heading',status:'review',group:'On-page',evidence:'Two headings',action:'Review the outline.'};
const report={version:1,requestedUrl:'https://site.org/',finalUrl:'https://site.org/',checkedAt:'2026-10-28T12:00:00Z',source:'HTML',redirects:[],checks:[finding]};
test('saved report restores notes and evidence baselines while excluding Google and unrelated data',()=>{
  const actions=updateAction({},report.finalUrl,finding,{status:'reviewed',note:'Café 日本語 <script> text'});
  actions['https://other.org/']={secret:'unrelated'};
  const raw=encodeSavedAudit({...report,token:'never-save',google:{clicks:123}},null,actions);
  assert.doesNotMatch(raw,/never-save|google|unrelated|other.org/);
  const saved=decodeSavedAudit(raw);assert.deepEqual(saved.report,report);
  assert.equal(checklist(saved.report,saved.actions)[0].note,'Café 日本語 <script> text');
  const changed={...report,checks:[{...finding,evidence:'Three headings'}]};
  assert.equal(checklist(changed,saved.actions)[0].evidenceChanged,true);
});
test('only same-page same-method comparison is persisted and unavailable checks are not fixed',()=>{
  const current={...report,checks:[{...finding,status:'not_checked'}]};
  const saved=decodeSavedAudit(encodeSavedAudit(current,report,{}));
  assert.equal(compareReports(saved.previous,saved.report).nowUnchecked,1);
  assert.equal(compareReports(saved.previous,saved.report).noLongerFlagged,0);
  assert.equal(decodeSavedAudit(encodeSavedAudit(report,{...report,finalUrl:'https://other.org/'},{})).previous,null);
});
test('corrupt, oversized, unsupported and malformed saved data fails safely',()=>{
  assert.equal(decodeSavedAudit(null),null);
  for(const raw of ['{','x'.repeat(2_000_001),JSON.stringify({version:2}),JSON.stringify({version:1,report:{...report,finalUrl:'javascript:alert(1)'}}),JSON.stringify({version:1,report:{...report,checks:[{...finding,id:'__proto__'}]}})])assert.throws(()=>decodeSavedAudit(raw));
  assert.throws(()=>encodeSavedAudit(report,null,{[report.finalUrl]:{h1:{status:'reviewed',note:'x'.repeat(1001),evidence:'x'}}}));
});
