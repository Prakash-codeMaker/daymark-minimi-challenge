import test from 'node:test';
import assert from 'node:assert/strict';
import { webSearch } from '../src/search.js';

test('Exa adapter sends publication cutoff and normalizes highlights',async()=>{
 const originalFetch=globalThis.fetch;let request;
 globalThis.fetch=async(url,options)=>{request={url:String(url),headers:options.headers,body:JSON.parse(options.body)};return new Response(JSON.stringify({results:[{title:'Official release notes',url:'https://example.com/changelog',publishedDate:'2026-11-10',highlights:['A feature shipped.'],text:'Full text excerpt.',score:0.9}]}),{status:200,headers:{'content-type':'application/json'}});};
 try{const results=await webSearch({query:'official release notes',since:'2026-11-03',exaApiKey:'test',provider:'exa',maxResults:3});assert.equal(request.body.startPublishedDate,'2026-11-03');assert.equal(request.body.numResults,3);assert.equal(request.headers['x-api-key'],'test');assert.equal(results[0].sourceType,'exa');assert.match(results[0].content,/A feature shipped/);}finally{globalThis.fetch=originalFetch;}
});

test('Tavily transient server errors retry once before succeeding',async()=>{
 const originalFetch=globalThis.fetch;let attempts=0;
 globalThis.fetch=async()=>{
   attempts++;
   if(attempts===1)return new Response('temporary outage',{status:503,headers:{'content-type':'text/plain'}});
   return new Response(JSON.stringify({results:[{title:'Official pricing',url:'https://example.com/pricing',published_date:'2026-11-11',content:'Official current pricing.'}]}),{status:200,headers:{'content-type':'application/json'}});
 };
 try{
   const results=await webSearch({query:'official pricing',apiKey:'test',provider:'tavily'});
   assert.equal(attempts,2);
   assert.equal(results.length,1);
   assert.equal(results[0].sourceType,'tavily');
 }finally{globalThis.fetch=originalFetch;}
});

test('Tavily client errors are not retried',async()=>{
 const originalFetch=globalThis.fetch;let attempts=0;
 globalThis.fetch=async()=>{attempts++;return new Response('invalid key',{status:401});};
 try{
   await assert.rejects(()=>webSearch({query:'official pricing',apiKey:'bad',provider:'tavily'}),/401/);
   assert.equal(attempts,1);
 }finally{globalThis.fetch=originalFetch;}
});
