import { MockWhatsAppService, RealWhatsAppService, WhatsAppServiceFactory } from '../src/services/WhatsAppService';
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

    test('should create RealWhatsAppService when isMock is false and apiKey is provided', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,
        apiKey: 'test_key'
      };
      
      const service = WhatsAppServiceFactory.create(config);
      expect(service).toBeInstanceOf(RealWhatsAppService);
    });

    test('should create WhatsAppWebServiceAdapter when useWhatsAppWeb is true', () => {
      const config: WhatsAppConfig = {
        phoneNumber: '+1234567890',
        isMock: false,
        useWhatsAppWeb: true
      };
      
      const service = WhatsAppServiceFactory.create(config);
      expect(service.constructor.name).toBe('WhatsAppWebServiceAdapter');
    });
  });

  describe('RealWhatsAppService', () => {
    let realService: RealWhatsAppService;
    let realConfig: WhatsAppConfig;

    beforeEach(() => {
      realConfig = {
        isMock: false,
        apiKey: 'test-api-key',
        phoneNumber: '+1234567890'
      };
      realService = new RealWhatsAppService(realConfig);
    });

    test('should be initially disconnected', () => {
      expect(realService.isConnected()).toBe(false);
    });

    // Note: Real WhatsApp service tests are limited because they require actual WhatsApp connection
    // which is not feasible in unit tests. We mainly test the interface and basic functionality.
    
    test('should handle disconnect when not connected', async () => {
      // Should not throw error
      await expect(realService.disconnect()).resolves.toBeUndefined();
    });
  });
});