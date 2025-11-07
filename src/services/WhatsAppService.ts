import { WhatsAppConfig } from '../types';
import { WhatsAppWebService } from './WhatsAppWebService';
import { WhatsAppWebServiceAdapter } from './WhatsAppWebServiceAdapter';

export interface WhatsAppMessage {
  recipient: string;
  message: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface IWhatsAppService {
  initialize(): Promise<void>;
  sendMessage(recipient: string, message: string): Promise<WhatsAppMessage>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export class MockWhatsAppService implements IWhatsAppService {
  private connected = false;
  private sentMessages: WhatsAppMessage[] = [];
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('🔗 Initializing Mock WhatsApp Service...');
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.connected = true;
    console.log('✅ Mock WhatsApp Service initialized successfully');
  }

  async sendMessage(recipient: string, message: string): Promise<WhatsAppMessage> {
    if (!this.connected) {
      throw new Error('WhatsApp service not initialized. Call initialize() first.');
    }

    const whatsAppMessage: WhatsAppMessage = {
      recipient,
      message,
      timestamp: new Date(),
      success: true
    };

    // Simulate message sending delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Store message for testing purposes
    this.sentMessages.push(whatsAppMessage);

    console.log(`📱 MOCK MESSAGE SENT:`);
    console.log(`   To: ${recipient}`);
    console.log(`   Message: ${message}`);
    console.log(`   Timestamp: ${whatsAppMessage.timestamp.toLocaleString()}`);
    console.log(`   ─────────────────────────────────────`);

    return whatsAppMessage;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting Mock WhatsApp Service...');
    this.connected = false;
    console.log('✅ Mock WhatsApp Service disconnected');
  }

  // Mock-specific methods for testing
  getSentMessages(): WhatsAppMessage[] {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  getMessageCount(): number {
    return this.sentMessages.length;
  }
}

export class RealWhatsAppService implements IWhatsAppService {
  private client: any; // WhatsApp Web.js client
  private connected = false;
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // This will be implemented when real WhatsApp API keys are provided
    console.log('🔗 Initializing Real WhatsApp Service...');
    
    // Import WhatsApp Web.js dynamically
    const { Client, LocalAuth } = await import('whatsapp-web.js');
    
    this.client = new Client({
      authStrategy: new LocalAuth()
    });

    return new Promise((resolve, reject) => {
      this.client.on('qr', (qr: string) => {
        console.log('📱 Scan this QR code with your WhatsApp:');
        console.log(qr);
      });

      this.client.on('ready', () => {
        console.log('✅ WhatsApp Client is ready!');
        this.connected = true;
        resolve();
      });

      this.client.on('auth_failure', (msg: string) => {
        console.error('❌ Authentication failure:', msg);
        reject(new Error(`WhatsApp authentication failed: ${msg}`));
      });

      this.client.initialize();
    });
  }

  async sendMessage(recipient: string, message: string): Promise<WhatsAppMessage> {
    if (!this.connected) {
      throw new Error('WhatsApp service not initialized. Call initialize() first.');
    }

    try {
      // Format phone number (assuming recipient is phone number)
      const chatId = `${recipient}@c.us`;
      await this.client.sendMessage(chatId, message);

      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message,
        timestamp: new Date(),
        success: true
      };

      console.log(`📱 WhatsApp message sent to ${recipient}: ${message}`);
      return whatsAppMessage;
    } catch (error) {
      const whatsAppMessage: WhatsAppMessage = {
        recipient,
        message,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      console.error(`❌ Failed to send WhatsApp message:`, error);
      return whatsAppMessage;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.connected = false;
      console.log('✅ WhatsApp client disconnected');
    }
  }
}

export class WhatsAppServiceFactory {
  static create(config: WhatsAppConfig): IWhatsAppService {
    if (config.isMock) {
      return new MockWhatsAppService(config);
    } else if (config.useWhatsAppWeb) {
      return new WhatsAppWebServiceAdapter(config);
    } else {
      return new RealWhatsAppService(config);
    }
  }
}