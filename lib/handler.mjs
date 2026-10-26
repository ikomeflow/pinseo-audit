import { audit, AuditError, readBounded } from './audit.mjs';
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
    return Response.json(await audit(value),{headers});
  } catch (e) {
    return Response.json({error:e instanceof AuditError?e.message:'The audit could not be completed. Please try again later. No findings were generated.'},{status:e instanceof AuditError?e.status:502,headers});
  }
}
