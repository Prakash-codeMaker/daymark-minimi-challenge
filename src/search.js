async function fetchWithRetry(url,options,{retries=1}={}) {
  let lastError;
  for(let attempt=0;attempt<=retries;attempt++) {
    try {
      const response=await fetch(url,{...options,signal:AbortSignal.timeout(18000)});
      if(response.ok) return response;
      const retryable=[429,500,502,503,504].includes(response.status);
      const body=(await response.text()).slice(0,300);
      if(!retryable||attempt===retries) throw new Error(`Search provider failed (${response.status}): ${body}`);
      const header=Number(response.headers.get('retry-after'));
      const waitMs=Number.isFinite(header)&&header>0?Math.min(1500,header*1000):250*(attempt+1);
      await new Promise(resolve=>setTimeout(resolve,waitMs));
    } catch(error) {
      lastError=error;
      if(attempt===retries||/Search provider failed \(4\d\d\)/.test(error.message)) throw error;
      await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
  }
  throw lastError||new Error('Search request failed.');
}

async function tavilySearch({query,since,apiKey,maxResults}) {
  const body={query,topic:'general',search_depth:'advanced',max_results:maxResults,include_answer:false,include_raw_content:false,api_key:apiKey};
  if(since) body.start_date=since;
  const response=await fetchWithRetry('https://api.tavily.com/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  return (data.results||[]).map(r=>({title:r.title||r.url,url:r.url,publishedDate:r.published_date||null,content:r.content||'',score:r.score??null,sourceType:'tavily'}));
}
async function exaSearch({query,since,apiKey,maxResults}) {
  const body={query,type:'auto',numResults:maxResults,contents:{highlights:true,text:{maxCharacters:3500}}};
  if(since) body.startPublishedDate=since;
  const response=await fetchWithRetry('https://api.exa.ai/search',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey},body:JSON.stringify(body)});
  const data=await response.json();
  return (data.results||[]).map(r=>({title:r.title||r.url,url:r.url,publishedDate:r.publishedDate||null,content:[...(r.highlights||[]),r.text||''].filter(Boolean).join('\n').slice(0,5000),score:r.score??null,sourceType:'exa'}));
}
export async function webSearch({query,since=null,apiKey='',exaApiKey='',provider='auto',maxResults=5}) {
  const selected=provider==='auto'?(exaApiKey?'exa':'tavily'):provider;
  if(selected==='exa') {
    if(!exaApiKey) throw new Error('EXA_API_KEY is missing. Add it to .env to use Exa search.');
    return exaSearch({query,since,apiKey:exaApiKey,maxResults});
  }
  if(selected==='tavily') {
    if(!apiKey) throw new Error('TAVILY_API_KEY is missing. Add it to .env to use Tavily search.');
    return tavilySearch({query,since,apiKey,maxResults});
  }
  throw new Error(`Unsupported search provider: ${selected}`);
}
