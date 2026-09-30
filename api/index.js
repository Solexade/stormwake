import {database,initialize} from '../cloud/store.js';
import {openSession,dispatch,persist} from '../cloud/game-service.js';
export default async function handler(req,res){
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,value)=>{res.statusCode=status;res.end(JSON.stringify(value));};
 const url=new URL(req.url,'http://localhost'),route=url.searchParams.get('route')||url.pathname.replace(/^\/api\//,'');
 if(!['GET','POST'].includes(req.method))return send(405,{error:'Method not allowed.'});
 if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(403,{error:'Use the game’s own tab.'});
 let c;try{
  let b=req.body;if(typeof b==='string')b=JSON.parse(b);if(!b&&req.method==='POST'){let text='';for await(const part of req){text+=part;if(text.length>4096)return send(413,{error:'Request too large.'});}b=text?JSON.parse(text):{};}if(JSON.stringify(b||{}).length>4096)return send(413,{error:'Request too large.'});
  await initialize();c=await database().connect();await c.query('BEGIN');await c.query("SET LOCAL statement_timeout = '12000'");
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('isles='))?.slice(6),ctx=await openSession(c,token);
  const now=Date.now();ctx.p.rate??={start:now,count:0};if(now-ctx.p.rate.start>10000)ctx.p.rate={start:now,count:0};ctx.p.rate.count++;
  let status=200,result;if(ctx.p.rate.count>150){status=429;result={error:'Please slow down for a moment.'};}else try{result=await dispatch(c,ctx,route,b||{},req.method,process.env.PUBLIC_ORIGIN||`https://${req.headers.host}`);}catch(e){if(!e.status)throw e;status=e.status;result={error:e.message};}
  await persist(c,ctx.p);await c.query('COMMIT');if(ctx.cookie!==undefined)res.setHeader('Set-Cookie',`isles=${ctx.cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${ctx.cookie?604800:0}; Secure`);send(status,result);
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});console.error('Stormwake cloud request failed:',e.code||e.message);send(503,{error:'Cloud storage is temporarily unavailable. Your saved progress is safe. Please retry.'});}finally{c?.release();}
}
