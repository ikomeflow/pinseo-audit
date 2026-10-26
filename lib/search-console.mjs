export const SEARCH_CONSOLE_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function propertyContainsPage(property, page) {
  try {
    const url = new URL(page);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    if (property.startsWith('sc-domain:')) {
      const domain = property.slice(10).toLowerCase();
      return !!domain && (url.hostname === domain || url.hostname.endsWith('.' + domain));
    }
    const prefix = new URL(property);
    return url.origin === prefix.origin && url.href.startsWith(prefix.href);
  } catch { return false; }
}

// Google reports dates in Pacific Time. Leave three days for final data, then
// request an inclusive 28-day window; this is a window, not a freshness promise.
export function searchWindow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone:'America/Los_Angeles', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now).map(p=>[p.type,p.value]));
  const day = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate()-3);
  const endDate = day.toISOString().slice(0,10);
  day.setUTCDate(day.getUTCDate()-27);
  return {startDate:day.toISOString().slice(0,10),endDate};
}

const number = (value,min=0,max=Infinity) => typeof value==='number' && Number.isFinite(value) && value>=min && value<=max ? value : null;
export function searchMetrics(row) {
  if (!row) return null;
  return {clicks:number(row.clicks),impressions:number(row.impressions),ctr:number(row.ctr,0,1),position:number(row.position,1)};
}

export class GoogleApiError extends Error {
  constructor(status) {
    super(status===401 ? 'Google access expired. Connect again.' : status===403 ? 'Google denied access. Check property permissions and API setup.' : status===429 ? 'Google’s quota is busy. Try again later.' : 'Google data is unavailable. Try again later.');
    this.status=status;
  }
}

export async function googleRead(token, resource, body, signal, fetcher=fetch) {
  // Only these read operations can receive the bearer token. Never send it to
  // the audited website, the PINSEO server, or a URL supplied by a visitor.
  if (!(/^https:\/\/www\.googleapis\.com\/webmasters\/v3\/sites(?:\/[^/]+\/searchAnalytics\/query)?$/.test(resource) || resource==='https://searchconsole.googleapis.com/v1/urlInspection/index:inspect')) throw new Error('Unsupported Google request.');
  const response = await fetcher(resource, {method:body?'POST':'GET',credentials:'omit',redirect:'error',headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal});
  if (!response.ok) throw new GoogleApiError(response.status);
  return response.json();
}

export async function readSearchData({token,property,page,signal,fetcher=fetch,now=new Date()}) {
  if (page && !propertyContainsPage(property,page)) throw new Error('Choose a property that includes this page.');
  const dates=searchWindow(now), endpoint=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const base={...dates,type:'web',dataState:'final',...(page?{dimensionFilterGroups:[{groupType:'and',filters:[{dimension:'page',operator:'equals',expression:page}]}]}:{})};
  const results=await Promise.allSettled([
    googleRead(token,endpoint,{...base,rowLimit:1},signal,fetcher),
    googleRead(token,endpoint,{...base,dimensions:['query'],rowLimit:5},signal,fetcher),
    ...(page?[googleRead(token,'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{inspectionUrl:page,siteUrl:property,languageCode:'en-US'},signal,fetcher)]:[])
  ]);
  // An expired token clears all private data, even if another request succeeded.
  for (const r of results) if(r.status==='rejected'&&r.reason?.status===401) throw r.reason;
  const value=i=>results[i]?.status==='fulfilled'?results[i].value:null;
  const message=i=>results[i]?.status==='rejected'?results[i].reason.message:'';
  const inspection=value(2)?.inspectionResult?.indexStatusResult;
  return {property,page:page||null,...dates,checkedAt:now.toISOString(),metrics:searchMetrics(value(0)?.rows?.[0]),metricsError:message(0),queries:(value(1)?.rows||[]).filter(r=>typeof r.keys?.[0]==='string').map(r=>({query:r.keys[0],...searchMetrics(r)})),queriesError:message(1),inspection:inspection?{coverage:inspection.coverageState||null,verdict:inspection.verdict||null,lastCrawl:inspection.lastCrawlTime||null,googleCanonical:inspection.googleCanonical||null}:null,inspectionError:message(2)};
}
