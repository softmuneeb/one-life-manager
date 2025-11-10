import { WhatsAppWebService, WhatsAppWebConfig } from './WhatsAppWebService';
import { IWhatsAppService, WhatsAppMessage } from './WhatsAppService';
import { WhatsAppConfig } from '../types';

export class WhatsAppWebServiceAdapter implements IWhatsAppService {
  private webService: WhatsAppWebService;
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
    
    const webConfig: WhatsAppWebConfig = {
      phoneNumber: config.phoneNumber || '+1234567890',
      useMock: config.isMock || false,
      sessionName: config.sessionName || 'cute99-assistant',
      useMongoAuth: config.useMongoAuth || false // Pass MongoDB auth option
    };
    
    this.webService = new WhatsAppWebService(webConfig);
  }

  setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.webService.setOnReadyCallback(callback);
  }

  async initialize(): Promise<void> {
    await this.webService.initialize();
  }

  async sendMessage(recipient: string, message: string): Promise<WhatsAppMessage> {
    const success = await this.webService.sendMessage(recipient, message);
    
    const result: WhatsAppMessage = {
      recipient,
      message,
      timestamp: new Date(),
      success
    };

    if (!success) {
      result.error = 'Failed to send message';
    }

    return result;
  }

  isConnected(): boolean {
    return this.webService.isConnected();
  }

  async disconnect(): Promise<void> {
    await this.webService.disconnect();
  }

  async sendReminder(phoneNumber: string, subject: string, type: string, time: string, location: string, minutesBefore: number): Promise<boolean> {
    return await this.webService.sendReminder(phoneNumber, subject, type, time, location, minutesBefore);
  }
}