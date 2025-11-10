import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export interface WhatsAppWebConfig {
  phoneNumber: string;
  useMock: boolean;
  sessionName?: string;
  useMongoAuth?: boolean; // New option to enable MongoDB authentication
}

export class WhatsAppWebService {
  private client: Client | null = null;
  private config: WhatsAppWebConfig;
  private isReady: boolean = false;
  private onReadyCallback?: () => Promise<void> | void;

  constructor(config: WhatsAppWebConfig) {
    this.config = config;
  }

  public setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.onReadyCallback = callback;
  }

  public async initialize(): Promise<void> {
    if (this.config.useMock) {
      console.log('🧪 WhatsApp Web Service initialized in MOCK mode');
      this.isReady = true;
      
      // Call the ready callback immediately in mock mode
      if (this.onReadyCallback) {
        try {
          await this.onReadyCallback();
        } catch (error) {
          console.error('❌ Error in WhatsApp ready callback (mock):', error);
        }
      }
      return;
    }

    console.log('🔗 Initializing WhatsApp Web Service...');
    
    // Use LocalAuth for now (MongoDB auth needs more work)
    const authStrategy = new LocalAuth({ clientId: this.config.sessionName || 'cute99-assistant' });

    console.log(`📱 Using Local authentication strategy`);
    
    this.client = new Client({
      authStrategy,
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('📱 Scan this QR code with your WhatsApp:');
      qrcode.generate(qr, { small: true });
      console.log('👆 Open WhatsApp > Settings > Linked Devices > Link a Device');
    });

    // Authentication successful
    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp Web authenticated successfully!');
    });

    // Client ready
    this.client.on('ready', async () => {
      console.log('🚀 WhatsApp Web client is ready!');
      this.isReady = true;
      
      // Call the ready callback if set
      if (this.onReadyCallback) {
        try {
          await this.onReadyCallback();
        } catch (error) {
          console.error('❌ Error in WhatsApp ready callback:', error);
        }
      }
    });

    // Authentication failure
    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp Web authentication failed:', msg);
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      console.log('🔌 WhatsApp Web disconnected:', reason);
      this.isReady = false;
    });

    // Initialize the client
    await this.client.initialize();
  }

  public async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    try {
      if (this.config.useMock) {
        console.log(`📱 [MOCK] WhatsApp message to ${phoneNumber}:`);
        console.log(`   ${message}`);
        console.log('   ✅ Message sent successfully (mock)');
        return true;
      }

      if (!this.client || !this.isReady) {
        console.error('❌ WhatsApp Web client not ready');
        return false;
      }

      // Format phone number for WhatsApp Web
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const chatId = `${formattedNumber}@c.us`;

      // Check if number exists on WhatsApp
      const numberId = await this.client.getNumberId(formattedNumber);
      if (!numberId) {
        console.error(`❌ Phone number ${phoneNumber} is not registered on WhatsApp`);
        return false;
      }

      // Send message
      await this.client.sendMessage(chatId, message);
      console.log(`📱 WhatsApp message sent to ${phoneNumber}: ${message}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send WhatsApp message:', error);
      return false;
    }
  }

  public async sendReminder(phoneNumber: string, subject: string, type: string, time: string, location: string, minutesBefore: number): Promise<boolean> {
    const reminderMessage = `🔔 *Reminder*\n\n` +
      `📚 *Subject:* ${subject}\n` +
      `📝 *Type:* ${type}\n` +
      `⏰ *Time:* ${time}\n` +
      `📍 *Location:* ${location}\n` +
      `⏳ *Starting in:* ${minutesBefore} minutes\n\n` +
      `_Sent by Cute99 Virtual Assistant_ 🤖`;

    return await this.sendMessage(phoneNumber, reminderMessage);
  }

  public async disconnect(): Promise<void> {
    if (this.config.useMock) {
      console.log('🔌 Mock WhatsApp Web Service disconnected');
      return;
    }

    if (this.client) {
      console.log('🔌 Disconnecting WhatsApp Web Service...');
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      console.log('✅ WhatsApp Web Service disconnected');
    }
  }

  public isConnected(): boolean {
    return this.isReady;
  }

  public getConnectionStatus(): string {
    if (this.config.useMock) {
      return 'Mock Mode';
    }
    return this.isReady ? 'Connected' : 'Disconnected';
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Remove + if present
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    
    // Ensure it starts with country code
    if (!formatted.startsWith('92') && phoneNumber.includes('92')) {
      // Pakistani number
      return formatted;
    }
    
    return formatted;
  }
}