#!/usr/bin/env node

import { ReminderChatBot } from './ReminderChatBot';

async function main() {
  const chatBot = new ReminderChatBot();
  
  // Setup graceful shutdown handlers
  chatBot.setupShutdownHandlers();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'check-env':
        console.log('🔍 Checking Environment Configuration...');
        console.log('════════════════════════════════════════');
        chatBot.checkEnvironmentVariables();
        break;

      case 'test':
        console.log('🧪 Running test mode...');
        await chatBot.start();
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        await chatBot.testReminder();
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        await chatBot.stop();
        break;

      case 'status':
        const status = chatBot.getStatus();
        console.log('📊 ChatBot Status:');
        console.log(`   🤖 Running: ${status.isRunning ? 'YES' : 'NO'}`);
        console.log(`   ⏰ Scheduled Reminders: ${status.scheduledReminders}`);
        console.log(`   🧪 Mock Mode: ${status.isMockMode ? 'ON' : 'OFF'}`);
        console.log(`   📁 Timetable File: ${status.timetableFile}`);
        break;

      case 'schedule':
        console.log('📅 Today\'s Schedule:');
        const todaySchedule = await chatBot.getTodaySchedule();
        if (todaySchedule.length === 0) {
          console.log('   No entries found for today');
        } else {
          todaySchedule.forEach((entry, index) => {
            console.log(`   ${index + 1}. ${entry.timeSlot}`);
            console.log(`      ${entry.activity}`);
          });
        }
        break;

      case 'start':
      case undefined:
        // Default behavior: start the chatbot
        await chatBot.start();
        
        // Keep the process running
        console.log('⏱️ ChatBot is now running. It will send reminders based on your timetable.');
        
        // Keep process alive
        setInterval(() => {
          // This keeps the process running
        }, 60000);
        
        break;

      case 'help':
      case '--help':
      case '-h':
        printUsage();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Application error:', error);
    process.exit(1);
  }
}

function printUsage(): void {
  console.log(`
🤖 Reminder ChatBot - Usage:

Commands:
  start         Start the reminder chatbot (default)
  test          Run in test mode (start, send test message, stop)
  status        Show current chatbot status
  schedule      Display today's timetable schedule
  help, -h      Show this help message

Environment Variables:
  WHATSAPP_API_KEY              WhatsApp API key (optional, uses mock if not set)
  WHATSAPP_PHONE_NUMBER         WhatsApp phone number for API
  RECIPIENT_PHONE               Phone number to send reminders to
  USE_MOCK_WHATSAPP            Set to 'true' to use mock mode
  REMINDER_MINUTES_BEFORE       Minutes before event to send reminder (default: 15)
  CUSTOM_REMINDER_MESSAGE       Custom reminder message template
  TIMETABLE_FILE               Path to timetable CSV file (default: muneeb-timetable.csv)

Examples:
  npm start                     # Start the chatbot
  npm run dev                   # Start in development mode
  npm test                      # Run test suite
  node dist/index.js check-env  # Check environment variables setup
  node dist/index.js test       # Run test mode
  node dist/index.js status     # Check status
  node dist/index.js schedule   # Show today's schedule
`);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}