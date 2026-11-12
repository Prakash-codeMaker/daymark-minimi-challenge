import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { openDatabase, getConversationHistory, listClaims, listEvidenceForTurn } from './db.js';
import { runAgent } from './agent.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const db=openDatabase(config.databasePath);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'content-type':type,'cache-control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}
async function bodyJson(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100_000)throw new Error('Request body too large');}return raw?JSON.parse(raw):{};}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/health') {const searchConfigured=config.searchProvider==='exa'?!!config.exaKey:config.searchProvider==='tavily'?!!config.tavilyKey:!!(config.tavilyKey||config.exaKey);return send(res,200,{ok:true,modelConfigured:!!config.openaiKey,searchConfigured,node:process.version});}
  if(req.method==='GET'&&url.pathname==='/api/history'){
    const id=url.searchParams.get('conversationId')||'default';return send(res,200,{turns:getConversationHistory(db,id,80)});
  }
  if(req.method==='GET'&&url.pathname==='/api/claims') return send(res,200,{claims:listClaims(db,url.searchParams.get('subject')||'')});
  if(req.method==='GET'&&url.pathname==='/api/evidence') {
    const turnId=Number(url.searchParams.get('turnId'));
    if(!Number.isSafeInteger(turnId)||turnId<=0)return send(res,400,{error:'A valid turnId is required.'});
    return send(res,200,{evidence:listEvidenceForTurn(db,turnId)});
  }
  if(req.method==='POST'&&url.pathname==='/api/chat'){
    try{
      const input=await bodyJson(req);const message=String(input.message||'').trim();
      if(!message)return send(res,400,{error:'Message is required.'});
      if(message.length>12000)return send(res,413,{error:'Message exceeds 12,000 characters.'});
      const conversationId=String(input.conversationId||randomUUID()).slice(0,100);
      const result=await runAgent({db,conversationId,message,timezone:config.timezone,model:config.model,baseUrl:config.openaiBaseUrl,apiKey:config.openaiKey,tavilyKey:config.tavilyKey,exaKey:config.exaKey,searchProvider:config.searchProvider,maxToolRounds:config.maxToolRounds,maxSearchResults:config.maxSearchResults});
      return send(res,200,{conversationId,...result});
    }catch(e){return send(res,500,{error:e.message||'Unexpected server error.'});}
  }
  const file=path.resolve(root,'public',url.pathname==='/'?'index.html':'.'+url.pathname);
  if(!file.startsWith(path.resolve(root,'public')+path.sep))return send(res,403,{error:'Forbidden'});
  if(req.method==='GET'&&fs.existsSync(file)&&fs.statSync(file).isFile())return send(res,200,fs.readFileSync(file,'utf8'),mime[path.extname(file)]||'application/octet-stream');
  return send(res,404,{error:'Not found'});
});
server.listen(config.port,'127.0.0.1',()=>console.log(`Daymark running at http://127.0.0.1:${config.port}`));
