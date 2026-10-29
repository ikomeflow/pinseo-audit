import {addressError} from './report-tools.mjs';

export const savedAuditKey='pinseo.saved-audit.v1';
const maxSize=2_000_000;
const statuses=new Set(['observed','review','not_checked']);
const progress=new Set(['todo','working','reviewed']);
function text(value,max){if(typeof value!=='string'||value.length>max)throw new Error('Invalid saved text');return value}
function pageUrl(value){text(value,2048);if(addressError(value))throw new Error('Invalid saved page');return value}
function cleanReport(value){
  if(!value||value.version!==1||!Array.isArray(value.checks)||value.checks.length>100||!Array.isArray(value.redirects)||value.redirects.length>4)throw new Error('Invalid saved report');
  if(!Number.isFinite(Date.parse(value.checkedAt)))throw new Error('Invalid saved date');
  const checks=value.checks.map(c=>{
    if(!c||!statuses.has(c.status)||!/^[-\w]{1,80}$/.test(c.id)||['__proto__','constructor','prototype'].includes(c.id))throw new Error('Invalid saved finding');
    const check={id:c.id,title:text(c.title,300),status:c.status,evidence:text(c.evidence,100_000),action:text(c.action,10_000),group:text(c.group,100)};
    if(c.details){const d=c.details;if(!Array.isArray(d.items)||d.items.length>100||!Number.isSafeInteger(d.total)||d.total<d.items.length)throw new Error('Invalid saved details');check.details={title:text(d.title,300),total:d.total,note:text(d.note,3000),items:d.items.map(i=>({label:text(i.label,500),detail:text(i.detail,10_000)}))}}
    return check;
  });
  if(new Set(checks.map(c=>c.id)).size!==checks.length)throw new Error('Duplicate saved findings');
  return {version:1,requestedUrl:pageUrl(value.requestedUrl),finalUrl:pageUrl(value.finalUrl),checkedAt:text(value.checkedAt,100),source:text(value.source,300),redirects:value.redirects.map(r=>{if(!Number.isInteger(r.status)||r.status<300||r.status>399)throw new Error('Invalid redirect');return {from:pageUrl(r.from),to:pageUrl(r.to),status:r.status}}),checks};
}
// Explicit allowlists keep Google connections, tokens and unrelated state out of storage.
export function savedAuditSnapshot(report,previous,actions){
  const current=cleanReport(report);
  const baseline=previous&&previous.finalUrl===current.finalUrl&&previous.source===current.source?cleanReport(previous):null;
  const page=actions?.[current.finalUrl]||{};
  const entries=current.checks.flatMap(c=>{const a=page[c.id];if(!a)return [];if(!progress.has(a.status))throw new Error('Invalid saved progress');return [[c.id,{status:a.status,note:text(a.note,1000),evidence:text(a.evidence,200_000)}]]});
  return {version:1,report:current,previous:baseline,actions:{[current.finalUrl]:Object.fromEntries(entries)}};
}
export function encodeSavedAudit(report,previous,actions){
  const raw=JSON.stringify(savedAuditSnapshot(report,previous,actions));
  if(raw.length>maxSize)throw new Error('This report is too large to save on this device. Export it instead.');
  return raw;
}
export function decodeSavedAudit(raw){
  if(!raw)return null;
  if(typeof raw!=='string'||raw.length>maxSize)throw new Error('Invalid saved audit');
  const value=JSON.parse(raw);
  if(value.version!==1)throw new Error('Unsupported saved audit');
  return savedAuditSnapshot(value.report,value.previous,value.actions);
}
