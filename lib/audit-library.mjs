import {savedAuditSnapshot,decodeSavedAudit} from './saved-audit.mjs';
import {platformKey} from './platform-guidance.mjs';
import {selectFindings} from './report-tools.mjs';

export const savedLibraryKey='pinseo.saved-audits.v2';
export const recentAuditLimit=5;
const maxSize=2_000_000;
function cleanEntry(entry){return {...savedAuditSnapshot(entry.report,entry.previous,entry.actions),platform:platformKey(entry.platform)}}
export function upsertSavedAudit(entries,report,previous,actions,platform='general'){
  const entry=cleanEntry({report,previous,actions,platform});
  return [entry,...entries.filter(e=>e.report.finalUrl!==entry.report.finalUrl)].slice(0,recentAuditLimit);
}
export function encodeAuditLibrary(entries,activeUrl){
  if(!Array.isArray(entries)||entries.length>recentAuditLimit)throw new Error('Too many saved audits');
  const clean=entries.map(cleanEntry),urls=clean.map(e=>e.report.finalUrl);
  if(new Set(urls).size!==urls.length||!urls.includes(activeUrl))throw new Error('Invalid saved audit selection');
  const raw=JSON.stringify({version:2,activeUrl,entries:clean});
  if(raw.length>maxSize)throw new Error('Saved reports are too large for device storage. Export them instead.');
  return raw;
}
export function decodeAuditLibrary(raw,legacyRaw=null){
  if(!raw){const legacy=decodeSavedAudit(legacyRaw);return legacy?{version:2,activeUrl:legacy.report.finalUrl,entries:[{...legacy,platform:'general'}]}:null}
  if(typeof raw!=='string'||raw.length>maxSize)throw new Error('Invalid saved audits');
  const parsed=JSON.parse(raw);
  if(parsed.version!==2)throw new Error('Unsupported saved audits');
  return JSON.parse(encodeAuditLibrary(parsed.entries,parsed.activeUrl));
}
export function matchingBaseline(latest,entries,current){
  const eligible=r=>r?.finalUrl===current.finalUrl&&r?.source===current.source;
  if(eligible(latest))return latest;
  return entries.find(e=>eligible(e.report))?.report||null;
}
export function resumeFinding(entry){
  return selectFindings(entry.report.checks,{status:'review'})[0]||entry.report.checks.find(c=>entry.actions?.[entry.report.finalUrl]?.[c.id])||null;
}
