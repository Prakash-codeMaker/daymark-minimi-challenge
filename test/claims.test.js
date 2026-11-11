import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase, saveTurn, saveSources, saveClaims, listClaims } from '../src/db.js';
import { auditClaimSupport, extractClaimsFromText } from '../src/agent.js';

function withDb(run) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daymark-ledger-'));
  const db=openDatabase(path.join(dir,'daymark.sqlite'));
  try { run(db); } finally { db.close(); fs.rmSync(dir,{recursive:true,force:true}); }
}

test('price claims retain normalized value, exact sentence, and cited source provenance',()=>withDb(db=>{
  const turnId=saveTurn(db,{conversationId:'ledger',role:'assistant',content:'HubSpot Starter costs $20/month [1].'});
  const sources=saveSources(db,turnId,[{title:'Official pricing',url:'https://example.com/pricing',publishedDate:'2026-11-10',content:'HubSpot Starter costs $20 per month.',query:'HubSpot official pricing'}]);
  const claims=extractClaimsFromText('HubSpot Starter costs $20/month [1].',[{...sources[0],_id:sources[0].id}]);
  assert.equal(claims.length,1);
  assert.equal(claims[0].subject,'HubSpot Starter');
  assert.equal(claims[0].currency,'DOLLAR_UNSPECIFIED');
  assert.equal(claims[0].amount,20);
  assert.equal(claims[0].billingInterval,'month');
  assert.equal(claims[0].evidenceStatus,'cited');
  assert.equal(claims[0].evidenceText,'HubSpot Starter costs $20/month [1].');
  const support=auditClaimSupport(claims[0],sources);
  saveClaims(db,turnId,claims.map(c=>({...c,sourceId:sources[0].id,supportStatus:support.status,supportQuote:support.quote})),'2026-11-11T00:00:00.000Z');
  const [stored]=listClaims(db,'HubSpot');
  assert.equal(stored.source_link,'https://example.com/pricing');
  assert.equal(stored.source_date,'2026-11-10');
  assert.equal(stored.evidence_status,'cited');
  assert.equal(stored.change_status,'baseline');
  assert.equal(stored.source_content_hash.length,64);
}));

test('uncited price statements stay explicitly unverified',()=>{
  const claims=extractClaimsFromText('Neon Launch costs $19/month.');
  assert.equal(claims.length,1);
  assert.equal(claims[0].evidenceStatus,'unverified');
  assert.equal(claims[0].sourceUrl,null);
  assert.equal(claims[0].confidence,'heuristic-unverified');
});

test('claim ledger links changed values to the prior like-for-like claim',()=>withDb(db=>{
  const first=saveTurn(db,{conversationId:'ledger',role:'assistant',content:'Acme Pro costs $20/month [1].'});
  const [s1]=saveSources(db,first,[{title:'Pricing 1',url:'https://example.com/price-1',content:'Acme Pro is $20/month.'}]);
  saveClaims(db,first,[{subject:'Acme Pro',attribute:'price',value:'$20/month',currency:'USD',amount:20,billingInterval:'month',plan:'Pro',normalizedValue:'USD|20|month|total',sourceId:s1.id,sourceUrl:s1.url,evidenceText:'Acme Pro costs $20/month [1].',evidenceStatus:'cited',supportStatus:'snippet-confirmed'}],'2026-11-10T00:00:00.000Z');
  const second=saveTurn(db,{conversationId:'ledger',role:'assistant',content:'Acme Pro costs $25/month [1].'});
  const [s2]=saveSources(db,second,[{title:'Pricing 2',url:'https://example.com/price-2',content:'Acme Pro is $25/month.'}]);
  saveClaims(db,second,[{subject:'Acme Pro',attribute:'price',value:'$25/month',currency:'USD',amount:25,billingInterval:'month',plan:'Pro',normalizedValue:'USD|25|month|total',sourceId:s2.id,sourceUrl:s2.url,evidenceText:'Acme Pro costs $25/month [1].',evidenceStatus:'cited',supportStatus:'snippet-confirmed'}],'2026-11-11T00:00:00.000Z');
  const rows=listClaims(db,'Acme Pro');
  assert.equal(rows[0].change_status,'changed');
  assert.equal(rows[0].previous_value,'$20/month');
  assert.equal(rows[0].supersedes_id,rows[1].id);
  assert.equal(rows[1].change_status,'baseline');
}));


test('per-seat monthly pricing preserves both unit and billing interval',()=>{
  const claims=extractClaimsFromText('Acme Business costs $49 per user per month [1].',[{url:'https://example.com/pricing',publishedDate:'2026-11-10'}]);
  assert.equal(claims.length,1);
  assert.equal(claims[0].unit,'user');
  assert.equal(claims[0].billingInterval,'month');
  assert.equal(claims[0].currency,'DOLLAR_UNSPECIFIED');
});


test('all citations attached to a claim remain linked in the evidence ledger',()=>withDb(db=>{
  const turn=saveTurn(db,{conversationId:'multi-source',role:'assistant',content:'Acme Pro costs USD 49/month [1] [2].'});
  const sources=saveSources(db,turn,[
    {title:'Official pricing',url:'https://example.com/pricing',publishedDate:'2026-11-10',content:'Acme Pro is USD 49 per month.'},
    {title:'Official plan details',url:'https://example.com/plans',publishedDate:'2026-11-10',content:'Acme Pro monthly plan is 49 USD.'}
  ]);
  const claims=extractClaimsFromText('Acme Pro costs USD 49/month [1] [2].',sources.map(source=>({...source,_id:source.id})));
  assert.equal(claims.length,1);
  assert.equal(claims[0].currency,'USD');
  saveClaims(db,turn,claims.map(claim=>({...claim,sourceId:sources[0].id,sourceIds:sources.map(source=>source.id)})));
  const [stored]=listClaims(db,'Acme Pro');
  assert.equal(stored.evidence_sources.length,2);
  assert.deepEqual(stored.evidence_sources.map(source=>source.url),['https://example.com/pricing','https://example.com/plans']);
}));


test('citation is only snippet-confirmed when amount, subject and billing interval appear in the excerpt',()=>{
  const [supported]=extractClaimsFromText('Acme Pro costs $49/month [1].',[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro costs $49/month when billed monthly.'}]);
  assert.equal(supported.evidenceStatus,'cited');
  assert.equal(auditClaimSupport(supported,[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro costs $49/month when billed monthly.'}]).status,'snippet-confirmed');
  const [partial]=extractClaimsFromText('Acme Pro costs $49/month [1].',[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro annual plan costs $49/year.'}]);
  assert.equal(partial.evidenceStatus,'cited');
  assert.equal(auditClaimSupport(partial,[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro annual plan costs $49/year.'}]).status,'partial-support');
});

test('a cited source without the price figure is not treated as proof',()=>{
  const [claim]=extractClaimsFromText('Acme Pro costs $49/month [1].',[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro offers team billing and SSO.'}]);
  assert.equal(claim.evidenceStatus,'cited');
  assert.equal(claim.sourceRefs.length,1);
  assert.equal(auditClaimSupport(claim,[{title:'Acme official pricing',url:'https://acme.example/pricing',content:'Acme Pro offers team billing and SSO.'}]).status,'citation-linked-only');
});


test('unsupported later claim cannot supersede a snippet-confirmed baseline',()=>withDb(db=>{
  const first=saveTurn(db,{conversationId:'ledger-guard',role:'assistant',content:'Acme Pro costs $20/month [1].'});
  const [source]=saveSources(db,first,[{title:'Acme pricing',url:'https://acme.example/pricing',content:'Acme Pro costs $20/month.'}]);
  saveClaims(db,first,[{subject:'Acme Pro',attribute:'price',value:'$20/month',currency:'DOLLAR_UNSPECIFIED',amount:20,billingInterval:'month',normalizedValue:'DOLLAR_UNSPECIFIED|20|month|total',sourceId:source.id,sourceUrl:source.url,evidenceText:'Acme Pro costs $20/month [1].',supportStatus:'snippet-confirmed'}]);
  const second=saveTurn(db,{conversationId:'ledger-guard',role:'assistant',content:'Acme Pro costs $25/month [1].'});
  const [weakSource]=saveSources(db,second,[{title:'Acme feature page',url:'https://acme.example/features',content:'Acme Pro has advanced features.'}]);
  saveClaims(db,second,[{subject:'Acme Pro',attribute:'price',value:'$25/month',currency:'DOLLAR_UNSPECIFIED',amount:25,billingInterval:'month',normalizedValue:'DOLLAR_UNSPECIFIED|25|month|total',sourceId:weakSource.id,sourceUrl:weakSource.url,evidenceText:'Acme Pro costs $25/month [1].',supportStatus:'citation-linked-only'}]);
  const rows=listClaims(db,'Acme Pro');
  assert.equal(rows[0].change_status,'unverified');
  assert.equal(rows[0].supersedes_id,null);
  assert.equal(rows[1].change_status,'baseline');
}));

test('a bare dollar symbol cannot confirm a claim explicitly denominated in USD',()=>{
 const claim={subject:'Example Pro',amount:20,currency:'USD',billingInterval:'month',unit:null};
 const ambiguous=auditClaimSupport(claim,[{title:'Example pricing',url:'https://example.com/pricing',content:'Example Pro costs $20 per month.'}]);
 const explicit=auditClaimSupport(claim,[{title:'Example pricing',url:'https://example.com/pricing',content:'Example Pro costs USD 20 per month.'}]);
 assert.equal(ambiguous.status,'partial-support');
 assert.equal(explicit.status,'snippet-confirmed');
});
