import * as path from 'path';
import { ConfigService } from './config/ConfigService';
import { TimetableParser } from './services/TimetableParser';
import { WhatsAppServiceFactory, IWhatsAppService } from './services/WhatsAppService';
import { SchedulerService } from './services/SchedulerService';

export class ReminderChatBot {
  private configService: ConfigService;
  private timetableParser!: TimetableParser;
  private whatsappService!: IWhatsAppService;
  private schedulerService!: SchedulerService;
  private isRunning = false;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.initializeServices();
  }

  private initializeServices(): void {
    const config = this.configService.getConfig();
    
    // Initialize timetable parser
    const timetableFilePath = path.resolve(process.cwd(), config.timetableFile);
    this.timetableParser = new TimetableParser(timetableFilePath);

    // Initialize WhatsApp service
    this.whatsappService = WhatsAppServiceFactory.create(config.whatsappConfig);

    // Initialize scheduler service
    this.schedulerService = new SchedulerService(
      this.timetableParser,
      this.whatsappService,
      config.reminderConfig,
      this.configService.getRecipientPhone()
    );
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ ChatBot is already running');
      return;
    }

    try {
      console.log('🤖 Starting Reminder ChatBot...');
      console.log('════════════════════════════════════════');

      // Print configuration
      this.configService.printConfig();

      // Validate configuration
      const validation = this.configService.validateConfig();
      if (!validation.valid) {
        console.error('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.error(`   • ${error}`));
        throw new Error('Invalid configuration');
      }

      // Validate timetable file
      const isValidTimetable = await this.timetableParser.validateTimetableFile();
      if (!isValidTimetable) {
        throw new Error(`Timetable file not found: ${this.configService.getTimetableFile()}`);
      }

      // Parse and display timetable summary
      await this.displayTimetableSummary();

      // Start scheduler service
      await this.schedulerService.start();

      this.isRunning = true;
      console.log('✅ Reminder ChatBot started successfully!');
      console.log('🔄 Monitoring timetable for reminders...');
      console.log('💡 Press Ctrl+C to stop the bot');
      console.log('════════════════════════════════════════');

    } catch (error) {
      console.error('❌ Failed to start ChatBot:', error);
      await this.handleShutdown();
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ ChatBot is not running');
      return;
    }

    console.log('🛑 Stopping Reminder ChatBot...');
    
    try {
      // Stop scheduler service
      await this.schedulerService.stop();

      // Disconnect WhatsApp service
      await this.whatsappService.disconnect();

      this.isRunning = false;
      console.log('✅ Reminder ChatBot stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping ChatBot:', error);
    }
  }

  private async displayTimetableSummary(): Promise<void> {
    try {
      const parsedTimetable = await this.timetableParser.parseTimetable();
      const todayEntries = await this.timetableParser.getTodaySchedule();

      console.log('📋 Timetable Summary:');
      console.log(`   📊 Total Entries: ${parsedTimetable.metadata.totalEntries}`);
      console.log(`   📅 Today's Entries: ${todayEntries.length}`);
      console.log(`   ⏱️ Time Range: ${parsedTimetable.metadata.dateRange}`);
      console.log(`   🔄 Last Updated: ${parsedTimetable.metadata.lastUpdated.toLocaleString()}`);

      if (todayEntries.length > 0) {
        console.log('\n📅 Today\'s Schedule:');
        todayEntries.slice(0, 5).forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.timeSlot} - ${entry.activity.substring(0, 50)}${entry.activity.length > 50 ? '...' : ''}`);
        });
        
        if (todayEntries.length > 5) {
          console.log(`   ... and ${todayEntries.length - 5} more entries`);
        }
      } else {
        console.log('\n📅 No entries found for today');
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Error displaying timetable summary:', error);
    }
  }

  private async handleShutdown(): Promise<void> {
    console.log('\n🔄 Graceful shutdown initiated...');
    await this.stop();
    // Don't call process.exit in tests or when called programmatically
    if (process.env.NODE_ENV !== 'test') {
      process.exit(0);
    }
  }

  public async testReminder(): Promise<void> {
    try {
      const todayEntries = await this.timetableParser.getTodaySchedule();
      
      if (todayEntries.length === 0) {
        console.log('📝 No entries found for testing. Creating a mock entry...');
        
        // Create a mock entry for testing
        const mockEntry = {
          timeSlot: "Test Time Slot",
          activity: "Test Reminder - ChatBot is working correctly!",
          startTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
          endTime: new Date(Date.now() + 35 * 60 * 1000)   // 35 minutes from now
        };
        
        await this.schedulerService.testReminder(mockEntry);
      } else {
        // Test with the first entry
        const firstEntry = todayEntries[0];
        if (firstEntry) {
          await this.schedulerService.testReminder(firstEntry);
        }
      }
      
      console.log('✅ Test reminder sent successfully!');
    } catch (error) {
      console.error('❌ Error sending test reminder:', error);
    }
  }

  public getStatus(): {
    isRunning: boolean;
    scheduledReminders: number;
    isMockMode: boolean;
    timetableFile: string;
  } {
    return {
      isRunning: this.isRunning,
      scheduledReminders: this.schedulerService ? this.schedulerService.getRemindersCount() : 0,
      isMockMode: this.configService.isMockMode(),
      timetableFile: this.configService.getTimetableFile()
    };
  }

  public async getScheduledReminders(): Promise<any[]> {
    if (!this.schedulerService) {
      return [];
    }
    return this.schedulerService.getScheduledReminders();
  }

  public async getTodaySchedule(): Promise<any[]> {
    return await this.timetableParser.getTodaySchedule();
  }

  // Setup graceful shutdown handlers
  public setupShutdownHandlers(): void {
    process.on('SIGINT', async () => {
      console.log('\n📥 Received SIGINT (Ctrl+C)');
      await this.handleShutdown();
    });

    process.on('SIGTERM', async () => {
      console.log('\n📥 Received SIGTERM');
      await this.handleShutdown();
    });

    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.handleShutdown();
    });

    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.handleShutdown();
    });
  }
}