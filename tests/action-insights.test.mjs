import test from 'node:test';
import assert from 'node:assert/strict';
import {updateAction,checklist,filterSearchRows,isOpportunity} from '../lib/action-insights.mjs';
const finding={id:'title',title:'Page title',status:'review',evidence:'Missing'};
const report={finalUrl:'https://site.org/a?lang=en',checks:[finding]};
test('checklist progress is isolated by exact page and changes do not mutate prior state',()=>{
  const before={};const after=updateAction(before,report.finalUrl,finding,{status:'working',note:'Review title'});
  assert.deepEqual(before,{});assert.equal(checklist(report,after)[0].status,'working');
  assert.equal(checklist({...report,finalUrl:'https://site.org/a?lang=fr'},after)[0].status,'todo');
  assert.equal(checklist({...report,checks:[{...finding,status:'observed'}]},after).length,1);
});
test('changed evidence remains distinct from manual review and note edits do not reset its baseline',()=>{
  let actions=updateAction({},report.finalUrl,finding,{status:'reviewed'});
  const changed={...finding,evidence:'Two titles'};
  actions=updateAction(actions,report.finalUrl,changed,{note:'Investigate again'});
  assert.equal(checklist({...report,checks:[changed]},actions)[0].evidenceChanged,true);
  actions=updateAction(actions,report.finalUrl,changed,{status:'reviewed'});
  assert.equal(checklist({...report,checks:[changed]},actions)[0].evidenceChanged,false);
  assert.equal(updateAction(actions,report.finalUrl,changed,{note:'x'.repeat(1001)})[report.finalUrl].title.note.length,1000);
});
test('query search and opportunity filter use real valid metrics and thresholds',()=>{
  const rows=[{key:'Course online',impressions:120,ctr:.01,clicks:2,position:8},{key:'Course fees',impressions:99,ctr:.01,clicks:1,position:null},{key:'Brand',impressions:300,ctr:.1,clicks:30,position:1}];
  assert.equal(isOpportunity(rows[0]),true);assert.equal(isOpportunity(rows[1]),false);
  assert.equal(isOpportunity({impressions:200,ctr:null}),false);assert.equal(isOpportunity({impressions:200,ctr:-1}),false);
  assert.deepEqual(filterSearchRows(rows,{query:'COURSE online',opportunities:true}).map(r=>r.key),['Course online']);
  assert.deepEqual(filterSearchRows(rows,{sort:'position_asc'}).map(r=>r.key),['Brand','Course online','Course fees']);
  assert.equal(rows[0].key,'Course online');
  assert.deepEqual(filterSearchRows(rows,{query:'absent'}),[]);
});
