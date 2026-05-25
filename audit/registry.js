/* ИСЦ registry generator — mirrors the in-app cardData() binding logic exactly,
   so the report numbers match what the cockpit renders. Read-only on data/. */
const fs=require('fs');
const dir=__dirname+'/../data';
const CK=JSON.parse(fs.readFileSync(dir+'/cockpit.json','utf8'));
const ST=JSON.parse(fs.readFileSync(dir+'/scheme-top.json','utf8'));

// --- normalizeNets (mirror of app) ---
let netTouched=0;
CK.nodes.forEach(n=>{ if(n.section==='nets'){ const m=String(n.id).match(/^s\d+-(electro|heat|water|gas|sewer|telecom)\b/); if(m){n.section='nets-'+m[1];netTouched++;} }});

const RENDER=new Set(['process','result','auxiliary','alternative','condition','reference','external_endpoint']);
const NODES=CK.nodes.filter(n=>n.stage!=null&&n.section!=null&&RENDER.has(n.type));
const ids=new Set(NODES.map(n=>n.id));
const FLOWS=CK.flows.filter(f=>ids.has(f.s)&&ids.has(f.t));

// indices (mirror buildIndices)
const im={},dr={},dg={};
CK.rel.implements.forEach(p=>{(im[p[0]]=im[p[0]]||[]).push(p[1]);});
CK.rel.docReq.forEach(p=>{(dr[p[1]]=dr[p[1]]||[]).push(p[0]);});
CK.rel.docGov.forEach(p=>{(dg[p[0]]=dg[p[0]]||[]).push(p[1]);});
const ds={}; CK.rel.docStage.forEach(p=>{(ds[p[1]]=ds[p[1]]||[]).push(p[0]);});
const succ={},pred={};
FLOWS.forEach(f=>{(succ[f.s]=succ[f.s]||[]).push(f);(pred[f.t]=pred[f.t]||[]).push(f);});
const codeSet=new Set((CK.processCodes||[]).map(p=>p.code));
const npaFromDocs=docs=>{const s=new Set();docs.forEach(d=>(dg[d]||[]).forEach(x=>s.add(x)));return[...s];};

function cardData(n){
  const codes=[...new Set([...(im[n.id]||[]),...(n.code?[n.code]:[])])];
  const directDocs=[...new Set([].concat(...codes.map(c=>dr[c]||[])))];
  const directNpa=npaFromDocs(directDocs);
  const directSet=new Set(directDocs);
  const fallbackDocs=(ds[n.stage]||[]).filter(d=>!directSet.has(d));
  const fallbackNpa=npaFromDocs(fallbackDocs).filter(x=>!directNpa.includes(x));
  const inE=(pred[n.id]||[]).length,outE=(succ[n.id]||[]).length;
  const method=directDocs.length?'direct_code':(fallbackDocs.length?'stage_fallback':'unmapped');
  return {codes,directDocs,directNpa,fallbackDocs,fallbackNpa,inE,outE,method};
}

const rows=NODES.map(n=>{const cd=cardData(n);return{id:n.id,title:n.title,stage:n.stage,section:n.section,type:n.type,
  inE:cd.inE,outE:cd.outE,dd:cd.directDocs.length,fd:cd.fallbackDocs.length,dn:cd.directNpa.length,fn:cd.fallbackNpa.length,method:cd.method};});

const M={
  cardsTotal:rows.length,
  withDirectDocs:rows.filter(r=>r.dd>0).length,
  withFallbackDocsOnly:rows.filter(r=>r.dd===0&&r.fd>0).length,
  withNoDocs:rows.filter(r=>r.dd===0&&r.fd===0).length,
  withDirectNpa:rows.filter(r=>r.dn>0).length,
  withFallbackNpaOnly:rows.filter(r=>r.dn===0&&r.fn>0).length,
  withNoNpa:rows.filter(r=>r.dn===0&&r.fn===0).length,
  isolated:rows.filter(r=>r.inE===0&&r.outE===0).length,
  atlasEdgesTotal:CK.flows.length,
  atlasEdgesRendered:FLOWS.length,
  atlasEdgesSkipped:CK.flows.length-FLOWS.length,
  sourceEdgesTotal:(ST.edges||[]).length,
  sourceNodes:(ST.nodes||[]).length,
  netSectionsSplit:netTouched
};
// source-edge render coverage (mirror renderScheme: skip if endpoint node missing)
const snIds=new Set((ST.nodes||[]).map(n=>n.id));
const srcSkipped=(ST.edges||[]).filter(e=>!snIds.has(e.s)||!snIds.has(e.t));
M.sourceEdgesRendered=M.sourceEdgesTotal-srcSkipped.length;
M.sourceEdgesSkipped=srcSkipped.length;
// per-stage
const byStage={}; rows.forEach(r=>{const k=r.stage;(byStage[k]=byStage[k]||{n:0,dd:0}).n++; if(r.dd>0)byStage[k].dd++;});

console.log('=== ИСЦ REGISTRY REPORT ===');
console.log(JSON.stringify(M,null,2));
console.log('per-stage cards/with-direct-docs:',JSON.stringify(byStage));
console.log('codes-with-no-docReq:',[...codeSet].filter(c=>!(dr[c]&&dr[c].length)).sort().join(', '));
console.log('net sections:',[...new Set(rows.filter(r=>/^nets/.test(r.section)).map(r=>r.section))].sort().join(', '));
console.log('src edges skipped sample:',JSON.stringify(srcSkipped.slice(0,10)));
fs.writeFileSync(__dirname+'/registry-report.json',JSON.stringify({metrics:M,byStage,rows},null,2));
console.log('wrote audit/registry-report.json ('+rows.length+' rows)');
