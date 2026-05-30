import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const log = (...a) => console.error(...a);
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Intercom-Version': '2.11' };
// /me -> app id_code (the workspace id used in inbox URLs)
const me = await (await fetch('https://api.intercom.io/me', { headers: H })).json();
log('me.app:', JSON.stringify(me?.app));
// grab one conversation's admin_url via the Unstable export attr to confirm the URL shape
const HU = { ...H, 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function parseCSV(t){const rows=[];let i=0,f='',row=[],q=false;const pf=()=>{row.push(f);f='';},pr=()=>{rows.push(row);row=[];};while(i<t.length){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i+=2;continue;}q=false;i++;continue;}f+=c;i++;continue;}if(c==='"'){q=true;i++;continue;}if(c===','){pf();i++;continue;}if(c==='\r'){i++;continue;}if(c==='\n'){pf();pr();i++;continue;}f+=c;i++;}if(f.length||row.length){pf();pr();}const h=rows.shift();return rows.filter(r=>r.length>1).map(r=>{const o={};h.forEach((x,idx)=>o[x]=r[idx]);return o;});}
const now=Math.floor(Date.now()/1000);
const enq=await (await fetch('https://api.intercom.io/export/reporting_data/enqueue',{method:'POST',headers:HU,body:JSON.stringify({dataset_id:'conversation',attribute_ids:['standard.conversation_id','conversation.admin_url'],start_time:now-86400,end_time:now})})).json();
let url=null;for(let k=0;k<30;k++){await sleep(2500);const s=await (await fetch(`https://api.intercom.io/export/reporting_data/${enq.job_identifier}`,{headers:HU})).json();if(s.status?.startsWith('complete')){url=s.download_url;break;}}
if(url){const rows=parseCSV(await (await fetch(url,{headers:{Authorization:`Bearer ${TOKEN}`,Accept:'application/octet-stream','Intercom-Version':'Unstable'}})).text());log('sample conversation_id + admin_url:');rows.slice(0,3).forEach(r=>log('  id='+r.conversation_id+'  url='+r.admin_url));}
