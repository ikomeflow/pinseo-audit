'use client';
import {useEffect,useRef,useState} from 'react';
import SearchConsole from './search-console';
import FindingAction from './finding-action';
import {actionIsSaved,hasUnsavedWork,filterDescription} from '../lib/workspace-state.mjs';
import {savedAuditKey} from '../lib/saved-audit.mjs';
import {savedLibraryKey,decodeAuditLibrary,encodeAuditLibrary,upsertSavedAudit,matchingBaseline,resumeFinding} from '../lib/audit-library.mjs';
import {platformGuide,platformLabels} from '../lib/platform-guidance.mjs';
import {updateAction,checklist,actionLabels} from '../lib/action-insights.mjs';
import {pageSpeedUrl} from '../lib/pagespeed.mjs';
import {prepareAddress,addressError,selectFindings,findingPriority,priorityLabels,compareReports,findingLabels as labels,findingLabel,otherChecksLabel} from '../lib/report-tools.mjs';
import {readAuditResponse} from '../lib/audit-stream.mjs';
import {findingGuide} from '../lib/fix-guidance.mjs';
import {reportCsv,reportHtml} from '../lib/report-export.mjs';
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right.mjs';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right.mjs';
import Check from 'lucide-react/dist/esm/icons/info.mjs';
import Minus from 'lucide-react/dist/esm/icons/minus.mjs';
import CircleAlert from 'lucide-react/dist/esm/icons/circle-alert.mjs';
import Printer from 'lucide-react/dist/esm/icons/printer.mjs';
import Globe from 'lucide-react/dist/esm/icons/globe.mjs';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import LoaderCircle from 'lucide-react/dist/esm/icons/loader-circle.mjs';
type Finding={id:string;title:string;status:'observed'|'review'|'not_checked';evidence:string;action:string;group:string;details?:{title:string;total:number;note:string;items:{label:string;detail:string}[]}};
type Report={version:number;requestedUrl:string;finalUrl:string;checkedAt:string;source:string;redirects:{from:string;to:string;status:number}[];checks:Finding[]};
const faqs=[
  ['What is checked?','One page’s HTML, headings, metadata, image descriptions and indexing directives, plus robots.txt and one sitemap candidate. Open each finding for evidence and a suggested fix.'],
  ['What are the limits?','This is a page check, not a full-site crawl or SEO grade. It does not run the page’s JavaScript, check backlinks or predict rankings. Google Search Console adds recorded indexing and historical search data for properties you can access.'],
  ['Is it free?','Yes. Public page checks need no account. Up to five audits per minute per IP, one megabyte per page and four redirects. Hosting and Google quotas may limit availability.'],
  ['How is my data handled?','Reports stay in this tab unless exported or you choose Save on this device. The browser warns before leaving with unsaved notes or progress when supported. Device saving keeps up to five recent pages with their reports, notes, comparisons and instruction choices in this browser until you remove saved reports. Our server fetches the public page and checks its hostname with Cloudflare DNS. Providers may log requests. Test speed opens the audited URL in Google PageSpeed. Optional Search Console requests read-only access; tokens and Google data stay in tab memory. Never submit sensitive URLs.']
];
function Logo(){return <svg viewBox="0 0 64 64" role="img" aria-label="PA monogram"><rect width="64" height="64" rx="15" fill="#1557e8"/><path d="M15 45V19h10a8 8 0 0 1 0 16H15M32 45l10-26 10 26M36 36h12" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function FixGuide({finding,platform,onPlatformChange}:{finding:Finding;platform:string;onPlatformChange:(value:string)=>void}){const guide=findingGuide(finding),specific=platformGuide(finding,platform);if(!guide)return null;return <details className="fix-guide"><summary>{specific?specific.label+' steps':'Review steps'}<ChevronDown size={15}/></summary><div className="platform-choice"><label htmlFor={'platform-'+finding.id}>Instructions for</label><select id={'platform-'+finding.id} value={platform} onChange={event=>onPlatformChange(event.target.value)}>{Object.entries(platformLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><p className="hint">Priority: {priorityLabels[findingPriority(finding)]}</p><ol>{(specific?.steps||guide.steps).map(step=><li key={step}>{step}</li>)}</ol>{specific&&<details className="general-guidance"><summary>General advice<ChevronDown size={15}/></summary><ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol></details>}{specific?.helpUrl&&<a href={specific.helpUrl} target="_blank" rel="noreferrer">Official {specific.label} help ↗</a>}</details>}
function FindingItems({finding}:{finding:Finding}){const d=finding.details;return d?<details className="finding-items"><summary>{d.title} · {d.items.length} of {d.total} listed<ChevronDown size={14}/></summary><p className="hint">{d.note}</p><ul>{d.items.map((item,i)=><li key={i}><span className="item-label">{item.label}</span><p>{item.detail}</p></li>)}</ul></details>:null}
export default function AuditClient(){
  const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[completedReport,setReport]=useState<Report|null>(null),[filter,setFilter]=useState('review');
  const [preview,setPreview]=useState<Report|null>(null),[stage,setStage]=useState({step:1,total:4,label:'Starting the page check'});
  const report=preview||completedReport;
  const [query,setQuery]=useState(''),[priority,setPriority]=useState('all'),[previous,setPrevious]=useState<Report|null>(null);
  const [actions,setActions]=useState<Record<string,any>>({});
  const [remember,setRemember]=useState(false),[storageReady,setStorageReady]=useState(false),[storageMessage,setStorageMessage]=useState(''),[restored,setRestored]=useState(false);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [entryOpen,setEntryOpen]=useState(false),[topic,setTopic]=useState('all'),[storageProblem,setStorageProblem]=useState(false),[saveOpen,setSaveOpen]=useState(false),[toolsOpen,setToolsOpen]=useState(false);
  const [platform,setPlatform]=useState('general'),[recent,setRecent]=useState<any[]>([]);
  const recentRef=useRef<any[]>([]);
  const latestReport=useRef<Report|null>(null);
  const auditController=useRef<AbortController|null>(null),generation=useRef(0);
  const resultRef=useRef<HTMLElement>(null);
  const unsavedWork=hasUnsavedWork(actions,remember?recent:[]);
  useEffect(()=>{if(!unsavedWork)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='Unsaved changes'};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn)},[unsavedWork]);
  useEffect(()=>{if(storageProblem){setToolsOpen(true);setSaveOpen(true)}},[storageProblem]);
  useEffect(()=>()=>{generation.current++;auditController.current?.abort()},[]);
  useEffect(()=>{
    try{const saved=decodeAuditLibrary(localStorage.getItem(savedLibraryKey),localStorage.getItem(savedAuditKey));if(saved){recentRef.current=saved.entries;setRecent(saved.entries);setActions(Object.assign({},...saved.entries.map(e=>e.actions)));setRemember(true);openSaved(saved.entries.find(e=>e.report.finalUrl===saved.activeUrl),false);}}
    catch{setStorageProblem(true);setStorageMessage('We couldn’t restore saved audits. Run a new check or remove saved reports below.');}
    setStorageReady(true);
    const onStorage=(event:StorageEvent)=>{if(event.key===null||event.key===savedLibraryKey&&!event.newValue){recentRef.current=[];setRecent([]);setRemember(false);setStorageProblem(false);setStorageMessage('Saved reports were removed in another tab.');}};
    addEventListener('storage',onStorage);return ()=>removeEventListener('storage',onStorage);
  },[]);
  useEffect(()=>{
    if(!storageReady||!remember||!completedReport)return;
    try{const next=upsertSavedAudit(recentRef.current,completedReport,previous,actions,platform);localStorage.setItem(savedLibraryKey,encodeAuditLibrary(next,completedReport.finalUrl));localStorage.removeItem(savedAuditKey);recentRef.current=next;setRecent(next);setStorageProblem(false);setStorageMessage('Saved. Google data is excluded.');}
    catch{setStorageProblem(true);setStorageMessage('Couldn’t save on this device. Storage may be full or unavailable. Export your report to keep it.');}
  },[storageReady,remember,completedReport,previous,actions,platform]);
  function removeSaved(){
    try{localStorage.removeItem(savedLibraryKey);localStorage.removeItem(savedAuditKey);recentRef.current=[];setRecent([]);setRemember(false);setStorageProblem(false);setStorageMessage('Saved reports removed. Your current report stays open in this tab.');}
    catch{setStorageProblem(true);setStorageMessage('Couldn’t remove saved reports. Check this browser’s site storage settings.');}
  }
  function openSaved(entry:any,focus=true){
    if(!entry||busy)return;
    const first=resumeFinding(entry);setTopic('all');setEntryOpen(false);setToolsOpen(false);setSaveOpen(false);
    latestReport.current=entry.report;setReport(entry.report);setPrevious(entry.previous);setActions(old=>({...entry.actions,...old}));setUrl(entry.report.finalUrl);setPlatform(entry.platform);setPreview(null);setRestored(true);setError('');setFilter(first&&first.status!=='review'?'all':'review');setQuery('');setPriority('all');setExpanded(first?{[first.id]:true}:{});
    if(focus)focusResults();
  }
  function focusResults(){requestAnimationFrame(()=>{resultRef.current?.focus({preventScroll:true});resultRef.current?.scrollIntoView({behavior:'instant',block:'start'})})}
  function cancelAudit(){generation.current++;auditController.current?.abort();auditController.current=null;setPreview(null);setBusy(false);setError('Audit cancelled.'+(latestReport.current?' Your last successful report is still shown below.':''))}
  async function runAudit(event?:React.FormEvent,requestedAddress?:string){
    event?.preventDefault();if(busy)return;
    const address=prepareAddress(requestedAddress??url);
    const invalid=addressError(address);if(invalid){setError(invalid+(latestReport.current?' Your last successful report is still shown below.':''));return;}
    const run=++generation.current,controller=new AbortController();auditController.current=controller;let showedPage=false;
    setUrl(address);setBusy(true);setToolsOpen(false);setSaveOpen(false);setTopic('all');setError('');setPreview(null);setStage({step:1,total:4,label:'Reading page'});setFilter('review');setQuery('');setPriority('all');
    try{
      const response=await fetch('/api/audit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({url:address}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(120000)])});
      const data=await readAuditResponse(response,packet=>{if(run!==generation.current)return;if(packet.type==='progress')setStage(packet);if(packet.type==='page'){showedPage=true;setPreview(packet.report);setEntryOpen(false);setExpanded(Object.fromEntries(selectFindings(packet.report.checks,{status:'review'}).slice(0,1).map(c=>[c.id,true])));focusResults()}});
      if(run!==generation.current)return;
      setPrevious(matchingBaseline(latestReport.current,recentRef.current,data));setPlatform(latestReport.current?.finalUrl===data.finalUrl?platform:recentRef.current.find(e=>e.report.finalUrl===data.finalUrl)?.platform||'general');latestReport.current=data;setReport(data);setPreview(null);setRestored(false);setEntryOpen(false);setExpanded(Object.fromEntries(selectFindings(data.checks,{status:'review'}).slice(0,1).map(c=>[c.id,true])));if(!showedPage||document.activeElement===resultRef.current)focusResults();
    }catch(e){if(run===generation.current){setPreview(null);setError((e instanceof Error&&e.name!=='TimeoutError'?e.message:'The check timed out. Try again.')+(latestReport.current?' Your last successful report is still shown below.':''))}}finally{if(run===generation.current){setBusy(false);auditController.current=null}}
  }
  function download(format:'json'|'csv'){if(!completedReport||preview)return;const tasks=checklist(completedReport,actions),text=format==='csv'?reportCsv(completedReport,tasks,platform):JSON.stringify({...completedReport,platform,actionChecklist:tasks},null,2);const blob=new Blob([text],{type:format==='csv'?'text/csv;charset=utf-8':'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='pinseo-audit-report.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
  function pdfReport(){if(!completedReport||preview)return;const popup=window.open('','_blank');if(!popup){setError('Allow the report window for this app, then select Print / save PDF again.');return}popup.opener=null;popup.document.open();popup.document.write(reportHtml(completedReport,checklist(completedReport,actions),platform));popup.document.close();popup.document.getElementById('print-report')?.addEventListener('click',()=>popup.print())}
  const otherLabel=otherChecksLabel(report?.checks||[]);
  const viewDescription=filterDescription({status:'all',topic,priority,query},otherLabel);
  const savedEntry=remember?recent.find(e=>e.report.finalUrl===report?.finalUrl):null;
  const reportSaved=!!savedEntry&&!storageProblem&&savedEntry.report.checkedAt===report?.checkedAt;
  const counts=report?Object.fromEntries(Object.keys(labels).map(key=>[key,report.checks.filter(c=>c.status===key).length])):{};
  const visible=report?selectFindings(report.checks,{status:filter,priority,query}).filter(c=>topic==='all'||c.group===topic):[];
  const topics=report?[...new Set(report.checks.map(c=>c.group))]:[];
  const comparison=report&&!preview?compareReports(previous,report):null;
  const tasks=report?checklist(report,actions):[];
  const reviewed=tasks.filter(t=>t.status==='reviewed'&&!t.evidenceChanged).length;
  function openSaving(){setToolsOpen(true);setSaveOpen(true);requestAnimationFrame(()=>{const input=document.getElementById('device-save');input?.focus({preventScroll:true});input?.scrollIntoView({behavior:'instant',block:'center'})})}
  function openGoogle(){setToolsOpen(true);requestAnimationFrame(()=>{const panel=document.querySelector<HTMLDetailsElement>('.google-panel');if(panel){panel.open=true;panel.querySelector('summary')?.focus({preventScroll:true});panel.scrollIntoView({behavior:'instant',block:'center'})}})}
  function newAudit(){setEntryOpen(true);requestAnimationFrame(()=>document.getElementById('website')?.focus())}
  function closeOptions(event:React.SyntheticEvent){const menu=event.currentTarget.closest('details');if(menu)menu.open=false;}
  function showTopic(group:string){setTopic(group);setFilter('all');setQuery('');setPriority('all');const first=report?selectFindings(report.checks,{status:'all'}).find(c=>group==='all'||c.group===group):null;setExpanded(first?{[first.id]:true}:{});}
  function showStatus(status:string){setTopic('all');setFilter(status);setQuery('');setPriority('all');const first=report?selectFindings(report.checks,{status})[0]:null;setExpanded(first?{[first.id]:true}:{});}
  return <>
    <a className="skip" href={report?'#results':'#website'}>{report?'Skip to results':'Skip to audit'}</a>
    <header className="header"><div className="shell header-inner"><a className="brand" href="/" aria-label="PINSEO Audit home"><Logo/><span>PINSEO<span className="brand-light"> Audit</span></span></a><button className="new-audit" type="button" disabled={busy} onClick={newAudit}>New audit<ArrowRight size={15}/></button></div></header>
    <main className={'shell'+(report?' has-report':'')}>
      <section className={report?'hero hero-compact':'hero'} aria-label="Free SEO audit">
        <h1 className={report?'sr-only':undefined}>{report?'Audit results':'Check your website.'}</h1>
        {(!report||error||entryOpen)&&<div className="audit-box">
          {report&&!busy&&<div className="audit-entry-heading"><h2>New audit</h2><button className="text-button" type="button" onClick={()=>{setEntryOpen(false);setError('')}}>Close</button></div>}
          <form onSubmit={runAudit}><label htmlFor="website">Website address</label><div className="audit-form-row"><div className="url-input"><Globe size={18}/><input id="website" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={2048} placeholder="yourwebsite.com or a page URL" value={url} onChange={e=>setUrl(e.target.value)} aria-describedby="url-hint audit-error" aria-invalid={error&&!!addressError(url)||undefined} disabled={busy}/></div><button className="button primary" disabled={busy} type="submit">{busy?<><LoaderCircle className="spin" size={17}/>Checking…</>:<>Run audit<ArrowRight size={17}/></>}</button></div><p className="hint" id="url-hint">Enter a public domain or HTTPS page. One page per audit.</p></form>
          <div id="audit-error" role="alert" className={error?'error':''}>{error}</div>
          {busy&&<div className="audit-progress"><p className="hint" role="status">{stage.label} · {stage.step} of {stage.total}</p><button className="text-button" type="button" onClick={cancelAudit}>Cancel audit</button></div>}
        </div>}
        {!report&&<p className="trust-line">Free · No signup</p>}
      </section>
      {report&&<section className="results" id="results" ref={resultRef} tabIndex={-1} aria-label="Audit results">
        <div className="result-heading">
          <div><p className="report-kicker">Audit results</p><h2><a className="result-url" href={report.finalUrl} target="_blank" rel="noreferrer">{report.finalUrl.replace(/^https:\/\//,'').replace(/\/$/,'')}<ArrowUpRight size={15}/></a></h2><p className="report-date">{preview?'Checking this page…':<>Checked <time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time></>}</p></div>
          <div className="report-actions"><button type="button" className="button primary" disabled={busy||!!preview} onClick={()=>runAudit(undefined,report.finalUrl)}>{busy?'Checking…':'Recheck page'}</button><details className="report-options" onKeyDown={event=>{if(event.key==='Escape'){event.currentTarget.open=false;(event.currentTarget.querySelector('summary') as HTMLElement)?.focus()}}}><summary>Export<ChevronDown size={14}/></summary><div><button type="button" disabled={busy||!!preview} onClick={event=>{closeOptions(event);pdfReport()}}><Printer size={15}/>Print / save PDF</button><button type="button" disabled={busy||!!preview} onClick={event=>{closeOptions(event);download('csv')}}>Spreadsheet (CSV)</button><button type="button" disabled={busy||!!preview} onClick={event=>{closeOptions(event);download('json')}}>Full data (JSON)</button></div></details></div>
        </div>
        {busy&&!entryOpen&&<div className="audit-progress report-progress"><p className="hint" role="status">{stage.label} · {stage.step} of {stage.total}</p><button className="text-button" type="button" onClick={cancelAudit}>Cancel audit</button></div>}
        {preview&&<p className="partial-notice" role="status">Preliminary results. Exports unlock when all checks finish.</p>}
        {restored&&!preview&&!busy&&<p className="partial-notice" role="status">Saved report. Recheck for fresh results.</p>}
        <div className="report-card">
          <nav className="result-tabs" aria-label="Finding status">
            {[['review','Needs review',counts.review],['observed','Recorded',counts.observed],['not_checked','Other checks',counts.not_checked],['all','All checks',report.checks.length]].map(([key,label,total])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>showStatus(String(key))}><span>{label}</span><span className="tab-count">{total}</span></button>)}
          </nav>
          <div className="report-controls">
            <div className="finding-view"><p role="status">Showing {visible.length} of {report.checks.length}{viewDescription?' · '+viewDescription:''}</p>{viewDescription&&<button type="button" className="text-button" onClick={()=>showTopic('all')}>Reset filters</button>}</div>
            <details className="filter-panel" key={report.checkedAt}><summary>Filters<ChevronDown size={14}/></summary><div className="finding-tools"><label className="finding-search" htmlFor="finding-search">Search findings<input id="finding-search" type="search" placeholder="Title or evidence" value={query} onChange={e=>{setQuery(e.target.value);if(e.target.value){setFilter('all');setTopic('all')}}}/></label><label htmlFor="finding-topic">Topic<select id="finding-topic" value={topic} onChange={e=>showTopic(e.target.value)}><option value="all">All topics</option>{topics.map(group=><option key={group} value={group}>{group}</option>)}</select></label><label htmlFor="finding-priority">Priority<select id="finding-priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="all">All priorities</option><option value="first">Check first</option><option value="next">Review next</option><option value="info">Informational</option></select></label></div></details>
          </div>
          <div className="findings">{visible.map(c=><details className={'finding'+(c.status==='review'?' finding-review':'')} key={report.checkedAt+c.id} open={!!expanded[c.id]} onToggle={event=>{if(event.target!==event.currentTarget)return;const open=event.currentTarget.open;setExpanded(old=>open?(old[c.id]&&Object.keys(old).length===1?old:{[c.id]:true}):old[c.id]?{}:old)}}>
            <summary onClick={event=>{event.preventDefault();setExpanded(old=>old[c.id]?{}:{[c.id]:true})}}><span className={'status-icon '+c.status}>{c.status==='observed'?<Check/>:c.status==='review'?<CircleAlert/>:<Minus/>}</span><span className="finding-title">{c.title}</span><span className={'badge '+c.status}>{findingLabel(c)}</span><ChevronDown className="chevron" size={16}/></summary>
            <div className="finding-body"><div className="finding-observation"><strong>What we found</strong><p>{c.evidence.length>280?c.evidence.slice(0,280)+'…':c.evidence}</p>{c.evidence.length>280&&<details className="full-evidence"><summary>Full evidence<ChevronDown size={14}/></summary><p>{c.evidence}</p></details>}<FindingItems finding={c}/></div><div className="finding-recommendation"><strong>Next step</strong><p>{c.action}</p>{c.id==='rankings'&&<button className="text-button" type="button" onClick={openGoogle}>Open Search Console tools<ArrowUpRight size={14}/></button>}</div><div className="finding-extras"><FixGuide finding={c} platform={platform} onPlatformChange={setPlatform}/><FindingAction finding={c} action={actions[report.finalUrl]?.[c.id]} saved={reportSaved&&actionIsSaved(actions[report.finalUrl]?.[c.id],savedEntry?.actions?.[report.finalUrl]?.[c.id])} saving={remember&&!storageProblem&&!reportSaved} onSave={preview?undefined:openSaving} onChange={patch=>setActions(old=>updateAction(old,report.finalUrl,c,patch))}/></div></div>
          </details>)}{visible.length===0&&<div className="empty"><Check size={26}/><h3>{filter==='review'&&!query&&priority==='all'&&topic==='all'?'No items flagged for review':'No matching findings'}</h3><p>{filter==='review'&&!query&&priority==='all'&&topic==='all'?'This covers the fetched page, not the whole website.':'Try another filter or view all checks.'}</p><button type="button" className="button secondary" onClick={()=>filter==='review'&&!query&&priority==='all'&&topic==='all'?showStatus('observed'):showTopic('all')}>{filter==='review'&&!query&&priority==='all'&&topic==='all'?'View recorded checks':'View all checks'}</button></div>}</div>
        </div>
      </section>}
      <details className={report?'report-tools':'home-tools'} open={!report||toolsOpen} onToggle={event=>{if(event.target===event.currentTarget&&report)setToolsOpen(event.currentTarget.open)}}><summary>Tools &amp; saved work<ChevronDown size={16}/></summary><div className="tools-content">
        {report&&<>
          <details className="report-details action-checklist"><summary>Your checklist · {reviewed} of {tasks.length} reviewed<ChevronDown size={14}/></summary>{tasks.length?<ul>{tasks.map(t=><li key={t.id}><strong>{t.title}</strong> · {actionLabels[t.status]}{t.evidenceChanged?' · Evidence changed — review again':''}{t.note&&<p>{t.note}</p>}</li>)}</ul>:<p>No tasks or notes yet.</p>}</details>
          {comparison&&<details className="report-details comparison"><summary>Compare checks · {comparison.changes.length} changed findings<ChevronDown size={14}/></summary><p>Compared with {new Date(comparison.checkedAt).toLocaleString()} for this page.</p><p>{comparison.newReview} newly flagged · {comparison.noLongerFlagged} no longer flagged · {comparison.nowUnchecked} no longer checked.</p><p>{comparison.omitted} omitted checks · {comparison.added} added checks. These changes do not confirm fixes or ranking improvements.</p>{comparison.changes.length===0?<p>No status or evidence changes were found.</p>:<ul>{comparison.changes.map(change=><li key={change.id}><strong>{change.current.title}</strong>: {findingLabel(change.before)} → {findingLabel(change.current)}<details><summary>Compare evidence</summary><p>Before: {change.before.evidence}</p><FindingItems finding={change.before}/><p>Now: {change.current.evidence}</p><FindingItems finding={change.current}/></details></li>)}</ul>}</details>}
          {!preview&&<details className="save-panel" open={saveOpen} onToggle={event=>{if(event.target===event.currentTarget)setSaveOpen(event.currentTarget.open)}}><summary>{reportSaved?'Saved on this device':'Save on this device'}<ChevronDown size={14}/></summary><label className="save-toggle"><input id="device-save" type="checkbox" checked={remember} onChange={e=>e.target.checked?setRemember(true):removeSaved()}/>Save on this device</label><p className="hint">Saves up to 5 pages with their notes in this browser. Anyone using this browser profile can see them.</p><p className="hint" role={storageProblem?'alert':'status'}>{storageMessage||'Saving is off. Reloading clears unsaved work.'}</p><button className="text-button" type="button" onClick={removeSaved}>Remove saved reports</button></details>}
          {remember&&recent.length>0&&<details className="recent-audits"><summary>Recent audits ({recent.length})<ChevronDown size={14}/></summary><ol>{recent.map(entry=><li key={entry.report.finalUrl}><button className="recent-open" type="button" disabled={busy} aria-label={'Open saved audit for '+entry.report.finalUrl} onClick={()=>openSaved(entry)}>{entry.report.finalUrl.replace(/^https:\/\//,'')}</button><p className="hint"><time dateTime={entry.report.checkedAt}>{new Date(entry.report.checkedAt).toLocaleString()}</time> · {platformLabels[entry.platform]}</p></li>)}</ol></details>}
          <details className="report-details"><summary>Audit details<ChevronDown size={14}/></summary><p>Single-page HTML check · {report.source}</p><p>Recorded means evidence was found, not that SEO passed. Other checks explain why a result is missing or outside this audit. Priorities guide review, not rankings.</p><p>Page scripts are not run.</p>{report.redirects.map((r,i)=><p key={i}>{r.status} · {r.from} → {r.to}</p>)}</details>
          <a className="speed-link" href={pageSpeedUrl(report.finalUrl)} target="_blank" rel="noopener noreferrer">Test speed in Google<ArrowUpRight size={14}/></a>
        </>}
        {!report&&storageMessage&&<div className="partial-notice" role="status">{storageMessage}<button className="text-button" type="button" onClick={removeSaved}>Remove saved reports</button></div>}
        <SearchConsole key="google" page={completedReport?.finalUrl}/>
        <section className="help"><details id="help"><summary>Help<ChevronDown size={16}/></summary><div className="help-content">{faqs.map(([title,text])=><details key={title}><summary>{title}<ChevronDown size={15}/></summary><p>{text}</p></details>)}<p><a href="https://developers.google.com/search/docs/fundamentals/seo-starter-guide" target="_blank" rel="noreferrer">Google’s SEO guide ↗</a></p></div></details></section>
      </div></details>
    </main>
    <footer className="shell footer"><a href="https://futuragroup.io/" target="_blank" rel="noreferrer">Produced by Futura Group ↗</a><div><a href="https://ikomeflow.com/">Ikomeflow</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/ikomeflow/pinseo-audit" target="_blank" rel="noreferrer">Source ↗</a></div></footer>
  </>;
}
