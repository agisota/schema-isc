const fs = require('fs');
const dir = __dirname + '/../data';
const ck = JSON.parse(fs.readFileSync(dir + '/cockpit.json', 'utf8'));
const st = JSON.parse(fs.readFileSync(dir + '/scheme-top.json', 'utf8'));

function keys(o){ return o && typeof o==='object' ? Object.keys(o) : typeof o; }
console.log('=== cockpit.json top keys ===');
for (const k of Object.keys(ck)) {
  const v = ck[k];
  if (Array.isArray(v)) console.log(`  ${k}: array[${v.length}]`);
  else if (v && typeof v==='object') console.log(`  ${k}: obj{${Object.keys(v).slice(0,14).join(',')}}`);
  else console.log(`  ${k}: ${JSON.stringify(v)}`);
}

console.log('\n=== nodes ===');
const nodes = ck.nodes || [];
console.log('count', nodes.length);
console.log('node[0]', JSON.stringify(nodes[0]));
const fields = {};
for (const n of nodes) for (const f of Object.keys(n)) fields[f]=(fields[f]||0)+1;
console.log('field coverage:', JSON.stringify(fields));
const types={}; for(const n of nodes){const t=n.type||'(none)';types[t]=(types[t]||0)+1;}
console.log('types:', JSON.stringify(types));
const vis = nodes.filter(n=>n.stage!=null && n.section!=null);
console.log('visible:', vis.length);
const secByStage={};
for(const n of vis){const k=n.stage+':'+n.section;secByStage[k]=(secByStage[k]||0)+1;}
console.log('sections by stage:', JSON.stringify(secByStage));

console.log('\n=== flows ===');
const flows = ck.flows || [];
console.log('count', flows.length, 'sample', JSON.stringify(flows.slice(0,3)));
const fkeys={}; for(const f of flows) for(const k of Object.keys(f)) fkeys[k]=(fkeys[k]||0)+1;
console.log('flow fields', JSON.stringify(fkeys));

console.log('\n=== rel ===');
if (ck.rel) for (const k of Object.keys(ck.rel)){const v=ck.rel[k];console.log(`  rel.${k}: ${Array.isArray(v)?'array['+v.length+'] '+JSON.stringify(v[0]):JSON.stringify(keys(v))}`);}

console.log('\n=== documents ===');
const docs = ck.documents||[];
console.log('count', docs.length, 'doc[0]', JSON.stringify(docs[0]));
const dfields={}; for(const d of docs) for(const f of Object.keys(d)) dfields[f]=(dfields[f]||0)+1;
console.log('doc fields:', JSON.stringify(dfields));

console.log('\n=== npa ===');
const npa = ck.npa||ck.npaCatalog||ck.acts||[];
console.log('npa count', npa.length, 'npa[0]', JSON.stringify(npa[0]));

console.log('\n=== stages meta ===');
console.log('stages[0]', JSON.stringify((ck.stages||[])[0]));

console.log('\n=== processCodes ===');
console.log(JSON.stringify(ck.processCodes).slice(0,500));

console.log('\n=== counts ===');
console.log(JSON.stringify(ck.counts||ck.meta||{}));

console.log('\n=== scheme-top.json ===');
for (const k of Object.keys(st)){const v=st[k];console.log(`  ${k}: ${Array.isArray(v)?'array['+v.length+']':JSON.stringify(keys(v))}`);}
if (st.nodes) console.log('st.node[0]', JSON.stringify(st.nodes[0]));
if (st.edges){console.log('st.edgeCount', st.edges.length, 'st.edge[0..2]', JSON.stringify((st.edges||[]).slice(0,3)));
  const ekeys={}; for(const e of st.edges) for(const k of Object.keys(e)) ekeys[k]=(ekeys[k]||0)+1;
  console.log('st.edge fields', JSON.stringify(ekeys));}
