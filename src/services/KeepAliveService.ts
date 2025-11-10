import http from 'http';
import https from 'https';

/**
 * KeepAliveService prevents the app from sleeping on free hosting platforms
 * by running a simple HTTP server and optionally pinging itself
 */
export class KeepAliveService {
  private server: http.Server | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly port: number;
  private readonly enableSelfPing: boolean;
  private readonly appUrl: string;

  constructor(
    port: number = parseInt(process.env.PORT || '3000'),
    enableSelfPing: boolean = process.env.ENABLE_SELF_PING === 'true',
    appUrl: string = process.env.RENDER_EXTERNAL_URL || ''
  ) {
    this.port = port;
    this.enableSelfPing = enableSelfPing;
    this.appUrl = appUrl;
  }

  /**
   * Start the keep-alive HTTP server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          const url = req.url || '';
          
          // Health check endpoint
          if (url === '/health' || url === '/') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'ok',
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              message: '🤖 BarakahTracker Bot is alive and running!',
              version: '1.0.0'
            }));
            return;
          }

          // Status endpoint
          if (url === '/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              status: 'running',
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              pid: process.pid,
              platform: process.platform,
              nodeVersion: process.version
            }));
            return;
          }

          // Keep-alive ping endpoint
          if (url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('pong');
            return;
          }

          // 404 for other routes
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        });

        this.server.listen(this.port, () => {
          console.log(`🌐 Keep-alive server running on port ${this.port}`);
          console.log(`📡 Health check: http://localhost:${this.port}/health`);
          
          // Start self-ping if enabled and URL is provided
          if (this.enableSelfPing && this.appUrl) {
            this.startSelfPing();
          }
          
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('❌ Keep-alive server error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Failed to start keep-alive server:', error);
        reject(error);
      }
    });
  }

  /**
   * Start self-ping to prevent sleeping
   */
  private startSelfPing(): void {
    if (!this.appUrl) {
      console.log('⚠️ No app URL provided, skipping self-ping');
      return;
    }

    console.log(`🏓 Starting self-ping to ${this.appUrl}/ping every 14 minutes`);
    
    // Ping every 14 minutes (just before Render's 15-minute timeout)
    this.pingInterval = setInterval(() => {
      this.pingSelf();
    }, 14 * 60 * 1000); // 14 minutes

    // Do an initial ping after 30 seconds
    setTimeout(() => {
      this.pingSelf();
    }, 30000);
  }

  /**
   * Ping the app itself to keep it awake
   */
  private pingSelf(): void {
    if (!this.appUrl) return;

    const pingUrl = `${this.appUrl}/ping`;
    const client = this.appUrl.startsWith('https://') ? https : http;

    console.log(`🏓 Pinging ${pingUrl} to stay awake...`);

    const req = client.get(pingUrl, (res) => {
      console.log(`✅ Keep-alive ping successful (${res.statusCode})`);
    });

    req.on('error', (error) => {
      console.error('❌ Keep-alive ping failed:', error.message);
    });

    req.setTimeout(10000, () => {
      console.error('⏰ Keep-alive ping timeout');
      req.destroy();
    });
  }

  /**
   * Stop the keep-alive service
   */
  public stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🛑 Stopping keep-alive service...');

      // Clear ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Close server
      if (this.server) {
        this.server.close(() => {
          console.log('✅ Keep-alive server stopped');
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isRunning: boolean;
    port: number;
    enableSelfPing: boolean;
    appUrl: string;
    uptime: number;
  } {
    return {
      isRunning: this.server !== null,
      port: this.port,
      enableSelfPing: this.enableSelfPing,
      appUrl: this.appUrl,
      uptime: process.uptime()
    };
  }
}