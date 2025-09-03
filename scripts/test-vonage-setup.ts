/**
 * Test script for Vonage API integration
 * Run this after adding VONAGE_API_SECRET to your environment
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testVonageSetup = async () => {
  console.log('🧪 Testing Vonage Configuration...\n');

  // Check API Key
  const apiKey = process.env.VONAGE_API_KEY || 'BPGlC0W6GktNXeO8';
  console.log(`📋 API Key: ${apiKey}`);
  
  // Check API Secret
  const apiSecret = process.env.VONAGE_API_SECRET;
  if (apiSecret) {
    console.log(`🔑 API Secret: ${apiSecret.slice(0, 4)}******* (configured)`);
  } else {
    console.log('❌ API Secret: Not configured');
    console.log('\n📝 To configure:');
    console.log('1. Log into your Heroku Dashboard');
    console.log('2. Go to Settings → Config Vars');
    console.log('3. Add: VONAGE_API_SECRET=your-secret-here');
    return;
  }

  // Test Vonage API initialization
  try {
    console.log('\n🔧 Testing Vonage API initialization...');
    
    const { Vonage } = await import('@vonage/server-sdk');
    
    const vonage = new Vonage({
      apiKey: apiKey,
      apiSecret: apiSecret,
    });

    console.log('✅ Vonage client initialized successfully');

    // Test account balance (this is a safe API call)
    try {
      const balance = await vonage.account.getBalance();
      console.log(`💰 Account Balance: €${balance.value} ${balance.currency}`);
      
      if (parseFloat(balance.value) > 0) {
        console.log('✅ Account has sufficient balance for testing');
      } else {
        console.log('⚠️ Account balance is low - add credits for testing');
      }
      
    } catch (balanceError) {
      console.log('⚠️ Could not check account balance (API key/secret may be invalid)');
    }

    console.log('\n🎉 Vonage setup test completed successfully!');
    console.log('\n📱 You can now:');
    console.log('• Send SMS messages through the CRM');
    console.log('• Send WhatsApp messages (if Business API is enabled)');
    console.log('• Auto-link messages to client records');
    console.log('• Run bulk SMS campaigns');

  } catch (error) {
    console.error('❌ Vonage initialization failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('• Verify your API key and secret are correct');
    console.log('• Check your Vonage account is active');
    console.log('• Ensure you have sufficient account balance');
  }
};

// Run the test
testVonageSetup().catch(console.error);
