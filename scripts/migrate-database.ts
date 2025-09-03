/**
 * Database migration script to add missing columns
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const runMigration = async () => {
  try {
    console.log('🔄 Starting database migration...');

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const connection = neon(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log('📊 Connected to database');

    // Add missing columns to sms_config table
    console.log('🔧 Adding missing columns to sms_config table...');

    try {
      // Add api_key column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE sms_config 
        ADD COLUMN IF NOT EXISTS api_key TEXT;
      `);
      console.log('✅ Added api_key column');
    } catch (error) {
      console.log('⚠️ api_key column may already exist');
    }

    try {
      // Add api_secret column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE sms_config 
        ADD COLUMN IF NOT EXISTS api_secret TEXT;
      `);
      console.log('✅ Added api_secret column');
    } catch (error) {
      console.log('⚠️ api_secret column may already exist');
    }

    try {
      // Ensure webhook_url column exists
      await db.execute(sql`
        ALTER TABLE sms_config 
        ADD COLUMN IF NOT EXISTS webhook_url TEXT;
      `);
      console.log('✅ Added webhook_url column');
    } catch (error) {
      console.log('⚠️ webhook_url column may already exist');
    }

    // Check if crm_messages table has required columns
    console.log('🔧 Checking crm_messages table...');

    try {
      await db.execute(sql`
        ALTER TABLE crm_messages 
        ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'email';
      `);
      console.log('✅ Added message_type column');
    } catch (error) {
      console.log('⚠️ message_type column may already exist');
    }

    try {
      await db.execute(sql`
        ALTER TABLE crm_messages 
        ADD COLUMN IF NOT EXISTS phone_number TEXT;
      `);
      console.log('✅ Added phone_number column');
    } catch (error) {
      console.log('⚠️ phone_number column may already exist');
    }

    console.log('🎉 Database migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
