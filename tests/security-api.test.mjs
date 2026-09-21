import assert from 'node:assert/strict';
const base='http://localhost:5173';
const send=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:typeof body==='string'?body:JSON.stringify(body)});
let checks=0;
async function check(name,fn){await fn();console.log('PASS',name);checks++;}
const login=await send('/api/auth',{username:'admin',password:'Reef!2026Cycle'});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
await check('malformed auth payloads return controlled client errors',async()=>{
  for(const b of ['null','[]','{','"string"',JSON.stringify({username:'admin',password:'x'.repeat(129)})]) assert.equal((await send('/api/auth',b)).status,400);
});
await check('actual request size limited before JSON parsing',async()=>assert.equal((await send('/api/auth',{username:'admin',password:'x'.repeat(5000)})).status,400));
await check('action root and payload arrays rejected',async()=>{
  for(const b of ['null','[]','{',JSON.stringify({action:'pickup.create',data:[]})]) assert.equal((await send('/api/action',b,{Cookie:cookie,'Idempotency-Key':crypto.randomUUID()})).status,400);
});
await check('prototype names are not business roles',async()=>assert.equal((await send('/api/action',{action:'user.create',data:{username:'invalid_role',name:'invalid',role:'toString',scope:'all',password:'NotAnAccount!2026'}},{Cookie:cookie,'Idempotency-Key':crypto.randomUUID()})).status,400));
await check('parallel password failures consume at most twelve attempts',async()=>{
  const username='absent_'+crypto.randomUUID().slice(0,8);
  const results=await Promise.all(Array.from({length:16},()=>send('/api/auth',{username,password:'wrong'})));
  assert.equal(results.filter(r=>r.status===429).length,4);
  assert.equal(results.filter(r=>r.status===400).length,12);
  assert(results.filter(r=>r.status===429).every(r=>Number(r.headers.get('retry-after'))>0));
});
await check('concurrent account command retries return the same outcome',async()=>{
  const key=crypto.randomUUID();
  const body={action:'user.create',data:{username:'repeat_'+key.slice(0,8),name:'Local Test',role:'driver',scope:'all',password:'LocalOnly!2026Password'}};
  const results=await Promise.all([send('/api/action',body,{Cookie:cookie,'Idempotency-Key':key}),send('/api/action',body,{Cookie:cookie,'Idempotency-Key':key})]);
  assert(results.every(r=>r.status===200));const values=await Promise.all(results.map(r=>r.json()));assert.equal(values[0].result.id,values[1].result.id);
});
await check('replacement login revokes prior session',async()=>{
  const newer=await send('/api/auth',{username:'admin',password:'Reef!2026Cycle'},{Cookie:cookie});assert.equal(newer.status,200);
  assert.equal((await fetch(base+'/api/data',{headers:{Cookie:cookie}})).status,401);
  const next=newer.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base+'/api/data',{headers:{Cookie:next}})).status,200);
  const logout=await fetch(base+'/api/auth',{method:'DELETE',headers:{Cookie:next,Origin:base,'Content-Type':'application/json'}});assert.equal(logout.status,200);
  assert.equal((await fetch(base+'/api/data',{headers:{Cookie:next}})).status,401);
});
console.log(`${checks} security API regression groups passed`);
