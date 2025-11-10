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
export class MongoAuthStrategy {
  public clientId: string;

  constructor(options: { clientId: string }) {
    this.clientId = options.clientId;
  }

  async beforeBrowserInitialized(): Promise<void> {
    // This method is called before the browser is initialized
  }

  async logout(): Promise<void> {
    try {
      await WhatsAppSession.deleteOne({ clientId: this.clientId });
      console.log(`🗑️ MongoDB: WhatsApp session deleted for ${this.clientId}`);
    } catch (error) {
      console.error('❌ MongoDB: Error removing session:', error);
    }
  }

  async destroy(): Promise<void> {
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