import mongoose, { Document, Schema } from 'mongoose';
import { LocalAuth } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';

// Interface for WhatsApp session data
interface IWhatsAppSession extends Document {
  clientId: string;
  sessionData: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB schema for WhatsApp sessions
const WhatsAppSessionSchema = new Schema<IWhatsAppSession>({
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  sessionData: {
    type: String,
    required: true
  }
}, {
  collection: 'whatsapp_sessions',
  timestamps: true
});

// Create the model
const WhatsAppSession = mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);

/**
 * Custom MongoDB-based authentication strategy for WhatsApp Web.js
 * Uses LocalAuth as base but stores session data in MongoDB instead of local files.
 * Perfect for cloud deployments where local storage is ephemeral.
 */
export class MongoAuthStrategy {
  private localAuth: LocalAuth;
  public clientId: string;
  private tempDataPath: string;

  constructor(options: { clientId: string }) {
    this.clientId = options.clientId;
    
    // Create a temporary directory for LocalAuth initialization
    this.tempDataPath = path.join(process.cwd(), '.temp-auth', options.clientId);
    
    // Initialize LocalAuth with temp directory
    this.localAuth = new LocalAuth({ 
      clientId: options.clientId,
      dataPath: this.tempDataPath
    });
  }

  async beforeBrowserInitialized(): Promise<void> {
    // First try to restore session from MongoDB
    await this.restoreSessionFromMongoDB();
    
    // Call LocalAuth's beforeBrowserInitialized
    if (this.localAuth.beforeBrowserInitialized) {
      await this.localAuth.beforeBrowserInitialized();
    }
  }

  async setup(client: any): Promise<void> {
    // Delegate to LocalAuth
    if (this.localAuth.setup) {
      await this.localAuth.setup(client);
    }
  }

  async afterBrowserInitialized(): Promise<void> {
    // Delegate to LocalAuth
    if (this.localAuth.afterBrowserInitialized) {
      await this.localAuth.afterBrowserInitialized();
    }
  }

  async onAuthenticationNeeded(): Promise<{ failed?: boolean; restart?: boolean; failureEventPayload?: any; }> {
    // Delegate to LocalAuth
    if (this.localAuth.onAuthenticationNeeded) {
      return await this.localAuth.onAuthenticationNeeded();
    }
    return {};
  }

  getAuthEventPayload(): any {
    // Delegate to LocalAuth
    if (this.localAuth.getAuthEventPayload) {
      return this.localAuth.getAuthEventPayload();
    }
    return {};
  }

  async afterAuthReady(): Promise<void> {
    // Save session to MongoDB after authentication is ready
    await this.saveSessionToMongoDB();
    
    // Delegate to LocalAuth
    if (this.localAuth.afterAuthReady) {
      await this.localAuth.afterAuthReady();
    }
  }

  async disconnect(): Promise<void> {
    // Save session before disconnect
    await this.saveSessionToMongoDB();
    
    // Delegate to LocalAuth
    if (this.localAuth.disconnect) {
      await this.localAuth.disconnect();
    }
  }

  async logout(): Promise<void> {
    try {
      // Save current session to MongoDB before logout
      await this.saveSessionToMongoDB();
      
      // Call LocalAuth logout
      if (this.localAuth.logout) {
        await this.localAuth.logout();
      }
      
      // Delete from MongoDB
      await WhatsAppSession.deleteOne({ clientId: this.clientId });
      console.log(`🗑️ MongoDB: WhatsApp session deleted for ${this.clientId}`);
      
      // Clean up temp files
      this.cleanupTempFiles();
    } catch (error) {
      console.error('❌ MongoDB: Error during logout:', error);
      if (this.localAuth.logout) {
        await this.localAuth.logout();
      }
    }
  }

  async destroy(): Promise<void> {
    await this.logout();
  }

  /**
   * Restore session data from MongoDB to temporary local files
   */
  private async restoreSessionFromMongoDB(): Promise<void> {
    try {
      const session = await WhatsAppSession.findOne({ clientId: this.clientId });
      if (session) {
        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDataPath)) {
          fs.mkdirSync(this.tempDataPath, { recursive: true });
        }
        
        // Write session data to temporary file
        const sessionFilePath = path.join(this.tempDataPath, 'session.json');
        fs.writeFileSync(sessionFilePath, session.sessionData, 'utf8');
        
        console.log(`� MongoDB: Restored WhatsApp session for ${this.clientId}`);
      } else {
        console.log(`📋 MongoDB: No existing session found for ${this.clientId}`);
      }
    } catch (error) {
      console.error('❌ MongoDB: Error restoring session:', error);
    }
  }

  /**
   * Save current session data from temporary files to MongoDB
   */
  private async saveSessionToMongoDB(): Promise<void> {
    try {
      const sessionFilePath = path.join(this.tempDataPath, 'session.json');
      
      if (fs.existsSync(sessionFilePath)) {
        const sessionData = fs.readFileSync(sessionFilePath, 'utf8');
        
        await WhatsAppSession.findOneAndUpdate(
          { clientId: this.clientId },
          { 
            clientId: this.clientId,
            sessionData: sessionData 
          },
          { 
            upsert: true,
            new: true
          }
        );
        
        console.log(`💾 MongoDB: Saved WhatsApp session for ${this.clientId}`);
      }
    } catch (error) {
      console.error('❌ MongoDB: Error saving session:', error);
    }
  }

  /**
   * Clean up temporary files
   */
  private cleanupTempFiles(): void {
    try {
      if (fs.existsSync(this.tempDataPath)) {
        fs.rmSync(this.tempDataPath, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp files for ${this.clientId}`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up temp files:', error);
    }
  }

  /**
   * Static method to clean up old sessions (optional maintenance)
   * Call this periodically to remove old unused sessions
   */
  static async cleanupOldSessions(olderThanDays: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const result = await WhatsAppSession.deleteMany({
        updatedAt: { $lt: cutoffDate }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old WhatsApp sessions from MongoDB`);
      
    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error);
    }
  }

  /**
   * Static method to list all active sessions (for debugging)
   */
  static async listActiveSessions(): Promise<string[]> {
    try {
      const sessions = await WhatsAppSession.find({}, { clientId: 1, updatedAt: 1 });
      return sessions.map(s => `${s.clientId} (last updated: ${s.updatedAt})`);
    } catch (error) {
      console.error('❌ Error listing sessions:', error);
      return [];
    }
  }
}

// Export the model for direct database operations if needed
export { WhatsAppSession };