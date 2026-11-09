'use strict';
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {questions}=require('./questions');
const {correct,settle,SHORT}=require('./lib/game-handler.cjs')._testing;
const srv=require('./dev-server');
async function run(){
 srv.listen(0,'127.0.0.1');await once(srv,'listening');const base='http://127.0.0.1:'+srv.address().port;
 async function api(action,more={}){const r=await fetch(base+'/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...more})});return {http:r.status,...await r.json()}}
 try{
  assert.equal(questions.length,20);
  for(const type of ['tf','one','many','match'])assert.equal(questions.filter(x=>x.type===type).length,5);
  assert.equal(SHORT.length,10);
  const host=await api('create');assert(host.ok);const code=host.code;
  const users=await Promise.all(Array.from({length:24},(_,i)=>api('join',{code,name:'Detective '+(i+1)})));
  assert(users.every(u=>u.ok),'Las uniones simultáneas deben conservarse');
  const start=await api('start',{code,token:host.token,mode:'short'});
  assert(start.ok);assert.equal(start.state.playerCount,24);assert.equal(start.state.total,10);
  assert.equal(start.state.deadline-start.state.created<10*60*1000,true);
  let pstate=(await api('state',{code,token:users[0].token})).state;
  assert.equal(pstate.solution,null,'Respuestas ocultas durante la investigación');
  const a0=await api('answer',{code,token:users[0].token,answer:true});assert(a0.ok);
  const a1=await api('answer',{code,token:users[1].token,answer:false});assert(a1.ok);
  const double=await api('answer',{code,token:users[0].token,answer:true});assert(!double.ok);
  const reveal=await api('reveal',{code,token:host.token});assert(reveal.ok);
  pstate=(await api('state',{code,token:users[0].token})).state;
  assert.equal(pstate.me.score,100);assert.equal(pstate.solution.answer,true);
  assert.equal(pstate.deadline-reveal.state.deadline,0);
  for(let i=1;i<10;i++){
   const next=await api('next',{code,token:host.token});assert(next.ok,'Siguiente '+i);assert.equal(next.state.questionIndex,i);
   if(next.state.q.type==='match')assert.equal(next.state.q.pairs.left.length,3,'Relaciones simplificadas para 35 s');
   const answer=await api('reveal',{code,token:host.token});assert(answer.ok);
  }
  const finished=await api('next',{code,token:host.token});assert.equal(finished.state.phase,'finished');
  const replay=await api('reset',{code,token:host.token});assert.equal(replay.state.phase,'lobby');
  const full=await api('start',{code,token:host.token,mode:'full'});assert.equal(full.state.total,20);
  const simulated={mode:'short',phase:'playing',index:0,questionIds:SHORT,answers:{},players:{},deadline:100000,started:65000};
  assert.equal(settle(simulated,600000),true);assert.equal(simulated.phase,'finished');
  console.log('PRUEBAS SUPERADAS: 20 preguntas, 24 participantes simultáneos, respuestas, fases, autoavance y modo 10 minutos.');
 }finally{srv.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1;srv.close()});
