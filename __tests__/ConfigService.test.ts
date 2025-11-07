import { ConfigService } from '../src/config/ConfigService';
import { ChatBotConfig } from '../src/types';

describe('ConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables for clean testing
    delete process.env.REMINDER_MINUTES_BEFORE;
    delete process.env.CUSTOM_REMINDER_MESSAGE;
    delete process.env.WHATSAPP_API_KEY;
    delete process.env.WHATSAPP_PHONE_NUMBER;
    delete process.env.RECIPIENT_PHONE;
    delete process.env.USE_MOCK_WHATSAPP;
    delete process.env.TIMETABLE_FILE;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clear singleton instance for next test
    (ConfigService as any).instance = undefined;
  });

  describe('getInstance', () => {
    test('should return singleton instance', () => {
      const instance1 = ConfigService.getInstance();
      const instance2 = ConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadConfig with default values', () => {
    test('should load default configuration', () => {
      const configService = ConfigService.getInstance();
      const config = configService.getConfig();
      
      expect(config.reminderConfig.minutesBefore).toBe(15);
      expect(config.whatsappConfig.isMock).toBe(false);
      expect(config.timetableFile).toBe('muneeb-timetable.csv');
    });
  });

  describe('loadConfig with environment variables', () => {
    test('should load configuration from environment variables', () => {
      // Set environment variables
      process.env.REMINDER_MINUTES_BEFORE = '30';
      process.env.CUSTOM_REMINDER_MESSAGE = 'Custom reminder: {activity}';
      process.env.WHATSAPP_API_KEY = 'test-api-key';
      process.env.RECIPIENT_PHONE = '+9876543210';
      process.env.USE_MOCK_WHATSAPP = 'false';
      process.env.TIMETABLE_FILE = 'custom-timetable.csv';
      
      const configService = ConfigService.getInstance();
      const config = configService.getConfig();
      
      expect(config.reminderConfig.minutesBefore).toBe(30);
      expect(config.reminderConfig.message).toBe('Custom reminder: {activity}');
      expect(config.whatsappConfig.apiKey).toBe('test-api-key');
      expect(config.whatsappConfig.phoneNumber).toBe('+9876543210');
      expect(config.whatsappConfig.isMock).toBe(false);
      expect(config.timetableFile).toBe('custom-timetable.csv');
    });
  });

  describe('getter methods', () => {
    beforeEach(() => {
      process.env.REMINDER_MINUTES_BEFORE = '25';
      process.env.RECIPIENT_PHONE = '+1111111111';
      process.env.WHATSAPP_API_KEY = 'test-key';
    });

    test('should return reminder config', () => {
      const configService = ConfigService.getInstance();
      const reminderConfig = configService.getReminderConfig();
      
      expect(reminderConfig.minutesBefore).toBe(25);
    });

    test('should return whatsapp config', () => {
      const configService = ConfigService.getInstance();
      const whatsappConfig = configService.getWhatsAppConfig();
      
      expect(whatsappConfig.apiKey).toBe('test-key');
      expect(whatsappConfig.phoneNumber).toBe('+1111111111');
    });

    test('should return recipient phone', () => {
      const configService = ConfigService.getInstance();
      const phone = configService.getRecipientPhone();
      
      expect(phone).toBe('+1111111111');
    });

    test('should return timetable file', () => {
      process.env.TIMETABLE_FILE = 'test.csv';
      
      const configService = ConfigService.getInstance();
      const file = configService.getTimetableFile();
      
      expect(file).toBe('test.csv');
    });

    test('should return mock mode status', () => {
      process.env.USE_MOCK_WHATSAPP = 'true';
      
      const configService = ConfigService.getInstance();
      const isMock = configService.isMockMode();
      
      expect(isMock).toBe(true);
    });
  });

  describe('updateConfig', () => {
    test('should update configuration', () => {
      const configService = ConfigService.getInstance();
      
      const newConfig: Partial<ChatBotConfig> = {
        reminderConfig: {
          minutesBefore: 45,
          message: 'Updated message'
        }
      };
      
      configService.updateConfig(newConfig);
      const config = configService.getConfig();
      
      expect(config.reminderConfig.minutesBefore).toBe(45);
      expect(config.reminderConfig.message).toBe('Updated message');
    });
  });

  describe('createDefaultConfig', () => {
    test('should create default configuration', () => {
      const defaultConfig = ConfigService.createDefaultConfig();
      
      expect(defaultConfig.timetableFile).toBe('muneeb-timetable.csv');
      expect(defaultConfig.reminderConfig.minutesBefore).toBe(15);
      expect(defaultConfig.whatsappConfig.isMock).toBe(true);
      expect(defaultConfig.whatsappConfig.phoneNumber).toBe('+1234567890');
    });
  });

  describe('validateConfig', () => {
    test('should validate valid configuration', () => {
      process.env.TIMETABLE_FILE = 'test.csv';
      process.env.REMINDER_MINUTES_BEFORE = '15';
      process.env.USE_MOCK_WHATSAPP = 'true';
      process.env.RECIPIENT_PHONE = '+1234567890';
      
      const configService = ConfigService.getInstance();
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should invalidate configuration with missing timetable file', () => {
      const configService = ConfigService.getInstance();
      
      // Update config to have empty timetable file
      configService.updateConfig({ timetableFile: '' });
      
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Timetable file path is required');
    });

    test('should invalidate configuration with invalid reminder minutes', () => {
      process.env.REMINDER_MINUTES_BEFORE = '-10';
      
      const configService = ConfigService.getInstance();
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Reminder minutes should be between 0 and 120');
    });

    test('should invalidate configuration without API key in non-mock mode', () => {
      const configService = ConfigService.getInstance();
      
      // Update config to non-mock mode without API key
      configService.updateConfig({ 
        whatsappConfig: { 
          isMock: false,
          phoneNumber: '+1234567890'
          // No apiKey provided
        } 
      });
      
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('WhatsApp API key is required when not using mock mode or WhatsApp Web');
    });

    test('should invalidate configuration without phone number', () => {
      delete process.env.RECIPIENT_PHONE;
      delete process.env.WHATSAPP_PHONE_NUMBER;
      
      const configService = ConfigService.getInstance();
      configService.updateConfig({
        whatsappConfig: {
          phoneNumber: undefined,
          isMock: true
        }
      });
      
      const validation = configService.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Recipient phone number is required');
    });
  });
});