import {useEffect,useRef,useState} from 'react';
import {filterSearchRows,isOpportunity} from '../lib/action-insights.mjs';
import {googleRead,readSearchData,readSearchBreakdown,propertyContainsPage,SEARCH_CONSOLE_SCOPE} from '../lib/search-console.mjs';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.mjs';

let sdkPromise:Promise<void>|null=null;
function loadGoogle(){
  if((window as any).google?.accounts?.oauth2)return Promise.resolve();
  if(!sdkPromise)sdkPromise=new Promise<void>((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;
    const timer=setTimeout(()=>{script.remove();sdkPromise=null;reject(new Error('Google could not load. Try again.'))},20000);
    script.onload=()=>{clearTimeout(timer);if((window as any).google?.accounts?.oauth2)resolve();else{sdkPromise=null;reject(new Error('Google could not load. Try again.'))}};
    script.onerror=()=>{clearTimeout(timer);script.remove();sdkPromise=null;reject(new Error('Google could not load. Try again.'))};document.head.append(script);
  });return sdkPromise;
}
const format=(n:number|null,percent=false)=>n===null?'—':percent?`${(n*100).toFixed(1)}%`:n.toLocaleString(undefined,{maximumFractionDigits:1});
const views=[['query','Search terms'],['page','Top pages'],['device','Devices'],['country','Countries'],['date','Trends']];
const metricFields=[['clicks','Clicks'],['impressions','Impressions'],['ctr','Click rate'],['position','Avg. position']];
export function SearchRows({rows,view}:{rows:any[];view:string}){
  const [query,setQuery]=useState(''),[sort,setSort]=useState('clicks_desc'),[opportunities,setOpportunities]=useState(false);
  const searchable=view==='query'||view==='page';
  const shown=searchable?filterSearchRows(rows,{query,sort,opportunities}):rows;
  const peak=Math.max(1,...rows.map(r=>typeof r.clicks==='number'?r.clicks:0));
  return <>{searchable&&<><div className="finding-tools search-row-tools"><label className="finding-search" htmlFor="google-row-search">{view==='query'?'Find a search term':'Find a page'}<input id="google-row-search" type="search" value={query} placeholder={view==='query'?'Search returned terms':'Search returned page URLs'} onChange={e=>setQuery(e.target.value)}/></label><label htmlFor="google-row-sort">Sort returned rows<select id="google-row-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="clicks_desc">Most clicks</option><option value="impressions_desc">Most impressions</option><option value="ctr_asc">Lowest click rate</option><option value="position_asc">Average position: low to high</option><option value="key_asc">A–Z</option></select></label></div><label className="opportunity-toggle"><input type="checkbox" checked={opportunities} onChange={e=>setOpportunities(e.target.checked)}/>Show review opportunities only</label><p className="hint">Review prompt: at least 100 impressions and below 3% click rate. This is a starting filter, not a universal benchmark or a ranking prediction.</p><p className="hint" role="status">{shown.length} of {rows.length} returned rows shown. Searches and sorting apply only to rows Google returned, not all keywords or pages.</p></>}{view==='date'&&rows.some(r=>r.clicks!==null)&&<div className="search-trend" role="img" aria-label="Daily clicks returned by Google. Exact values are in the table below.">{rows.map(r=><div key={r.key} title={`${r.key}: ${format(r.clicks)} clicks`}><span style={{height:r.clicks===null?0:`${r.clicks/peak*100}%`}}/></div>)}</div>}{shown.length?<div className="table-wrap"><table><caption className="sr-only">{views.find(v=>v[0]===view)?.[1]} from Google Search Console</caption><thead><tr><th>{view==='query'?'Search term':view==='page'?'Page':view==='device'?'Device':view==='country'?'Country code':'Date (PT)'}</th>{metricFields.map(([key,label])=><th key={key}>{label}</th>)}</tr></thead><tbody>{shown.map(r=><tr key={r.key}><td>{view==='country'?r.key.toUpperCase():r.key}{searchable&&isOpportunity(r)&&<small className="opportunity-note">Review opportunity</small>}</td>{metricFields.map(([key])=><td key={key}>{format(r[key],key==='ctr')}</td>)}</tr>)}</tbody></table></div>:<div className="empty"><p>No returned rows match these filters.</p><button className="button secondary" onClick={()=>{setQuery('');setSort('clicks_desc');setOpportunities(false)}}>Reset row filters</button></div>}</>;
}
export default function SearchConsole({page}:{page?:string}){
  const [config,setConfig]=useState<{clientId:string;testing:boolean}|null>(null),[configError,setConfigError]=useState(''),[opened,setOpened]=useState(false),[ready,setReady]=useState(false),[sdkBusy,setSdkBusy]=useState(false);
  const [connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sites,setSites]=useState<string[]>([]),[property,setProperty]=useState(''),[scope,setScope]=useState('page'),[data,setData]=useState<any>(null);
  const [days,setDays]=useState(28),[view,setView]=useState('query'),[breakdowns,setBreakdowns]=useState<Record<string,any>>({}),[detailBusy,setDetailBusy]=useState(false),[detailError,setDetailError]=useState('');
  const token=useRef(''),expires=useRef<ReturnType<typeof setTimeout>|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0),mounted=useRef(true);
  function clear(){generation.current++;controller.current?.abort();token.current='';if(expires.current)clearTimeout(expires.current);setConnected(false);setSites([]);setProperty('');setData(null);setBusy(false);setBreakdowns({});setDetailBusy(false);setDetailError('')}
  useEffect(()=>{mounted.current=true;const c=new AbortController();fetch('/api/config',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setConfig).catch(e=>{if(e.name!=='AbortError')setConfigError('Google connection is unavailable.')});return()=>{mounted.current=false;c.abort();controller.current?.abort();token.current='';if(expires.current)clearTimeout(expires.current)}},[]);
  useEffect(()=>{change();setScope(page?'page':'property');setProperty(old=>page&&old&&!propertyContainsPage(old,page)?'':old)},[page]);
  async function prepare(){if(ready||sdkBusy||!config?.clientId)return;setSdkBusy(true);setError('');try{await loadGoogle();if(mounted.current)setReady(true)}catch(e){if(mounted.current)setError((e as Error).message)}finally{if(mounted.current)setSdkBusy(false)}}
  useEffect(()=>{if(opened&&config?.clientId)prepare()},[opened,config?.clientId]);
  function connect(){
    if(!ready||!config?.clientId||busy)return;clear();setBusy(true);setError('');const run=generation.current;
    const oauth=(window as any).google.accounts.oauth2;
    const client=oauth.initTokenClient({client_id:config.clientId,scope:SEARCH_CONSOLE_SCOPE,include_granted_scopes:false,
      callback:async(response:any)=>{
        if(!mounted.current||run!==generation.current)return;
        if(response.error||!response.access_token||!oauth.hasGrantedAllScopes(response,SEARCH_CONSOLE_SCOPE)){setBusy(false);setError('Read-only Search Console access was not granted.');return}
        const lifetime=Number(response.expires_in);if(!Number.isFinite(lifetime)||lifetime<=0){setBusy(false);setError('Google access expired. Connect again.');return}
        token.current=response.access_token;setConnected(true);
        expires.current=setTimeout(()=>{clear();setError('Google access expired. Connect again.')},Math.min(lifetime*1000,2147483647));
        const c=new AbortController();controller.current=c;
        try{
          const result=await googleRead(token.current,'https://www.googleapis.com/webmasters/v3/sites',undefined,AbortSignal.any([c.signal,AbortSignal.timeout(30000)]));
          if(run!==generation.current||!mounted.current)return;
          const available=(result.siteEntry||[]).filter((s:any)=>s.permissionLevel!=='siteUnverifiedUser'&&typeof s.siteUrl==='string').map((s:any)=>s.siteUrl);
          setSites(available);setProperty(page?available.find((s:string)=>propertyContainsPage(s,page))||'':available[0]||'');
        }catch(e){if(run===generation.current){if((e as any).status===401)clear();setError((e as Error).name==='TimeoutError'?'Google did not respond. Connect again.':(e as Error).message)}}finally{if(run===generation.current)setBusy(false)}
      },error_callback:(e:any)=>{if(run===generation.current){setBusy(false);setError(e.type==='popup_closed'?'Google connection cancelled.':'Allow Google’s sign-in popup, then try again.')}}});
    try{client.requestAccessToken({prompt:'select_account'})}catch{setBusy(false);setError('Google connection could not start. Try again.')}
  }
  async function load(){
    if(!token.current||!property||busy)return;const run=++generation.current;controller.current?.abort();const c=new AbortController();controller.current=c;setBusy(true);setData(null);setError('');setBreakdowns({});setDetailBusy(false);setDetailError('');setView('query');
    try{
      const result=await readSearchData({token:token.current,property,page:scope==='page'?page:undefined,days,compare:true,queryLimit:20,signal:AbortSignal.any([c.signal,AbortSignal.timeout(40000)])});
      if(run===generation.current&&mounted.current){setData(result);setBreakdowns({query:{rows:result.queries.map((q:any)=>({...q,key:q.query})),error:result.queriesError}})}
    }catch(e){if(run===generation.current){if((e as any).status===401)clear();setError((e as Error).name==='TimeoutError'?'Google did not respond. Try again.':(e as Error).message)}}finally{if(run===generation.current)setBusy(false)}
  }
  function change(){generation.current++;controller.current?.abort();setBusy(false);setData(null);setError('');setBreakdowns({});setDetailBusy(false);setDetailError('');setView('query')}
  async function showView(next:string){
    if(!data||busy||!token.current)return;const run=++generation.current;controller.current?.abort();setView(next);setDetailError('');setDetailBusy(false);
    if(breakdowns[next]&&!breakdowns[next].error)return;
    const c=new AbortController();controller.current=c;setDetailBusy(true);
    try{
      const result=await readSearchBreakdown({token:token.current,property:data.property,page:data.page||undefined,days:data.days,dimension:next,now:new Date(data.checkedAt),signal:AbortSignal.any([c.signal,AbortSignal.timeout(40000)])});
      if(run===generation.current&&mounted.current)setBreakdowns(old=>({...old,[next]:result}));
    }catch(e){if(run===generation.current&&mounted.current){if((e as any).status===401){clear();setError((e as Error).message)}else setDetailError((e as Error).name==='TimeoutError'?'Google did not respond. Try again.':(e as Error).message)}}finally{if(run===generation.current&&mounted.current)setDetailBusy(false)}
  }
  async function disconnect(){const value=token.current;clear();setError('');if(value){try{(window as any).google.accounts.oauth2.revoke(value,()=>{})}catch{}}}
  return <details className="google-panel" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary><span className="google-g" aria-hidden="true">G</span><strong>Google Search Console</strong><span className="optional">{connected?'Connected':'Optional'}</span><ChevronDown size={16}/></summary>
    <div className="google-body">
      {config?.clientId&&config.testing&&<p className="hint">Testing · Approved accounts only.</p>}
      {!connected&&<><p className="hint">Search traffic and recorded indexing. Read-only; data stays in this tab.</p>{config?.clientId?<button className="button secondary" disabled={!ready||busy} onClick={connect}>{busy?'Connecting…':sdkBusy?'Loading Google…':'Connect with Google'}</button>:<p className="setup-note">{configError||(!config?'Checking connection…':'Connection setup is pending.')} <a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">Open Search Console ↗</a></p>}{config?.clientId&&!ready&&!sdkBusy&&<button className="text-button" onClick={prepare}>Retry loading Google</button>}</>}
      {connected&&<><div className="google-controls"><div className="property-select"><label htmlFor="google-property">Website</label><select id="google-property" value={property} disabled={busy} onChange={e=>{change();setProperty(e.target.value)}}><option value="">Choose your property</option>{sites.map(site=><option key={site} value={site}>{site}</option>)}</select></div>{page&&<div><label htmlFor="google-scope">Show</label><select id="google-scope" value={scope} disabled={busy} onChange={e=>{change();setScope(e.target.value)}}><option value="page">Audited page</option><option value="property">Whole property</option></select></div>}<div><label htmlFor="google-days">Period</label><select id="google-days" value={days} disabled={busy} onChange={e=>{change();setDays(Number(e.target.value))}}>{[7,28,90].map(n=><option key={n} value={n}>Last {n} days</option>)}</select></div><button className="button primary" disabled={busy||!property||(scope==='page'&&!!page&&!propertyContainsPage(property,page))} onClick={load}>{busy?'Reading Google…':'Load Google data'}</button></div>{!busy&&sites.length===0&&<p className="hint">No accessible properties found. Add or verify your website in <a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">Search Console</a>, then reconnect.</p>}{page&&scope==='page'&&property&&!propertyContainsPage(property,page)&&<p className="hint">This property does not include the audited page. Choose a matching property.</p>}<button className="text-button disconnect" onClick={disconnect}>Disconnect Google</button></>}
      <div role="status">{error&&<p className="error">{error}</p>}</div>
      {data&&<div className="google-data"><p className="data-context"><strong>{data.page?'Audited page':'Whole property'}</strong> · {data.startDate} – {data.endDate} (PT)<br/>{data.page||data.property}</p>{data.metrics?<dl className="google-metrics">{metricFields.map(([key,label])=><div key={key}><dt>{label}</dt><dd>{format(data.metrics[key],key==='ctr')}</dd><small>Previous: {format(data.previousMetrics?.[key]??null,key==='ctr')}</small></div>)}</dl>:<p className="hint">{data.metricsError||'Google returned no traffic rows for this period.'}</p>}
        <p className="hint">Final Google search data · historical average position.</p>
        {data.page&&<div className="index-result"><strong>Google indexing</strong><p>{data.inspection?.coverage||data.inspection?.verdict||data.inspectionError||'No indexing result returned.'}</p><small>Google’s recorded version, not a live test.{data.inspection?.lastCrawl&&` Last crawled: ${new Date(data.inspection.lastCrawl).toLocaleString()}.`}</small>{data.inspection?.googleCanonical&&<small>Google canonical: {data.inspection.googleCanonical}</small>}</div>}
        <div className="search-views"><div className="search-tabs" role="group" aria-label="Search Console details">{views.map(([key,label])=><button key={key} aria-pressed={view===key} onClick={()=>showView(key)}>{label}</button>)}</div><section className="search-view" aria-label={views.find(v=>v[0]===view)?.[1]} aria-busy={detailBusy}><div role="status">{detailBusy&&<p className="hint">Reading Google…</p>}{(detailError||breakdowns[view]?.error)&&!detailBusy&&<p className="hint">{detailError||breakdowns[view].error} <button className="text-button" onClick={()=>showView(view)}>Retry</button></p>}</div>{!detailBusy&&!detailError&&!breakdowns[view]?.error&&(breakdowns[view]?.rows.length?<SearchRows key={view+data.checkedAt} rows={breakdowns[view].rows} view={view}/>:<p className="hint">Google returned no rows for this view.</p>)}{view==='page'&&data.page&&<p className="hint">Showing the audited page. Choose Whole property to see other pages.</p>}{view==='date'&&<p className="hint">Daily clicks. Dates Google omits are left out.</p>}{view==='country'&&<p className="hint">Google’s three-letter country codes.</p>}</section></div>
        <details className="report-details"><summary>Data details</summary><p>Previous period: {data.previousDates.startDate} – {data.previousDates.endDate} (PT). {data.previousError||(!data.previousMetrics?'No previous traffic rows returned.':'')}</p><p>Final data only, ending three days before today. Top 20 search terms, pages and countries; Google may omit rows and private queries. Tables may not add up to the totals. Each extra view loads on demand; free API limits apply.</p><p>Average position is historical. These reports do not measure visits from other search engines or provide a site-wide indexing count.</p><a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">Open full Search Console ↗</a></details>
      </div>}
    </div>
  </details>;
}
