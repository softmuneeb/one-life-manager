import * as cron from 'node-cron';
import moment from 'moment';
import { TimetableEntry, ReminderConfig } from '../types';
import { TimetableParser } from './TimetableParser';
import { IWhatsAppService } from './WhatsAppService';

export interface ScheduledReminder {
  id: string;
  entry: TimetableEntry;
  reminderTime: Date;
  cronExpression: string;
  task?: cron.ScheduledTask;
  sent: boolean;
}

export class SchedulerService {
  private timetableParser: TimetableParser;
  private whatsappService: IWhatsAppService;
  private reminderConfig: ReminderConfig;
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private recipientPhone: string;

  constructor(
    timetableParser: TimetableParser,
    whatsappService: IWhatsAppService,
    reminderConfig: ReminderConfig,
    recipientPhone: string
  ) {
    this.timetableParser = timetableParser;
    this.whatsappService = whatsappService;
    this.reminderConfig = reminderConfig;
    this.recipientPhone = recipientPhone;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting Reminder Scheduler Service...');
    
    // Initialize WhatsApp service if not connected
    if (!this.whatsappService.isConnected()) {
      await this.whatsappService.initialize();
    }

    // Schedule daily timetable loading at midnight
    this.scheduleDailyTimetableUpdate();

    // Load today's schedule
    await this.loadTodaySchedule();

    // Start monitoring for immediate reminders
    this.startImmediateReminderCheck();

    this.isRunning = true;
    console.log('✅ Reminder Scheduler Service started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Reminder Scheduler Service...');

    // Clear all scheduled tasks
    this.scheduledReminders.forEach(reminder => {
      if (reminder.task) {
        reminder.task.stop();
      }
    });
    this.scheduledReminders.clear();

    // Clear check interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isRunning = false;
    console.log('✅ Reminder Scheduler Service stopped');
  }

  private scheduleDailyTimetableUpdate(): void {
    // Schedule to run at midnight every day
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Loading new day schedule...');
      await this.loadTodaySchedule();
    });
  }

  private async loadTodaySchedule(): Promise<void> {
    try {
      console.log('📅 Loading today\'s schedule...');
      const todayEntries = await this.timetableParser.getTodaySchedule();
      
      // Clear existing reminders
      this.clearScheduledReminders();

      // Schedule reminders for today's entries
      for (const entry of todayEntries) {
        await this.scheduleReminder(entry);
      }

      console.log(`✅ Scheduled ${todayEntries.length} reminders for today`);
    } catch (error) {
      console.error('❌ Error loading today\'s schedule:', error);
    }
  }

  private async scheduleReminder(entry: TimetableEntry): Promise<void> {
    const reminderTime = moment(entry.startTime).subtract(this.reminderConfig.minutesBefore, 'minutes');
    const now = moment();

    // Skip if reminder time has already passed
    if (reminderTime.isBefore(now)) {
      console.log(`⏭️ Skipping past reminder for: ${entry.activity}`);
      return;
    }

    const reminderId = this.generateReminderId(entry);
    const cronExpression = this.createCronExpression(reminderTime.toDate());

    const scheduledReminder: ScheduledReminder = {
      id: reminderId,
      entry,
      reminderTime: reminderTime.toDate(),
      cronExpression,
      sent: false
    };

    // Create cron task
    const task = cron.schedule(cronExpression, async () => {
      await this.sendReminder(scheduledReminder);
    }, {
      scheduled: true,
      timezone: 'Asia/Karachi' // Adjust timezone as needed
    });

    scheduledReminder.task = task;
    this.scheduledReminders.set(reminderId, scheduledReminder);

    console.log(`⏰ Scheduled reminder for "${entry.activity}" at ${reminderTime.format('h:mm A')}`);
  }

  private async sendReminder(scheduledReminder: ScheduledReminder): Promise<void> {
    if (scheduledReminder.sent) {
      return;
    }

    try {
      const message = this.formatReminderMessage(scheduledReminder.entry);
      const result = await this.whatsappService.sendMessage(this.recipientPhone, message);

      if (result.success) {
        scheduledReminder.sent = true;
        console.log(`✅ Reminder sent for: ${scheduledReminder.entry.activity}`);
      } else {
        console.error(`❌ Failed to send reminder: ${result.error}`);
      }

      // Stop the cron task after sending
      if (scheduledReminder.task) {
        scheduledReminder.task.stop();
      }
    } catch (error) {
      console.error('❌ Error sending reminder:', error);
    }
  }

  private formatReminderMessage(entry: TimetableEntry): string {
    const customMessage = this.reminderConfig.message;
    if (customMessage) {
      // Parse the activity to extract subject, type, and location
      const activity = entry.activity;
      const startTime = moment(entry.startTime).format('h:mm A');
      
      // Extract subject (main activity)
      let subject = activity;
      let type = 'Activity';
      let location = 'Scheduled Location';
      
      // Try to extract type and location from activity description
      if (activity.includes(':')) {
        const parts = activity.split(':');
        subject = parts[0]?.trim() || activity;
        if (parts[1]) {
          const description = parts[1].trim();
          if (description.toLowerCase().includes('gym')) {
            location = 'GYM';
          } else if (description.toLowerCase().includes('home')) {
            location = 'Home';
          } else if (description.toLowerCase().includes('office')) {
            location = 'Office';
          }
        }
      }
      
      // Determine type based on keywords
      const activityLower = activity.toLowerCase();
      if (activityLower.includes('prayer')) {
        type = 'Prayer';
        location = 'Home';
      } else if (activityLower.includes('gym')) {
        type = 'Exercise';
        location = 'GYM';
      } else if (activityLower.includes('work') || activityLower.includes('office')) {
        type = 'Work';
        location = 'Office';
      } else if (activityLower.includes('read') || activityLower.includes('quran')) {
        type = 'Study';
        location = 'Home';
      } else if (activityLower.includes('walk')) {
        type = 'Exercise';
        location = 'Outdoor';
      } else if (activityLower.includes('family')) {
        type = 'Personal';
        location = 'Home';
      } else if (activityLower.includes('meet') || activityLower.includes('coffee')) {
        type = 'Social';
        location = 'Meeting Place';
      } else if (activityLower.includes('rest') || activityLower.includes('sleep')) {
        type = 'Rest';
        location = 'Home';
      }

      return customMessage
        .replace(/{subject}/g, subject)
        .replace(/{type}/g, type)
        .replace(/{location}/g, location)
        .replace(/{minutesBefore}/g, this.reminderConfig.minutesBefore.toString())
        .replace(/{time}/g, startTime)
        .replace(/{activity}/g, activity);
    }

    const startTime = moment(entry.startTime).format('h:mm A');
    const timeRemaining = this.reminderConfig.minutesBefore;

    return `🔔 REMINDER: Your "${entry.activity}" is starting in ${timeRemaining} minutes at ${startTime}.\n\n⏰ Time Slot: ${entry.timeSlot}\n📝 Activity: ${entry.activity}\n\nHave a productive session! 💪`;
  }

  private startImmediateReminderCheck(): void {
    // Check every minute for any missed reminders or immediate ones
    this.checkInterval = setInterval(async () => {
      const now = moment();
      const upcomingEntries = await this.timetableParser.getUpcomingEntries(this.reminderConfig.minutesBefore);

      for (const entry of upcomingEntries) {
        const reminderId = this.generateReminderId(entry);
        const existingReminder = this.scheduledReminders.get(reminderId);

        if (!existingReminder || existingReminder.sent) {
          // Schedule immediate reminder for entries not yet scheduled
          const reminderTime = moment(entry.startTime).subtract(this.reminderConfig.minutesBefore, 'minutes');
          
          if (reminderTime.isSameOrBefore(now, 'minute')) {
            await this.sendImmediateReminder(entry);
          }
        }
      }
    }, 60000); // Check every minute
  }

  private async sendImmediateReminder(entry: TimetableEntry): Promise<void> {
    const reminderId = this.generateReminderId(entry);
    
    // Check if already sent
    const existingReminder = this.scheduledReminders.get(reminderId);
    if (existingReminder?.sent) {
      return;
    }

    try {
      const message = this.formatReminderMessage(entry);
      const result = await this.whatsappService.sendMessage(this.recipientPhone, message);

      if (result.success) {
        // Mark as sent
        const immediateReminder: ScheduledReminder = {
          id: reminderId,
          entry,
          reminderTime: new Date(),
          cronExpression: '',
          sent: true
        };
        this.scheduledReminders.set(reminderId, immediateReminder);
        
        console.log(`✅ Immediate reminder sent for: ${entry.activity}`);
      } else {
        console.error(`❌ Failed to send immediate reminder: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error sending immediate reminder:', error);
    }
  }

  private createCronExpression(date: Date): string {
    const moment_date = moment(date);
    const minute = moment_date.minute();
    const hour = moment_date.hour();
    const dayOfMonth = moment_date.date();
    const month = moment_date.month() + 1; // moment months are 0-indexed
    
    return `${minute} ${hour} ${dayOfMonth} ${month} *`;
  }

  private generateReminderId(entry: TimetableEntry): string {
    // Create unique ID based on time slot and activity
    const timeSlotNormalized = entry.timeSlot.replace(/\s+/g, '').toLowerCase();
    const activityNormalized = entry.activity.substring(0, 20).replace(/\s+/g, '').toLowerCase();
    return `${timeSlotNormalized}-${activityNormalized}`;
  }

  private clearScheduledReminders(): void {
    this.scheduledReminders.forEach(reminder => {
      if (reminder.task) {
        reminder.task.stop();
      }
    });
    this.scheduledReminders.clear();
  }

  // Public methods for monitoring and testing
  public getScheduledReminders(): ScheduledReminder[] {
    return Array.from(this.scheduledReminders.values());
  }

  public getRemindersCount(): number {
    return this.scheduledReminders.size;
  }

  public isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  public async testReminder(entry: TimetableEntry): Promise<void> {
    console.log('🧪 Sending test reminder...');
    const message = this.formatReminderMessage(entry);
    await this.whatsappService.sendMessage(this.recipientPhone, message);
  }
}