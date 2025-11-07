import * as dotenv from 'dotenv';
import { ChatBotConfig, ReminderConfig, WhatsAppConfig } from '../types';

// Load environment variables
dotenv.config();

export class ConfigService {
  private static instance: ConfigService;
  private config: ChatBotConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  private loadConfig(): ChatBotConfig {
    const reminderConfig: ReminderConfig = {
      minutesBefore: parseInt(process.env.REMINDER_MINUTES_BEFORE || '15', 10),
      message: process.env.CUSTOM_REMINDER_MESSAGE
    };

    const whatsappConfig: WhatsAppConfig = {
      apiKey: process.env.WHATSAPP_API_KEY,
      phoneNumber: process.env.WHATSAPP_PHONE_NUMBER || process.env.RECIPIENT_PHONE || '+1234567890',
      isMock: process.env.USE_MOCK_WHATSAPP === 'true',
      useWhatsAppWeb: process.env.USE_WHATSAPP_WEB === 'true',
      sessionName: process.env.WHATSAPP_SESSION_NAME || 'cute99-assistant'
    };

    return {
      timetableFile: process.env.TIMETABLE_FILE || 'muneeb-timetable.csv',
      reminderConfig,
      whatsappConfig
    };
  }

  public getConfig(): ChatBotConfig {
    return { ...this.config };
  }

  public getReminderConfig(): ReminderConfig {
    return { ...this.config.reminderConfig };
  }

  public getWhatsAppConfig(): WhatsAppConfig {
    return { ...this.config.whatsappConfig };
  }

  public getTimetableFile(): string {
    return this.config.timetableFile;
  }

  public getRecipientPhone(): string {
    return this.config.whatsappConfig.phoneNumber || '+1234567890';
  }

  public isMockMode(): boolean {
    return this.config.whatsappConfig.isMock || false;
  }

  public updateConfig(newConfig: Partial<ChatBotConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public static createDefaultConfig(): ChatBotConfig {
    return {
      timetableFile: 'muneeb-timetable.csv',
      reminderConfig: {
        minutesBefore: 15,
        message: undefined
      },
      whatsappConfig: {
        phoneNumber: '+1234567890',
        isMock: true,
        useWhatsAppWeb: false,
        sessionName: 'cute99-assistant'
      }
    };
  }

  public validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check timetable file
    if (!this.config.timetableFile || this.config.timetableFile.trim() === '') {
      errors.push('Timetable file path is required');
    }

    // Check reminder config
    if (this.config.reminderConfig.minutesBefore < 0 || this.config.reminderConfig.minutesBefore > 120) {
      errors.push('Reminder minutes should be between 0 and 120');
    }

    // Check WhatsApp config
    if (!this.config.whatsappConfig.isMock && 
        !this.config.whatsappConfig.useWhatsAppWeb && 
        !this.config.whatsappConfig.apiKey) {
      errors.push('WhatsApp API key is required when not using mock mode or WhatsApp Web');
    }

    if (!this.config.whatsappConfig.phoneNumber || this.config.whatsappConfig.phoneNumber.trim() === '') {
      errors.push('Recipient phone number is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public printConfig(): void {
    console.log('🔧 Current Configuration:');
    console.log(`   📁 Timetable File: ${this.config.timetableFile}`);
    console.log(`   ⏰ Reminder Minutes Before: ${this.config.reminderConfig.minutesBefore}`);
    console.log(`   📱 Recipient Phone: ${this.config.whatsappConfig.phoneNumber}`);
    console.log(`   🧪 Mock Mode: ${this.config.whatsappConfig.isMock ? 'ON' : 'OFF'}`);
    
    if (this.config.reminderConfig.message) {
      console.log(`   💬 Custom Message: ${this.config.reminderConfig.message}`);
    }
    
    console.log('   ─────────────────────────────────────');
  }
}