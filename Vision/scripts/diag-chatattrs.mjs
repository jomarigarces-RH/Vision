import { config } from 'dotenv';
config({ path: '.env.local' });
const TOKEN = process.env.INTERCOM_API_TOKEN;
const H = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', 'Intercom-Version': 'Unstable' };
const log = (...a) => console.error(...a);
const ds = (await (await fetch('https://api.intercom.io/export/reporting_data/get_datasets', { headers: H })).json()).data.find((d) => d.id === 'conversation');
log('conversation dataset — timestamp & teammate attrs:');
ds.attributes.filter((a) => /^timestamp\.|teammate|assign|channel|state/i.test(a.qualified_id)).forEach((a) => log(`  ${(a.qualified_id || '').padEnd(52)} ${a.name || ''}`));
