const tourMarkup = `
<section class="walkthrough" id="walkthrough" aria-labelledby="walkTitle">
  <div class="walkhead">
    <div class="walkintro">
      <div class="walkkicker">Learn by seeing · 4 steps · about 45 seconds</div>
      <h2 id="walkTitle">See how Daymark checks what changed</h2>
      <p>Follow one practical research task from the first question to an answer with evidence attached.</p>
    </div>
    <div class="walkactions"><span class="samplelabel">GUIDED EXAMPLE · NOT LIVE RESULTS</span><button class="tour-toggle" id="tourToggle" type="button" aria-expanded="false">Play walkthrough <span class="arrow">↗</span></button></div>
  </div>
  <div class="workflowline" role="tablist" aria-label="Daymark workflow steps">
    <button class="flowstep active" type="button" role="tab" aria-selected="true" data-tour-step="0"><span class="flow-num">01</span><span class="flow-label">Remember</span></button>
    <button class="flowstep" type="button" role="tab" aria-selected="false" data-tour-step="1"><span class="flow-num">02</span><span class="flow-label">Search again</span></button>
    <button class="flowstep" type="button" role="tab" aria-selected="false" data-tour-step="2"><span class="flow-num">03</span><span class="flow-label">Compare</span></button>
    <button class="flowstep" type="button" role="tab" aria-selected="false" data-tour-step="3"><span class="flow-num">04</span><span class="flow-label">Show evidence</span></button>
  </div>
  <div class="tourpanel" id="tourPanel" hidden>
    <div class="tourgrid">
      <div class="tourcopy">
        <div class="tourcounter" id="tourCounter">STEP 01 / 04</div>
        <h3 id="tourTitle">Start with the question you asked before.</h3>
        <p id="tourDescription">Daymark searches your saved conversation and brings back the original question, date and research context. It doesn't make you explain the whole story again.</p>
        <ul class="tourbullets" id="tourBullets"><li>Recover the earlier request from local history</li><li>Keep the original date as the comparison baseline</li><li>Reuse the original search intent</li></ul>
        <div class="tourcontrols">
          <button class="tour-nav" id="tourPrev" type="button" disabled>← Back</button>
          <button class="tour-nav" id="tourPlay" type="button">Auto-play ▶</button>
          <button class="tour-nav primary" id="tourNext" type="button">Next step →</button>
        </div>
        <button class="tourtry" id="tourTry" type="button">Use the baseline prompt in chat <span class="arrow">↗</span></button>
      </div>
      <div class="tourvisual" id="tourVisual" aria-live="polite"></div>
    </div>
    <div class="tourdisclaimer">This walkthrough uses an illustrative Postgres-hosting example and real provider brand marks. The cards explain the workflow; they are not claims about current prices or live search results. Run the prompt in chat to use your configured agent.</div>
  </div>
</section>
`;
document.querySelector('#tourMount').innerHTML = tourMarkup;

const tourSteps=[
  {
    title:'Start with the question you asked before.',
    description:'Daymark searches your saved conversation and brings back the original question, date and research context. It does not make you explain the whole story again.',
    bullets:['Recover the earlier request from local history','Keep the original date as the comparison baseline','Reuse the original search intent'],
    button:'Use the baseline prompt in chat',
    prompt:'Compare PostgreSQL hosting options for a small side project. Focus on pricing, free-tier limits, and major product changes. Cite the sources you use.',
    visual:`<div class="vishead"><span>MEMORY / MATCH FOUND</span><span class="vis-chip">EXAMPLE MEMORY</span></div>
      <div class="memory-card"><div class="memory-date">03 NOV 2026 · SAVED QUESTION</div><div class="memory-question">“Compare PostgreSQL hosting options for my side project.”</div><div class="memory-meta"><span class="mini-tag">Original query</span><span class="mini-tag">Search intent</span><span class="mini-tag">Cited sources</span></div></div>
      <div class="follow-card"><span class="follow-icon">↶</span><span><strong>Today:</strong> “Has anything important changed since I asked?”</span></div>`
  },
  {
    title:'Search the present and the time in between.',
    description:'The agent replays the earlier research instead of guessing what you meant. It checks current pages and looks separately for dated changes after the original question.',
    bullets:['Current lane checks what the pages say now','Since lane looks for updates after the baseline date','Provider names are search targets, not proof of a change'],
    button:'Use the follow-up prompt in chat',
    prompt:'I asked you about PostgreSQL hosting earlier. Recheck the options we discussed and tell me what has changed in pricing, limits, or major product updates since that research. If you cannot find my earlier question, say so.',
    visual:`<div class="vishead"><span>WEB SEARCH / TWO LANES</span><span class="vis-chip">PARALLEL RECHECK</span></div>
      <div class="lanes">
        <div class="search-lane"><div class="lane-title">Current pages</div><div class="lane-sub">What provider pages say now</div><div class="logo-row">
          <span class="provider"><img src="/assets/supabase.svg" alt="" onerror="this.hidden=true"><span class="fallback">S</span>Supabase</span>
          <span class="provider"><img src="/assets/neon.svg" alt="" onerror="this.hidden=true"><span class="fallback">N</span>Neon</span>
        </div><div class="lane-status"><i class="lane-pulse"></i> CHECK CURRENT STATE</div></div>
        <div class="search-lane"><div class="lane-title">Since 03 Nov</div><div class="lane-sub">Dated changes after the baseline</div><div class="logo-row">
          <span class="provider"><img src="/assets/railway.svg" alt="" onerror="this.hidden=true"><span class="fallback">R</span>Railway</span>
          <span class="provider"><img src="/assets/neon.svg" alt="" onerror="this.hidden=true"><span class="fallback">N</span>Neon</span>
        </div><div class="lane-status"><i class="lane-pulse"></i> LOOK FOR NEW SIGNALS</div></div>
      </div>`
  },
  {
    title:'Separate a real change from missing evidence.',
    description:'A search result is not automatically a product change. Daymark keeps distinct outcomes so an empty search does not become a confident “nothing changed”.',
    bullets:['Changed: dated evidence supports a different state','Still supported: available evidence backs the earlier claim','Not verifiable: evidence is incomplete or inconclusive'],
    button:'Run the follow-up prompt in chat',
    prompt:'I asked you about PostgreSQL hosting earlier. Recheck the options we discussed and tell me what has changed in pricing, limits, or major product updates since that research. If you cannot find my earlier question, say so.',
    visual:`<div class="vishead"><span>CHANGE REVIEW / EXAMPLE STATES</span><span class="vis-chip">NO SILENT ASSUMPTIONS</span></div>
      <div class="compare-grid">
        <div class="compare-card good"><div class="compare-icon">✓</div><h4>Still supported</h4><p>Evidence continues to support the earlier point.</p></div>
        <div class="compare-card warn"><div class="compare-icon">↗</div><h4>Changed</h4><p>A dated source supports a different value or state.</p></div>
        <div class="compare-card neutral"><div class="compare-icon">?</div><h4>Not verifiable</h4><p>Evidence is too thin. Keep the uncertainty visible.</p></div>
      </div>
      <div class="guardrail">GUARDRAIL / No result found ≠ proof that nothing changed.</div>`
  },
  {
    title:'Keep the evidence beside the answer.',
    description:'The final response keeps source links, publication dates and the tracked claim context together. You can inspect where a statement came from instead of trusting a bare summary.',
    bullets:['Open numbered citations from the answer','Inspect current and since-baseline source receipts','Review tracked claims and their evidence status'],
    button:'Try the follow-up in chat',
    prompt:'I asked you about PostgreSQL hosting earlier. Recheck the options we discussed and tell me what has changed in pricing, limits, or major product updates since that research. If you cannot find my earlier question, say so.',
    visual:`<div class="vishead"><span>EVIDENCE RAIL / ILLUSTRATIVE RECEIPTS</span><span class="vis-chip">ATTACHED TO ANSWER</span></div>
      <div class="receipts">
        <div class="receipt-card"><span class="receipt-num">[1]</span><div class="receipt-main"><div class="receipt-title">Provider pricing page</div><div class="receipt-meta">CURRENT PAGE · SOURCE DATE CAPTURED WHEN AVAILABLE</div></div><span class="receipt-mode">CURRENT</span></div>
        <div class="receipt-card"><span class="receipt-num">[2]</span><div class="receipt-main"><div class="receipt-title">Product changelog</div><div class="receipt-meta">DATED UPDATE · AFTER BASELINE</div></div><span class="receipt-mode">SINCE</span></div>
        <div class="receipt-card"><span class="receipt-num">[3]</span><div class="receipt-main"><div class="receipt-title">Supporting documentation</div><div class="receipt-meta">SOURCE EXCERPT · CLAIM CONTEXT</div></div><span class="receipt-mode">CONTEXT</span></div>
      </div>
      <div class="ledger-mini"><strong>Tracked claim · PostgreSQL hosting</strong><span>SUPPORT CHECK REQUIRED</span></div>`
  }
];
let activeTourStep=0,tourTimer=null;
const tourPanel=$('#tourPanel'),tourToggle=$('#tourToggle'),tourVisual=$('#tourVisual');
function stopTourPlayback(){if(tourTimer){clearInterval(tourTimer);tourTimer=null;}const play=$('#tourPlay');if(play)play.textContent='Auto-play ▶';}
function renderTourStep(index){
  activeTourStep=Math.max(0,Math.min(tourSteps.length-1,index));
  const step=tourSteps[activeTourStep];
  $('#tourCounter').textContent=`STEP ${String(activeTourStep+1).padStart(2,'0')} / 04`;
  $('#tourTitle').textContent=step.title;$('#tourDescription').textContent=step.description;
  const bullets=$('#tourBullets');bullets.replaceChildren();step.bullets.forEach(line=>{const li=document.createElement('li');li.textContent=line;bullets.append(li);});
  $('#tourTry').innerHTML=step.button+' <span class="arrow">↗</span>';
  $('#tourPrev').disabled=activeTourStep===0;$('#tourNext').disabled=activeTourStep===tourSteps.length-1;
  document.querySelectorAll('[data-tour-step]').forEach((button,i)=>{button.classList.toggle('active',i===activeTourStep);button.classList.toggle('done',i<activeTourStep);button.setAttribute('aria-selected',String(i===activeTourStep));});
  tourVisual.style.animation='none';void tourVisual.offsetWidth;tourVisual.style.animation='';tourVisual.innerHTML=step.visual;
}
function openTour(){tourPanel.hidden=false;tourToggle.setAttribute('aria-expanded','true');renderTourStep(0);tourToggle.innerHTML='Hide walkthrough <span class="arrow">×</span>';tourPanel.scrollIntoView({behavior:'smooth',block:'nearest'});}
function startTourPlayback(){if(activeTourStep>=tourSteps.length-1)renderTourStep(0);stopTourPlayback();$('#tourPlay').textContent='Pause Ⅱ';tourTimer=setInterval(()=>{if(activeTourStep>=tourSteps.length-1){stopTourPlayback();return;}renderTourStep(activeTourStep+1);},6500);}
tourToggle.addEventListener('click',()=>{if(tourPanel.hidden){openTour();}else{stopTourPlayback();tourPanel.hidden=true;tourToggle.setAttribute('aria-expanded','false');tourToggle.innerHTML='Play walkthrough <span class="arrow">↗</span>';}});
$('#tourPlay').addEventListener('click',()=>{if(tourTimer)stopTourPlayback();else startTourPlayback();});
$('#tourPrev').addEventListener('click',()=>{stopTourPlayback();renderTourStep(activeTourStep-1);});
$('#tourNext').addEventListener('click',()=>{stopTourPlayback();renderTourStep(activeTourStep+1);});
document.querySelectorAll('[data-tour-step]').forEach(button=>button.addEventListener('click',()=>{stopTourPlayback();if(tourPanel.hidden){tourPanel.hidden=false;tourToggle.setAttribute('aria-expanded','true');tourToggle.innerHTML='Hide walkthrough <span class="arrow">×</span>';}renderTourStep(Number(button.dataset.tourStep));}));
$('#tourTry').addEventListener('click',()=>{stopTourPlayback();input.value=tourSteps[activeTourStep].prompt;input.focus();input.scrollIntoView({behavior:'smooth',block:'center'});input.dispatchEvent(new Event('input',{bubbles:true}));});
