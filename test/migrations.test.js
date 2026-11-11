import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { openDatabase } from '../src/db.js';

test('upgrades the original Daymark source and claim tables in place',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'daymark-migration-'));
  const filename=path.join(dir,'legacy.sqlite');
  const legacy=new DatabaseSync(filename);
  legacy.exec(`CREATE TABLE turns(id INTEGER PRIMARY KEY,conversation_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'completed',reply_to INTEGER);
    CREATE TABLE sources(id INTEGER PRIMARY KEY,turn_id INTEGER NOT NULL,title TEXT,url TEXT NOT NULL,published_date TEXT,snippet TEXT,source_type TEXT DEFAULT 'web');
    CREATE TABLE claims(id INTEGER PRIMARY KEY,turn_id INTEGER NOT NULL,subject TEXT NOT NULL,attribute TEXT NOT NULL,value TEXT NOT NULL,source_url TEXT,observed_at TEXT NOT NULL,confidence TEXT DEFAULT 'model-extracted');`);
  legacy.close();
  const migrated=openDatabase(filename);
  try {
    const sourceColumns=migrated.prepare('PRAGMA table_info(sources)').all().map(row=>row.name);
    const claimColumns=migrated.prepare('PRAGMA table_info(claims)').all().map(row=>row.name);
    for(const column of ['query','search_since','retrieved_at','content_hash']) assert.ok(sourceColumns.includes(column),`missing source migration: ${column}`);
    for(const column of ['source_id','evidence_text','currency','amount','billing_interval','unit','normalized_value','evidence_status','support_status','support_quote','claim_key','change_status','previous_value','supersedes_id']) assert.ok(claimColumns.includes(column),`missing claim migration: ${column}`);
  } finally {
    migrated.close();
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
