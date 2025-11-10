export interface TimetableEntry {
  timeSlot: string;
  activity: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface ReminderConfig {
  minutesBefore: number;
  message?: string | undefined;
}

export interface WhatsAppConfig {
  apiKey?: string | undefined;
  phoneNumber?: string | undefined;
  isMock?: boolean;
  useWhatsAppWeb?: boolean;
  sessionName?: string;
  useMongoAuth?: boolean; // Enable MongoDB-based authentication persistence
}

export interface ChatBotConfig {
  timetableFile: string;
  reminderConfig: ReminderConfig;
  whatsappConfig: WhatsAppConfig;
}

export interface ParsedTimetable {
  entries: TimetableEntry[];
  metadata: {
    totalEntries: number;
    dateRange: string;
    lastUpdated: Date;
  };
}