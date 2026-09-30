import pg from 'pg';
import {attachDatabasePool} from '@vercel/functions';
export const schema=`
CREATE TABLE IF NOT EXISTS stormwake_profiles(id TEXT PRIMARY KEY,wallet TEXT UNIQUE,name TEXT NOT NULL,best INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,doc JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS stormwake_sessions(token TEXT PRIMARY KEY,player TEXT NOT NULL REFERENCES stormwake_profiles(id),expires BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS stormwake_sessions_player ON stormwake_sessions(player);
CREATE TABLE IF NOT EXISTS stormwake_records(id TEXT PRIMARY KEY,player TEXT NOT NULL REFERENCES stormwake_profiles(id),kind TEXT NOT NULL,payload JSONB NOT NULL,created BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS stormwake_records_player ON stormwake_records(player,created DESC);
CREATE TABLE IF NOT EXISTS stormwake_world(id INTEGER PRIMARY KEY,salvage BIGINT NOT NULL DEFAULT 0);
INSERT INTO stormwake_world(id,salvage) VALUES(1,0) ON CONFLICT(id) DO NOTHING;
`;
let pool,ready;
export function database(){if(!pool){const connectionString=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!connectionString)throw Error('Cloud database is not configured');pool=new pg.Pool({connectionString,max:4,idleTimeoutMillis:5000,connectionTimeoutMillis:8000});attachDatabasePool(pool);}return pool;}
export async function initialize(db=database()){if(!ready)ready=db.query(schema).catch(e=>{ready=null;throw e;});await ready;}
