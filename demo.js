#!/usr/bin/env node

/**
 * Quick Start Demo Script
 * 
 * This script demonstrates the Cute99 Virtual Assistant in action
 * by running a quick demo with your timetable data.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🤖 Cute99 Virtual Assistant - Quick Start Demo');
console.log('=' .repeat(50));

// Check if environment file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('📋 Setting up environment configuration...');
  const envExamplePath = path.join(__dirname, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Environment file created from .env.example');
  } else {
    console.log('❌ .env.example not found. Please create .env manually.');
    process.exit(1);
  }
}

// Check if timetable file exists
const timetablePath = path.join(__dirname, 'muneeb-timetable.csv');
if (!fs.existsSync(timetablePath)) {
  console.log('❌ Timetable file not found: muneeb-timetable.csv');
  console.log('📝 Please create your timetable CSV file first.');
  process.exit(1);
}

console.log('🔧 Building the project...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Build failed:', error);
    return;
  }
  
  console.log('✅ Build completed successfully!');
  console.log('🧪 Running tests to verify everything works...');
  
  exec('npm test', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Tests failed:', error);
      return;
    }
    
    console.log('✅ All tests passed!');
    console.log('🚀 Starting the chatbot...');
    console.log('');
    console.log('Note: The bot is running in MOCK mode for safety.');
    console.log('WhatsApp messages will be logged to console instead of sent.');
    console.log('');
    console.log('Press Ctrl+C to stop the bot.');
    console.log('=' .repeat(50));
    
    // Start the bot
    const botProcess = exec('npm start', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Bot failed to start:', error);
        return;
      }
    });
    
    // Forward output
    botProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    botProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping the bot...');
      botProcess.kill('SIGTERM');
      console.log('👋 Thanks for trying Cute99 Virtual Assistant!');
      process.exit(0);
    });
  });
});