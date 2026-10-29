import { audit, AuditError, readBounded, normalizeUrl } from './audit.mjs';
function streamAudit(value,request,headers){
  const abort=new AbortController(),encoder=new TextEncoder();let closed=false;
  const cancelled=()=>abort.abort();request.signal.addEventListener('abort',cancelled,{once:true});
  if(request.signal.aborted)abort.abort();
  const stream=new ReadableStream({
    start(controller){
      const send=packet=>{if(!closed&&!abort.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify(packet)+'\n'))};
      void (async()=>{
        try{const report=await audit(value,{signal:abort.signal,onProgress:progress=>send({type:'progress',...progress}),onPage:report=>send({type:'page',report})});send({type:'result',report})}
        catch(e){if(!abort.signal.aborted)send({type:'error',message:e instanceof AuditError?e.message:'The audit could not be completed. Try again later.'})}
        finally{request.signal.removeEventListener('abort',cancelled);if(!closed){closed=true;controller.close()}}
      })();
    },
    cancel(){closed=true;abort.abort();request.signal.removeEventListener('abort',cancelled)}
  });
  return new Response(stream,{headers:{...headers,'Content-Type':'application/x-ndjson; charset=utf-8','X-Accel-Buffering':'no'}});
}
const windows = new Map();
export async function handleAudit(request) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({error:'Use the audit form on this website.'},{status:403,headers});
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return Response.json({error:'Send a JSON request.'},{status:415,headers});
  const ip = request.headers.get('cf-connecting-ip') || 'local', now = Date.now();
  for (const [key,item] of windows) if (now-item.start>60000) windows.delete(key);
  const current = windows.get(ip) || {start:now,count:0};
  if (current.count>=5 || windows.size>=2000) return Response.json({error:'The free audit limit has been reached. Wait one minute and try again.'},{status:429,headers:{...headers,'Retry-After':'60'}});
  current.count++; windows.set(ip,current);
  try {
    let value;
    const body = await readBounded(new Response(request.body, {headers:request.headers}),4096);
    try { value=JSON.parse(body).url; } catch { throw new AuditError('Enter a valid website address.',400); }
    normalizeUrl(value);
    if((request.headers.get('accept')||'').includes('application/x-ndjson'))return streamAudit(value,request,headers);
    return Response.json(await audit(value),{headers});
  } catch (e) {
    return Response.json({error:e instanceof AuditError?e.message:'The audit could not be completed. Please try again later. No findings were generated.'},{status:e instanceof AuditError?e.status:502,headers});
  }
}
