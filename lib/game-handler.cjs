'use strict';
const crypto=require('node:crypto');
const {questions,scenes}=require('../questions.js');
const store=require('../store.js');
const SHORT=[0,1,6,7,8,11,13,14,16,19]; // Dos pruebas por escena
const ALL=questions.map((_,i)=>i);
const MAX_PLAYERS=80;
const CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const token=()=>crypto.randomBytes(24).toString('hex');
const newCode=()=>Array.from(crypto.randomBytes(6)).map(n=>CHARS[n%CHARS.length]).join('');
function fail(s,m){const e=new Error(m);e.status=s;throw e}
function getRole(r,t){if(r.host===t)return 'host';if(Object.prototype.hasOwnProperty.call(r.players,t))return 'player';fail(403,'Sesión no reconocida. Vuelve a entrar a la sala.')}
function qAt(r){const q=questions[r.questionIds[r.index]]||null;if(q&&r.mode==='short'&&q.type==='match')return {...q,pairs:q.pairs.slice(0,3)};return q}
function correct(q,v){if(!q||v===undefined||v===null)return false;
 if(q.type==='tf')return typeof v==='boolean'&&q.answer===v;
 if(q.type==='one')return Number.isInteger(v)&&q.answer===v;
 if(q.type==='many')return Array.isArray(v)&&v.length===q.answer.length&&new Set(v).size===v.length&&v.every(x=>Number.isInteger(x)&&q.answer.includes(x));
 if(q.type==='match')return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===q.pairs.length&&q.pairs.every(([l,r])=>v[l]===r);
 return false}
function valid(q,a){if(q.type==='tf')return typeof a==='boolean';
 if(q.type==='one')return Number.isInteger(a)&&a>=0&&a<q.options.length;
 if(q.type==='many')return Array.isArray(a)&&a.length<=q.options.length&&new Set(a).size===a.length&&a.every(x=>Number.isInteger(x)&&x>=0&&x<q.options.length);
 if(q.type==='match')return a&&typeof a==='object'&&!Array.isArray(a)&&Object.keys(a).length===q.pairs.length&&q.pairs.every(([l])=>typeof a[l]==='string'&&q.pairs.some(([,r])=>r===a[l]))&&new Set(Object.values(a)).size===q.pairs.length;
 return false}
function publicQ(q){if(!q)return null;return {id:q.id,scene:q.scene,type:q.type,q:q.q,...(q.options?{options:q.options}:{}),...(q.pairs?{pairs:{left:q.pairs.map(p=>p[0]),right:q.pairs.map(p=>p[1]).reverse()}}:{})}}
function rank(r){return Object.values(r.players).map(p=>({name:p.name,score:p.score,correct:p.correct})).sort((a,b)=>b.score-a.score||b.correct-a.correct||a.name.localeCompare(b.name))}
function view(r,t){const role=getRole(r,t),q=qAt(r),reveal=r.phase==='reveal'||r.phase==='finished',me=r.players[t],own=r.answers[t];return {
 role,code:r.code,mode:r.mode,phase:r.phase,questionIndex:r.index,total:r.questionIds.length,answered:Object.keys(r.answers).length,playerCount:Object.keys(r.players).length,deadline:r.deadline,created:r.created,
 scene:q?scenes[q.scene]:scenes[4],sceneIndex:q?q.scene:4,q:publicQ(q),submitted:Object.prototype.hasOwnProperty.call(r.answers,t),
 ownCorrect:reveal&&role==='player'?correct(q,own):undefined,solution:reveal&&q?{answer:q.answer??q.pairs.map(p=>p.slice()),why:q.why}:null,
 clue:reveal&&q?scenes[q.scene].evidence:null,players:rank(r),me:me?{name:me.name,score:me.score,correct:me.correct}:null,
 progress:[...new Set(r.questionIds.slice(0,r.index+(reveal?1:0)).map(i=>questions[i].scene))]
}}
function startQuestion(r,stamp){r.phase='playing';r.answers={};r.deadline=stamp+(r.mode==='short'?35000:45000)}
function doReveal(r,stamp){if(r.phase!=='playing')return;const q=qAt(r);for(const [t,a] of Object.entries(r.answers))if(r.players[t]&&correct(q,a)){r.players[t].score+=100;r.players[t].correct+=1}r.phase='reveal';r.deadline=stamp+(r.mode==='short'?15000:18000)}
function next(r,stamp){if(r.phase!=='reveal')return;r.index++;if(r.index>=r.questionIds.length){r.phase='finished';r.deadline=null}else startQuestion(r,stamp)}
function settle(r,now){let changed=false,loops=0;while(r.deadline&&now>=r.deadline&&loops++<45){const at=r.deadline;if(r.phase==='playing'){doReveal(r,at);changed=true}else if(r.phase==='reveal'){next(r,at);changed=true}else break}return changed}
function modify(r,action,body,now){const role=getRole(r,body.token);
 if(action==='start'){
  if(role!=='host'||r.phase!=='lobby')fail(400,'Solo el moderador puede iniciar el juego desde la sala de espera.');
  if(!Object.keys(r.players).length)fail(400,'Primero debe entrar al menos un detective.');
  r.mode=body.mode==='full'?'full':'short';r.questionIds=(r.mode==='full'?ALL:SHORT).slice();r.index=0;r.started=now;
  for(const p of Object.values(r.players)){p.score=0;p.correct=0}startQuestion(r,now);return;
 }
 if(action==='answer'){
  if(role!=='player'||r.phase!=='playing'||now>=r.deadline)fail(400,'El tiempo de esta prueba ya terminó.');
  if(Object.prototype.hasOwnProperty.call(r.answers,body.token))fail(400,'Tu respuesta ya fue entregada.');
  const q=qAt(r);if(!valid(q,body.answer))fail(400,'La respuesta está incompleta o no tiene formato válido.');
  r.answers[body.token]=body.answer;return;
 }
 if(role!=='host')fail(403,'Acción reservada al jefe de investigación.');
 if(action==='reveal'){if(r.phase!=='playing')fail(400,'No hay una prueba abierta.');doReveal(r,now);return}
 if(action==='next'){if(r.phase!=='reveal')fail(400,'Primero debes revelar la respuesta.');next(r,now);return}
 if(action==='reset'){r.phase='lobby';r.index=0;r.deadline=null;r.answers={};r.started=null;for(const p of Object.values(r.players)){p.score=0;p.correct=0}return}
 fail(400,'Acción desconocida.');
}
async function getRoom(code){const c=String(code||'').trim().toUpperCase();if(!/^[A-Z2-9]{6}$/.test(c))fail(400,'Código de sala inválido.');const r=await store.read(c);if(!r)fail(404,'La sala no existe o ya expiró.');return r}
async function tx(code,change){for(let tries=0;tries<10;tries++){
  const r=await getRoom(code);const prev=r.version;const value=await change(r);r.version=prev+1;
  if(await store.writeCAS(r.code,prev,r)===1)return {r,value};
 }fail(503,'La sala está muy ocupada. Vuelve a intentar.');
}
async function handler(req,res){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Solo solicitudes POST.'});
 try{
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(JSON.stringify(body).length>12000)fail(413,'Solicitud demasiado grande.');
  const action=body.action,now=Date.now();
  if(action==='create'){
   for(let i=0;i<12;i++){
    const code=newCode(),r={code,host:token(),players:{},answers:{},created:now,started:null,phase:'lobby',mode:'short',questionIds:SHORT.slice(),index:0,deadline:null,version:1};
    if(await store.create(r))return res.status(200).json({ok:true,code,token:r.host,state:view(r,r.host)});
   }fail(503,'No se pudo generar un código único de sala.');
  }
  if(action==='join'){
   const r=await getRoom(body.code);let t=typeof body.token==='string'?body.token:'';
   if(Object.prototype.hasOwnProperty.call(r.players,t))return res.status(200).json({ok:true,code:r.code,token:t,state:view(r,t)});
   if(r.phase!=='lobby')fail(400,'La investigación ya comenzó.');
   const name=String(body.name||'').trim().replace(/[<>]/g,'').slice(0,28);
   if(name.length<2)fail(400,'Escribe un nombre o alias de al menos 2 letras.');
   t=token();const result=await tx(r.code,r2=>{
    if(r2.phase!=='lobby')fail(400,'La investigación ya comenzó.');
    if(Object.keys(r2.players).length>=MAX_PLAYERS)fail(400,'La sala ya alcanzó 80 participantes.');
    r2.players[t]={name,score:0,correct:0};
   });
   return res.status(200).json({ok:true,code:r.code,token:t,state:view(result.r,t)});
  }
  const r=await getRoom(body.code);
  getRole(r,body.token);
  if(action==='state'){
   if(!settle(r,now))return res.status(200).json({ok:true,state:view(r,body.token)});
   const result=await tx(r.code,r2=>{settle(r2,now)});
   return res.status(200).json({ok:true,state:view(result.r,body.token)});
  }
  const result=await tx(r.code,r2=>{settle(r2,now);modify(r2,action,body,now)});
  return res.status(200).json({ok:true,state:view(result.r,body.token)});
 }catch(e){
  const status=e.status||(/Falta conectar/.test(e.message)?503:500);
  return res.status(status).json({ok:false,error:status===500?'No se pudo completar la operación. Revisa la configuración o la conexión.':e.message});
 }
}
module.exports=handler;
module.exports._testing={correct,settle,view,SHORT,modify};
