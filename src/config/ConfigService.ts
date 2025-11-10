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
      sessionName: process.env.WHATSAPP_SESSION_NAME || 'cute99-assistant',
      useMongoAuth: process.env.USE_MONGO_AUTH === 'true' || false,
      // WhatsApp Business Platform (ultra-lightweight option)
      useBusinessAPI: process.env.USE_BUSINESS_API === 'true',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0'
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

  public getMongoUrl(): string {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is required');
    }
    return mongoUrl;
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
        sessionName: 'cute99-assistant',
        useMongoAuth: process.env.USE_MONGO_AUTH === 'true' || false
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

  /**
   * Validate critical environment variables and provide helpful setup instructions
   */
  public validateEnvironmentVariables(): { valid: boolean; missing: string[]; instructions: string[] } {
    const missing: string[] = [];
    const instructions: string[] = [];

    // Define critical environment variables with their descriptions
    const criticalEnvVars = [
      {
        name: 'WHATSAPP_PHONE_NUMBER',
        value: process.env.WHATSAPP_PHONE_NUMBER,
        description: 'Your WhatsApp phone number (recipient of reminders)',
        example: '+1234567890',
        required: true
      },
      {
        name: 'TIMETABLE_FILE', 
        value: process.env.TIMETABLE_FILE,
        description: 'Path to your CSV timetable file',
        example: 'my-timetable.csv',
        required: true
      },
      {
        name: 'MONGO_URL',
        value: process.env.MONGO_URL,
        description: 'MongoDB connection string for activity tracking',
        example: 'mongodb+srv://user:password@cluster.mongodb.net/database',
        required: true
      },
      {
        name: 'REMINDER_MINUTES_BEFORE',
        value: process.env.REMINDER_MINUTES_BEFORE,
        description: 'Minutes before each activity to send reminder',
        example: '15',
        required: false,
        default: '15'
      },
      {
        name: 'USE_MOCK_WHATSAPP',
        value: process.env.USE_MOCK_WHATSAPP,
        description: 'Whether to use mock WhatsApp (for testing)',
        example: 'false',
        required: false,
        default: 'false'
      },
      {
        name: 'NODE_ENV',
        value: process.env.NODE_ENV,
        description: 'Application environment',
        example: 'production',
        required: false,
        default: 'development'
      }
    ];

    // Check each environment variable
    for (const envVar of criticalEnvVars) {
      if (envVar.required && (!envVar.value || envVar.value.trim() === '')) {
        missing.push(envVar.name);
        instructions.push(
          `❌ ${envVar.name}: ${envVar.description}\n` +
          `   💡 Example: ${envVar.name}="${envVar.example}"`
        );
      } else if (!envVar.required && !envVar.value) {
        instructions.push(
          `⚠️  ${envVar.name}: ${envVar.description} (Optional)\n` +
          `   💡 Example: ${envVar.name}="${envVar.example}"\n` +
          `   🔧 Default: "${envVar.default}"`
        );
      }
    }

    // Add production-specific checks
    if (process.env.NODE_ENV === 'production') {
      const prodEnvVars = [
        {
          name: 'PORT',
          value: process.env.PORT,
          description: 'Server port (usually provided by hosting platform)',
          required: false
        }
      ];

      for (const envVar of prodEnvVars) {
        if (!envVar.value) {
          instructions.push(
            `ℹ️  ${envVar.name}: ${envVar.description} (Production only)`
          );
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      instructions
    };
  }

  /**
   * Display comprehensive setup instructions for missing environment variables
   */
  public displayEnvironmentSetupInstructions(): void {
    const validation = this.validateEnvironmentVariables();

    if (validation.valid) {
      console.log('✅ All critical environment variables are properly configured!');
      return;
    }

    console.log('\n🚨 ENVIRONMENT SETUP REQUIRED');
    console.log('══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  Critical environment variables are missing or invalid!');
    console.log('');
    console.log('📋 REQUIRED ENVIRONMENT VARIABLES:');
    console.log('');

    validation.instructions.forEach(instruction => {
      console.log(instruction);
      console.log('');
    });

    console.log('🛠️  HOW TO FIX:');
    console.log('');
    console.log('1️⃣  Create/Update .env file in your project root:');
    console.log('');
    console.log('   touch .env');
    console.log('');
    console.log('2️⃣  Add the missing variables to your .env file:');
    console.log('');
    
    validation.missing.forEach(varName => {
      const envVar = this.getEnvironmentVariableInfo(varName);
      console.log(`   echo '${varName}="${envVar.example}"' >> .env`);
    });

    console.log('');
    console.log('3️⃣  Update the example values with your actual configuration');
    console.log('');
    console.log('4️⃣  Restart the application');
    console.log('');
    console.log('📚 ADDITIONAL HELP:');
    console.log('');
    console.log('   📱 WhatsApp Setup: Check WHATSAPP_SETUP.md');
    console.log('   🗃️  MongoDB Setup: Create free cluster at mongodb.com/atlas');
    console.log('   📄 CSV Timetable: Create your schedule in CSV format');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════');
  }

  /**
   * Get detailed information about a specific environment variable
   */
  private getEnvironmentVariableInfo(varName: string): { example: string; description: string } {
    const envVarMap: { [key: string]: { example: string; description: string } } = {
      'WHATSAPP_PHONE_NUMBER': {
        example: '+1234567890',
        description: 'Your WhatsApp phone number (recipient of reminders)'
      },
      'TIMETABLE_FILE': {
        example: 'my-timetable.csv',
        description: 'Path to your CSV timetable file'
      },
      'MONGO_URL': {
        example: 'mongodb+srv://user:password@cluster.mongodb.net/database',
        description: 'MongoDB connection string for activity tracking'
      },
      'REMINDER_MINUTES_BEFORE': {
        example: '15',
        description: 'Minutes before each activity to send reminder'
      },
      'USE_MOCK_WHATSAPP': {
        example: 'false',
        description: 'Whether to use mock WhatsApp (for testing)'
      }
    };

    return envVarMap[varName] || { example: 'value', description: 'Environment variable' };
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