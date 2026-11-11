import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../src/config.js';
import { openDatabase, saveTurn } from '../src/db.js';
import { runAgent } from '../src/agent.js';
import { EVAL_NOW, scenarios } from './scenarios.js';

if(!config.openaiKey) throw new Error('OPENAI_API_KEY is required for live evaluation. Copy .env.example to .env and configure it.');
if(!config.tavilyKey&&!config.exaKey) throw new Error('TAVILY_API_KEY or EXA_API_KEY is required for live evaluation.');
const here=path.dirname(fileURLToPath(import.meta.url));
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
function assess(scenario,result,searchEvents) {
  const answer=result.answer;
  const recalled=scenario.expectedRecall.filter(term=>answer.toLowerCase().includes(term.toLowerCase()));
  const answerBody=answer.split(/\n\s*Sources\s*\n/i)[0];
  const citationCount=[...answerBody.matchAll(/\[(\d+)\]/g)].length;
  const changedLanguage=/\b(changed|increase|decrease|new|launched|released|updated|still supported|unchanged)\b/i.test(answer);
  const uncertainty=/\b(unverifiable|could not verify|cannot verify|no saved record|not enough evidence|no exact price)\b/i.test(answer);
  if(scenario.expectNoHistory) return {
    baselineDate:result.memory.baselineDate,recalledTerms:recalled,expectedTerms:[],recallCoverage:1,
    searchCalls:searchEvents.length,sourceCount:result.sources.length,citationCount,
    explicitUncertainty:/no saved conversation/i.test(answer),hasChangeAssessment:false,
    deterministicShortCircuit:result.shortCircuited==='historical-baseline-missing',needsHumanReview:false,
    note:'No historical record exists, so the harness returns a deterministic absence answer and does not spend a model or search call.'
  };
  return {
    baselineDate:result.memory.baselineDate,recalledTerms:recalled,expectedTerms:scenario.expectedRecall,recallCoverage:recalled.length/scenario.expectedRecall.length,
    searchCalls:searchEvents.length,sourceCount:result.sources.length,citationCount,
    explicitUncertainty:uncertainty,hasChangeAssessment:changedLanguage,
    needsHumanReview:true,
    note:'Automated checks are indicators only. Read each cited source and verify that it supports the attached claim; citation presence alone is not evidence entailment.'
  };
}
try {
  const report={mode:'live-api-evaluation',startedAt:new Date().toISOString(),model:config.model,searchProvider:config.searchProvider,referenceClock:EVAL_NOW.toISOString(),results:[]};
  for(const scenario of scenarios) {
    const db=openDatabase(':memory:');
    seedScenario(db,scenario);
    const searchEvents=[];
    const result=await runAgent({db,conversationId:`live-eval-${scenario.id}`,message:scenario.prompt,timezone:config.timezone,model:config.model,baseUrl:config.openaiBaseUrl,apiKey:config.openaiKey,tavilyKey:config.tavilyKey,exaKey:config.exaKey,searchProvider:config.searchProvider,maxToolRounds:config.maxToolRounds,maxSearchResults:config.maxSearchResults,clock:()=>new Date(EVAL_NOW),onEvent:e=>{if(e.type==='search') searchEvents.push(e);}});
    const assessment=assess(scenario,result,searchEvents);
    report.results.push({id:scenario.id,label:scenario.label,prompt:scenario.prompt,assessment,answer:result.answer,sources:result.sources,searches:searchEvents});
    console.log(`\n=== ${scenario.label} ===\n${result.answer}\n\nAssessment: ${JSON.stringify(assessment,null,2)}`);
    db.close();
  }
  report.finishedAt=new Date().toISOString();
  fs.mkdirSync(path.join(here,'reports'),{recursive:true});
  const reportPath=path.join(here,'reports',`live-${new Date().toISOString().replaceAll(':','-')}.json`);
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(here,'reports','live-latest.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`\nSaved report: ${path.relative(process.cwd(),reportPath)}`);
} finally { /* Each scenario owns and closes its isolated in-memory database. */ }
