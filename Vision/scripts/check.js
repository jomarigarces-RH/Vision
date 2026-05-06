require('dotenv').config({ path: '.env.local' });
const { ConvexClient } = require('convex/browser');

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function check() {
  const result = await client.query('observations:list');
  console.log(`Found ${result.length} observations in the database.`);
  if (result.length > 0) {
    console.log("Sample:", result[0]);
  }
  process.exit(0);
}

check();
