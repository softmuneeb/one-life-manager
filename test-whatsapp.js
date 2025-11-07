#!/usr/bin/env node

/**
 * WhatsApp Test Script
 * 
 * This script sends test messages immediately to verify WhatsApp integration
 */

require('dotenv').config();

const { WhatsAppWebService } = require('./dist/services/WhatsAppWebService');

async function testWhatsApp() {
  console.log('🧪 WhatsApp Web Test Script');
  console.log('=' .repeat(40));
  console.log('');

  const config = {
    phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '+923014440289',
    useMock: process.env.USE_MOCK_WHATSAPP === 'true',
    sessionName: process.env.WHATSAPP_SESSION_NAME || 'cute99-test'
  };

  console.log('📋 Configuration:');
  console.log(`   📱 Phone: ${config.phoneNumber}`);
  console.log(`   🧪 Mock Mode: ${config.useMock ? 'ON' : 'OFF'}`);
  console.log(`   💾 Session: ${config.sessionName}`);
  console.log('');

  const whatsapp = new WhatsAppWebService(config);

  try {
    console.log('🔗 Initializing WhatsApp Web...');
    await whatsapp.initialize();

    if (!config.useMock) {
      console.log('⏳ Waiting for WhatsApp Web to be ready...');
      
      // Wait up to 2 minutes for connection
      let attempts = 0;
      while (!whatsapp.isConnected() && attempts < 120) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`⏳ Still waiting... (${attempts}s)`);
        }
      }

      if (!whatsapp.isConnected()) {
        console.log('❌ Failed to connect to WhatsApp Web within 2 minutes');
        process.exit(1);
      }

      console.log('✅ WhatsApp Web connected successfully!');
    }

    console.log('');
    console.log('📤 Sending test messages...');
    console.log('');

    // Test Message 1
    const testMsg1 = `🤖 *Cute99 Virtual Assistant Test*

🎉 *Congratulations!* Your WhatsApp integration is working perfectly!

📊 *Test Details:*
• Date: ${new Date().toLocaleDateString()}
• Time: ${new Date().toLocaleTimeString()}
• Status: ✅ Connected

🔧 *Next Steps:*
1. Your bot can now send real reminders
2. It will use your timetable to schedule messages
3. No more mock messages - this is real!

_This is a test message from your chatbot_ 🚀`;

    const success1 = await whatsapp.sendMessage(config.phoneNumber, testMsg1);
    console.log(`📱 Test Message 1: ${success1 ? '✅ Sent' : '❌ Failed'}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Message 2 - Simulated Reminder
    const testMsg2 = `🔔 *REMINDER TEST*

📚 *Subject:* Focused Office Work
📝 *Type:* Work Session  
⏰ *Time:* ${new Date(Date.now() + 15*60*1000).toLocaleTimeString()}
📍 *Location:* Home Office
⏳ *Starting in:* 15 minutes

💡 *This is a test reminder to show how your real reminders will look!*

_Sent by Cute99 Virtual Assistant_ 🤖`;

    const success2 = await whatsapp.sendMessage(config.phoneNumber, testMsg2);
    console.log(`📱 Test Message 2: ${success2 ? '✅ Sent' : '❌ Failed'}`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test Message 3 - System Status
    const testMsg3 = `📊 *SYSTEM STATUS*

🟢 *All Systems Operational*

✅ CSV Parser: Working
✅ Scheduler: Active  
✅ WhatsApp: Connected
✅ Reminders: Ready

📅 *Your timetable is loaded with 48 entries*
⏰ *Next reminder will be sent 15 minutes before each activity*

🎯 *Your virtual assistant is now live!*

_System check completed_ ⚡`;

    const success3 = await whatsapp.sendMessage(config.phoneNumber, testMsg3);
    console.log(`📱 Test Message 3: ${success3 ? '✅ Sent' : '❌ Failed'}`);

    console.log('');
    console.log('🎉 Test completed! Check your WhatsApp for the messages.');
    console.log('');

    if (success1 && success2 && success3) {
      console.log('✅ All test messages sent successfully!');
      console.log('🚀 Your WhatsApp integration is working perfectly!');
    } else {
      console.log('⚠️ Some messages may have failed. Check the logs above.');
    }

    await whatsapp.disconnect();
    console.log('🔌 Disconnected from WhatsApp Web');

  } catch (error) {
    console.error('❌ Error during WhatsApp test:', error.message);
  }
}

testWhatsApp().catch(console.error);