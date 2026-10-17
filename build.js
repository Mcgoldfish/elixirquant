import {mkdirSync, copyFileSync} from 'node:fs';
mkdirSync('dist', {recursive: true});
for (const file of ['index.html', 'style.css', 'app.js', 'model.js', 'rules.js','charts.js','historical-data.json']) copyFileSync(file, `dist/${file}`);
mkdirSync('dist/vendor',{recursive:true});
for(const [from,to] of [['dist/echarts.min.js','echarts.min.js'],['LICENSE','LICENSE'],['NOTICE','NOTICE']])copyFileSync(`node_modules/echarts/${from}`,`dist/vendor/${to}`);
console.log('Static public edition built in dist/');
