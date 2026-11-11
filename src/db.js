import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const columnExists = (db, table, column) => db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
function addColumn(db, table, column, definition) {
  if (!columnExists(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive:true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'completed',
      reply_to INTEGER, FOREIGN KEY(reply_to) REFERENCES turns(id)
    );
    CREATE INDEX IF NOT EXISTS turns_created_at ON turns(created_at);
    CREATE INDEX IF NOT EXISTS turns_conversation ON turns(conversation_id,id);
    CREATE VIRTUAL TABLE IF NOT EXISTS turns_fts USING fts5(content, content='turns', content_rowid='id', tokenize='unicode61');
    CREATE TRIGGER IF NOT EXISTS turns_ai AFTER INSERT ON turns BEGIN INSERT INTO turns_fts(rowid,content) VALUES(new.id,new.content); END;
    CREATE TRIGGER IF NOT EXISTS turns_ad AFTER DELETE ON turns BEGIN INSERT INTO turns_fts(turns_fts,rowid,content) VALUES('delete',old.id,old.content); END;
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY, turn_id INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
      title TEXT, url TEXT NOT NULL, published_date TEXT, snippet TEXT, source_type TEXT DEFAULT 'web'
    );
    CREATE INDEX IF NOT EXISTS sources_turn ON sources(turn_id);
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY, turn_id INTEGER NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
      subject TEXT NOT NULL, attribute TEXT NOT NULL, value TEXT NOT NULL, source_url TEXT,
      observed_at TEXT NOT NULL, confidence TEXT DEFAULT 'model-extracted'
    );
    CREATE INDEX IF NOT EXISTS claims_subject ON claims(subject,attribute,observed_at);
    CREATE TABLE IF NOT EXISTS claim_sources (
      claim_id INTEGER NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      citation_order INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(claim_id,source_id)
    );
    CREATE INDEX IF NOT EXISTS claim_sources_source ON claim_sources(source_id);`);

  // Forward-only migrations keep existing Daymark databases usable.
  for (const [column, definition] of Object.entries({
    query: 'TEXT', search_since: 'TEXT', retrieved_at: 'TEXT', content_hash: 'TEXT'
  })) addColumn(db, 'sources', column, definition);
  for (const [column, definition] of Object.entries({
    source_id: 'INTEGER REFERENCES sources(id)', evidence_text: 'TEXT', source_published_date: 'TEXT',
    currency: 'TEXT', amount: 'REAL', billing_interval: 'TEXT', unit: 'TEXT', region: 'TEXT', plan: 'TEXT',
    normalized_value: 'TEXT', evidence_status: "TEXT NOT NULL DEFAULT 'unverified'", support_status: "TEXT NOT NULL DEFAULT 'not-checked'", support_quote: 'TEXT', claim_hash: 'TEXT',
    claim_key: 'TEXT', change_status: "TEXT NOT NULL DEFAULT 'baseline'", previous_value: 'TEXT',
    supersedes_id: 'INTEGER REFERENCES claims(id)'
  })) addColumn(db, 'claims', column, definition);
  db.exec(`CREATE INDEX IF NOT EXISTS claims_lookup ON claims(subject,attribute,observed_at);
    CREATE INDEX IF NOT EXISTS claims_source ON claims(source_id);
    CREATE INDEX IF NOT EXISTS sources_hash ON sources(content_hash);
    INSERT OR IGNORE INTO claim_sources(claim_id,source_id,citation_order) SELECT id,source_id,1 FROM claims WHERE source_id IS NOT NULL;`);
  return db;
}

export function saveTurn(db, {conversationId,role,content,createdAt=new Date().toISOString(),replyTo=null,status='completed'}) {
  const r=db.prepare('INSERT INTO turns(conversation_id,role,content,created_at,reply_to,status) VALUES(?,?,?,?,?,?)').run(conversationId,role,content,createdAt,replyTo,status);
  return Number(r.lastInsertRowid);
}

export function saveSources(db, turnId, sources=[]) {
  const stmt=db.prepare(`INSERT INTO sources(turn_id,title,url,published_date,snippet,source_type,query,search_since,retrieved_at,content_hash)
    VALUES(?,?,?,?,?,?,?,?,?,?)`);
  const saved=[];
  const retrievedAt=new Date().toISOString();
  for(const s of sources) {
    if(!s.url || !/^https?:\/\//i.test(s.url)) continue;
    const snippet=String(s.content||s.snippet||'').slice(0,12000);
    const hash=createHash('sha256').update(`${s.url}\n${snippet}`).digest('hex');
    const r=stmt.run(turnId,s.title||'',s.url,s.publishedDate||null,snippet,s.sourceType||'web',s.query||null,s.searchSince||null,retrievedAt,hash);
    saved.push({...s,id:Number(r.lastInsertRowid),contentHash:hash,retrievedAt});
  }
  return saved;
}

export function saveClaims(db, turnId, claims=[], observedAt=new Date().toISOString()) {
  const stmt=db.prepare(`INSERT INTO claims(turn_id,subject,attribute,value,source_url,observed_at,confidence,
    source_id,evidence_text,source_published_date,currency,amount,billing_interval,unit,region,plan,normalized_value,evidence_status,support_status,support_quote,claim_hash,claim_key,change_status,previous_value,supersedes_id)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const linkStmt=db.prepare('INSERT OR IGNORE INTO claim_sources(claim_id,source_id,citation_order) VALUES(?,?,?)');
  for(const c of claims) {
    if(!c.subject||!c.attribute||!c.value) continue;
    const normalizedValue=c.normalizedValue||[c.currency,c.amount,c.unit,c.billingInterval].filter(Boolean).join('|')||c.value;
    const claimKey=[c.subject,c.attribute,c.currency||'',c.billingInterval||'',c.unit||'',c.region||'',c.plan||''].join('|').toLowerCase().replace(/\bplan\b/g,'').replace(/\s+/g,' ').trim();
    const comparable=c.supportStatus==='snippet-confirmed';
    const previous=comparable?db.prepare(`SELECT id,value,normalized_value FROM claims WHERE claim_key=? AND support_status='snippet-confirmed' ORDER BY observed_at DESC,id DESC LIMIT 1`).get(claimKey):null;
    const changeStatus=!comparable?'unverified':!previous?'baseline':previous.normalized_value===normalizedValue?'unchanged':'changed';
    const claimHash=createHash('sha256').update([claimKey,normalizedValue,c.sourceUrl||'',c.evidenceText||''].join('\n')).digest('hex');
    const sourceIds=[...new Set([...(c.sourceIds||[]),...(c.sourceId?[c.sourceId]:[])])];
    const primarySourceId=c.sourceId||sourceIds[0]||null;
    const result=stmt.run(turnId,c.subject,c.attribute,c.value,c.sourceUrl||null,observedAt,c.confidence||'heuristic-unverified',
      primarySourceId,c.evidenceText||null,c.sourcePublishedDate||null,c.currency||null,c.amount??null,
      c.billingInterval||null,c.unit||null,c.region||null,c.plan||null,normalizedValue,c.evidenceStatus||'unverified',
      c.supportStatus||'not-checked',c.supportQuote||null,claimHash,claimKey,changeStatus,previous?.value||null,previous?.id||null);
    sourceIds.forEach((sourceId,index)=>linkStmt.run(Number(result.lastInsertRowid),sourceId,index+1));
  }
}

const turnSelect = `SELECT t.*, (SELECT json_group_array(json_object('id',s.id,'title',s.title,'url',s.url,'publishedDate',s.published_date,'snippet',s.snippet,'query',s.query,'searchSince',s.search_since,'contentHash',s.content_hash)) FROM sources s WHERE s.turn_id=t.id) AS sources
  FROM turns t`;
export function recallByDate(db, start, end) {
  return db.prepare(`${turnSelect} WHERE t.created_at>=? AND t.created_at<? ORDER BY t.created_at ASC`).all(start,end).map(x=>({...x,sources:JSON.parse(x.sources||'[]')}));
}
export function recallByTopic(db, query, limit=8) {
  const terms=query.toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g)||[];
  const safe=[...new Set(terms)].slice(0,8).map(x=>`"${x.replaceAll('"','')}"`).join(' OR ');
  if(!safe) return [];
  try {
    return db.prepare(`SELECT t.*, bm25(turns_fts) AS rank,
      (SELECT json_group_array(json_object('id',s.id,'title',s.title,'url',s.url,'publishedDate',s.published_date,'snippet',s.snippet,'query',s.query,'searchSince',s.search_since,'contentHash',s.content_hash)) FROM sources s WHERE s.turn_id=t.id) AS sources
      FROM turns_fts JOIN turns t ON t.id=turns_fts.rowid WHERE turns_fts MATCH ? ORDER BY rank LIMIT ?`).all(safe,limit).map(x=>({...x,sources:JSON.parse(x.sources||'[]')}));
  } catch { return []; }
}
export function getRecentTurns(db,conversationId,limit=12) {
  return db.prepare('SELECT * FROM turns WHERE conversation_id=? ORDER BY id DESC LIMIT ?').all(conversationId,limit).reverse();
}
export function listClaims(db, subject='') {
  const base=`SELECT c.*, s.title AS source_title, s.url AS source_link, s.published_date AS source_date,
    s.content_hash AS source_content_hash,s.query AS source_query,s.search_since AS source_search_since,s.retrieved_at AS source_retrieved_at,
    (SELECT json_group_array(json_object('id',s2.id,'title',s2.title,'url',s2.url,'publishedDate',s2.published_date,'searchSince',s2.search_since,'contentHash',s2.content_hash))
      FROM claim_sources cs JOIN sources s2 ON s2.id=cs.source_id WHERE cs.claim_id=c.id) AS evidence_sources
    FROM claims c LEFT JOIN sources s ON s.id=c.source_id`;
  const rows=subject
    ? db.prepare(`${base} WHERE c.subject LIKE ? ORDER BY c.observed_at DESC LIMIT 100`).all(`%${subject}%`)
    : db.prepare(`${base} ORDER BY c.observed_at DESC LIMIT 100`).all();
  return rows.map(row=>({...row,evidence_sources:JSON.parse(row.evidence_sources||'[]')}));
}

export function getSourcesForTurn(db, turnId) {
  return db.prepare(`SELECT id,title,url,published_date AS publishedDate,snippet AS content,source_type AS sourceType,
    query,search_since AS searchSince,retrieved_at AS retrievedAt,content_hash AS contentHash
    FROM sources WHERE turn_id=? ORDER BY id`).all(turnId);
}

export function getConversationHistory(db, conversationId, limit=80) {
  return db.prepare(`${turnSelect} WHERE t.conversation_id=? ORDER BY t.id DESC LIMIT ?`)
    .all(conversationId,limit).reverse().map(row=>({...row,sources:JSON.parse(row.sources||'[]')}));
}

export function listEvidenceForTurn(db, turnId) {
  return db.prepare(`SELECT s.*, c.id AS claim_id,c.subject,c.attribute,c.value AS claim_value,c.evidence_text,c.evidence_status,
    c.confidence,c.normalized_value,c.currency,c.amount,c.billing_interval,c.unit,c.region,c.plan,c.support_status,c.support_quote
    FROM sources s LEFT JOIN claim_sources cs ON cs.source_id=s.id LEFT JOIN claims c ON c.id=cs.claim_id
    WHERE s.turn_id=? ORDER BY s.id,c.id`).all(turnId);
}
