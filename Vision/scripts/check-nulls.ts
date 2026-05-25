
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function checkNulls() {
  const { data, error } = await supabase
    .from('ops_metrics')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total rows:', data.length);
  console.log('NULL inbound_count:', data.filter(r => r.inbound_count === null).length);
  console.log('NULL abandoned_count:', data.filter(r => r.abandoned_count === null).length);
  
  if (data.length > 0) {
    console.log('Last row details:', JSON.stringify(data[data.length-1], null, 2));
  }
}

checkNulls();
