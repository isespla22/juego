'use strict';
process.env.LOCAL_DEMO='1';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const handler=require('./lib/game-handler.cjs');
const types={'/':'text/html; charset=utf-8','/style.css':'text/css; charset=utf-8','/app.js':'application/javascript; charset=utf-8'};
const files={'/':'index.html','/style.css':'style.css','/app.js':'app.js'};
const srv=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/game'){
   res.status=(n)=>{res.statusCode=n;return res};res.json=(d)=>res.end(JSON.stringify(d));
   let content='';for await(const chunk of req){content+=chunk;if(content.length>12000)break}
   try{req.body=JSON.parse(content||'{}')}catch{req.body={}}
   await handler(req,res);return;
  }
  const file=files[url.pathname];if(!file){res.writeHead(404);res.end('No encontrado');return}
  res.writeHead(200,{'Content-Type':types[url.pathname],'Cache-Control':'no-store'});fs.createReadStream(path.join(__dirname,file)).pipe(res);
});
if(require.main===module){const port=Number(process.env.PORT||3000);srv.listen(port,'0.0.0.0',()=>console.log(`Juego local en http://localhost:${port}`))}
module.exports=srv;
