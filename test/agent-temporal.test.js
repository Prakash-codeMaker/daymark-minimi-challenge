import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, saveTurn, saveSources } from '../src/db.js';
import { buildMemory, runAgent } from '../src/agent.js';

const NOW = new Date('2026-11-11T10:00:00.000Z');
function makeMemory() { return openDatabase(':memory:'); }
function seedPair(db, date, conversationId, userText, assistantText, sourceQuery=null) {
  const userId=saveTurn(db,{conversationId,role:'user',content:userText,createdAt:`${date}T04:00:00.000Z`});
  const assistantId=saveTurn(db,{conversationId,role:'assistant',content:assistantText,createdAt:`${date}T04:01:00.000Z`,replyTo:userId});
  if(sourceQuery) saveSources(db,assistantId,[{title:'Acme official pricing',url:'https://acme.example/pricing',publishedDate:'2026-11-03',content:'Acme Pro costs $20/month.',query:sourceQuery}]);
  return {userId,assistantId};
}

test('ambiguous weekday does not select the only recorded day when its topic is unrelated',()=>{
  const db=makeMemory();
  try {
    seedPair(db,'2026-11-10','react','How should I structure a React Server Components security review?','We reviewed a React Server Components security checklist.');
    const memory=buildMemory(db,'Last Tuesday I asked about Postgres hosting. Is that still accurate?', 'Asia/Kolkata', NOW);
    assert.equal(memory.dateTurns.length,2);
    assert.equal(memory.baselineDate,null);
  } finally { db.close(); }
});


test('missing exact-date history returns an honest no-record answer without API calls',async()=>{
  const db=makeMemory();
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('No API call should happen for an absent historical baseline.');};
  try {
    const result=await runAgent({db,conversationId:'empty-history',message:'What did I ask you on 3 November? Is your answer still correct today?',timezone:'Asia/Kolkata',model:'missing-model',baseUrl:'https://model.test/v1',apiKey:'',tavilyKey:'',exaKey:'',clock:()=>new Date('2026-11-11T10:00:00.000Z')});
    assert.equal(result.shortCircuited,'historical-baseline-missing');
    assert.match(result.answer,/no saved conversation/i);
    assert.equal(result.sources.length,0);
    assert.equal(result.searchMetrics.providerRequests,0);
    assert.equal(calls,0);
  } finally { globalThis.fetch=originalFetch; db.close(); }
});

test('ambiguous date with unrelated history asks for clarification without searching',async()=>{
  const db=makeMemory();
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('Ambiguous history must not trigger a speculative search.');};
  try {
    seedPair(db,'2026-11-10','react-only','How should I structure a React Server Components security review?','We discussed the React Server Components security checklist.');
    const result=await runAgent({db,conversationId:'ambiguous-history',message:'Last Tuesday I asked about Postgres hosting. Has any pricing changed since then?',timezone:'Asia/Kolkata',model:'missing-model',baseUrl:'https://model.test/v1',apiKey:'',tavilyKey:'',exaKey:'',clock:()=>new Date('2026-11-11T10:00:00.000Z')});
    assert.equal(result.shortCircuited,'historical-baseline-missing');
    assert.match(result.answer,/none matches the topic|none matches/i);
    assert.equal(result.sources.length,0);
    assert.equal(calls,0);
  } finally { globalThis.fetch=originalFetch; db.close(); }
});

test('recheck automatically replays prior queries against current and since-date search',async()=>{
  const db=makeMemory();
  seedPair(db,'2026-11-03','acme-thread','Which managed Postgres providers should we shortlist, especially Acme?','Acme Pro costs $20/month [1].','managed Postgres provider comparison');
  const historicalAssistant=(()=>{const rows=db.prepare('SELECT id FROM turns WHERE conversation_id=\'acme-thread\' AND role=\'assistant\' ORDER BY id DESC LIMIT 1').all();return rows[0].id;})();
  saveSources(db,historicalAssistant,[{title:'Acme Pro official pricing',url:'https://acme.example/pricing',publishedDate:'2026-11-03',content:'Acme Pro costs $20/month.',query:'managed Postgres provider comparison'}]);
  const originalFetch=globalThis.fetch;
  const modelRequests=[];
  const searchRequests=[];
  globalThis.fetch=async(url,options={})=>{
    if(String(url).includes('/chat/completions')) {
      const body=JSON.parse(options.body); modelRequests.push(body);
      return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'Acme Pro now costs $25/month [1]. The re-check has both current-page and dated evidence.'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).includes('api.tavily.com/search')) {
      const body=JSON.parse(options.body); searchRequests.push(body);
      const since=body.start_date||null;
      return new Response(JSON.stringify({results:[{title:since?'Acme dated updates':'Acme current pricing',url:since?'https://acme.example/changelog':'https://acme.example/pricing',published_date:since?'2026-11-10':'2026-11-11',content:since?'Acme published a pricing update on 10 November.':'Acme Pro costs $25/month.'}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    const events=[];
    const result=await runAgent({db,conversationId:'recheck-thread',message:'Last Tuesday I asked about Acme Postgres pricing. Has it changed since then?',timezone:'Asia/Kolkata',model:'test-model',baseUrl:'https://model.test/v1',apiKey:'test-key',tavilyKey:'test-tavily',searchProvider:'tavily',clock:()=>new Date(NOW),onEvent:event=>events.push(event)});
    assert.equal(result.memory.baselineDate,'2026-11-03');
    assert.equal(result.memory.priorQueries,3);
    assert.equal(searchRequests.length,6);
    assert.equal(searchRequests.filter(request=>!request.start_date).length,3);
    assert.equal(searchRequests.filter(request=>request.start_date).length,3);
    assert.ok(searchRequests.some(request=>request.query.includes('Acme Pro official pricing acme.example')));
    assert.equal(searchRequests.find(request=>request.start_date).start_date,'2026-11-03');
    assert.match(modelRequests[0].messages.map(message=>message.content||'').join('\n'),/HISTORICAL SEARCH REPLAY/);
    assert.equal(result.searchMetrics.preflightQueries,3);
    assert.equal(result.sources.length,2);
    assert.ok(events.some(event=>event.type==='recheck'));
  } finally { globalThis.fetch=originalFetch; db.close(); }
});

test('model tool calls in the final round are closed before a tool-free final answer',async()=>{
  const db=makeMemory();
  const originalFetch=globalThis.fetch;
  let modelCall=0, searchCall=0;
  const requests=[];
  globalThis.fetch=async(url,options={})=>{
    if(String(url).includes('/chat/completions')) {
      const body=JSON.parse(options.body); requests.push(body); modelCall++;
      if(modelCall===1) return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'first',type:'function',function:{name:'web_search',arguments:JSON.stringify({query:'Acme official pricing'})}}]}}]}),{status:200,headers:{'content-type':'application/json'}});
      if(modelCall===2) return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'ignored-final',type:'function',function:{name:'web_search',arguments:JSON.stringify({query:'Acme second search'})}}]}}]}),{status:200,headers:{'content-type':'application/json'}});
      return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'I can only support the final answer with the evidence gathered so far [1].'}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).includes('api.tavily.com/search')) {
      searchCall++;
      return new Response(JSON.stringify({results:[{title:'Acme pricing',url:'https://acme.example/pricing',content:'Acme pricing details.'}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  try {
    await runAgent({db,conversationId:'tool-round-limit',message:'Find current Acme pricing.',timezone:'Asia/Kolkata',model:'test-model',baseUrl:'https://model.test/v1',apiKey:'test-key',tavilyKey:'test-tavily',searchProvider:'tavily',maxToolRounds:2,clock:()=>new Date(NOW)});
    assert.equal(modelCall,3);
    assert.equal(searchCall,1);
    assert.equal(requests[1].tool_choice,'none');
    const finalMessages=requests[2].messages;
    const ignoredCall=finalMessages.findIndex(message=>message.role==='assistant'&&(message.tool_calls||[]).some(call=>call.id==='ignored-final'));
    const matchingTool=finalMessages.findIndex(message=>message.role==='tool'&&message.tool_call_id==='ignored-final');
    assert.ok(ignoredCall>=0 && matchingTool>ignoredCall);
    assert.equal(requests[2].tool_choice,'none');
  } finally { globalThis.fetch=originalFetch; db.close(); }
});
