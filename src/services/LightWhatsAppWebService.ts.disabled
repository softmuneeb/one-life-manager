import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

export interface LightWhatsAppConfig {
  phoneNumber: string;
  useMock: boolean;
  sessionName?: string;
  useMongoAuth?: boolean;
  useMinimalBrowser?: boolean; // New option for minimal browser
}

/**
 * Ultra-lightweight WhatsApp Web Service
 * Uses minimal Chrome configuration to reduce memory usage
 */
export class LightWhatsAppWebService {
  private client: Client | null = null;
  private config: LightWhatsAppConfig;
  private isReady: boolean = false;
  private onReadyCallback?: () => Promise<void> | void;

  constructor(config: LightWhatsAppConfig) {
    this.config = config;
  }

  public setOnReadyCallback(callback: () => Promise<void> | void): void {
    this.onReadyCallback = callback;
  }

  public async initialize(): Promise<void> {
    if (this.config.useMock) {
      console.log('🧪 Light WhatsApp Web Service initialized in MOCK mode');
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

    console.log('🪶 Initializing Ultra-Light WhatsApp Web Service...');
    
    // Ultra-minimal Puppeteer configuration for maximum memory efficiency
    const puppeteerConfig: any = {
      headless: 'new', // Use new headless mode (more efficient)
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // Critical for memory
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI,VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-background-mode',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--memory-pressure-off',
        '--max_old_space_size=128', // Very low heap limit for Chrome
        '--aggressive-cache-discard', // Aggressive memory management
        '--memory-pressure-off',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: { width: 480, height: 640 }, // Very small viewport
      timeout: 60000,
      protocolTimeout: 240000,
      // Use system Chrome if available (saves ~200MB)
      executablePath: this.findSystemChrome(),
    };

    // Remove executablePath if not found to use bundled Chrome
    if (!puppeteerConfig.executablePath) {
      delete puppeteerConfig.executablePath;
      console.log('🔍 System Chrome not found, using bundled Chrome (higher memory usage)');
    } else {
      console.log('✅ Using system Chrome for reduced memory usage');
    }

    try {
      const { LocalAuth } = await import('whatsapp-web.js');
      const authStrategy = new LocalAuth({ 
        clientId: this.config.sessionName || 'light-assistant' 
      });

      this.client = new Client({
        authStrategy,
        puppeteer: puppeteerConfig,
        restartOnAuthFail: true,
        qrMaxRetries: 3,
        takeoverOnConflict: false,
        takeoverTimeoutMs: 60000,
      });

      this.setupEventHandlers();
      
      console.log('🚀 Starting light WhatsApp Web client...');
      await this.client.initialize();
      
    } catch (error) {
      console.error('❌ Failed to initialize light WhatsApp client:', error);
      throw error;
    }
  }

  /**
   * Try to find system Chrome installation to save ~200MB
   */
  private findSystemChrome(): string | null {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/opt/google/chrome/google-chrome', // Linux
      '/usr/bin/google-chrome-stable', // Linux
      '/usr/bin/google-chrome', // Linux
      '/snap/bin/chromium', // Linux Snap
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows
    ];

    const fs = require('fs');
    for (const path of possiblePaths) {
      try {
        if (fs.existsSync(path)) {
          return path;
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    return null;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // QR Code generation
    this.client.on('qr', (qr) => {
      console.log('📱 Scan this QR code with your WhatsApp:');
      qrcode.generate(qr, { small: true });
      
      // Auto-refresh QR every 20 seconds to prevent timeouts
      setTimeout(() => {
        if (!this.isReady) {
          console.log('🔄 QR code refresh available...');
        }
      }, 20000);
    });

    // Ready event
    this.client.on('ready', async () => {
      console.log('✅ Light WhatsApp Web client is ready!');
      this.isReady = true;
      
      // Force garbage collection after initialization
      if (global.gc) {
        global.gc();
        console.log('🗑️ Forced GC after WhatsApp initialization');
      }
      
      if (this.onReadyCallback) {
        try {
          await this.onReadyCallback();
        } catch (error) {
          console.error('❌ Error in WhatsApp ready callback:', error);
        }
      }
    });

    // Authentication events
    this.client.on('authenticated', () => {
      console.log('🔐 WhatsApp authentication successful');
    });

    this.client.on('auth_failure', (message) => {
      console.error('❌ WhatsApp authentication failed:', message);
    });

    this.client.on('disconnected', (reason) => {
      console.log('📵 WhatsApp client disconnected:', reason);
      this.isReady = false;
    });

    // Memory optimization: Clear message cache periodically
    setInterval(() => {
      if (this.isReady && global.gc) {
        global.gc();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  public async sendMessage(to: string, message: string): Promise<boolean> {
    if (this.config.useMock) {
      console.log(`📱 MOCK: Would send to ${to}: ${message}`);
      return true;
    }

    if (!this.client || !this.isReady) {
      console.error('❌ WhatsApp client not ready');
      return false;
    }

    try {
      // Format phone number (ensure it has country code)
      const formattedNumber = to.replace(/[^0-9]/g, '');
      const chatId = `${formattedNumber}@c.us`;
      
      await this.client.sendMessage(chatId, message);
      console.log(`✅ Message sent to ${to}`);
      
      // Force GC after sending message
      if (global.gc) {
        global.gc();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  public isClientReady(): boolean {
    return this.isReady;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      console.log('📵 Disconnecting light WhatsApp client...');
      await this.client.destroy();
      this.client = null;
      this.isReady = false;
      
      // Final garbage collection
      if (global.gc) {
        global.gc();
        console.log('🗑️ Final GC after WhatsApp disconnect');
      }
    }
  }

  public getClient(): Client | null {
    return this.client;
  }
}