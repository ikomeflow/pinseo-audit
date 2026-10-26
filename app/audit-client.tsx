'use client';
import {useRef,useState} from 'react';
import SearchConsole from './search-console';
import {pageSpeedUrl} from '../lib/pagespeed.mjs';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right.mjs';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs';
import Check from 'lucide-react/dist/esm/icons/check.mjs';
import Minus from 'lucide-react/dist/esm/icons/minus.mjs';
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert.mjs';
import Download from 'lucide-react/dist/esm/icons/download.mjs';
import Printer from 'lucide-react/dist/esm/icons/printer.mjs';
import Globe from 'lucide-react/dist/esm/icons/globe.mjs';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import LoaderCircle from 'lucide-react/dist/esm/icons/loader-circle.mjs';
type Finding={id:string;title:string;status:'observed'|'review'|'not_checked';evidence:string;action:string;group:string};
type Report={version:number;requestedUrl:string;finalUrl:string;checkedAt:string;source:string;redirects:{from:string;to:string;status:number}[];checks:Finding[]};
const labels={observed:'Observed',review:'Review',not_checked:'Not checked'};
const faqs=[
  ['What is checked?','One page’s HTML, headings, metadata, image descriptions and indexing directives, plus robots.txt and one sitemap candidate. Open each finding for evidence and a suggested fix.'],
  ['What are the limits?','This is a page check, not a full-site crawl or SEO grade. It does not run the page’s JavaScript, check backlinks or predict rankings. Google Search Console adds recorded indexing and historical search data for properties you can access.'],
  ['Is it free?','Yes. Public page checks need no account. Up to five audits per minute per IP, one megabyte per page and four redirects. Hosting and Google quotas may limit availability.'],
  ['How is my data handled?','Reports stay in this tab unless saved or printed. Our server fetches the public page and checks its hostname with Cloudflare DNS. Providers may log requests. Test speed opens the audited URL in Google PageSpeed. Optional Search Console requests read-only access; tokens and Google data stay in tab memory. Never submit sensitive URLs.']
];
function Logo(){return <svg viewBox="0 0 64 64" role="img" aria-label="PA monogram"><rect width="64" height="64" rx="15" fill="#1557e8"/><path d="M15 45V19h10a8 8 0 0 1 0 16H15M32 45l10-26 10 26M36 36h12" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
export default function AuditClient(){
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState<Report|null>(null),[filter,setFilter]=useState('review');
  const resultRef=useRef<HTMLElement>(null);
  async function runAudit(event:React.FormEvent){
    event.preventDefault();if(busy)return;
    setBusy(true);setError('');setReport(null);setFilter('review');
    try{
      const response=await fetch('/api/audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:AbortSignal.timeout(120000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not check this page.');
      setReport(data);requestAnimationFrame(()=>{resultRef.current?.focus();resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'})});
    }catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'The check timed out. Try again.')}finally{setBusy(false)}
  }
  function download(){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pinseo-audit-report.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
  const counts=report?Object.fromEntries(Object.keys(labels).map(key=>[key,report.checks.filter(c=>c.status===key).length])):{};
  return <>
    <a className="skip" href="#website">Skip to audit</a>
    <header className="header"><div className="shell header-inner"><a className="brand" href="/" aria-label="PINSEO Audit home"><Logo/><span>PINSEO<span className="brand-light"> Audit</span><small>BY FUTURA GROUP</small></span></a><a className="home-link" href="https://ikomeflow.com/">Ikomeflow ↗</a></div></header>
    <main className="shell">
      <section className="hero" aria-label="Free SEO audit"><h1>Check your website.</h1><p>Find issues. Know what to fix.</p><div className="audit-box"><form onSubmit={runAudit}><label htmlFor="website">Website address</label><div className="audit-form-row"><div className="url-input"><Globe size={18}/><input id="website" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={2048} placeholder="https://yourwebsite.com" value={url} onChange={e=>setUrl(e.target.value)} aria-describedby="url-hint audit-error" disabled={busy}/></div><button className="button primary" disabled={busy} type="submit">{busy?<><LoaderCircle className="spin" size={17}/>Checking…</>:<>Run audit<ArrowRight size={17}/></>}</button></div><p className="hint" id="url-hint">Public pages only.</p></form><div id="audit-error" role="alert" className={error?'error':''}>{error}</div>{busy&&<p className="hint" role="status">This may take up to two minutes.</p>}</div><p className="trust-line">Free · No signup</p></section>
      {report&&<section className="results" id="results" ref={resultRef} tabIndex={-1} aria-label="Audit results">
        <div className="result-heading"><div><h2>{counts.review===0?'Page results':counts.review+(counts.review===1?' item to review':' items to review')}</h2><a className="result-url" href={report.finalUrl} target="_blank" rel="noreferrer">{report.finalUrl}<ArrowUpRight size={14}/></a></div><div className="report-actions"><a className="button primary" href={pageSpeedUrl(report.finalUrl)} target="_blank" rel="noopener noreferrer" aria-label="Test speed in Google PageSpeed Insights (opens in a new tab)">Test speed<ArrowUpRight size={15}/></a><button className="button secondary" onClick={download}><Download size={15}/>Save</button><button className="icon-button" aria-label="Print audit report" onClick={()=>{document.querySelectorAll<HTMLDetailsElement>('.finding').forEach(d=>d.open=true);window.print()}}><Printer size={18}/></button></div></div>
        <p className="notice">Open an item for evidence and a suggested fix.</p>
        <div className="filters" aria-label="Filter findings">{[['review','Review ('+counts.review+')'],['observed','Observed ('+counts.observed+')'],['not_checked','Not checked ('+counts.not_checked+')'],['all','All ('+report.checks.length+')']].map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
        <div className="findings">{report.checks.filter(c=>filter==='all'||c.status===filter).map(c=><details className="finding" key={c.id}><summary><span className={'status-icon '+c.status}>{c.status==='observed'?<Check/>:c.status==='review'?<CircleAlert/>:<Minus/>}</span><span className="finding-title">{c.title}</span><span className={'badge '+c.status}>{labels[c.status]}</span><ChevronDown className="chevron" size={16}/></summary><div className="finding-body"><strong>Evidence</strong><p>{c.evidence}</p><strong>Next step</strong><p>{c.action}</p></div></details>)}{report.checks.filter(c=>filter==='all'||c.status===filter).length===0&&<p className="empty">No items here. View all checks for details.</p>}</div>
        <details className="report-details"><summary>Report details</summary><p>Checked {new Date(report.checkedAt).toLocaleString()} · {report.source}</p><p>These are page observations, not an SEO grade. “Observed” confirms only the item described. Test speed opens this audited URL in Google PageSpeed Insights.</p>{report.redirects.map((r,i)=><p key={i}>{r.status} · {r.from} → {r.to}</p>)}</details>
      </section>}
      <SearchConsole page={report?.finalUrl}/>
      <section className="help"><details id="help"><summary>Help &amp; limits<ChevronDown size={16}/></summary><div className="help-content">{faqs.map(([title,text])=><details key={title}><summary>{title}<ChevronDown size={15}/></summary><p>{text}</p></details>)}<p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" target="_blank" rel="noreferrer">Google’s SEO guide ↗</a></p></div></details></section>
    </main>
    <footer className="shell footer"><a href="https://futuragroup.io/" target="_blank" rel="noreferrer">Futura Group ↗</a><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/ikomeflow/pinseo-audit" target="_blank" rel="noreferrer">Source ↗</a></div></footer>
  </>;
}
