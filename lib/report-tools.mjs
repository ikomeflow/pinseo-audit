import {evidenceKey} from './finding-details.mjs';
export const findingLabels={observed:'Checks recorded',review:'Needs review',not_checked:'Not checked'};
// These IDs have fixed meanings, including in reports saved by earlier versions.
export function findingLabel(finding){
  if(finding.status!=='not_checked')return findingLabels[finding.status]||finding.status;
  if(finding.id==='rankings')return 'Outside this audit';
  if(finding.id==='alt')return 'Not applicable';
  if(finding.id==='schema')return 'Not found';
  if(finding.id==='robots'||finding.id==='sitemap')return 'Couldn’t load';
  return 'Not checked';
}
export function otherChecksLabel(checks){
  const labels=new Set(checks.filter(c=>c.status==='not_checked').map(findingLabel));
  return labels.size===1?[...labels][0]:'Other checks';
}
// UI helpers only; server-side public URL/DNS validation remains authoritative.
export function prepareAddress(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;
}

export function addressError(value){
  try{
    const u=new URL(prepareAddress(value));
    if(u.protocol!=='https:')return 'Use an HTTPS address, such as https://yourwebsite.com.';
    if(u.username||u.password||u.port)return 'Use a public website address without a password or custom port.';
    const host=u.hostname.toLowerCase().replace(/\.$/,'');
    if(!host.includes('.')||!/^[a-z0-9.-]+$/.test(host)||/^[\d.]+$/.test(host)||/(^|\.)(localhost|local|internal|test|invalid|example|onion|home|lan|arpa)$/.test(host))return 'Enter a public website domain, such as yourwebsite.com.';
    return '';
  }catch{return 'Enter a valid website address, such as yourwebsite.com.'}
}

const first = new Set(['http', 'indexing', 'canonical']);
const next = new Set(['title', 'description', 'h1', 'viewport', 'lang', 'alt', 'schema', 'redirects']);
export function findingPriority(finding) {
  if (finding.status !== 'review') return 'info';
  if (first.has(finding.id)) return 'first';
  return next.has(finding.id) ? 'next' : 'info';
}
export const priorityLabels = {first:'Check first', next:'Review next', info:'Informational'};
export function selectFindings(checks, {status='all', priority='all', query=''} = {}) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const order = {first:0, next:1, info:2};
  return checks.filter(c => (status === 'all' || c.status === status) &&
    (priority === 'all' || findingPriority(c) === priority) &&
    terms.every(term => `${c.title} ${c.group} ${c.evidence} ${c.action} ${c.id} ${JSON.stringify(c.details||'')}`.toLowerCase().includes(term)))
    .sort((a,b) => order[findingPriority(a)] - order[findingPriority(b)]);
}
export function compareReports(previous, current) {
  if (!previous || previous.finalUrl !== current.finalUrl || previous.source !== current.source) return null;
  const old = new Map(previous.checks.map(c => [c.id,c]));
  const now = new Map(current.checks.map(c => [c.id,c]));
  const changes = current.checks.flatMap(c => {
    const before = old.get(c.id);
    if (!before || before.status === c.status && evidenceKey(before) === evidenceKey(c)) return [];
    return [{id:c.id, before, current:c}];
  });
  return {
    checkedAt:previous.checkedAt, changes,
    stillReview:current.checks.filter(c=>c.status==='review').length,
    omitted:previous.checks.filter(c=>!now.has(c.id)).length,
    added:current.checks.filter(c=>!old.has(c.id)).length,
    newReview:current.checks.filter(c => c.status === 'review' && old.has(c.id) && old.get(c.id).status !== 'review').length,
    noLongerFlagged:previous.checks.filter(c => c.status === 'review' && now.get(c.id)?.status === 'observed').length,
    nowUnchecked:previous.checks.filter(c => c.status !== 'not_checked' && now.get(c.id)?.status === 'not_checked').length
  };
}
