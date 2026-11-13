const { connectDb, query, getActiveEngine } = require('./db');
const { config, loadSsmParameters } = require('../config');

async function run() {
  console.log('=== AquaAlert Database Setup & Migration Script ===');
  await loadSsmParameters();
  const engine = await connectDb();
  console.log(`Database initialized successfully using engine: ${engine}`);

  const counts = await query('SELECT COUNT(*) as total FROM incidents');
  const count = counts[0] ? (counts[0].total ?? counts[0].cnt) : 0;
  console.log(`Current incident count in database: ${count}`);
  
  process.exit(0);
}

run().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

