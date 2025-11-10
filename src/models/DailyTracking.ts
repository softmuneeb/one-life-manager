import mongoose, { Document, Schema } from 'mongoose';

// Interface for daily tracking entries
export interface IDailyTracking extends Document {
  date: Date;
  userId: string; // For future multi-user support
  entries: ITimeEntry[];
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateEntry(timeSlot: string, actualActivity: string, mood?: string, notes?: string): Promise<IDailyTracking>;
  getCompletionRate(): number;
  getSummary(): {
    date: Date;
    totalSlots: number;
    completedSlots: number;
    pendingSlots: number;
    completionRate: number;
    lastUpdate: Date;
  };
}

// Interface for individual time entries
export interface ITimeEntry {
  timeSlot: string; // "05:00 AM - 05:30 AM" 
  timestamp: Date;
  plannedActivity: string; // From CSV timetable
  actualActivity: string; // User's response to 30-min check-in
  isCompleted: boolean; // Whether user responded to this time slot
  mood?: string; // Optional mood tracking
  notes?: string; // Optional additional notes
}

// Time Entry Schema
const TimeEntrySchema = new Schema<ITimeEntry>({
  timeSlot: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  plannedActivity: {
    type: String,
    required: true
  },
  actualActivity: {
    type: String,
    default: ''
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  mood: {
    type: String,
    enum: ['😊', '😐', '😔', '😤', '😴', '💪', '🤔'],
    default: '😐'
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: false });

// Static methods interface
interface IDailyTrackingModel extends mongoose.Model<IDailyTracking> {
  findOrCreateToday(userId?: string): Promise<IDailyTracking>;
  getByDate(date: Date, userId?: string): Promise<IDailyTracking | null>;
  getStats(startDate: Date, endDate: Date, userId?: string): Promise<any>;
}

// Daily Tracking Schema
const DailyTrackingSchema = new Schema<IDailyTracking>({
  date: {
    type: Date,
    required: true,
    index: true,
    unique: false // Allow multiple users same date
  },
  userId: {
    type: String,
    required: true,
    default: 'muneeb', // Default user ID
    index: true
  },
  entries: [TimeEntrySchema]
}, {
  timestamps: true,
  collection: 'dailyTracking'
});

// Compound index for efficient queries
DailyTrackingSchema.index({ date: 1, userId: 1 }, { unique: true });
DailyTrackingSchema.index({ 'entries.timestamp': 1 });
DailyTrackingSchema.index({ 'entries.isCompleted': 1 });

// Static methods for the model
DailyTrackingSchema.statics = {
  /**
   * Find or create today's tracking document
   */
  async findOrCreateToday(userId: string = 'muneeb'): Promise<IDailyTracking> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let tracking = await this.findOne({ date: today, userId });
    
    if (!tracking) {
      tracking = new this({
        date: today,
        userId,
        entries: []
      });
      await tracking.save();
    }
    
    return tracking;
  },

  /**
   * Get tracking data for a specific date
   */
  async getByDate(date: Date, userId: string = 'muneeb'): Promise<IDailyTracking | null> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return this.findOne({ date: targetDate, userId });
  },

  /**
   * Get tracking stats for a date range
   */
  async getStats(startDate: Date, endDate: Date, userId: string = 'muneeb') {
    return this.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$entries'
      },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          completedEntries: {
            $sum: { $cond: ['$entries.isCompleted', 1, 0] }
          },
          completionRate: {
            $avg: { $cond: ['$entries.isCompleted', 1, 0] }
          },
          avgMood: { $push: '$entries.mood' }
        }
      }
    ]);
  }
};

// Instance methods
DailyTrackingSchema.methods = {
  /**
   * Add or update an entry for a specific time slot
   */
  async updateEntry(timeSlot: string, actualActivity: string, mood?: string, notes?: string) {
    const entryIndex = this.entries.findIndex((entry: ITimeEntry) => entry.timeSlot === timeSlot);
    
    if (entryIndex >= 0) {
      // Update existing entry
      this.entries[entryIndex].actualActivity = actualActivity;
      this.entries[entryIndex].isCompleted = true;
      this.entries[entryIndex].timestamp = new Date();
      if (mood) this.entries[entryIndex].mood = mood;
      if (notes) this.entries[entryIndex].notes = notes;
    } else {
      // Create new entry
      this.entries.push({
        timeSlot,
        timestamp: new Date(),
        plannedActivity: '', // Will be populated from timetable
        actualActivity,
        isCompleted: true,
        mood: mood || '😐',
        notes: notes || ''
      });
    }
    
    return this.save();
  },

  /**
   * Get completion percentage for today
   */
  getCompletionRate(): number {
    if (this.entries.length === 0) return 0;
    const completed = this.entries.filter((entry: ITimeEntry) => entry.isCompleted).length;
    return (completed / this.entries.length) * 100;
  },

  /**
   * Get today's summary
   */
  getSummary() {
    const totalSlots = this.entries.length;
    const completedSlots = this.entries.filter((e: ITimeEntry) => e.isCompleted).length;
    const pendingSlots = totalSlots - completedSlots;
    
    return {
      date: this.date,
      totalSlots,
      completedSlots,
      pendingSlots,
      completionRate: this.getCompletionRate(),
      lastUpdate: this.updatedAt
    };
  }
};

// Export the model
export const DailyTracking = mongoose.model<IDailyTracking, IDailyTrackingModel>('DailyTracking', DailyTrackingSchema);