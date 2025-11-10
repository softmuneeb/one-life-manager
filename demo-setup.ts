#!/usr/bin/env node

/**
 * Demo Setup Script for BarakahTracker
 * Creates sample data for November 10, 2025
 */

import { DatabaseService } from './src/services/DatabaseService';
import { DailyTracking } from './src/models/DailyTracking';
import { TimetableParser } from './src/services/TimetableParser';
import { WebDashboardService } from './src/services/WebDashboardService';
import moment from 'moment';
import * as path from 'path';

class DemoSetup {
  private dbService: DatabaseService;
  private webDashboard: WebDashboardService;
  private timetableParser: TimetableParser;

  constructor() {
    this.dbService = DatabaseService.getInstance();
    this.timetableParser = new TimetableParser(path.resolve(process.cwd(), 'muneeb-timetable.csv'));
    this.webDashboard = new WebDashboardService(3001, this.timetableParser);
  }

  async initialize(): Promise<void> {
    console.log('🚀 Starting BarakahTracker Demo Setup...\n');

    try {
      // 1. Connect to database
      console.log('📊 Connecting to BarakahTrackerDB...');
      await this.dbService.connect();
      await this.dbService.initialize();

      // 2. Create demo data for Nov 10, 2025
      console.log('📅 Creating demo data for November 10, 2025...');
      await this.createDemoData();

      // 3. Start web dashboard
      console.log('🌐 Starting Web Dashboard...');
      await this.webDashboard.start();

      // 4. Show demo links
      this.showDemoInfo();

    } catch (error) {
      console.error('❌ Demo setup failed:', error);
      process.exit(1);
    }
  }

  private async createDemoData(): Promise<void> {
    const demoDate = moment('2025-11-10').toDate();
    demoDate.setHours(0, 0, 0, 0);

    try {
      // Get planned schedule from CSV
      const plannedSchedule = await this.timetableParser.getTodaySchedule();
      
      // Create or get daily tracking document
      let tracking = await DailyTracking.getByDate(demoDate);
      if (!tracking) {
        tracking = new DailyTracking({
          date: demoDate,
          userId: 'muneeb',
          entries: []
        });
      }

      // Create sample actual activities (some completed, some pending)
      const sampleActivities = this.generateSampleActivities();

      // Clear existing entries and add new ones
      tracking.entries = [];

      // Add planned activities with some actual responses
      for (let i = 0; i < plannedSchedule.length; i++) {
        const planned = plannedSchedule[i];
        const actual = sampleActivities[i] || null;
        
        // Ensure planned activity exists
        if (!planned) {
          console.warn(`No planned activity found at index ${i}`);
          continue;
        }
        
        tracking.entries.push({
          timeSlot: planned.timeSlot,
          timestamp: actual ? moment(demoDate).add(i * 30, 'minutes').toDate() : new Date(),
          plannedActivity: planned.activity,
          actualActivity: actual?.activity || '',
          isCompleted: !!actual,
          mood: actual?.mood || '😐',
          notes: actual?.notes || ''
        });
      }

      await tracking.save();
      
      console.log(`✅ Created demo data with ${tracking.entries.length} time slots`);
      console.log(`📊 Completion rate: ${tracking.getCompletionRate().toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Failed to create demo data:', error);
      throw error;
    }
  }

  private generateSampleActivities(): Array<{activity: string, mood: string, notes: string}> {
    return [
      { activity: 'Woke up and listened to Seerah podcast', mood: '😊', notes: 'Great way to start the day' },
      { activity: 'Prayed Fajr with family', mood: '😊', notes: 'Peaceful morning prayer' },
      { activity: 'Recited Quran with tajweed', mood: '😊', notes: 'Completed half parah' },
      { activity: 'Had healthy breakfast', mood: '😊', notes: 'Avoided gas-producing foods' },
      { activity: 'Went to gym and worked out', mood: '💪', notes: '45 minutes of cardio and weights' },
      { activity: 'Continued gym session', mood: '💪', notes: 'Listened to productivity audiobook' },
      { activity: 'Started office work with coffee', mood: '😊', notes: 'Had paratha and coffee' },
      { activity: 'Deep work session on project', mood: '🤔', notes: 'Working on BarakahTracker features' },
      { activity: 'Attended Quran session', mood: '😊', notes: 'Uncle\'s session was enlightening' },
      { activity: 'Continued Quran study', mood: '😊', notes: 'Taking notes for reflection' },
      { activity: 'Coding and problem solving', mood: '💪', notes: 'Fixed several bugs today' },
      { activity: 'Team meeting and planning', mood: '😐', notes: 'Discussed project roadmap' },
      { activity: 'Working on documentation', mood: '🤔', notes: 'Writing technical specs' },
      { activity: 'Code review and testing', mood: '😊', notes: 'Found and fixed edge cases' },
      { activity: 'Client call and updates', mood: '😐', notes: 'Discussed requirements' },
      { activity: 'Focus work on algorithms', mood: '💪', notes: 'Optimized search function' },
      { activity: 'Database optimization', mood: '🤔', notes: 'Improved query performance' },
      { activity: 'Prayed Zuhr and took break', mood: '😊', notes: 'Much needed spiritual break' },
      { activity: 'Power nap', mood: '😴', notes: '15 minute recharge' },
      { activity: 'Met friend for coffee', mood: '😊', notes: 'Caught up on life updates' },
      { activity: 'Networking conversation', mood: '😊', notes: 'Discussed potential collaboration' },
      { activity: 'Continued coffee meeting', mood: '😊', notes: 'Great insights shared' },
      { activity: 'Prayed Asr together', mood: '😊', notes: 'Prayed at the cafe' },
      { activity: 'Evening walk with wife', mood: '😊', notes: 'Discussed our day' },
      { activity: 'Prayed Maghrib at home', mood: '😊', notes: 'Grateful for the day' },
      // Rest will be pending/not completed
    ];
  }

  private showDemoInfo(): void {
    const today = moment().format('DD-MMM-YYYY');
    const demoDate = '10-Nov-2025';
    
    console.log('\n🎉 BarakahTracker Demo is Ready!');
    console.log('════════════════════════════════════════');
    console.log('');
    console.log('📊 Web Dashboard URLs:');
    console.log(`   Today's Diary: http://localhost:3001/`);
    console.log(`   Demo Date:     http://localhost:3001/diary/${demoDate}`);
    console.log(`   JSON API:      http://localhost:3001/api/diary/${demoDate}`);
    console.log(`   Health Check:  http://localhost:3001/health`);
    console.log('');
    console.log('📱 Features Demonstrated:');
    console.log('   ✅ Target vs Actual timeline comparison');
    console.log('   ✅ Mood tracking with emojis');
    console.log('   ✅ Activity notes and timestamps');
    console.log('   ✅ Completion rate statistics');
    console.log('   ✅ Beautiful responsive web interface');
    console.log('   ✅ MongoDB data persistence');
    console.log('');
    console.log('🚀 Sample Data:');
    console.log('   📅 Date: November 10, 2025');
    console.log('   ⏰ Time Slots: 48 (30-minute intervals)');
    console.log('   ✅ Completed: ~25 activities with responses');
    console.log('   ⏳ Pending: ~23 activities without responses');
    console.log('   📊 Realistic completion rate: ~52%');
    console.log('');
    console.log('💡 To stop demo: Press Ctrl+C');
    console.log('════════════════════════════════════════');
  }

  async stop(): Promise<void> {
    console.log('\n🛑 Stopping BarakahTracker Demo...');
    await this.webDashboard.stop();
    await this.dbService.disconnect();
    console.log('✅ Demo stopped successfully');
    process.exit(0);
  }
}

// Initialize and run demo
async function runDemo() {
  const demo = new DemoSetup();
  
  // Setup graceful shutdown
  process.on('SIGINT', async () => {
    await demo.stop();
  });

  process.on('SIGTERM', async () => {
    await demo.stop();
  });

  // Start demo
  await demo.initialize();
}

// Run if called directly
if (require.main === module) {
  runDemo().catch((error) => {
    console.error('💥 Demo failed:', error);
    process.exit(1);
  });
}

export { DemoSetup };