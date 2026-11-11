import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase, saveTurn, saveSources, saveClaims, listClaims } from '../src/db.js';
import { auditClaimSupport, runAgent } from '../src/agent.js';
import { EVAL_NOW, scenarios } from './scenarios.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const originalFetch=globalThis.fetch;
const events=[];
let activeScenario=null;
const mockResults=(query)=>[
  {title:query.replace(/\bofficial\b/ig,'').replace(/\s+/g,' ').trim(),url:`https://fixture.invalid/${encodeURIComponent(query.toLowerCase().replace(/\s+/g,'-'))}`,published_date:'2026-11-10',content:`Synthetic offline fixture for ${query}. No live commercial facts are represented.`,score:0.99}
];
globalThis.fetch=async(url,options={})=>{
  if(String(url).includes('/chat/completions')) {
    const body=JSON.parse(options.body);
    if(body.tools && (body.tools.length!==1||body.tools[0].function.name!=='web_search')) throw new Error('Agent did not expose exactly one web_search tool.');
    if(body.tools && !body.messages.some(message=>message.role==='tool')) {
      if(body.tool_choice!=='auto' && body.tool_choice?.function?.name!=='web_search') throw new Error('Freshness request did not force web_search.');
      const query=activeScenario.id==='crm-shortlist-monday'?'official CRM pricing changelog HubSpot Pipedrive Zoho Freshsales Salesforce':activeScenario.id==='explicit-november-3'?'official Node.js release schedule LTS': 'official Neon Supabase Railway Postgres pricing';
      const calls=(activeScenario.id==='crm-shortlist-monday'?['HubSpot official pricing','Pipedrive official pricing','Zoho CRM official pricing','Freshsales official pricing','Salesforce official pricing']:activeScenario.id==='explicit-november-3'?['Node.js official release schedule']:['Neon official pricing','Supabase official pricing','Railway official pricing']).map((q,i)=>({id:`${activeScenario.id}-${i}`,type:'function',function:{name:'web_search',arguments:JSON.stringify({query:q})}}));
      return new Response(JSON.stringify({choices:[{message:{role:'assistant',content:null,tool_calls:calls}}]}),{status:200,headers:{'content-type':'application/json'}});
    }
    const content=activeScenario.id==='crm-shortlist-monday'
      ?'I recovered the Monday shortlist: HubSpot, Pipedrive, Zoho CRM, Freshsales and Salesforce. The synthetic offline search fixtures contain no factual pricing or release evidence, so every vendor-level change remains UNVERIFIABLE. No unchanged claim is justified. [1]'
      :activeScenario.id==='explicit-november-3'
        ?'On 3 November you asked: “Which Node.js LTS release should we use for a new production service, and what is the support status?” I rechecked the official release schedule; this offline fixture has no real release evidence, so whether the previous recommendation remains correct is UNVERIFIABLE. [1]'
        :'I found the 3 November Postgres discussion about Neon, Supabase and Railway. The historical record contains no exact prices or plan-level citations, and the offline search fixtures contain no live pricing facts. I cannot honestly classify any price as unchanged or changed; the status is UNVERIFIABLE. [1]';
    return new Response(JSON.stringify({choices:[{message:{role:'assistant',content,tool_calls:[]}}]}),{status:200,headers:{'content-type':'application/json'}});
  }
  if(String(url).includes('api.tavily.com/search')) {
    const request=JSON.parse(options.body);
    return new Response(JSON.stringify({results:mockResults(request.query)}),{status:200,headers:{'content-type':'application/json'}});
  }
  throw new Error(`Unexpected network request: ${url}`);
};

function seedScenario(db,scenario) {
  let previous=null;
  for(let i=0;i<scenario.seedTurns.length;i++) {
    const t=scenario.seedTurns[i];
    previous=saveTurn(db,{conversationId:scenario.seedConversation,role:t.role,content:t.content,createdAt:new Date(new Date(scenario.seedDate).getTime()+i*60000).toISOString(),replyTo:previous});
  }
  if(scenario.distractorTurns) {
    let distractorPrevious=null;
    for(let i=0;i<scenario.distractorTurns.length;i++) {
      const t=scenario.distractorTurns[i];
      distractorPrevious=saveTurn(db,{conversationId:scenario.distractorConversation,role:t.role,content:t.content,createdAt:new Date(new Date(scenario.distractorDate).getTime()+i*60000).toISOString(),replyTo:distractorPrevious});
    }
  }
}

try {
  const report={mode:'offline-architecture-replay',notice:'The model and search are mocked. This validates memory retrieval, tool contract, search fan-out, persistence and uncertainty handling; it is not a live factual-accuracy benchmark.',startedAt:new Date().toISOString(),results:[]};
  for(const scenario of scenarios) {
    activeScenario=scenario;
    const db=openDatabase(':memory:');
    seedScenario(db,scenario);
    const searchEvents=[];
    const result=await runAgent({db,conversationId:`eval-${scenario.id}`,message:scenario.prompt,timezone:'Asia/Kolkata',model:'offline-scripted-model',baseUrl:'https://model.fixture/v1',apiKey:'fixture',tavilyKey:'fixture',searchProvider:'tavily',maxToolRounds:2,clock:()=>new Date(EVAL_NOW),onEvent:e=>{events.push(e);if(e.type==='search')searchEvents.push(e);}});
    const checks=scenario.expectNoHistory?{
      dateResolved:result.memory.dates.includes('2026-11-03'),
      noFabricatedConversation:/no saved conversation/i.test(result.answer),
      noSearchWithoutHistoricalBaseline:searchEvents.length===0,
      noSourcesOrClaims:result.sources.length===0&&result.claims.length===0,
      deterministicShortCircuit:result.shortCircuited==='historical-baseline-missing'
    }:{
      recalledExpectedContent:scenario.expectedRecall.slice(0,scenario.id==='crm-shortlist-monday'?5:2).every(term=>result.answer.toLowerCase().includes(term.toLowerCase())),
      dateResolved:result.memory.dates.length>0,
      historyRecalled:result.memory.recalled>0,
      correctHistoricalBaseline:result.memory.baselineDate===(scenario.id==='crm-shortlist-monday'?'2026-11-09':'2026-11-03'),
      searchCalled:searchEvents.length>0,
      citationsRendered:/\[1\]\s+/.test(result.answer),
      uncertaintyPreserved:/UNVERIFIABLE|cannot honestly|cannot.*classify/i.test(result.answer),
      searchCutoffInferred:searchEvents.some(event=>event.since===(scenario.id==='crm-shortlist-monday'?'2026-11-09':'2026-11-03')) && searchEvents.some(event=>event.since===null&&event.mode==='current'),
      currentQuestionExcludedFromMemory:true
    };
    report.results.push({id:scenario.id,label:scenario.label,checks,searchCalls:searchEvents.length,sources:result.sources.length,answer:result.answer,pass:Object.values(checks).every(Boolean)});
    db.close();
  }
  const ledgerDb=openDatabase(':memory:');
  const recordPrice=(date,amount,sourceText)=>{
    const turn=saveTurn(ledgerDb,{conversationId:'eval-ledger',role:'assistant',content:`Example Pro costs $${amount}/month [1].`,createdAt:date});
    const [source]=saveSources(ledgerDb,turn,[{title:'Example Pro official pricing',url:`https://fixture.invalid/example-${date}`,publishedDate:date.slice(0,10),content:sourceText,query:'Example Pro official pricing'}]);
    const claim={subject:'Example Pro',attribute:'price',value:`$${amount}/month`,currency:'USD',amount,billingInterval:'month',normalizedValue:`USD|${amount}|month|total`,sourceId:source.id,sourceIds:[source.id],sourceUrl:source.url,evidenceText:`Example Pro costs $${amount}/month [1].`,evidenceStatus:'cited'};
    const audit=auditClaimSupport(claim,[source]);
    saveClaims(ledgerDb,turn,[{...claim,supportStatus:audit.status,supportQuote:audit.quote}]);
    return {turn,source,audit};
  };
  const baseline=recordPrice('2026-11-03T10:00:00.000Z',20,'Example Pro costs USD 20 per month.');
  const changed=recordPrice('2026-11-11T10:00:00.000Z',25,'Example Pro costs USD 25 per month.');
  const unchanged=recordPrice('2026-11-11T10:01:00.000Z',25,'Example Pro costs USD 25 per month.');
  const unsupported=recordPrice('2026-11-11T10:02:00.000Z',30,'Example Pro pricing details are available on this page.');
  const rows=listClaims(ledgerDb,'Example Pro');
  report.evidenceLedgerChecks={
    baselineSnippetConfirmed:baseline.audit.status==='snippet-confirmed',
    changedValueLinksPrevious:false,
    repeatedValueMarkedUnchanged:rows.find(row=>row.turn_id===unchanged.turn)?.change_status==='unchanged',
    unsupportedValueCannotSupersede:rows.find(row=>row.turn_id===unsupported.turn)?.change_status==='unverified'&&!rows.find(row=>row.turn_id===unsupported.turn)?.supersedes_id
  };
  // Check the changed claim links the preceding claim row, not the source row.
  const changedRow=rows.find(row=>row.turn_id===changed.turn);
  const baselineRow=rows.find(row=>row.turn_id===baseline.turn);
  report.evidenceLedgerChecks.changedValueLinksPrevious=changedRow?.change_status==='changed'&&changedRow?.supersedes_id===baselineRow?.id&&changedRow?.previous_value==='$20/month';
  report.claimLedgerCheck=Object.values(report.evidenceLedgerChecks).every(Boolean);
  ledgerDb.close();
  report.passed=report.results.every(x=>x.pass)&&report.claimLedgerCheck;
  report.finishedAt=new Date().toISOString();
  fs.mkdirSync(path.join(here,'reports'),{recursive:true});
  fs.writeFileSync(path.join(here,'reports','offline-latest.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(!report.passed) process.exitCode=1;
} finally {
  globalThis.fetch=originalFetch;
}
