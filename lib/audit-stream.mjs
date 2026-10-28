// Read incremental public audit updates. A partial report is never a completed audit.
export async function readAuditResponse(response,onPacket=()=>{}){
  if(!response.ok||!response.headers.get('content-type')?.includes('application/x-ndjson')){
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not check this page.');return data;
  }
  if(!response.body)throw new Error('The audit connection ended. Try again.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result=null,finished=false;
  function consume(line){
    if(!line.trim())return;
    const packet=JSON.parse(line);
    if(packet.type==='error')throw new Error(packet.message||'The audit could not be completed.');
    if(packet.type==='result'){result=packet.report;finished=true;return}
    onPacket(packet);
  }
  try{
    while(true){const {done,value}=await reader.read();if(done)break;pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n'))>=0){consume(pending.slice(0,end));pending=pending.slice(end+1)}}
    pending+=decoder.decode();if(pending.trim())consume(pending);
    if(!finished||!result)throw new Error('The audit connection ended before all checks finished. Try again.');
    return result;
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
