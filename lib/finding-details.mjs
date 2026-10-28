// Item lists describe fetched HTML only. They never load an image or execute page code.
export const MAX_HEADING_ITEMS=100,MAX_IMAGE_ITEMS=30;
export function imageSourceText(image,base){
  const value=String(image.source||'').trim();
  if(!value)return 'No image address was declared in src, data-src or srcset.';
  if(image.attribute==='srcset')return 'srcset: '+value.slice(0,500);
  try{const u=new URL(value,base);if(['http:','https:'].includes(u.protocol)&&!u.username&&!u.password)return image.attribute+': '+u.href.slice(0,600);if(u.protocol==='data:')return 'Embedded image (data URL).'}catch{}
  return 'A usable public image address was not found in this attribute.';
}
export function headingDetails(data){
  const rows=data.headings||[];
  if(!rows.length)return null;
  return {title:'Heading outline',total:data.headingCount||rows.length,note:'Source HTML order. Page scripts and computed visibility are not evaluated, so theme or hidden headings may appear.',items:rows.map(h=>({label:'#'+h.number+' · H'+h.level,detail:(h.text||'(empty heading)')+(h.id?'\nID: '+h.id:'')}))};
}
export function imageDetails(data,base){
  if(!data.missingAlt||!data.imageIssues?.length)return null;
  return {title:'Images missing alt text',total:data.missingAlt,note:'These images have no alt attribute. Empty alt text can be intentional for decorative images. Image addresses are listed without loading the images.',items:data.imageIssues.map(i=>({label:'Image #'+i.number+(i.id?' · ID: '+i.id:''),detail:imageSourceText(i,base)}))};
}
export function evidenceKey(finding){return finding.details?finding.evidence+'\nAffected items: '+JSON.stringify(finding.details):finding.evidence}
