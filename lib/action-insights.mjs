export const actionLabels={todo:'To do',working:'Working on it',reviewed:'Reviewed'};
export function updateAction(all,url,finding,patch) {
  const page=all[url]||{},old=page[finding.id]||{status:'todo',note:'',evidence:finding.evidence};
  const status=Object.hasOwn(actionLabels,patch.status)?patch.status:old.status;
  const note=typeof patch.note==='string'?patch.note.slice(0,1000):old.note;
  const evidence=patch.status&&Object.hasOwn(actionLabels,patch.status)?finding.evidence:old.evidence;
  return {...all,[url]:{...page,[finding.id]:{status,note,evidence}}};
}
export function checklist(report,all) {
  const page=all[report.finalUrl]||{};
  return report.checks.filter(c=>c.status==='review'||page[c.id]?.status!=='todo'&&!!page[c.id]||page[c.id]?.note)
    .map(c=>({id:c.id,title:c.title,findingStatus:c.status,...(page[c.id]||{status:'todo',note:'',evidence:c.evidence}),evidenceChanged:!!page[c.id]&&page[c.id].evidence!==c.evidence}));
}
export function isOpportunity(row) {
  return typeof row.impressions==='number'&&Number.isFinite(row.impressions)&&row.impressions>=100&&
    typeof row.ctr==='number'&&Number.isFinite(row.ctr)&&row.ctr>=0&&row.ctr<0.03;
}
export function filterSearchRows(rows,{query='',sort='clicks_desc',opportunities=false}={}) {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const [field,direction]=sort.split('_');
  const allowed=['clicks','impressions','ctr','position','key'];
  const key=allowed.includes(field)?field:'clicks',ascending=direction==='asc';
  return rows.filter(r=>terms.every(term=>String(r.key).toLowerCase().includes(term))&&(!opportunities||isOpportunity(r)))
    .sort((a,b)=>{
      if(key==='key')return String(a.key).localeCompare(String(b.key));
      const av=typeof a[key]==='number'&&Number.isFinite(a[key])?a[key]:null;
      const bv=typeof b[key]==='number'&&Number.isFinite(b[key])?b[key]:null;
      if(av===null)return bv===null?0:1;
      if(bv===null)return -1;
      return (av-bv)*(ascending?1:-1);
    });
}
