// Minimal test server to isolate the issue
console.log('🔍 Testing server startup...');

process.env.NODE_ENV = 'production';
process.env.DEMO_MODE = 'false';

async function test() {
  try {
    console.log('1. Testing express import...');
    const express = await import('express');
    console.log('✅ Express imported successfully');
    
    console.log('2. Testing dotenv...');
    await import('dotenv/config');
    console.log('✅ Dotenv imported successfully');
    
    console.log('3. Testing drizzle-orm...');
    const { sql } = await import('drizzle-orm');
    console.log('✅ Drizzle imported successfully');
    
    console.log('4. Testing database connection...');
    const { db } = await import('./server/db.js');
    console.log('✅ Database imported successfully');
    
    console.log('5. Creating basic express server...');
    const app = express.default();
    const port = process.env.PORT || 3000;
    
    app.get('/', (req, res) => {
      res.json({ status: 'test-ok', timestamp: Date.now() });
    });
    
    app.get('/healthz', (req, res) => {
      res.json({ status: 'healthy', uptime: process.uptime() });
    });
    
    app.listen(port, () => {
      console.log(`✅ Test server listening on port ${port}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

test();
