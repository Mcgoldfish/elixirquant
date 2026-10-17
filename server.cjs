const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const allowed = new Set(['favicon.svg','index.html','style.css','app.js','intro.js','model.js','rules.js','charts.js','historical-data.json','vendor/echarts.min.js']);
http.createServer((req,res) => {
 const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
 if (!allowed.has(file)) { res.writeHead(404); res.end(); return; }
 fs.readFile(path.join(__dirname,file==='vendor/echarts.min.js'?'node_modules/echarts/dist/echarts.min.js':file),(err,data) => {if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.json')?'application/json':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
}).listen(5182,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:5182'));
