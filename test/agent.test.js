import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase, getRecentTurns, listClaims } from '../src/db.js';
import { runAgent } from '../src/agent.js';

test('agent exposes only web_search and persists source-backed answer', async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daymark-test-'));
  const db=openDatabase(path.join(dir,'test.sqlite'));
  const originalFetch=globalThis.fetch;
  let modelCalls=0,searchCalls=0;
  globalThis.fetch=async (url,options={})=>{
    if(String(url).includes('/chat/completions')){
      modelCalls++;
      const request=JSON.parse(options.body);
      assert.equal(request.tools.length,1);
      assert.equal(request.tools[0].function.name,'web_search');
      if(modelCalls===1) {
        assert.equal(request.tool_choice.type,'function');
        assert.equal(request.tool_choice.function.name,'web_search');
      }
      if(modelCalls===1) return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'web_search',arguments:JSON.stringify({query:'official example pricing'})}}]}}]}),{status:200,headers:{'content-type':'application/json'}});
      return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'Example Starter costs $20/month [1].',tool_calls:[]}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    if(String(url).includes('api.tavily.com/search')){
      searchCalls++;
      return new Response(JSON.stringify({results:[{title:'Official pricing',url:'https://example.com/pricing',published_date:'2026-11-10',content:'Example Starter costs $20 per month.'}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    throw new Error('Unexpected network call: '+url);
  };
  try{
    const result=await runAgent({db,conversationId:'test-thread',message:'What is the current official example pricing?',timezone:'Asia/Kolkata',model:'test-model',baseUrl:'https://model.test/v1',apiKey:'test-key',tavilyKey:'test-tavily',maxToolRounds:2});
    assert.equal(modelCalls,2);
    assert.equal(searchCalls,1);
    assert.match(result.answer,/Official pricing/);
    const claims=listClaims(db,'Example Starter');
    assert.equal(claims.length,1);
    assert.equal(claims[0].source_link,'https://example.com/pricing');
    assert.equal(claims[0].evidence_sources.length,1);
    assert.equal(claims[0].amount,20);
    assert.match(result.answer,/https:\/\/example.com\/pricing/);
    const turns=getRecentTurns(db,'test-thread',10);
    assert.equal(turns.length,2);
    assert.equal(turns[1].role,'assistant');
  } finally {
    globalThis.fetch=originalFetch;
    db.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
