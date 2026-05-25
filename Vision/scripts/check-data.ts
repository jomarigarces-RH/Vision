
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function checkData() {
  const { data, error } = await supabase
    .from('ops_metrics')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching metrics:', error);
    return;
  }

  console.log('Latest 10 rows in ops_metrics:');
  console.table(data.map(m => ({
    dept: m.department,
    chan: m.channel,
    date: m.date,
    in: m.inbound_count,
    pass: m.passed_count,
    ab: m.abandoned_count,
    rate: m.inbound_count > 0 ? ((m.abandoned_count / m.inbound_count) * 100).toFixed(1) + '%' : '0%'
  })));
}

checkData();
