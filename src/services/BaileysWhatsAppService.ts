import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';

export interface BaileysWhatsAppConfig {
  phoneNumber: string;
  useMock: boolean;
  sessionName?: string;
}

/**
 * Ultra-Lightweight WhatsApp Service using Baileys
 * NO PUPPETEER - Direct WhatsApp Web protocol implementation
 * Memory usage: ~10-20MB vs 250MB+ with Puppeteer
 */
export class BaileysWhatsAppService {
  private socket: any = null;
  private config: BaileysWhatsAppConfig;
  private isReady: boolean = false;
  private onReadyCallback?: () => Promise<void> | void;
  private authDir: string;

  constructor(config: BaileysWhatsAppConfig) {
    this.config = config;
    this.authDir = path.join(process.cwd(), '.baileys-auth', config.sessionName || 'session');
  }

  public setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.onReadyCallback = callback;
  }

  public async initialize(): Promise<void> {
    if (this.config.useMock) {
      console.log('🧪 Baileys WhatsApp Service initialized in MOCK mode');
      this.isReady = true;
      
      if (this.onReadyCallback) {
        try {
          await this.onReadyCallback();
        } catch (error) {
          console.error('❌ Error in WhatsApp ready callback (mock):', error);
        }
      }
      return;
    }

    console.log('🪶 Initializing Baileys WhatsApp Service (NO PUPPETEER)...');
    
    try {
      // Ensure auth directory exists
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      // Set up authentication state
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      // Create socket connection
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Shows QR in terminal
        // Remove complex logger to avoid TypeScript issues and save memory
        // logger: undefined, // Use default logging
        browser: ['BarakahTracker', 'Chrome', '10.15.7'], // Identify as Chrome
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        markOnlineOnConnect: true,
        syncFullHistory: false, // Don't sync full history to save memory
        shouldIgnoreJid: () => false,
        shouldSyncHistoryMessage: () => false, // Skip history sync
      });

      this.setupEventHandlers(saveCreds);
      
    } catch (error) {
      console.error('❌ Failed to initialize Baileys WhatsApp client:', error);
      throw error;
    }
  }

  private setupEventHandlers(saveCreds: any): void {
    if (!this.socket) return;

    // Connection events
    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('📱 QR Code generated - scan with WhatsApp');
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          console.log('🔄 Reconnecting to WhatsApp...');
          setTimeout(() => this.initialize(), 5000); // Reconnect after 5 seconds
        } else {
          console.log('❌ WhatsApp logged out. Need to scan QR again.');
          this.isReady = false;
        }
      } else if (connection === 'open') {
        console.log('✅ Baileys WhatsApp client connected successfully!');
        this.isReady = true;
        
        // Force garbage collection after connection
        if (global.gc) {
          global.gc();
          console.log('🗑️ Forced GC after WhatsApp connection');
        }
        
        if (this.onReadyCallback) {
          try {
            await this.onReadyCallback();
          } catch (error) {
            console.error('❌ Error in WhatsApp ready callback:', error);
          }
        }
      }
    });

    // Save credentials when updated
    this.socket.ev.on('creds.update', saveCreds);

    // Memory optimization: Minimal message handling
    this.socket.ev.on('messages.upsert', (m: any) => {
      // Only log incoming messages, don't store them to save memory
      if (m.messages?.length > 0) {
        console.log('📩 Received message(s) - processed');
      }
    });

    // Periodic garbage collection
    setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, 3 * 60 * 1000); // Every 3 minutes
  }

  public async sendMessage(to: string, message: string): Promise<boolean> {
    if (this.config.useMock) {
      console.log(`📱 MOCK: Would send to ${to}: ${message}`);
      return true;
    }

    if (!this.socket || !this.isReady) {
      console.error('❌ Baileys WhatsApp client not ready');
      return false;
    }

    try {
      // Format phone number for Baileys
      const formattedNumber = to.replace(/[^0-9]/g, '');
      const jid = `${formattedNumber}@s.whatsapp.net`;
      
      await this.socket.sendMessage(jid, { text: message });
      console.log(`✅ Message sent via Baileys to ${to}`);
      
      // Force GC after sending
      if (global.gc) {
        global.gc();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send message via Baileys:', error);
      return false;
    }
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  public async disconnect(): Promise<void> {
    if (this.socket) {
      console.log('📵 Disconnecting Baileys WhatsApp client...');
      await this.socket.logout();
      this.socket = null;
      this.isReady = false;
      
      // Final cleanup
      if (global.gc) {
        global.gc();
        console.log('🗑️ Final GC after Baileys disconnect');
      }
    }
  }

  public getClient(): any {
    return this.socket;
  }

  /**
   * Get memory usage of Baileys service (should be very low)
   */
  public getMemoryUsage(): { rss: number; heapUsed: number } {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) // MB
    };
  }
}