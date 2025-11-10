import { ActivityTracker } from '../src/services/ActivityTracker';
import { TimetableParser } from '../src/services/TimetableParser';
import { IWhatsAppService } from '../src/services/WhatsAppService';
import { DailyTracking } from '../src/models/DailyTracking';
import moment from 'moment';

// Mock dependencies
jest.mock('../src/services/TimetableParser');
jest.mock('../src/models/DailyTracking');

describe('ActivityTracker', () => {
  let activityTracker: ActivityTracker;
  let mockTimetableParser: jest.Mocked<TimetableParser>;
  let mockWhatsAppService: jest.Mocked<IWhatsAppService>;

  beforeEach(() => {
    // Create mock instances
    mockTimetableParser = {
      getTodaySchedule: jest.fn(),
      validateTimetableFile: jest.fn(),
      parseTimetable: jest.fn(),
      displayTimetableSummary: jest.fn()
    } as any;

    mockWhatsAppService = {
      sendMessage: jest.fn(),
      sendReminder: jest.fn(),
      initialize: jest.fn(),
      stop: jest.fn(),
      getStatus: jest.fn()
    } as any;

    activityTracker = new ActivityTracker(
      mockTimetableParser,
      mockWhatsAppService,
      '+923014440289'
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(activityTracker).toBeDefined();
      expect(activityTracker.getStatus().isRunning).toBe(false);
    });
  });

  describe('createCheckInMessage', () => {
    it('should create properly formatted check-in message', () => {
      const timeSlot = '2:00 PM - 2:30 PM';
      const plannedActivity = 'Focused Office Work';
      
      const message = (activityTracker as any).createCheckInMessage(timeSlot, plannedActivity);
      
      expect(message).toContain('BarakahTracker Check-in');
      expect(message).toContain(timeSlot);
      expect(message).toContain(plannedActivity);
      expect(message).toContain('What are you actually doing right now?');
      expect(message).toContain('Reply within 25 minutes');
    });
  });

  describe('parseUserResponse', () => {
    it('should parse activity with mood emoji', () => {
      const response = 'Working on project 💪';
      const parsed = (activityTracker as any).parseUserResponse(response);
      
      expect(parsed.activity).toBe('Working on project');
      expect(parsed.mood).toBe('💪');
      expect(parsed.notes).toBe('');
    });

    it('should parse activity with notes', () => {
      const response = 'Studying - making good progress';
      const parsed = (activityTracker as any).parseUserResponse(response);
      
      expect(parsed.activity).toBe('Studying');
      expect(parsed.mood).toBe('😐'); // default
      expect(parsed.notes).toBe('making good progress');
    });

    it('should parse complex response with mood and notes', () => {
      const response = 'Exercising 💪 - completed 30 minutes';
      const parsed = (activityTracker as any).parseUserResponse(response);
      
      expect(parsed.activity).toBe('Exercising');
      expect(parsed.mood).toBe('💪');
      expect(parsed.notes).toBe('completed 30 minutes');
    });

    it('should handle simple activity without mood or notes', () => {
      const response = 'Reading book';
      const parsed = (activityTracker as any).parseUserResponse(response);
      
      expect(parsed.activity).toBe('Reading book');
      expect(parsed.mood).toBe('😐');
      expect(parsed.notes).toBe('');
    });
  });

  describe('isActiveTime', () => {
    beforeEach(() => {
      (activityTracker as any).wakeTime = '05:00 AM';
      (activityTracker as any).sleepTime = '11:30 PM';
    });

    it('should return true for time within active hours', () => {
      const isActive = (activityTracker as any).isActiveTime('14:30');
      expect(isActive).toBe(true);
    });

    it('should return false for time outside active hours', () => {
      const isActive = (activityTracker as any).isActiveTime('02:00');
      expect(isActive).toBe(false);
    });

    it('should return true for wake time', () => {
      const isActive = (activityTracker as any).isActiveTime('05:00');
      expect(isActive).toBe(true);
    });

    it('should return true for sleep time', () => {
      const isActive = (activityTracker as any).isActiveTime('23:30');
      expect(isActive).toBe(true);
    });
  });

  describe('generateTimeSlot', () => {
    it('should generate correct time slot format', () => {
      const now = moment('2025-11-10 14:00:00');
      const timeSlot = (activityTracker as any).generateTimeSlot(now);
      
      expect(timeSlot).toMatch(/^\d{1,2}:\d{2} [AP]M - \d{1,2}:\d{2} [AP]M$/);
      expect(timeSlot).toContain('2:00 PM - 2:30 PM');
    });
  });

  describe('handleResponse', () => {
    it('should return error message when no pending check-ins', async () => {
      const result = await activityTracker.handleResponse('Working on project');
      
      expect(result).toContain('No active check-in found');
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const status = activityTracker.getStatus();
      
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('activeHours');
      expect(status).toHaveProperty('pendingCheckIns');
      expect(status).toHaveProperty('nextCheckIn');
      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.pendingCheckIns).toBe('number');
    });
  });

  describe('extractWakeSleepTimes', () => {
    it('should extract wake and sleep times from timetable', async () => {
      const mockSchedule = [
        { 
          timeSlot: '5:00 AM to 5:30 AM', 
          activity: 'Wake up',
          startTime: new Date('2025-11-10T05:00:00'),
          endTime: new Date('2025-11-10T05:30:00')
        },
        { 
          timeSlot: '11:00 PM to 11:30 PM', 
          activity: 'Sleep',
          startTime: new Date('2025-11-10T23:00:00'),
          endTime: new Date('2025-11-10T23:30:00')
        }
      ];
      
      mockTimetableParser.getTodaySchedule.mockResolvedValue(mockSchedule);
      
      await (activityTracker as any).extractWakeSleepTimes();
      
      expect((activityTracker as any).wakeTime).toBe('5:00 AM');
      expect((activityTracker as any).sleepTime).toBe('11:30 PM');
    });

    it('should use default times when timetable is empty', async () => {
      mockTimetableParser.getTodaySchedule.mockResolvedValue([]);
      
      await (activityTracker as any).extractWakeSleepTimes();
      
      expect((activityTracker as any).wakeTime).toBe('05:00');
      expect((activityTracker as any).sleepTime).toBe('23:30');
    });
  });
});