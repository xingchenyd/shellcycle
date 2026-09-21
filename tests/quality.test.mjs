import { buildSync } from 'esbuild';
import assert from 'node:assert/strict';
for (const name of ['domain', 'seed', 'request', 'grid-data', 'business-date']) buildSync({entryPoints:[`lib/${name}.ts`],bundle:true,platform:'node',format:'esm',outfile:`.sites-runtime/quality-${name}.mjs`});
const {businessDate} = await import('../.sites-runtime/quality-business-date.mjs');
const {apply, grams, str, visible} = await import('../.sites-runtime/quality-domain.mjs');
const {seedData} = await import('../.sites-runtime/quality-seed.mjs');
const {readJson} = await import('../.sites-runtime/quality-request.mjs');
const {gridRecords,csvCell} = await import('../.sites-runtime/quality-grid-data.mjs');
const admin = {id:'A',role:'admin',scope:'all',name:'Test'};
let count=0;
async function test(name, run) {await run();count++;console.log('PASS',name);}
await test('weight rejects booleans, arrays, objects, exponents and sub-gram values',()=>{
  for(const v of [true,false,[],[12],{},'1e2','0x10','1.0001',0.0001]) assert.throws(()=>grams(v));
  for(const v of [1.001,'1.001',0.009,'0.009']) assert.equal(grams(v),Math.round(Number(v)*1000));
});
await test('text rejects object coercion',()=>assert.throws(()=>str({x:1})));
await test('scrapped batch cannot be revived by failed inspection',()=>{
  const s=seedData(); s.find(r=>r.id==='BAT-001').quality='scrapped';
  assert.throws(()=>apply(s,admin,'batch.inspect',{id:'BAT-001',result:'fail',notes:'check'}),/报废/);
});
await test('quarantined assembling batch rejects new material',()=>{
  const s=seedData();const b=s.find(r=>r.id==='BAT-001');b.status='assembling';b.quality='quarantined';
  assert.throws(()=>apply(s,admin,'batch.input',{id:b.id,receiptId:'REC-0001',weight:1}),/隔离/);
});
await test('inactive site rejects batch creation',()=>{
  const s=seedData();s.find(r=>r.id==='SITE-1').active=false;
  assert.throws(()=>apply(s,admin,'batch.create',{siteId:'SITE-1',name:'test',zone:'A1'}),/停用/);
});
await test('closed demand cannot be relabeled cancelled',()=>{
  const s=seedData();const d=s.find(r=>r.kind==='demand');d.status='closed';
  assert.throws(()=>apply(s,admin,'demand.cancel',{id:d.id}),/结束/);
});
await test('deployment cannot predate receipt',()=>{
  const s=seedData();s.find(r=>r.id==='DSP-1').receivedAt='2026-09-20T12:00:00Z';
  assert.throws(()=>apply(s,admin,'deployment.create',{dispatchId:'DSP-1',weight:1,date:'2026-09-19',location:'test'},new Date('2026-09-22')),/早于/);
});
await test('driver sees assigned trips only',()=>{
  const s=seedData();const trip=s.find(r=>r.kind==='trip');trip.driverId='different-driver';
  const v=visible(s,{id:'other',role:'driver',scope:'all'});assert(!v.some(r=>r.id===trip.id));
});
await test('business ids retain full UUID entropy',()=>{
  const r=apply(seedData(),admin,'pickup.create',{partnerId:'PAR-1',expected:1,buckets:1,scheduled:'2026-09-22'}).result;
  assert.match(r.id,/^PIC-[A-F0-9-]{36}$/);
});
await test('bounded JSON rejects invalid roots and malformed syntax',async()=>{
  for(const text of ['null','[]','1','{']) await assert.rejects(()=>readJson(new Request('http://localhost',{method:'POST',body:text})),/格式|对象/);
});
await test('bounded JSON enforces actual bytes without content length',async()=>{
  await assert.rejects(()=>readJson(new Request('http://localhost',{method:'POST',body:JSON.stringify({text:'壳'.repeat(30)})}),40),/过大/);
});
await test('table and CSV share filter and order',()=>{
  const r=gridRecords([{id:'2',kind:'pickup',status:'failed'},{id:'1',kind:'pickup',status:'requested'}],'pickup','','requested','id',()=> '');assert.deepEqual(r.map(x=>x.id),['1']);
});
await test('CSV blocks whitespace-prefixed spreadsheet formulas',()=>{
  for(const x of ['=1+1','\t=1+1','  +SUM(A1:A2)','\r@x']) assert(csvCell(x).startsWith('"\''));
  assert.equal(csvCell('a"b'),'"a""b"');
});
await test('business date changes at Shanghai midnight, not UTC midnight',()=>{
  assert.equal(businessDate('2026-09-21T15:59:59Z'),'2026-09-21');
  assert.equal(businessDate('2026-09-21T16:00:00Z'),'2026-09-22');
  assert.equal(businessDate('2026-09-22'),'2026-09-22');
});
console.log(`${count} quality regression groups passed`);
