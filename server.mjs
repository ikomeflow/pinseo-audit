import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import './build.mjs';
const {default:worker}=await import(pathToFileURL(process.cwd()+'/dist/server/index.js').href);
const port=Number(process.env.PORT||4173);
const server=createServer(async(req,res)=>{
  try{
    const host='http://127.0.0.1:'+port;
    // Discard spoofable proxy identity headers in the local Node adapter.
    const headers={...req.headers};delete headers['cf-connecting-ip'];
    const init={method:req.method,headers};if(!['GET','HEAD'].includes(req.method)){init.body=req;init.duplex='half'}
    const result=await worker.fetch(new Request(host+req.url,init),{GOOGLE_SEARCH_CONSOLE_CLIENT_ID:process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID});res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'text/plain'});res.end('Could not complete the request.')}
});server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
