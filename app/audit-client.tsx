'use client';
import {useEffect,useRef,useState} from 'react';
import SearchConsole from './search-console';
import FindingAction from './finding-action';
import {updateAction,checklist,actionLabels} from '../lib/action-insights.mjs';
import {pageSpeedUrl} from '../lib/pagespeed.mjs';
import {prepareAddress,addressError,selectFindings,findingPriority,priorityLabels,compareReports} from '../lib/report-tools.mjs';
import {readAuditResponse} from '../lib/audit-stream.mjs';
import {findingGuide} from '../lib/fix-guidance.mjs';
import {reportCsv,reportHtml} from '../lib/report-export.mjs';
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
function FixGuide({finding}:{finding:Finding}){const guide=findingGuide(finding);return guide?<div className="fix-guide"><strong>How to check it</strong><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol><details><summary>WordPress steps, if applicable</summary><ol>{guide.wordpress.map(step=><li key={step}>{step}</li>)}</ol></details></div>:null}
export default function AuditClient(){
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[completedReport,setReport]=useState<Report|null>(null),[filter,setFilter]=useState('review');
  const [preview,setPreview]=useState<Report|null>(null),[stage,setStage]=useState({step:1,total:4,label:'Starting the page check'});
  const report=preview||completedReport;
  const [query,setQuery]=useState(''),[priority,setPriority]=useState('all'),[previous,setPrevious]=useState<Report|null>(null);
  const [actions,setActions]=useState<Record<string,any>>({});
  const latestReport=useRef<Report|null>(null);
  const auditController=useRef<AbortController|null>(null),generation=useRef(0);
  const resultRef=useRef<HTMLElement>(null);
  useEffect(()=>()=>{generation.current++;auditController.current?.abort()},[]);
  function focusResults(){requestAnimationFrame(()=>{resultRef.current?.focus();resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'})})}
  function cancelAudit(){generation.current++;auditController.current?.abort();auditController.current=null;setPreview(null);setBusy(false);setError('Audit cancelled.'+(latestReport.current?' Your last successful report is still shown below.':''))}
  async function runAudit(event:React.FormEvent){
    event.preventDefault();if(busy)return;
    const address=prepareAddress(url);
    const invalid=addressError(address);if(invalid){setError(invalid+(latestReport.current?' Your last successful report is still shown below.':''));return;}
    const run=++generation.current,controller=new AbortController();auditController.current=controller;let showedPage=false;
    setUrl(address);setBusy(true);setError('');setPreview(null);setStage({step:1,total:4,label:'Reading page'});setFilter('review');setQuery('');setPriority('all');
    try{
      const response=await fetch('/api/audit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({url:address}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)])});
      const data=await readAuditResponse(response,packet=>{if(run!==generation.current)return;if(packet.type==='progress')setStage(packet);if(packet.type==='page'){showedPage=true;setPreview(packet.report);focusResults()}});
      if(run!==generation.current)return;
      setPrevious(latestReport.current);latestReport.current=data;setReport(data);setPreview(null);if(!showedPage)focusResults();
    }catch(e){if(run===generation.current){setPreview(null);setError((e instanceof Error&&e.name!=='TimeoutError'?e.message:'The check timed out. Try again.')+(latestReport.current?' Your last successful report is still shown below.':''))}}finally{if(run===generation.current){setBusy(false);auditController.current=null}}
  }
  function download(format:'json'|'csv'){if(!completedReport||preview)return;const tasks=checklist(completedReport,actions),text=format==='csv'?reportCsv(completedReport,tasks):JSON.stringify({...completedReport,actionChecklist:tasks},null,2);const blob=new Blob([text],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pinseo-audit-report.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
  function pdfReport(){if(!completedReport||preview)return;const popup=window.open('','_blank');if(!popup){setError('Allow the report window for this app, then select PDF report again.');return}popup.opener=null;popup.document.open();popup.document.write(reportHtml(completedReport,checklist(completedReport,actions)));popup.document.close();popup.document.getElementById('print-report')?.addEventListener('click',()=>popup.print())}
  const counts=report?Object.fromEntries(Object.keys(labels).map(key=>[key,report.checks.filter(c=>c.status===key).length])):{};
  const visible=report?selectFindings(report.checks,{status:filter,priority,query}):[];
  const comparison=report&&!preview?compareReports(previous,report):null;
  const tasks=report?checklist(report,actions):[];
  const reviewed=tasks.filter(t=>t.status==='reviewed'&&!t.evidenceChanged).length;
  return <>
    <a className="skip" href="#website">Skip to audit</a>
    <header className="header"><div className="shell header-inner"><a className="brand" href="/" aria-label="PINSEO Audit home"><Logo/><span>PINSEO<span className="brand-light"> Audit</span><small>BY FUTURA GROUP</small></span></a><a className="home-link" href="https://ikomeflow.com/">Ikomeflow ↗</a></div></header>
    <main className="shell">
      <section className="hero" aria-label="Free SEO audit"><h1>Check your website.</h1><p>Find issues. Know what to fix.</p><div className="audit-box">
        <form onSubmit={runAudit}><label htmlFor="website">Website address</label><div className="audit-form-row"><div className="url-input"><Globe size={18}/><input id="website" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={2048} placeholder="yourwebsite.com or a page URL" value={url} onChange={e=>setUrl(e.target.value)} aria-describedby="url-hint audit-error" disabled={busy}/></div><button className="button primary" disabled={busy} type="submit">{busy?<><LoaderCircle className="spin" size={17}/>Checking…</>:<>Run audit<ArrowRight size={17}/></>}</button></div><p className="hint" id="url-hint">Single-page audit. Enter a domain or a public HTTPS page. We add https:// for domains.</p></form>
        <div id="audit-error" role="alert" className={error?'error':''}>{error}</div>
        {busy&&<div className="audit-progress"><p className="hint" role="status">{stage.label} · Step {stage.step} of {stage.total}. This may take up to two minutes.</p><button className="button secondary" type="button" onClick={cancelAudit}>Cancel audit</button></div>}
      </div><p className="trust-line">Free · No signup</p></section>
      {report&&<section className="results" id="results" ref={resultRef} tabIndex={-1} aria-label="Audit results">
        <div className="result-heading"><div><h2>{counts.review===0?'Page results':counts.review+(counts.review===1?' item to review':' items to review')}</h2><a className="result-url" href={report.finalUrl} target="_blank" rel="noreferrer">{report.finalUrl}<ArrowUpRight size={14}/></a></div>
          <div className="report-actions"><a className="button primary" href={pageSpeedUrl(report.finalUrl)} target="_blank" rel="noopener noreferrer" aria-label="Test speed in Google PageSpeed Insights (opens in a new tab)">Test speed<ArrowUpRight size={15}/></a>
            <button className="button secondary" disabled={!!preview} onClick={pdfReport} title="Open the complete report to print or save as PDF"><Printer size={15}/>PDF report</button>
            {!preview&&<details className="export-menu"><summary aria-label="More report formats"><Download size={18}/><ChevronDown size={13}/></summary><div><button type="button" onClick={()=>download('csv')}>Spreadsheet (CSV)</button><button type="button" onClick={()=>download('json')}>Full data (JSON)</button></div></details>}
          </div>
        </div>
        {preview&&<p className="partial-notice" role="status">Page findings are ready. Robots.txt and sitemap checks are still running. Report exports unlock when all checks finish.</p>}
        <p className="notice">Open an item for evidence and a suggested fix.</p>
        <details className="report-details action-checklist"><summary>Action checklist · {reviewed} of {tasks.length} reviewed</summary><p>Open a finding below to update your progress or add notes. Your progress is separate from the automated findings.</p><p>Saved only in this tab. Reloading or closing the tab clears it; export a PDF, CSV or JSON report to keep your notes.</p>{tasks.length?<ul>{tasks.map(t=><li key={t.id}><strong>{t.title}</strong> · {actionLabels[t.status]}{t.evidenceChanged?' · Evidence changed — review again':''}{t.note&&<p>{t.note}</p>}</li>)}</ul>:<p>No review items or personal actions yet. You can add a note to any finding.</p>}</details>
        {comparison&&<details className="report-details comparison"><summary>Changes since your previous check</summary><p>Compared with {new Date(comparison.checkedAt).toLocaleString()} for this exact page. Comparison stays in this tab.</p><p>{comparison.newReview} newly flagged · {comparison.noLongerFlagged} no longer flagged · {comparison.nowUnchecked} now not checked · {comparison.changes.length} changed findings</p><p>These are changes in page observations, not proof of a fix or a ranking improvement.</p>{comparison.changes.length===0?<p>No status or evidence changes were found.</p>:<ul>{comparison.changes.map(change=><li key={change.id}><strong>{change.current.title}</strong>: {labels[change.before.status]} → {labels[change.current.status]}<details><summary>Compare evidence</summary><p>Before: {change.before.evidence}</p><p>Now: {change.current.evidence}</p></details></li>)}</ul>}</details>}
        <div className="filters" aria-label="Filter findings">{[['review','Review ('+counts.review+')'],['observed','Observed ('+counts.observed+')'],['not_checked','Not checked ('+counts.not_checked+')'],['all','All ('+report.checks.length+')']].map(([key,label])=><button key={key} aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
        <div className="finding-tools"><label className="finding-search" htmlFor="finding-search">Search findings<input id="finding-search" type="search" placeholder="Try title, images or indexing" value={query} onChange={e=>{setQuery(e.target.value);if(!query && e.target.value)setFilter('all')}}/></label><label htmlFor="finding-priority">Priority<select id="finding-priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="all">All priorities</option><option value="first">Check first</option><option value="next">Review next</option><option value="info">Informational</option></select></label>{(query||priority!=='all')&&<button className="button secondary" onClick={()=>{setQuery('');setPriority('all')}}>Clear search</button>}</div>
        <p className="hint finding-count" role="status">{visible.length} of {report.checks.length} findings shown. Priority is review guidance, not an SEO score.</p>
        <div className="findings">{visible.map(c=><details className="finding" key={c.id}><summary><span className={'status-icon '+c.status}>{c.status==='observed'?<Check/>:c.status==='review'?<CircleAlert/>:<Minus/>}</span><span className="finding-title">{c.title}{c.status==='review'&&<small className="finding-priority">{priorityLabels[findingPriority(c)]}</small>}</span><span className={'badge '+c.status}>{labels[c.status]}</span><ChevronDown className="chevron" size={16}/></summary><div className="finding-body"><strong>Evidence</strong><p>{c.evidence}</p><strong>Next step</strong><p>{c.action}</p><FixGuide finding={c}/><FindingAction finding={c} action={actions[report.finalUrl]?.[c.id]} onChange={patch=>setActions(old=>updateAction(old,report.finalUrl,c,patch))}/></div></details>)}{visible.length===0&&<div className="empty"><p>{filter==='review' && !query && priority==='all'?'No review items were flagged in this response.':'No findings match these filters.'}</p><button className="button secondary" onClick={()=>{setFilter('all');setQuery('');setPriority('all')}}>Show all findings</button></div>}</div>
        <details className="report-details"><summary>Report details</summary><p>Checked {new Date(report.checkedAt).toLocaleString()} · {report.source}</p><p>These are page observations, not an SEO grade. “Observed” confirms only the item described. Test speed opens this audited URL in Google PageSpeed Insights.</p>{report.redirects.map((r,i)=><p key={i}>{r.status} · {r.from} → {r.to}</p>)}</details>
      </section>}
      <SearchConsole page={completedReport?.finalUrl}/>
      <section className="help"><details id="help"><summary>Help &amp; limits<ChevronDown size={16}/></summary><div className="help-content">{faqs.map(([title,text])=><details key={title}><summary>{title}<ChevronDown size={15}/></summary><p>{text}</p></details>)}<p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" target="_blank" rel="noreferrer">Google’s SEO guide ↗</a></p></div></details></section>
    </main>
    <footer className="shell footer"><a href="https://futuragroup.io/" target="_blank" rel="noreferrer">Produced by Futura Group ↗</a><div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/ikomeflow/pinseo-audit" target="_blank" rel="noreferrer">Source ↗</a></div></footer>
  </>;
}
