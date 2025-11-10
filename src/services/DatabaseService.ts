import mongoose from 'mongoose';
import { ConfigService } from '../config/ConfigService';

/**
 * MongoDB Database Service for BarakahTracker
 * Handles database connection and basic operations
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Connect to MongoDB using the MONGO_URL from environment
   */
  public async connect(): Promise<void> {
    try {
      const mongoUrl = this.configService.getMongoUrl();
      
      if (this.isConnected) {
        console.log('📊 Already connected to RespectedKatibDB');
        return;
      }

      console.log('📊 Connecting to MongoDB...');
      
      await mongoose.connect(mongoUrl, {
        dbName: 'BarakahTrackerDB', // Use specific database name
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000, // Added for better connection handling
        bufferCommands: false,
        retryWrites: true, // Enable retry writes
        retryReads: true, // Enable retry reads
        maxIdleTimeMS: 30000 // Added for connection pool management
      });

      this.isConnected = true;
      
      // Handle connection events
      mongoose.connection.on('error', this.handleError);
      mongoose.connection.on('disconnected', this.handleDisconnection);
      mongoose.connection.on('reconnected', this.handleReconnection);

      console.log('✅ Connected to BarakahTrackerDB successfully!');
      console.log(`📈 Database: ${mongoose.connection.name}`);
      console.log(`🔗 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from BarakahTrackerDB');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  public isDbConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection status
   */
  public getConnectionStatus(): {
    connected: boolean;
    readyState: number;
    host?: string;
    port?: number;
    name?: string;
  } {
    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  /**
   * Test database connection with a ping
   */
  public async ping(): Promise<boolean> {
    try {
      await mongoose.connection.db?.admin().ping();
      return true;
    } catch (error) {
      console.error('📊 Database ping failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<any> {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }

      const stats = await mongoose.connection.db?.stats();
      return {
        database: mongoose.connection.name,
        collections: stats?.collections || 0,
        documents: stats?.objects || 0,
        dataSize: stats?.dataSize || 0,
        storageSize: stats?.storageSize || 0,
        indexes: stats?.indexes || 0
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  /**
   * Initialize database with default data if needed
   */
  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing BarakahTrackerDB...');

      // Check if we can ping the database
      const isHealthy = await this.ping();
      if (!isHealthy) {
        throw new Error('Database health check failed');
      }

      // Get database stats
      const stats = await this.getStats();
      if (stats) {
        console.log('📊 Database Stats:');
        console.log(`   📁 Collections: ${stats.collections}`);
        console.log(`   📄 Documents: ${stats.documents}`);
        console.log(`   💾 Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      }

      console.log('✅ Database initialized successfully!');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle connection errors
   */
  private handleError = (error: Error): void => {
    console.error('❌ MongoDB connection error:', error);
    this.isConnected = false;
  };

  /**
   * Handle disconnection
   */
  private handleDisconnection = (): void => {
    console.log('⚠️ MongoDB disconnected');
    this.isConnected = false;
  };

  /**
   * Handle reconnection
   */
  private handleReconnection = (): void => {
    console.log('🔄 MongoDB reconnected');
    this.isConnected = true;
  };

  /**
   * Setup graceful shutdown handlers
   */
  public setupShutdownHandlers(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`📊 Received ${signal}. Closing database connection...`);
      try {
        await this.disconnect();
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during database shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
  }
}