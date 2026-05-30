import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
const log = (...a) => console.error(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ms = (t) => `${Math.round(performance.now() - t)}ms`;
function parseCSV(t){const rows=[];let i=0,f='',row=[],q=false;const pf=()=>{row.push(f);f='';},pr=()=>{rows.push(row);row=[];};while(i<t.length){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i+=2;continue;}q=false;i++;continue;}f+=c;i++;continue;}if(c==='"'){q=true;i++;continue;}if(c===','){pf();i++;continue;}if(c==='\r'){i++;continue;}if(c==='\n'){pf();pr();i++;continue;}f+=c;i++;}if(f.length||row.length){pf();pr();}const h=rows.shift();return rows.filter(r=>r.length>1).map(r=>{const o={};h.forEach((x,idx)=>o[x]=r[idx]);return o;});}
const t0 = performance.now();
const now = Math.floor(Date.now()/1000);
const start = now - 21*86400; // 21-day window to catch the open backlog
const enq = await fetch('https://api.intercom.io/export/reporting_data/enqueue',{method:'POST',headers:H,body:JSON.stringify({dataset_id:'conversation',attribute_ids:['standard.channel','standard.current_conversation_state','teammate.currently_assigned_teammate_id'],start_time:start,end_time:now})});
const ej = await enq.json(); const id = ej.job_identifier; if(!id){log('enqueue fail',JSON.stringify(ej).slice(0,200));process.exit(1);}
let url=null; for(let k=0;k<40;k++){await sleep(2500);const s=await (await fetch(`https://api.intercom.io/export/reporting_data/${id}`,{headers:H})).json();if(s.status?.startsWith('complete')){url=s.download_url;break;}if(s.status==='failed'){log('failed');process.exit(1);}}
const rows = parseCSV(await (await fetch(url,{headers:{Authorization:`Bearer ${TOKEN}`,Accept:'application/octet-stream','Intercom-Version':'Unstable'}})).text());
log(`export done ${ms(t0)} rows=${rows.length}`);
log('sample row:', JSON.stringify(rows[0]));
const open = rows.filter(r=>/email/i.test(r.channel) && /open/i.test(r.current_conversation_state));
log(`open EMAIL rows: ${open.length}`);
const byAgent={}; open.forEach(r=>{const a=r.currently_assigned_teammate_id||'(unassigned)';byAgent[a]=(byAgent[a]||0)+1;});
log('top email-load agents:');
Object.entries(byAgent).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([a,n])=>log(`  ${a.padEnd(24)} ${n}`));
