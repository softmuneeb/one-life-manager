import { DailyTracking, IDailyTracking, ITimeEntry } from '../models/DailyTracking';
import { TimetableParser } from './TimetableParser';
import { IWhatsAppService } from './WhatsAppService';
import * as cron from 'node-cron';
import moment from 'moment';

/**
 * Activity Tracker Service for BarakahTracker
 * Asks user every 30 minutes what they're doing and stores responses
 */
export class ActivityTracker {
  private timetableParser: TimetableParser;
  private whatsappService: IWhatsAppService;
  private recipientPhone: string;
  private isRunning = false;
  private checkInTask: cron.ScheduledTask | null = null;
  private wakeTime = '05:00'; // 5:00 AM default
  private sleepTime = '23:30'; // 11:30 PM default
  private pendingResponses = new Map<string, { timeSlot: string; timestamp: Date }>(); 

  constructor(
    timetableParser: TimetableParser,
    whatsappService: IWhatsAppService,
    recipientPhone: string
  ) {
    this.timetableParser = timetableParser;
    this.whatsappService = whatsappService;
    this.recipientPhone = recipientPhone;
  }

  /**
   * Start the 30-minute activity tracking system
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Activity Tracker is already running');
      return;
    }

    console.log('🕐 Starting 30-minute Activity Tracker...');
    
    try {
      // Extract wake and sleep times from timetable
      await this.extractWakeSleepTimes();
      
      // Schedule check-ins every 30 minutes during active hours
      this.scheduleCheckIns();
      
      // Initialize today's tracking document
      await this.initializeTodayTracking();
      
      this.isRunning = true;
      console.log(`✅ Activity Tracker started! Checking in every 30 minutes from ${this.wakeTime} to ${this.sleepTime}`);
      
    } catch (error) {
      console.error('❌ Failed to start Activity Tracker:', error);
      throw error;
    }
  }

  /**
   * Stop the activity tracking system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Activity Tracker...');
    
    if (this.checkInTask) {
      this.checkInTask.stop();
      this.checkInTask = null;
    }
    
    this.isRunning = false;
    console.log('✅ Activity Tracker stopped');
  }

  /**
   * Extract wake and sleep times from timetable
   */
  private async extractWakeSleepTimes(): Promise<void> {
    try {
      const todaySchedule = await this.timetableParser.getTodaySchedule();
      
      if (todaySchedule.length > 0) {
        // First entry is wake time
        const firstEntry = todaySchedule[0];
        const firstTimeSlot = firstEntry?.timeSlot.split(' to ')[0]?.trim();
        if (firstTimeSlot) this.wakeTime = firstTimeSlot;
        
        // Last entry is sleep time
        const lastEntry = todaySchedule[todaySchedule.length - 1];
        const lastTimeSlot = lastEntry?.timeSlot.split(' to ')[1]?.trim();
        if (lastTimeSlot) this.sleepTime = lastTimeSlot;
      }
      
      console.log(`⏰ Active hours: ${this.wakeTime} - ${this.sleepTime}`);
    } catch (error) {
      console.error('⚠️ Could not extract wake/sleep times, using defaults:', error);
    }
  }

  /**
   * Schedule check-ins every 30 minutes
   */
  private scheduleCheckIns(): void {
    // Run every 30 minutes: 0 */30 * * * * (every 30 minutes)
    this.checkInTask = cron.schedule('0 */30 * * * *', async () => {
      await this.performCheckIn();
    }, {
      scheduled: true,
      timezone: 'Asia/Karachi' // Adjust to your timezone
    });

    console.log('📅 Scheduled check-ins every 30 minutes');
  }

  /**
   * Perform a check-in: ask user what they're doing
   */
  private async performCheckIn(): Promise<void> {
    try {
      const now = moment();
      const currentTime = now.format('HH:mm');
      
      // Check if we're within active hours
      if (!this.isActiveTime(currentTime)) {
        console.log(`😴 Outside active hours (${currentTime}), skipping check-in`);
        return;
      }

      const timeSlot = this.generateTimeSlot(now);
      const plannedActivity = await this.getPlannedActivity(now);
      
      // Create check-in message
      const checkInMessage = this.createCheckInMessage(timeSlot, plannedActivity);
      
      // Send WhatsApp message
      await this.whatsappService.sendMessage(this.recipientPhone, checkInMessage);
      
      // Store pending response
      this.pendingResponses.set(timeSlot, {
        timeSlot,
        timestamp: now.toDate()
      });

      console.log(`✅ Check-in sent for ${timeSlot}`);
      
      // Auto-timeout after 25 minutes if no response
      setTimeout(() => {
        this.handleTimeout(timeSlot);
      }, 25 * 60 * 1000); // 25 minutes

    } catch (error) {
      console.error('❌ Failed to perform check-in:', error);
    }
  }

  /**
   * Check if current time is within active hours
   */
  private isActiveTime(currentTime: string): boolean {
    const wake = moment(this.wakeTime, 'HH:mm A');
    const sleep = moment(this.sleepTime, 'HH:mm A');
    const current = moment(currentTime, 'HH:mm');
    
    return current.isBetween(wake, sleep) || current.isSame(wake) || current.isSame(sleep);
  }

  /**
   * Generate time slot string (e.g., "2:00 PM - 2:30 PM")
   */
  private generateTimeSlot(now: moment.Moment): string {
    const startTime = now.format('h:mm A');
    const endTime = now.add(30, 'minutes').format('h:mm A');
    return `${startTime} - ${endTime}`;
  }

  /**
   * Get planned activity for this time slot
   */
  private async getPlannedActivity(time: moment.Moment): Promise<string> {
    try {
      const todaySchedule = await this.timetableParser.getTodaySchedule();
      const currentTimeStr = time.format('h:mm A');
      
      // Find matching time slot in timetable
      const matchingEntry = todaySchedule.find((entry: any) => {
        const entryStartTime = entry.timeSlot.split(' to ')[0].trim();
        return entryStartTime === currentTimeStr;
      });
      
      return matchingEntry ? matchingEntry.activity : 'Free time';
    } catch (error) {
      console.error('⚠️ Could not get planned activity:', error);
      return 'Free time';
    }
  }

  /**
   * Create check-in message for WhatsApp
   */
  private createCheckInMessage(timeSlot: string, plannedActivity: string): string {
    return `🕐 **BarakahTracker Check-in**

**Time:** ${timeSlot}
**Planned:** ${plannedActivity}

**What are you actually doing right now?**

Please reply with:
• Your current activity
• Optional: Add mood emoji (😊😐😔😤😴💪🤔)
• Optional: Add notes

*Example: "Working on project ⚡ 💪 - making good progress"*

Reply within 25 minutes to be recorded! ⏰`;
  }

  /**
   * Handle user response to check-in
   */
  public async handleResponse(userMessage: string, timeSlot?: string): Promise<string> {
    try {
      // If no specific timeSlot provided, use the most recent pending one
      let activeTimeSlot: string;
      if (!timeSlot) {
        const pendingSlots = Array.from(this.pendingResponses.keys());
        if (pendingSlots.length === 0) {
          return "No active check-in found. Type 'status' to see your daily progress.";
        }
        activeTimeSlot = pendingSlots[pendingSlots.length - 1] || '';
      } else {
        activeTimeSlot = timeSlot;
      }

      // Remove from pending
      this.pendingResponses.delete(activeTimeSlot);

      // Parse response (extract activity, mood, notes)
      const parsedResponse = this.parseUserResponse(userMessage);

      // Store in database
      await this.storeActivity(activeTimeSlot, parsedResponse.activity, parsedResponse.mood, parsedResponse.notes);

      return `✅ **Activity Recorded!**

**Time:** ${activeTimeSlot}
**Activity:** ${parsedResponse.activity}
**Mood:** ${parsedResponse.mood}
${parsedResponse.notes ? `**Notes:** ${parsedResponse.notes}` : ''}

Great job staying on track! 🎯`;

    } catch (error) {
      console.error('❌ Failed to handle response:', error);
      return 'Sorry, there was an error recording your activity. Please try again.';
    }
  }

  /**
   * Parse user response to extract activity, mood, and notes
   */
  private parseUserResponse(message: string): { activity: string; mood: string; notes: string } {
    const moodEmojis = ['😊', '😐', '😔', '😤', '😴', '💪', '🤔'];
    
    let activity = message.trim();
    let mood = '😐'; // default
    let notes = '';

    // Extract mood emoji
    const foundMood = moodEmojis.find(emoji => message.includes(emoji));
    if (foundMood) {
      mood = foundMood;
      activity = activity.replace(foundMood, '').trim();
    }

    // Split activity and notes (if contains " - ")
    const parts = activity.split(' - ');
    if (parts.length > 1 && parts[0]) {
      activity = parts[0].trim();
      notes = parts.slice(1).join(' - ').trim();
    }

    return { activity, mood, notes };
  }

  /**
   * Store activity in database
   */
  private async storeActivity(timeSlot: string, activity: string, mood: string, notes: string): Promise<void> {
    try {
      // Get or create today's tracking document
      const tracking = await DailyTracking.findOrCreateToday();
      
      // Update the entry
      await tracking.updateEntry(timeSlot, activity, mood, notes);
      
      console.log(`💾 Stored activity for ${timeSlot}: ${activity} ${mood}`);
    } catch (error) {
      console.error('❌ Failed to store activity:', error);
      throw error;
    }
  }

  /**
   * Handle timeout if user doesn't respond
   */
  private handleTimeout(timeSlot: string): void {
    if (this.pendingResponses.has(timeSlot)) {
      this.pendingResponses.delete(timeSlot);
      console.log(`⏰ Check-in timeout for ${timeSlot}`);
      
      // Optionally send reminder
      this.whatsappService.sendMessage(
        this.recipientPhone,
        `⏰ **Missed Check-in**\n\nYou missed the check-in for ${timeSlot}.\n\nNo worries! The next check-in is in 30 minutes. Stay focused! 💪`
      ).catch(console.error);
    }
  }

  /**
   * Initialize today's tracking document with planned schedule
   */
  private async initializeTodayTracking(): Promise<void> {
    try {
      const tracking = await DailyTracking.findOrCreateToday();
      const todaySchedule = await this.timetableParser.getTodaySchedule();

      // Add planned activities to tracking document if not already present
      for (const scheduleEntry of todaySchedule) {
        const existingEntry = tracking.entries.find((e: ITimeEntry) => e.timeSlot === scheduleEntry.timeSlot);
        if (!existingEntry) {
          tracking.entries.push({
            timeSlot: scheduleEntry.timeSlot,
            timestamp: new Date(),
            plannedActivity: scheduleEntry.activity,
            actualActivity: '',
            isCompleted: false,
            mood: '😐',
            notes: ''
          });
        }
      }

      await tracking.save();
      console.log('📅 Today\'s tracking initialized with planned schedule');
      
    } catch (error) {
      console.error('❌ Failed to initialize tracking:', error);
    }
  }

  /**
   * Get daily summary
   */
  public async getDailySummary(): Promise<string> {
    try {
      const tracking = await DailyTracking.findOrCreateToday();
      const summary = tracking.getSummary();
      
      return `📊 **Daily Summary**

**Date:** ${moment(summary.date).format('MMMM Do, YYYY')}
**Completion Rate:** ${summary.completionRate.toFixed(1)}%
**Completed:** ${summary.completedSlots}/${summary.totalSlots} time slots
**Pending:** ${summary.pendingSlots} check-ins

Keep up the great work! 🎯`;

    } catch (error) {
      console.error('❌ Failed to get daily summary:', error);
      return 'Sorry, could not generate daily summary.';
    }
  }

  /**
   * Get status information
   */
  public getStatus(): {
    isRunning: boolean;
    activeHours: string;
    pendingCheckIns: number;
    nextCheckIn: string;
  } {
    const nextCheckIn = moment().add(30, 'minutes').startOf('hour').add(Math.floor(moment().minute() / 30) * 30 + 30, 'minutes');
    
    return {
      isRunning: this.isRunning,
      activeHours: `${this.wakeTime} - ${this.sleepTime}`,
      pendingCheckIns: this.pendingResponses.size,
      nextCheckIn: nextCheckIn.format('h:mm A')
    };
  }
}