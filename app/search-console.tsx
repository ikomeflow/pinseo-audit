import {useEffect,useRef,useState} from 'react';
import {googleRead,readSearchData,propertyContainsPage,SEARCH_CONSOLE_SCOPE} from '../lib/search-console.mjs';
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

export default function SearchConsole({page}:{page?:string}){
  const [config,setConfig]=useState<{clientId:string}|null>(null),[configError,setConfigError]=useState(''),[opened,setOpened]=useState(false),[ready,setReady]=useState(false),[sdkBusy,setSdkBusy]=useState(false);
  const [connected,setConnected]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sites,setSites]=useState<string[]>([]),[property,setProperty]=useState(''),[scope,setScope]=useState('page'),[data,setData]=useState<any>(null);
  const token=useRef(''),expires=useRef<ReturnType<typeof setTimeout>|null>(null),controller=useRef<AbortController|null>(null),generation=useRef(0),mounted=useRef(true);
  function clear(){generation.current++;controller.current?.abort();token.current='';if(expires.current)clearTimeout(expires.current);setConnected(false);setSites([]);setProperty('');setData(null);setBusy(false)}
  useEffect(()=>{mounted.current=true;const c=new AbortController();fetch('/api/config',{signal:c.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(setConfig).catch(e=>{if(e.name!=='AbortError')setConfigError('Google connection is unavailable.')});return()=>{mounted.current=false;c.abort();controller.current?.abort();token.current='';if(expires.current)clearTimeout(expires.current)}},[]);
  useEffect(()=>{generation.current++;controller.current?.abort();setBusy(false);setData(null);setError('');setScope(page?'page':'property');setProperty(old=>page&&old&&!propertyContainsPage(old,page)?'':old)},[page]);
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
    if(!token.current||!property||busy)return;const run=++generation.current;controller.current?.abort();const c=new AbortController();controller.current=c;setBusy(true);setData(null);setError('');
    try{
      const result=await readSearchData({token:token.current,property,page:scope==='page'?page:undefined,signal:AbortSignal.any([c.signal,AbortSignal.timeout(40000)])});
      if(run===generation.current&&mounted.current)setData(result);
    }catch(e){if(run===generation.current){if((e as any).status===401)clear();setError((e as Error).name==='TimeoutError'?'Google did not respond. Try again.':(e as Error).message)}}finally{if(run===generation.current)setBusy(false)}
  }
  function change(){generation.current++;controller.current?.abort();setBusy(false);setData(null);setError('')}
  async function disconnect(){const value=token.current;clear();setError('');if(value){try{(window as any).google.accounts.oauth2.revoke(value,()=>{})}catch{}}}
  return <details className="google-panel" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary><span className="google-g" aria-hidden="true">G</span><strong>Google Search Console</strong><span className="optional">{connected?'Connected':'Optional'}</span><ChevronDown size={16}/></summary>
    <div className="google-body">
      {!connected&&<><p>See real Google traffic and indexing data for sites you manage.</p><p className="hint">Read-only access. No PINSEO account. Data stays in this tab.</p>{config?.clientId?<button className="button secondary" disabled={!ready||busy} onClick={connect}>{busy?'Connecting…':sdkBusy?'Loading Google…':'Connect with Google'}</button>:<p className="setup-note">{configError||(!config?'Checking connection…':'Connection setup is pending.')} <a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">Open Search Console ↗</a></p>}{config?.clientId&&!ready&&!sdkBusy&&<button className="text-button" onClick={prepare}>Retry loading Google</button>}</>}
      {connected&&<><div className="google-controls"><div className="property-select"><label htmlFor="google-property">Website property</label><select id="google-property" value={property} disabled={busy} onChange={e=>{change();setProperty(e.target.value)}}><option value="">Choose your property</option>{sites.map(site=><option key={site} value={site}>{site}</option>)}</select></div>{page&&<div><label htmlFor="google-scope">Show</label><select id="google-scope" value={scope} disabled={busy} onChange={e=>{change();setScope(e.target.value)}}><option value="page">Audited page</option><option value="property">Whole property</option></select></div>}<button className="button primary" disabled={busy||!property||(scope==='page'&&!!page&&!propertyContainsPage(property,page))} onClick={load}>{busy?'Reading Google…':'Load Google data'}</button></div>{!busy&&sites.length===0&&<p className="hint">No accessible properties found. Add or verify your website in <a href="https://search.google.com/search-console/" target="_blank" rel="noreferrer">Search Console</a>, then reconnect.</p>}{page&&scope==='page'&&property&&!propertyContainsPage(property,page)&&<p className="hint">This property does not include the audited page. Choose a matching property.</p>}<button className="text-button disconnect" onClick={disconnect}>Disconnect Google</button></>}
      <div role="status">{error&&<p className="error">{error}</p>}</div>
      {data&&<div className="google-data"><p className="data-context"><strong>{data.page?'Audited page':'Whole property'}</strong> · {data.startDate} – {data.endDate} (PT)<br/>{data.page||data.property}</p>{data.metrics?<dl className="google-metrics">{[['Clicks',format(data.metrics.clicks)],['Impressions',format(data.metrics.impressions)],['Click rate',format(data.metrics.ctr,true)],['Avg. position',format(data.metrics.position)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:<p className="hint">{data.metricsError||'Google returned no traffic rows for this period.'}</p>}
        <p className="hint">Google web search · final data only. Average position is historical, not a live keyword ranking.</p>
        {data.page&&<div className="index-result"><strong>Google indexing</strong><p>{data.inspection?.coverage||data.inspection?.verdict||data.inspectionError||'No indexing result returned.'}</p><small>Google’s recorded version, not a live test.{data.inspection?.lastCrawl&&` Last crawled: ${new Date(data.inspection.lastCrawl).toLocaleString()}.`}</small>{data.inspection?.googleCanonical&&<small>Google canonical: {data.inspection.googleCanonical}</small>}</div>}
        <details className="query-details"><summary>Top search queries <ChevronDown size={16}/></summary>{data.queries.length>0?<div className="table-wrap"><table><thead><tr><th>Query</th><th>Clicks</th><th>Impressions</th></tr></thead><tbody>{data.queries.map((q:any,i:number)=><tr key={i}><td>{q.query}</td><td>{format(q.clicks)}</td><td>{format(q.impressions)}</td></tr>)}</tbody></table></div>:<p className="hint">{data.queriesError||'No query rows returned.'}</p>}<p className="hint">Up to 5 queries. Google omits some queries for privacy; these rows do not represent all traffic.</p></details>
      </div>}
    </div>
  </details>;
}
