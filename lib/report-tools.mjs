// UI helpers only; server-side public URL/DNS validation remains authoritative.
export function prepareAddress(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`;
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
    terms.every(term => `${c.title} ${c.group} ${c.evidence} ${c.action} ${c.id}`.toLowerCase().includes(term)))
    .sort((a,b) => order[findingPriority(a)] - order[findingPriority(b)]);
}
export function compareReports(previous, current) {
  if (!previous || previous.finalUrl !== current.finalUrl || previous.source !== current.source) return null;
  const old = new Map(previous.checks.map(c => [c.id,c]));
  const now = new Map(current.checks.map(c => [c.id,c]));
  const changes = current.checks.flatMap(c => {
    const before = old.get(c.id);
    if (!before || before.status === c.status && before.evidence === c.evidence) return [];
    return [{id:c.id, before, current:c}];
  });
  return {
    checkedAt:previous.checkedAt, changes,
    newReview:current.checks.filter(c => c.status === 'review' && old.has(c.id) && old.get(c.id).status !== 'review').length,
    noLongerFlagged:previous.checks.filter(c => c.status === 'review' && now.get(c.id)?.status === 'observed').length,
    nowUnchecked:previous.checks.filter(c => c.status !== 'not_checked' && now.get(c.id)?.status === 'not_checked').length
  };
}
