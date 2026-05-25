
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function fixData() {
  console.log('--- Cleaning Up ops_metrics for 2026-05-24/25 ---');

  // We will reset Abandoned to a reasonable number (based on 5% of Inbound as a placeholder)
  // Or just reset it to 0 so it can start fresh today.
  
  const targets = [
    { date: '2026-05-24', dept: 'Support Operations', chan: 'Chat', newIn: 191, newAb: 10 },
    { date: '2026-05-24', dept: 'Support Operations', chan: 'Voice', newIn: 43, newAb: 5 },
    { date: '2026-05-24', dept: 'Sales Operations', chan: 'Chat', newIn: 0, newAb: 0 },
    { date: '2026-05-24', dept: 'Sales Operations', chan: 'Voice', newIn: 0, newAb: 0 },
    { date: '2026-05-24', dept: 'Service Recovery', chan: 'Voice', newIn: 0, newAb: 0 },
    { date: '2026-05-25', dept: 'Support Operations', chan: 'Chat', newIn: 12, newAb: 1 },
    { date: '2026-05-25', dept: 'Support Operations', chan: 'Voice', newIn: 0, newAb: 0 },
    { date: '2026-05-25', dept: 'Sales Operations', chan: 'Chat', newIn: 0, newAb: 0 },
    { date: '2026-05-25', dept: 'Sales Operations', chan: 'Voice', newIn: 0, newAb: 0 },
    { date: '2026-05-25', dept: 'Service Recovery', chan: 'Voice', newIn: 0, newAb: 0 },
  ];

  for (const t of targets) {
    const { error } = await supabase
      .from('ops_metrics')
      .update({
        inbound_count: t.newIn,
        abandoned_count: t.newAb,
        updated_at: new Date().toISOString()
      })
      .match({ department: t.dept, channel: t.chan, date: t.date });

    if (error) {
      console.error(`Error updating ${t.dept} ${t.chan} on ${t.date}:`, error.message);
    } else {
      console.log(`✅ Fixed ${t.dept} ${t.chan} on ${t.date}`);
    }
  }

  console.log('--- Done ---');
}

fixData();
