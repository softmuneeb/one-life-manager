import * as path from 'path';
import * as os from 'os';
import { ConfigService } from './config/ConfigService';
import { TimetableParser } from './services/TimetableParser';
import { WhatsAppServiceFactory, IWhatsAppService } from './services/WhatsAppService';
import { SchedulerService } from './services/SchedulerService';
import { KeepAliveService } from './services/KeepAliveService';
import { WebDashboardService } from './services/WebDashboardService';
import { DatabaseService } from './services/DatabaseService';
import { MemoryMonitorService } from './services/MemoryMonitorService';
import { MemoryCleanupService } from './services/MemoryCleanupService';

export class ReminderChatBot {
  private configService: ConfigService;
  private timetableParser!: TimetableParser;
  private whatsappService!: IWhatsAppService;
  private schedulerService!: SchedulerService;
  private keepAliveService!: KeepAliveService;
  private webDashboardService!: WebDashboardService;
  private memoryMonitor!: MemoryMonitorService;
  private memoryCleanup!: MemoryCleanupService;
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
    
    // Set up callback for when WhatsApp is ready (connects to database)
    if (this.whatsappService.setOnReadyCallback) {
      this.whatsappService.setOnReadyCallback(async () => {
        await this.onWhatsAppReady();
      });
    }

    // Initialize scheduler service
    this.schedulerService = new SchedulerService(
      this.timetableParser,
      this.whatsappService,
      config.reminderConfig,
      this.configService.getRecipientPhone()
    );

    // Initialize keep-alive service for production deployments
    // Use a different port than the web dashboard to avoid conflicts
    const keepAlivePort = parseInt(process.env.KEEP_ALIVE_PORT || '3000', 10);
    this.keepAliveService = new KeepAliveService(keepAlivePort);
    
    // Initialize web dashboard service for health checks and monitoring
    const port = parseInt(process.env.PORT || '3001', 10);
    this.webDashboardService = new WebDashboardService(port, this.timetableParser);
    
    // Initialize memory monitoring service
    this.memoryMonitor = MemoryMonitorService.getInstance();
    
    // Initialize memory cleanup service
    this.memoryCleanup = MemoryCleanupService.getInstance();
  }

  /**
   * Get current IP addresses for MongoDB whitelisting
   */
  private getIPAddresses(): { ipv4: string[], ipv6: string[] } {
    const interfaces = os.networkInterfaces();
    const ipv4: string[] = [];
    const ipv6: string[] = [];

    for (const interfaceName in interfaces) {
      const addresses = interfaces[interfaceName];
      if (addresses) {
        for (const address of addresses) {
          if (!address.internal) {
            if (address.family === 'IPv4') {
              ipv4.push(address.address);
            } else if (address.family === 'IPv6') {
              ipv6.push(address.address);
            }
          }
        }
      }
    }

    return { ipv4, ipv6 };
  }

  /**
   * Get external IP address from external service
   */
  private async getExternalIP(): Promise<string | null> {
    try {
      const response = await fetch('https://ipv4.icanhazip.com');
      const ip = await response.text();
      return ip.trim();
    } catch (error) {
      try {
        // Fallback to another service
        const response = await fetch('https://api.ipify.org');
        const ip = await response.text();
        return ip.trim();
      } catch (fallbackError) {
        console.log('⚠️  Could not determine external IP address');
        return null;
      }
    }
  }

  /**
   * Log IP information for MongoDB whitelisting
   */
  private async logIPInformation(): Promise<void> {
    console.log('🌐 IP Address Information for MongoDB Whitelisting:');
    console.log('════════════════════════════════════════════════════');
    
    // Get local network interfaces
    const localIPs = this.getIPAddresses();
    
    if (localIPs.ipv4.length > 0) {
      console.log('📍 Local IPv4 Addresses:');
      localIPs.ipv4.forEach(ip => console.log(`   • ${ip}`));
    }
    
    // Get external IP
    const externalIP = await this.getExternalIP();
    if (externalIP) {
      console.log('🌍 External IP Address (use this for MongoDB):');
      console.log(`   • ${externalIP}`);
      console.log('💡 Add this IP to MongoDB Atlas Network Access List');
    }
    
    console.log('════════════════════════════════════════════════════');
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ ChatBot is already running');
      return;
    }

    try {
      console.log('🤖 Starting Reminder ChatBot...');
      console.log('════════════════════════════════════════');

      // First, validate critical environment variables
      const envValidation = this.configService.validateEnvironmentVariables();
      if (!envValidation.valid) {
        console.error('🚨 Critical environment variables are missing!');
        this.configService.displayEnvironmentSetupInstructions();
        process.exit(1);
      }

      // Print configuration
      this.configService.printConfig();

      // Log IP address information for MongoDB whitelisting
      await this.logIPInformation();

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

      // Start web dashboard service for health checks and monitoring
      await this.webDashboardService.start();
      const port = parseInt(process.env.PORT || '3001', 10);
      console.log(`🌐 Web dashboard started on port ${port} (health checks and monitoring)`);

      // Note: KeepAlive service disabled since WebDashboard already provides /health endpoint
      console.log('ℹ️  Keep-alive functionality provided by Web Dashboard /health endpoint');

      // Start memory monitoring and cleanup
      this.memoryMonitor.startMonitoring(3); // Monitor every 3 minutes
      this.memoryCleanup.startAutoCleanup(); // Start automatic memory cleanup
      
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

  /**
   * Called when WhatsApp is authenticated and ready
   * This is when we connect to the database safely
   */
  private async onWhatsAppReady(): Promise<void> {
    try {
      console.log('📊 WhatsApp ready - connecting to database...');
      
      // Log IP address for MongoDB connection
      await this.logIPInformation();
      
      // Connect to MongoDB now that WhatsApp is authenticated
      const dbService = DatabaseService.getInstance();
      await dbService.connect();
      
      console.log('✅ Database connected successfully after WhatsApp authentication');
      console.log('📊 Activity tracking is now available');
      
    } catch (error) {
      console.error('⚠️  Database connection failed after WhatsApp ready:', error);
      console.log('📝 Activity tracking will not be available, but reminders will still work');
      
      // Log IP information even if connection fails to help with troubleshooting
      await this.logIPInformation();
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ ChatBot is not running');
      return;
    }

    console.log('🛑 Stopping Reminder ChatBot...');
    
    try {
      // Stop keep-alive service
      await this.keepAliveService.stop();

      // Stop web dashboard service
      await this.webDashboardService.stop();

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
    
    // Stop memory monitoring and cleanup
    if (this.memoryMonitor) {
      this.memoryMonitor.stopMonitoring();
    }
    
    if (this.memoryCleanup) {
      this.memoryCleanup.stopAutoCleanup();
    }
    
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

  /**
   * Check and display environment variable configuration status
   */
  public checkEnvironmentVariables(): void {
    this.configService.displayEnvironmentSetupInstructions();
    const envValidation = this.configService.validateEnvironmentVariables();
    
    if (envValidation.valid) {
      console.log('🎉 All environment variables are properly configured!');
      console.log('✅ You can start the application with: npm start');
    } else {
      console.log(`❌ ${envValidation.missing.length} critical environment variable(s) missing: ${envValidation.missing.join(', ')}`);
      console.log('⚠️  Please fix the issues above before starting the application');
      process.exit(1);
    }
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