const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const { cleanDemoData, initSystemData } = require('../seed');

const run = async () => {
  try {
    console.log('[DB Clean] Connecting to database...');
    await connectDB();
    console.log('[DB Clean] Purging demo products and test orders...');
    await cleanDemoData();
    console.log('[DB Clean] Ensuring system categories and admin exist...');
    await initSystemData();
    console.log('[DB Clean] Database is now clean and production-ready.');
    process.exit(0);
  } catch (err) {
    console.error('[DB Clean] Error cleaning database:', err);
    process.exit(1);
  }
};

run();
