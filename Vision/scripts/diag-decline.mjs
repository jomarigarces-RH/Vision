import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const log = (...a) => console.error(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
function parseCSV(t){const rows=[];let i=0,f='',row=[],q=false;const pf=()=>{row.push(f);f='';},pr=()=>{rows.push(row);row=[];};while(i<t.length){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i+=2;continue;}q=false;i++;continue;}f+=c;i++;continue;}if(c==='"'){q=true;i++;continue;}if(c===','){pf();i++;continue;}if(c==='\r'){i++;continue;}if(c==='\n'){pf();pr();i++;continue;}f+=c;i++;}if(f.length||row.length){pf();pr();}const h=rows.shift();return rows.filter(r=>r.length>1).map(r=>{const o={};h.forEach((x,idx)=>o[x]=r[idx]);return o;});}
async function exp(dataset, attrs, start, end){
  const r=await fetch('https://api.intercom.io/export/reporting_data/enqueue',{method:'POST',headers:H,body:JSON.stringify({dataset_id:dataset,attribute_ids:attrs,start_time:start,end_time:end})});
  const j=await r.json();const id=j.job_identifier;if(!id)throw new Error('enqueue '+JSON.stringify(j).slice(0,200));
  let url=null;for(let k=0;k<40;k++){await sleep(2500);const s=await fetch(`https://api.intercom.io/export/reporting_data/${id}`,{headers:H});const sj=await s.json();if(sj.status?.startsWith('complete')){url=sj.download_url;break;}if(sj.status==='failed')throw new Error('failed');}
  const d=await fetch(url,{headers:{Authorization:`Bearer ${TOKEN}`,Accept:'application/octet-stream','Intercom-Version':'Unstable'}});
  return parseCSV(await d.text());
}
function pstRange(dateStr){const [y,m,d]=dateStr.split('-').map(Number);const off=(ms)=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date(ms));const o={};p.forEach(x=>o[x.type]=x.value);return Date.UTC(+o.year,+o.month-1,+o.day,+o.hour%24,+o.minute,+o.second)-ms;};let ms=Date.UTC(y,m-1,d);const a=off(ms);ms-=a;const b=off(ms);if(b!==a)ms+=a-b;return {start:Math.floor(ms/1000),end:Math.floor(ms/1000)+86400};}

// first, list call_teammate_stats attributes (qualified ids)
const ds=(await (await fetch('https://api.intercom.io/export/reporting_data/get_datasets',{headers:H})).json()).data.find(d=>d.id==='call_teammate_stats');
log('call_teammate_stats attrs:'); ds.attributes.filter(a=>/call|teammate|decline|miss|state|direction|conversation|terminat/i.test(a.qualified_id+(a.name||''))).forEach(a=>log(`  ${(a.qualified_id||'').padEnd(48)} ${a.name||''}`));

const { start, end } = pstRange(process.argv[2] || '2026-05-29');
const rows = await exp('call_teammate_stats', [
  'call.call_id','teammate.call_teammate_id','call.call_direction','call.call_state',
  'call.call_teammate_declined_call_count','call.call_teammate_missed_call_count',
  'call.call_terminating_party_type','timestamp.call_initiated_at',
], start, end);
log(`\nrows: ${rows.length}`);
log('sample row:', JSON.stringify(rows[0]));
const declined = rows.filter(r=>Number(r.call_teammate_declined_call_count)>0);
const missed = rows.filter(r=>Number(r.call_teammate_missed_call_count)>0);
log(`\nrows with teammate DECLINED>0: ${declined.length}`);
log(`rows with teammate MISSED>0: ${missed.length}`);
log('\nsample declined (agent | call_id | when | state):');
declined.slice(0,6).forEach(r=>log(`  ${String(r.call_teammate_id).padEnd(22)} call=${r.call_id} at=${r.call_initiated_at} state=${r.call_state} term=${r.call_terminating_party_type}`));
log('\nsample missed:');
missed.slice(0,6).forEach(r=>log(`  ${String(r.call_teammate_id).padEnd(22)} call=${r.call_id} at=${r.call_initiated_at} state=${r.call_state}`));
// top offenders
const byAgent={}; rows.forEach(r=>{const a=r.call_teammate_id||'?';byAgent[a]=byAgent[a]||{d:0,m:0};byAgent[a].d+=Number(r.call_teammate_declined_call_count)||0;byAgent[a].m+=Number(r.call_teammate_missed_call_count)||0;});
log('\ntop decline/miss agents:');
Object.entries(byAgent).sort((a,b)=>(b[1].d+b[1].m)-(a[1].d+a[1].m)).slice(0,8).forEach(([a,v])=>log(`  ${a.padEnd(22)} declined=${v.d} missed=${v.m}`));
