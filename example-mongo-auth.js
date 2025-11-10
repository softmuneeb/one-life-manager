#!/usr/bin/env node

/**
 * Example: Using MongoDB Authentication with WhatsApp Web
 * 
 * This example shows how to enable MongoDB-based session persistence
 * for WhatsApp Web authentication instead of local file storage.
 * 
 * Benefits of MongoDB Authentication:
 * - Works on cloud platforms like Render, Heroku, etc.
 * - Session data persists across deployments
 * - Can be shared across multiple instances
 * - Automatic cleanup of old sessions
 */

const { ConfigService } = require('./dist/config/ConfigService');
const { DatabaseService } = require('./dist/services/DatabaseService');
const { WhatsAppWebService } = require('./dist/services/WhatsAppWebService');

async function exampleMongoAuth() {
  console.log('📱 WhatsApp Web with MongoDB Authentication Example\n');

  try {
    // Step 1: Initialize configuration
    const config = ConfigService.getInstance();
    
    // Step 2: Configure WhatsApp with MongoDB authentication
    const whatsappConfig = {
      phoneNumber: config.getPhoneNumber(),
      useMock: false, // Set to false for real WhatsApp connection
      sessionName: 'production-session', // Unique session identifier
      useMongoAuth: true // ✨ Enable MongoDB authentication!
    };

    console.log('⚙️ Configuration:');
    console.log(`   📱 Phone: ${whatsappConfig.phoneNumber}`);
    console.log(`   💾 MongoDB Auth: ${whatsappConfig.useMongoAuth}`);
    console.log(`   🏷️  Session Name: ${whatsappConfig.sessionName}\n`);

    // Step 3: Connect to database first
    console.log('🔌 Connecting to MongoDB...');
    const database = DatabaseService.getInstance();
    await database.connect();
    console.log('✅ MongoDB connected!\n');

    // Step 4: Initialize WhatsApp with MongoDB authentication
    console.log('📱 Initializing WhatsApp Web with MongoDB auth...');
    const whatsapp = new WhatsAppWebService(whatsappConfig);
    
    // Set up callback for when WhatsApp is ready
    whatsapp.setOnReadyCallback(async () => {
      console.log('🎉 WhatsApp is ready! Session saved to MongoDB.');
      
      // Test sending a message
      const testResult = await whatsapp.sendMessage(
        whatsappConfig.phoneNumber,
        '✅ WhatsApp Web connected with MongoDB authentication!'
      );
      
      console.log(`📤 Test message: ${testResult ? 'Sent' : 'Failed'}`);
    });

    // Initialize (this will show QR code if not authenticated)
    await whatsapp.initialize();

    console.log('\n📋 What happens next:');
    console.log('   1. If first time: Scan QR code with WhatsApp');
    console.log('   2. Session data gets saved to MongoDB');
    console.log('   3. Next time: Automatically loads from MongoDB');
    console.log('   4. No QR code needed on subsequent starts!');

    // Keep the process running
    console.log('\n⏳ WhatsApp Web is running...');
    console.log('   Press Ctrl+C to stop');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🔌 Shutting down...');
      await whatsapp.disconnect();
      await database.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  exampleMongoAuth();
}

module.exports = { exampleMongoAuth };