import { WhatsAppConfig } from '../types';
// Removed heavy imports: WhatsAppWebService, WhatsAppWebServiceAdapter, LightWhatsAppWebService
// These required whatsapp-web.js + puppeteer (~270MB total)
import { BaileysWhatsAppService } from './BaileysWhatsAppService';
import { WhatsAppBusinessService } from './WhatsAppBusinessService';
import { WhatsAppBusinessServiceAdapter } from './WhatsAppBusinessServiceAdapter';

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
  setOnReadyCallback?(callback: () => Promise<void> | void): void;
}

export class MockWhatsAppService implements IWhatsAppService {
  private connected = false;
  private sentMessages: WhatsAppMessage[] = [];
  private config: WhatsAppConfig;
  private onReadyCallback?: () => Promise<void> | void;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.onReadyCallback = callback;
  }

  async initialize(): Promise<void> {
    console.log('🔗 Initializing Mock WhatsApp Service...');
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.connected = true;
    console.log('✅ Mock WhatsApp Service initialized successfully');
    
    // Call the ready callback if set
    if (this.onReadyCallback) {
      try {
        await this.onReadyCallback();
      } catch (error) {
        console.error('❌ Error in WhatsApp ready callback (mock):', error);
      }
    }
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

// RealWhatsAppService removed - it required whatsapp-web.js (~270MB with Puppeteer)
// Use WhatsAppBusinessServiceAdapter for production WhatsApp functionality (~4MB)

export class WhatsAppServiceFactory {
  static create(config: WhatsAppConfig): IWhatsAppService {
    if (config.isMock) {
      return new MockWhatsAppService(config);
    } else if (config.useBusinessAPI) {
      // ULTRA LIGHTWEIGHT: WhatsApp Business Platform (only ~4MB, no Puppeteer)
      console.log('🚀 Using WhatsApp Business Platform (ultra-lightweight, ~4MB)');
      return new WhatsAppBusinessServiceAdapter(config);
    } else {
      // FALLBACK: Mock service (old WhatsApp Web removed to save 270MB)
      console.log('🧪 WhatsApp Web removed for memory savings. Using Mock service.');
      console.log('💡 Set USE_BUSINESS_API=true for production WhatsApp functionality');
      return new MockWhatsAppService(config);
    }
  }
}