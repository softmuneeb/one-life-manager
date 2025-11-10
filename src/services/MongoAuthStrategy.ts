import { AuthStrategy } from 'whatsapp-web.js';
import mongoose, { Document, Schema } from 'mongoose';

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
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'whatsapp_sessions',
  timestamps: true
});

// Create the model
const WhatsAppSession = mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);

/**
 * Custom MongoDB-based authentication strategy for WhatsApp Web.js
 * Stores session data in MongoDB instead of local files.
 * Perfect for cloud deployments where local storage is ephemeral.
 */
export class MongoAuthStrategy extends AuthStrategy {
  private clientId: string;

  constructor(options: { clientId: string }) {
    super();
    this.clientId = options.clientId;
  }

  async getWebAuthSession(): Promise<string | null> {
    try {
      // Retrieve session data from MongoDB
      const session = await WhatsAppSession.findOne({ clientId: this.clientId });
      
      if (session && session.sessionData) {
        console.log(`📱 Retrieved WhatsApp session from MongoDB for client: ${this.clientId}`);
        return session.sessionData;
      }
      
      console.log(`🆕 No existing WhatsApp session found in MongoDB for client: ${this.clientId}`);
      return null;
      
    } catch (error) {
      console.error('❌ Error retrieving session data from MongoDB:', error);
      return null;
    }
  }

  async setWebAuthSession(session: string): Promise<void> {
    try {
      // Store or update session data in MongoDB
      await WhatsAppSession.findOneAndUpdate(
        { clientId: this.clientId },
        { 
          sessionData: session,
          updatedAt: new Date()
        },
        { 
          upsert: true, // Create if doesn't exist
          new: true
        }
      );
      
      console.log(`💾 WhatsApp session data saved to MongoDB for client: ${this.clientId}`);
      
    } catch (error) {
      console.error('❌ Error saving session data to MongoDB:', error);
      throw error;
    }
  }

  async removeWebAuthSession(): Promise<void> {
    await this.logout();
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