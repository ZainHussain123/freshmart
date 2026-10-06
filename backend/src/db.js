import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
// Vercel's Neon integration provides DATABASE_URL (pooled); POSTGRES_URL is the legacy Vercel Postgres name. Keep the pool small on serverless.
const {Pool}=pg; export const pool=new Pool({connectionString:process.env.DATABASE_URL||process.env.POSTGRES_URL,max:process.env.VERCEL?3:10}); export const query=(q,p=[])=>pool.query(q,p);
export async function transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const r=await fn(c);await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
