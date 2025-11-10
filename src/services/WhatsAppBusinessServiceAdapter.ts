import { WhatsAppBusinessService } from './WhatsAppBusinessService';
import { WhatsAppConfig } from '../types';
import { IWhatsAppService, WhatsAppMessage } from './WhatsAppService';

/**
 * Adapter for WhatsApp Business Platform Service
 * Provides IWhatsAppService interface for the ultra-lightweight Business API
 */
export class WhatsAppBusinessServiceAdapter implements IWhatsAppService {
  private businessService: WhatsAppBusinessService;
  private phoneNumber: string;

  constructor(config: WhatsAppConfig) {
    this.phoneNumber = config.phoneNumber || '';
    
    // Validate required Business Platform configuration
    if (!config.isMock && config.useBusinessAPI) {
      if (!config.accessToken) {
        throw new Error('WhatsApp Business Access Token is required when useBusinessAPI is true');
      }
      if (!config.phoneNumberId) {
        throw new Error('WhatsApp Business Phone Number ID is required when useBusinessAPI is true');
      }
    }
    
    this.businessService = new WhatsAppBusinessService({
      phoneNumber: this.phoneNumber,
      useMock: config.isMock || false,
      accessToken: config.accessToken || '',
      phoneNumberId: config.phoneNumberId || '',
      webhookVerifyToken: config.webhookVerifyToken || 'default_verify_token',
      apiVersion: config.apiVersion || 'v21.0'
    });
  }

  public setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.businessService.setOnReadyCallback(callback);
  }

  public async initialize(): Promise<void> {
    await this.businessService.initialize();
  }

  public async sendMessage(recipient: string, message: string): Promise<WhatsAppMessage> {
    try {
      const success = await this.businessService.sendMessage(recipient, message);
      
      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message,
        timestamp: new Date(),
        success
      };

      if (success) {
        console.log(`✅ WhatsApp Business Platform message sent to ${recipient}: ${message}`);
      } else {
        console.error(`❌ Failed to send WhatsApp Business Platform message to ${recipient}`);
      }

      return whatsAppMessage;
    } catch (error) {
      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.error(`❌ Failed to send WhatsApp Business Platform message:`, error);
      return whatsAppMessage;
    }
  }

  public isConnected(): boolean {
    return this.businessService.isClientReady();
  }

  public async disconnect(): Promise<void> {
    await this.businessService.disconnect();
  }

  /**
   * Get the underlying WhatsApp Business service for advanced operations
   */
  public getBusinessService(): WhatsAppBusinessService {
    return this.businessService;
  }

  /**
   * Send a template message (Business Platform specific)
   */
  public async sendTemplate(recipient: string, templateName: string, components?: any[]): Promise<WhatsAppMessage> {
    try {
      const success = await this.businessService.sendTemplate(recipient, templateName, components);
      
      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message: `Template: ${templateName}`,
        timestamp: new Date(),
        success
      };

      return whatsAppMessage;
    } catch (error) {
      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message: `Template: ${templateName}`,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      return whatsAppMessage;
    }
  }

  /**
   * Get memory usage (should be very low with Business Platform)
   */
  public getMemoryUsage(): { rss: number; heapUsed: number } {
    return this.businessService.getMemoryUsage();
  }
}