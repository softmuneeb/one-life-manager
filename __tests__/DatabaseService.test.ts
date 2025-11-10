import { DatabaseService } from '../src/services/DatabaseService';
import { DailyTracking } from '../src/models/DailyTracking';
import mongoose from 'mongoose';

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeAll(() => {
    // Mock environment variable
    process.env.MONGO_URL = 'mongodb://localhost:27017/test';
    dbService = DatabaseService.getInstance();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DatabaseService.getInstance();
      const instance2 = DatabaseService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should connect to BarakahTrackerDB', async () => {
      const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as any);
      
      await dbService.connect();
      
      expect(connectSpy).toHaveBeenCalledWith(
        process.env.MONGO_URL,
        expect.objectContaining({
          dbName: 'BarakahTrackerDB'
        })
      );
    });

    it('should handle connection errors', async () => {
      // Disconnect first to ensure clean state
      await dbService.disconnect();
      
      const error = new Error('Connection failed');
      const connectSpy = jest.spyOn(mongoose, 'connect').mockRejectedValue(error);
      
      await expect(dbService.connect()).rejects.toThrow('Database connection failed: Error: Connection failed');
      
      connectSpy.mockRestore();
    });

    it('should not connect if already connected', async () => {
      const connectSpy = jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose as any);
      
      // Ensure we're connected first
      await dbService.connect();
      const callCountBefore = connectSpy.mock.calls.length;
      
      // Try to connect again - should not call mongoose.connect again
      await dbService.connect();
      const callCountAfter = connectSpy.mock.calls.length;
      
      // Should not have called connect again
      expect(callCountAfter).toBe(callCountBefore);
      
      connectSpy.mockRestore();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status', () => {
      const status = dbService.getConnectionStatus();
      
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('readyState');
      expect(typeof status.connected).toBe('boolean');
      expect(typeof status.readyState).toBe('number');
    });
  });

  describe('ping', () => {
    it('should return true when connected', async () => {
      // Ensure we're in a connected state
      await dbService.connect();
      const result = await dbService.ping();
      expect(result).toBe(true);
    });

    it('should return false when not connected', async () => {
      // Disconnect first
      await dbService.disconnect();
      
      // Mock the admin ping to throw an error when disconnected
      const mockPing = jest.fn().mockRejectedValue(new Error('Not connected'));
      const mockAdmin = jest.fn().mockReturnValue({ ping: mockPing });
      const mockDb = { admin: mockAdmin };
      
      // Mock mongoose.connection.db
      Object.defineProperty(mongoose.connection, 'db', {
        value: mockDb,
        configurable: true
      });
      
      const result = await dbService.ping();
      expect(result).toBe(false);
      
      // Restore
      jest.restoreAllMocks();
    });
  });

  describe('getStats', () => {
    it('should return null when not connected', async () => {
      const stats = await dbService.getStats();
      expect(stats).toBe(null);
    });
  });
});