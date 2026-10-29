// Compare actual annotations with the last successful device snapshot. Turning
// saving on is not proof that a browser write succeeded.
export function hasPersonalWork(action){return !!action&&(!!action.note||action.status!=='todo')}
export function actionIsSaved(action,snapshot){
  if(!hasPersonalWork(action)&&!hasPersonalWork(snapshot))return true;
  return !!action&&!!snapshot&&action.status===snapshot.status&&action.note===snapshot.note&&action.evidence===snapshot.evidence;
}
export function hasUnsavedWork(actions,entries=[]){
  return Object.entries(actions).some(([url,page])=>{
    const saved=entries.find(e=>e.report.finalUrl===url)?.actions?.[url]||{};
    return Object.entries(page).some(([id,action])=>!actionIsSaved(action,saved[id]));
  });
}
export function filterDescription({status='all',topic='all',priority='all',query=''},otherLabel='Other checks'){
  const labels={review:'Needs review',observed:'Recorded',not_checked:otherLabel};
  const priorities={first:'Check first',next:'Review next',info:'Informational'};
  return [labels[status],topic!=='all'?topic:'',priorities[priority],query.trim()?`“${query.trim()}”`:''].filter(Boolean).join(' · ');
}
