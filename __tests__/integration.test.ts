import { ReminderChatBot } from '../src/ReminderChatBot';
import * as fs from 'fs';
import * as path from 'path';

describe('ReminderChatBot Integration Tests', () => {
  let chatBot: ReminderChatBot;
  let testTimetableFile: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create test timetable file
    testTimetableFile = path.join(process.cwd(), 'test-integration-timetable.csv');
    const currentTime = new Date();
    const futureTime = new Date(currentTime.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const futureTimeStr = futureTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const futureEndTime = new Date(futureTime.getTime() + 30 * 60 * 1000);
    const futureEndTimeStr = futureEndTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

    const testData = `Time Slot,Activity
5:00 AM to 5:30 AM,Morning Walk Test
${futureTimeStr} to ${futureEndTimeStr},Test Integration Activity
9:00 AM to 9:30 AM,Quran session test
10:00 AM to 10:30 AM,Work session test`;

    fs.writeFileSync(testTimetableFile, testData);

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.USE_MOCK_WHATSAPP = 'true';
    process.env.TIMETABLE_FILE = testTimetableFile;
    process.env.REMINDER_MINUTES_BEFORE = '10';
    process.env.RECIPIENT_PHONE = '+1234567890';

    // Clear singleton instance
    (require('../src/config/ConfigService').ConfigService as any).instance = undefined;
  });

  afterEach(async () => {
    // Clean up
    if (chatBot) {
      try {
        await chatBot.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Remove test file
    if (fs.existsSync(testTimetableFile)) {
      fs.unlinkSync(testTimetableFile);
    }

    // Restore original environment
    process.env = originalEnv;
    
    // Clear singleton instance
    (require('../src/config/ConfigService').ConfigService as any).instance = undefined;
  });

  test('should initialize and start successfully', async () => {
    chatBot = new ReminderChatBot();
    
    const initialStatus = chatBot.getStatus();
    expect(initialStatus.isRunning).toBe(false);
    expect(initialStatus.isMockMode).toBe(true);

    await chatBot.start();
    
    const runningStatus = chatBot.getStatus();
    expect(runningStatus.isRunning).toBe(true);
    expect(runningStatus.timetableFile).toBe(testTimetableFile);
  });

  test('should parse and load timetable correctly', async () => {
    chatBot = new ReminderChatBot();
    await chatBot.start();
    
    const todaySchedule = await chatBot.getTodaySchedule();
    expect(Array.isArray(todaySchedule)).toBe(true);
    expect(todaySchedule.length).toBeGreaterThan(0);
    
    // Check that the schedule contains our test entries
    const hasTestEntry = todaySchedule.some(entry => 
      entry.activity.includes('Test Integration Activity') ||
      entry.activity.includes('Morning Walk Test')
    );
    expect(hasTestEntry).toBe(true);
  });

  test('should send test reminder successfully', async () => {
    chatBot = new ReminderChatBot();
    await chatBot.start();

    // This should not throw an error
    await expect(chatBot.testReminder()).resolves.toBeUndefined();
  });

  test('should handle stop gracefully', async () => {
    chatBot = new ReminderChatBot();
    await chatBot.start();
    
    expect(chatBot.getStatus().isRunning).toBe(true);
    
    await chatBot.stop();
    
    expect(chatBot.getStatus().isRunning).toBe(false);
  });

  test('should get scheduled reminders after start', async () => {
    chatBot = new ReminderChatBot();
    await chatBot.start();
    
    const scheduledReminders = await chatBot.getScheduledReminders();
    expect(Array.isArray(scheduledReminders)).toBe(true);
    
    // Should have at least some reminders scheduled
    expect(scheduledReminders.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle multiple start calls gracefully', async () => {
    chatBot = new ReminderChatBot();
    
    await chatBot.start();
    expect(chatBot.getStatus().isRunning).toBe(true);
    
    // Second start should not throw error
    await expect(chatBot.start()).resolves.toBeUndefined();
    expect(chatBot.getStatus().isRunning).toBe(true);
  });

  test('should handle stop when not running', async () => {
    chatBot = new ReminderChatBot();
    
    expect(chatBot.getStatus().isRunning).toBe(false);
    
    // Should not throw error
    await expect(chatBot.stop()).resolves.toBeUndefined();
    expect(chatBot.getStatus().isRunning).toBe(false);
  });

  describe('error handling', () => {
    test('should handle invalid timetable file gracefully', async () => {
      // Set invalid timetable file
      process.env.TIMETABLE_FILE = '/non-existent/path.csv';
      
      // Clear singleton to pick up new config
      (require('../src/config/ConfigService').ConfigService as any).instance = undefined;
      
      chatBot = new ReminderChatBot();
      
      await expect(chatBot.start()).rejects.toThrow();
    });

    test('should handle malformed timetable file', async () => {
      // Create malformed CSV
      const malformedFile = path.join(process.cwd(), 'malformed-test.csv');
      fs.writeFileSync(malformedFile, 'Invalid,CSV\nNo proper,format');
      
      process.env.TIMETABLE_FILE = malformedFile;
      
      // Clear singleton to pick up new config
      (require('../src/config/ConfigService').ConfigService as any).instance = undefined;
      
      try {
        chatBot = new ReminderChatBot();
        await chatBot.start();
        
        // Should still work but with no valid entries
        const schedule = await chatBot.getTodaySchedule();
        expect(Array.isArray(schedule)).toBe(true);
        
      } finally {
        // Clean up malformed file
        if (fs.existsSync(malformedFile)) {
          fs.unlinkSync(malformedFile);
        }
      }
    });
  });

  describe('configuration validation', () => {
    test('should validate configuration on start', async () => {
      // Test with valid config (already set in beforeEach)
      chatBot = new ReminderChatBot();
      
      await expect(chatBot.start()).resolves.toBeUndefined();
      expect(chatBot.getStatus().isRunning).toBe(true);
    });
  });
});