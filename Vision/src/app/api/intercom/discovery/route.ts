import { NextResponse } from 'next/server';
const INTERCOM_TOKEN = process.env.INTERCOM_API_TOKEN;

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);
    const startTs = Math.floor(today.getTime() / 1000);
    const counts: Record<string, number> = {};
    let page = 1;

    // Scan all pages to find the real volume
    while (page <= 20) {
      const res = await fetch(`https://api.intercom.io/conversations/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${INTERCOM_TOKEN}`, 'Accept': 'application/json', 'Intercom-Version': '2.2', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: { field: 'created_at', operator: '>', value: startTs },
          pagination: { page, per_page: 150 }
        })
      });
      const data = await res.json();
      if (!data.conversations?.length) break;
      data.conversations.forEach((c: any) => {
        const id = c.team_assignee_id || 'unassigned';
        counts[id] = (counts[id] || 0) + 1;
      });
      page++;
    }

    console.log('--- DEEP DISCOVERY ---');
    console.log(JSON.stringify(counts, null, 2));
    return NextResponse.json(counts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
