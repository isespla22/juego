// Vercel Function oficial (Web Handler). Mantiene la clave de Redis en el servidor.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const handler=require('../lib/game-handler.cjs');
export async function POST(request){
 let body;
 try{body=await request.json()}catch{return Response.json({ok:false,error:'El cuerpo JSON no es válido.'},{status:400})}
 let code=200,data={ok:false,error:'Sin respuesta'},headers=new Headers();
 const res={
  setHeader(name,value){headers.set(name,value);return this},
  status(n){code=n;return this},
  json(obj){data=obj;return this}
 };
 await handler({method:'POST',body},res);
 return Response.json(data,{status:code,headers});
}
export async function GET(){return Response.json({ok:false,error:'Método no permitido.'},{status:405})}
