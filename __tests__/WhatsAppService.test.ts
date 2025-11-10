import { MockWhatsAppService, WhatsAppServiceFactory } from '../src/services/WhatsAppService';
import { WhatsAppConfig } from '../src/types';

describe('WhatsAppService', () => {
  describe('MockWhatsAppService', () => {
    let mockService: MockWhatsAppService;
    let mockConfig: WhatsAppConfig;

    beforeEach(() => {
      mockConfig = {
        isMock: true,
        phoneNumber: '+1234567890'
      };
      mockService = new MockWhatsAppService(mockConfig);
    });

    test('should initialize successfully', async () => {
      expect(mockService.isConnected()).toBe(false);
      
      await mockService.initialize();
      
      expect(mockService.isConnected()).toBe(true);
    });

    test('should send message successfully', async () => {
      await mockService.initialize();
      
      const result = await mockService.sendMessage('+1234567890', 'Test message');
      
      expect(result.success).toBe(true);
      expect(result.recipient).toBe('+1234567890');
      expect(result.message).toBe('Test message');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    test('should track sent messages', async () => {
      await mockService.initialize();
      
      expect(mockService.getMessageCount()).toBe(0);
      
      await mockService.sendMessage('+1234567890', 'Message 1');
      await mockService.sendMessage('+1234567890', 'Message 2');
      
      expect(mockService.getMessageCount()).toBe(2);
      
      const sentMessages = mockService.getSentMessages();
      expect(sentMessages).toHaveLength(2);
      expect(sentMessages[0]?.message).toBe('Message 1');
      expect(sentMessages[1]?.message).toBe('Message 2');
    });

    test('should clear sent messages', async () => {
      await mockService.initialize();
      
      await mockService.sendMessage('+1234567890', 'Test message');
      expect(mockService.getMessageCount()).toBe(1);
      
      mockService.clearSentMessages();
      expect(mockService.getMessageCount()).toBe(0);
      expect(mockService.getSentMessages()).toHaveLength(0);
    });

    test('should throw error when sending without initialization', async () => {
      await expect(mockService.sendMessage('+1234567890', 'Test'))
        .rejects.toThrow('WhatsApp service not initialized');
    });

    test('should disconnect successfully', async () => {
      await mockService.initialize();
      expect(mockService.isConnected()).toBe(true);
      
      await mockService.disconnect();
      expect(mockService.isConnected()).toBe(false);
    });
  });

  describe('WhatsAppServiceFactory', () => {
    test('should create MockWhatsAppService when isMock is true', () => {
      const config: WhatsAppConfig = {
        isMock: true,
        phoneNumber: '+1234567890'
      };
      
      const service = WhatsAppServiceFactory.create(config);
      expect(service).toBeInstanceOf(MockWhatsAppService);
    });

    test('should create MockWhatsAppService when apiKey is not provided and mock is true', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: true
        // No apiKey provided
      };
      
      const service = WhatsAppServiceFactory.create(config);
      expect(service).toBeInstanceOf(MockWhatsAppService);
    });

    test('should create Mock service when Business API not configured', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,
        apiKey: 'test_key'
      };
      
      const service = WhatsAppServiceFactory.create(config);
      // Should fallback to Mock service since RealWhatsAppService was removed to save memory
      expect(service).toBeInstanceOf(MockWhatsAppService);
    });

    test('should prioritize Business API when both useWhatsAppWeb and useBusinessAPI are true', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,
        useWhatsAppWeb: true,
        useBusinessAPI: true,  // This should take priority
        accessToken: 'test_token',  // Required for Business API
        phoneNumberId: 'test_phone_id'  // Required for Business API
      };
      
      const service = WhatsAppServiceFactory.create(config);
      // Business API should take priority over WhatsApp Web (and save 270MB memory)
      expect(service.constructor.name).toBe('WhatsAppBusinessServiceAdapter');
    });

    test('should use mock mode when Business API credentials are missing', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,
        useWhatsAppWeb: false,
        useBusinessAPI: true  // Missing credentials should fallback
      };
      
      // This should fallback to mock since credentials are missing
      expect(() => WhatsAppServiceFactory.create(config)).toThrow('WhatsApp Business Access Token is required');
    });

    test('should use Business API in mock mode', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: true,  // Mock mode should use MockWhatsAppService regardless
        useBusinessAPI: true
      };
      
      const service = WhatsAppServiceFactory.create(config);
      // Mock mode always returns MockWhatsAppService for testing
      expect(service.constructor.name).toBe('MockWhatsAppService');
    });

    test('should use Business API when not in mock mode with credentials', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,  // Not mock mode
        useBusinessAPI: true,
        accessToken: 'test_token',
        phoneNumberId: 'test_phone_id'
      };
      
      const service = WhatsAppServiceFactory.create(config);
      expect(service.constructor.name).toBe('WhatsAppBusinessServiceAdapter');
    });
  });

  // RealWhatsAppService tests removed - service disabled to save 270MB memory
  // WhatsApp functionality now provided by ultra-lightweight Business Platform API
});