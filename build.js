import {mkdirSync, copyFileSync} from 'node:fs';
mkdirSync('dist', {recursive: true});
for (const file of ['index.html', 'style.css', 'app.js', 'model.js']) copyFileSync(file, `dist/${file}`);
console.log('Static public edition built in dist/');
