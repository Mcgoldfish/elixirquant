import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {backtest,historicalHistory,annualizedReturn} from '../model.js';
import {validateStrategy} from '../rules.js';

// Keep publisher definitions OUTSIDE this checkout. No private directory is served.
export function loadPublications(file, marketFile) {
 if(!file)return [];
 const repo=fileURLToPath(new URL('../',import.meta.url));
 const rel=relative(realpathSync(repo),realpathSync(file));
 if(!rel.startsWith('..')&&!isAbsolute(rel))throw Error('Publisher definitions must be outside the public checkout.');
 const records=JSON.parse(readFileSync(file,'utf8'));
 if(!Array.isArray(records)||records.length>100)throw Error('Use an array of at most 100 publications.');
 const market=JSON.parse(readFileSync(marketFile,'utf8')),ids=new Set();
 return records.map(record=>{
  const {id,name,version,symbol,startDate,endDate,capital=10000,fee=5,slippage=5,definition}=record;
  if(!/^[a-z0-9-]{1,60}$/.test(id)||ids.has(id)||typeof name!=='string'||!name.trim()||name.length>100||typeof version!=='string'||version.length>40)throw Error('Invalid publication metadata.');
  ids.add(id);
  const config={strategy:'custom',custom:validateStrategy(definition),startDate,endDate,capital,fee,slippage,fast:2,slow:3};
  const {rows}=historicalHistory(config,market.stocks[symbol]);
  const result=backtest(rows,config);
  const returns=result.equity.slice(1).map((v,i)=>v/result.equity[i]-1);
  const mean=returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance=returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length;
  // Deliberately release monthly endpoints only, rounded, with no daily curve/signals/orders.
  const curve=rows.flatMap((row,i)=>i===rows.length-1||row.date.slice(0,7)!==rows[i+1].date.slice(0,7)?[{month:row.date.slice(0,7),index:Number((100*result.equity[i]/capital).toFixed(1)),benchmark:Number((100*result.benchmark[i]/capital).toFixed(1))}]:[]);
  return {id,name,version,symbol,period:{start:rows[0].date,end:rows.at(-1).date},assumptions:{capital,feeBps:fee,slippageBps:slippage,dataSnapshot:market.asOf},metrics:{totalReturn:result.totalReturn,cagr:annualizedReturn(result.totalReturn,rows),maxDrawdown:Math.abs(result.maxDrawdown),sharpe:variance?mean/Math.sqrt(variance)*Math.sqrt(252):null},curve};
 });
}
export function createPublishedHandler({publications=[],origin='',limit=10,globalLimit=120,now=Date.now}={}) {
 const windows=new Map();let globalWindow={at:now(),count:0};
 return (req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith('/api/published/'))return false;
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{})});res.end(JSON.stringify(data));return true;};
  if(req.headers.origin&&req.headers.origin!==origin)return send(403,{error:'Origin not allowed.'});
  if(req.method!=='GET')return send(405,{error:'Only fixed published results are available.'});
  if(url.search)return send(400,{error:'Publication parameters cannot be changed.'});
  const time=now(),ip=req.socket.remoteAddress; // Never trust client-supplied forwarding headers.
  if(time-globalWindow.at>=60000){windows.clear();globalWindow={at:time,count:0};}
  const client=windows.get(ip)||{count:0};
  if(client.count>=limit||globalWindow.count>=globalLimit){res.setHeader('Retry-After','60');return send(429,{error:'Request limit reached. Try again later.'});}
  client.count++;globalWindow.count++;windows.set(ip,client);
  if(url.pathname==='/api/published/catalog')return send(200,{strategies:publications.map(({id,name,version,symbol,period})=>({id,name,version,symbol,period}))});
  const match=url.pathname.match(/^\/api\/published\/results\/([a-z0-9-]{1,60})$/);
  const result=match&&publications.find(p=>p.id===match[1]);
  return result?send(200,result):send(404,{error:'Publication not found.'});
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const publications=loadPublications(process.env.ELIXIR_PUBLISHER_FILE,process.env.ELIXIR_MARKET_FILE||fileURLToPath(new URL('../historical-data.json',import.meta.url)));
 const handler=createPublishedHandler({publications,origin:process.env.ELIXIR_ALLOWED_ORIGIN||''});
 createServer((req,res)=>{if(!handler(req,res)){res.writeHead(404);res.end();}}).listen(Number(process.env.PORT||5183),process.env.HOST||'127.0.0.1',()=>console.log('Private publisher API started; '+publications.length+' publications.'));
}
