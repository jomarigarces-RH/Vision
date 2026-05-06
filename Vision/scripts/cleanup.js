require('dotenv').config({ path: '.env.local' });
const { ConvexClient } = require('convex/browser');

const client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function cleanup() {
  const result = await client.query('observations:list');
  const badObs = result.filter(obs => !obs.agentName || obs.agentName.trim() === "");
  console.log(`Found ${badObs.length} bad observations. Deleting...`);
  
  if (badObs.length > 0) {
    const ids = badObs.map(obs => obs._id);
    // Since deleteMany might not be exposed as a public action we can call from client without a mutation wrapper in our check.js, 
    // wait, I can just use the deleteMany mutation I added.
    await client.mutation('observations:deleteMany', { ids });
    console.log("Deleted!");
  } else {
    console.log("Nothing to delete.");
  }
  process.exit(0);
}

cleanup();
