import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeAuditLibrary,encodeAuditLibrary,upsertSavedAudit,matchingBaseline,resumeFinding} from '../lib/audit-library.mjs';
import {encodeSavedAudit} from '../lib/saved-audit.mjs';
import {updateAction,checklist} from '../lib/action-insights.mjs';
import {compareReports} from '../lib/report-tools.mjs';
const finding={id:'h1',title:'Main heading',status:'review',group:'On-page',evidence:'Two headings',action:'Review the outline.'};
const report=(path='a',checks=[finding])=>({version:1,requestedUrl:'https://site.org/'+path,finalUrl:'https://site.org/'+path,checkedAt:'2026-10-28T12:00:00Z',source:'HTML',redirects:[],checks});
test('legacy opt-in saves migrate without losing notes or changing their evidence baseline',()=>{
  const r=report(),actions=updateAction({},r.finalUrl,finding,{status:'reviewed',note:'Review café heading'});
  const migrated=decodeAuditLibrary(null,encodeSavedAudit(r,null,actions));
  const restored=decodeAuditLibrary(encodeAuditLibrary(migrated.entries,migrated.activeUrl));
  assert.equal(restored.entries[0].platform,'general');
  assert.equal(checklist(restored.entries[0].report,restored.entries[0].actions)[0].note,'Review café heading');
  assert.equal(checklist(report('a',[{...finding,evidence:'Three headings'}]),restored.entries[0].actions)[0].evidenceChanged,true);
});
test('recent pages are bounded, exact-URL isolated, deduplicated and ordered by latest use',()=>{
  let entries=[];for(let i=0;i<6;i++)entries=upsertSavedAudit(entries,report(String(i)),null,{},'shopify');
  assert.equal(entries.length,5);assert.equal(entries.at(-1).report.finalUrl,'https://site.org/1');
  entries=upsertSavedAudit(entries,report('2'),null,{},'wordpress');
  assert.equal(entries.length,5);assert.equal(entries[0].platform,'wordpress');
  entries=upsertSavedAudit(entries,report('2?lang=fr'),null,{},'custom');
  assert.equal(entries.length,5);assert.notEqual(entries[0].report.finalUrl,entries[1].report.finalUrl);
  const restored=decodeAuditLibrary(encodeAuditLibrary(entries,entries[0].report.finalUrl));
  assert.deepEqual(restored.entries.map(e=>e.platform),entries.map(e=>e.platform));
});
test('library storage keeps each page’s notes but excludes Google tokens and unrelated fields',()=>{
  const a=report('a'),b=report('b');let actions=updateAction({},a.finalUrl,finding,{note:'Page A'});actions=updateAction(actions,b.finalUrl,finding,{note:'Page B'});
  let entries=upsertSavedAudit([],{...a,token:'secret-token',google:{clicks:10}},null,actions,'wordpress');entries=upsertSavedAudit(entries,b,null,actions,'shopify');
  const raw=encodeAuditLibrary(entries,b.finalUrl);assert.doesNotMatch(raw,/secret-token|google/);
  const restored=decodeAuditLibrary(raw);
  assert.equal(restored.entries[0].actions[b.finalUrl].h1.note,'Page B');assert.equal(restored.entries[1].actions[a.finalUrl].h1.note,'Page A');
});
test('returning to a recent page finds only an exact-page same-method comparison baseline',()=>{
  const a=report('a'),b=report('b'),entries=upsertSavedAudit([],a,null,{});
  assert.deepEqual(matchingBaseline(b,entries,a),a);
  assert.equal(matchingBaseline(b,entries,report('a?lang=fr')),null);
  assert.equal(matchingBaseline(b,entries,{...a,source:'Rendered HTML'}),null);
});
test('resume opens a personal note when no review findings exist and still prioritizes flagged findings',()=>{
  const observed={...finding,status:'observed'},r=report('a',[observed]);
  const actions=updateAction({},r.finalUrl,observed,{note:'Check wording with maintainer'});
  const entry=upsertSavedAudit([],r,null,actions)[0];assert.equal(resumeFinding(entry).id,'h1');
  const flagged={...finding,id:'title'};assert.equal(resumeFinding({...entry,report:report('a',[observed,flagged])}).id,'title');
  assert.equal(resumeFinding({...entry,actions:{}}),null);
});
test('corrupt, duplicated, oversized and unsupported libraries fail before replacing a saved copy',()=>{
  const entry=upsertSavedAudit([],report(),null,{})[0];
  for(const raw of ['{',JSON.stringify({version:3}),JSON.stringify({version:2,activeUrl:'https://site.org/a',entries:[entry,entry]}),'x'.repeat(2_000_001)])assert.throws(()=>decodeAuditLibrary(raw));
  assert.throws(()=>encodeAuditLibrary([entry],'https://other.org/'));
  const huge=report('big',Array.from({length:30},(_,i)=>({...finding,id:'c'+i,evidence:'x'.repeat(100_000)})));
  assert.throws(()=>encodeAuditLibrary(upsertSavedAudit([],huge,null,{}),huge.finalUrl),/too large/);
});
test('visible comparison totals keep unavailable, omitted and newly added checks distinct from improvements',()=>{
  const old=report('a',[finding,{...finding,id:'title'},{...finding,id:'alt'},{...finding,id:'lang'}]);
  const now=report('a',[{...finding,status:'not_checked'},{...finding,id:'title',status:'observed'},{...finding,id:'alt'},{...finding,id:'new'}]);
  const diff=compareReports(old,now);
  assert.equal(diff.nowUnchecked,1);assert.equal(diff.noLongerFlagged,1);assert.equal(diff.omitted,1);assert.equal(diff.added,1);assert.equal(diff.stillReview,2);
});
