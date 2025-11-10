#!/usr/bin/env node

/**
 * Test MongoDB Authentication for WhatsApp Web
 * This script demonstrates how to use MongoDB-based authentication persistence
 */

import { ConfigService } from './src/config/ConfigService';
import { DatabaseService } from './src/services/DatabaseService';
import { WhatsAppWebService } from './src/services/WhatsAppWebService';
import { MongoAuthStrategy } from './src/services/MongoAuthStrategy';

async function testMongoAuth() {
  console.log('🧪 Testing MongoDB Authentication for WhatsApp Web\n');

  try {
    // Initialize configuration
    const configService = ConfigService.getInstance();
    const config = configService.getWhatsAppConfig();
    
    console.log('📋 Current WhatsApp Configuration:');
    console.log(`   - Use Mock: ${config.isMock}`);
    console.log(`   - Use WhatsApp Web: ${config.useWhatsAppWeb}`);
    console.log(`   - Use MongoDB Auth: ${config.useMongoAuth}`);
    console.log(`   - Session Name: ${config.sessionName}\n`);

    // Connect to database
    console.log('🔗 Connecting to MongoDB...');
    const dbService = DatabaseService.getInstance();
    await dbService.connect();
    console.log('✅ Connected to MongoDB\n');

    // Test MongoDB authentication strategy
    console.log('🔐 Testing MongoDB Authentication Strategy...');
    
    // List existing sessions
    const activeSessions = await MongoAuthStrategy.listActiveSessions();
    console.log(`📱 Active WhatsApp sessions: ${activeSessions.length}`);
    activeSessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session}`);
    });
    console.log();

    // Create WhatsApp Web service with MongoDB auth
    const whatsappConfig = {
      phoneNumber: config.phoneNumber || '+1234567890',
      useMock: true, // Use mock for testing
      sessionName: config.sessionName || 'cute99-assistant',
      useMongoAuth: true // Enable MongoDB authentication
    };

    const whatsappService = new WhatsAppWebService(whatsappConfig);
    
    console.log('🚀 Initializing WhatsApp Web Service with MongoDB auth...');
    await whatsappService.initialize();
    
    console.log(`✅ WhatsApp Web Service Status: ${whatsappService.getConnectionStatus()}`);
    console.log(`🔌 Is Connected: ${whatsappService.isConnected()}\n`);

    // Test session persistence
    console.log('💾 Testing session persistence...');
    
    // Simulate saving a session (in real usage, this happens automatically)
    const testStrategy = new MongoAuthStrategy({ clientId: 'test-client' });
    await testStrategy.setWebAuthSession('test-session-data-' + Date.now());
    
    // Retrieve the session
    const retrievedSession = await testStrategy.getWebAuthSession();
    console.log(`📥 Retrieved session data: ${retrievedSession ? 'Found' : 'Not found'}`);
    
    // Clean up test session
    await testStrategy.logout();
    console.log('🗑️ Test session cleaned up\n');

    // Optional: Clean up old sessions (older than 30 days)
    console.log('🧹 Cleaning up old sessions...');
    await MongoAuthStrategy.cleanupOldSessions(30);

    // Disconnect
    await whatsappService.disconnect();
    await dbService.disconnect();
    
    console.log('✅ MongoDB Authentication test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing MongoDB authentication:', error);
    process.exit(1);
  }
}

// Environment variable examples
console.log('🔧 Environment Variables for MongoDB Authentication:');
console.log('   USE_MONGO_AUTH=true          # Enable MongoDB auth persistence');
console.log('   USE_WHATSAPP_WEB=true        # Enable WhatsApp Web');
console.log('   WHATSAPP_SESSION_NAME=my-bot # Custom session name');
console.log('   MONGO_URL=mongodb://...      # MongoDB connection string\n');

// Run the test
if (require.main === module) {
  testMongoAuth().catch(console.error);
}

export { testMongoAuth };