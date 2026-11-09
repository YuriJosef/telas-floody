const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const globals = new Set(['React', 'Promise', 'Error', 'Set', 'Map', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Math', 'Date', 'JSON', 'URL', 'AbortController', 'fetch', 'console', 'process', 'globalThis', 'navigator', 'document', 'window', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'parseFloat', 'encodeURIComponent', 'undefined', 'module']);
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? files(path.join(dir,item.name)) : item.name.endsWith('.js') ? [path.join(dir,item.name)] : []); }
let failures = 0;
for (const file of ['App.js','index.js',...files('src')]) {
 const ast = parser.parse(fs.readFileSync(file,'utf8'), { sourceType: 'module', plugins: ['jsx'] });
 traverse(ast, {
  ReferencedIdentifier(p) { const name=p.node.name; if (!p.scope.hasBinding(name) && !globals.has(name)) { console.error(`${file}:${p.node.loc.start.line}: unknown binding ${name}`); failures++; } },
  ImportDeclaration(p) {
   const name = p.node.source.value;
   if (!name.startsWith('.')) return;
   for (const platform of ['web','native']) {
    if (/\.(web|native)\.js$/.test(file) && !file.endsWith(`.${platform}.js`)) continue;
    const base=path.resolve(path.dirname(file),name);
    if (![base,base+`.${platform}.js`,base+'.js',path.join(base,'index.js')].some(p=>fs.existsSync(p))) { console.error(`${file}: unresolved ${name} for ${platform}`); failures++; }
   }
  }
 });
}
if (failures) process.exitCode=1; else console.log('All source bindings and platform imports verified.');
