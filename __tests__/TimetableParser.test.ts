import { TimetableParser } from '../src/services/TimetableParser';
import * as fs from 'fs';
import * as path from 'path';

describe('TimetableParser', () => {
  let timetableParser: TimetableParser;
  let testTimetableFile: string;

  beforeEach(() => {
    // Create a test CSV file
    testTimetableFile = path.join(__dirname, 'test-timetable.csv');
    const testData = `Time Slot,Activity
5:00 AM to 5:30 AM,Morning Walk with Audio Book
5:30 AM to 6:00 AM,FAJR Prayer
6:00 AM to 6:30 AM,Read Quran in good voice
6:30 AM to 7:00 AM,Pre-workout diet and drive to gym
7:00 AM to 8:00 AM,GYM with audio book
8:00 AM to 8:30 AM,Focused Office Work + Breakfast
9:00 AM to 9:30 AM,Quran session in home
10:00 AM to 10:30 AM,Focused Office Work
1:30 PM to 2:00 PM,ZUHR Prayer and Rest
11:00 PM to 11:30 PM,Evening Routine`;

    fs.writeFileSync(testTimetableFile, testData);
    timetableParser = new TimetableParser(testTimetableFile);
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testTimetableFile)) {
      fs.unlinkSync(testTimetableFile);
    }
  });

  describe('parseTimetable', () => {
    test('should parse CSV file correctly', async () => {
      const result = await timetableParser.parseTimetable();
      
      expect(result.entries).toHaveLength(10);
      expect(result.metadata.totalEntries).toBe(10);
      expect(result.metadata.lastUpdated).toBeInstanceOf(Date);
    });

    test('should parse time slots correctly', async () => {
      const result = await timetableParser.parseTimetable();
      const firstEntry = result.entries[0];
      
      expect(firstEntry).toBeDefined();
      expect(firstEntry?.timeSlot).toBe('5:00 AM to 5:30 AM');
      expect(firstEntry?.activity).toBe('Morning Walk with Audio Book');
      expect(firstEntry?.startTime).toBeInstanceOf(Date);
      expect(firstEntry?.endTime).toBeInstanceOf(Date);
      
      // Check if start time is before end time
      if (firstEntry) {
        expect(firstEntry.startTime.getTime()).toBeLessThan(firstEntry.endTime.getTime());
      }
    });

    test('should handle PM to AM time transitions correctly', async () => {
      const result = await timetableParser.parseTimetable();
      const eveningEntry = result.entries.find(e => e.timeSlot.includes('11:00 PM'));
      
      expect(eveningEntry).toBeDefined();
      if (eveningEntry) {
        expect(eveningEntry.startTime.getTime()).toBeLessThan(eveningEntry.endTime.getTime());
      }
    });
  });

  describe('validateTimetableFile', () => {
    test('should return true for existing file', async () => {
      const isValid = await timetableParser.validateTimetableFile();
      expect(isValid).toBe(true);
    });

    test('should return false for non-existing file', async () => {
      const invalidParser = new TimetableParser('/non-existent/path.csv');
      const isValid = await invalidParser.validateTimetableFile();
      expect(isValid).toBe(false);
    });
  });

  describe('getTodaySchedule', () => {
    test('should return entries for today', async () => {
      const todaySchedule = await timetableParser.getTodaySchedule();
      
      // All returned entries should have today's date
      todaySchedule.forEach(entry => {
        const entryDate = new Date(entry.startTime);
        const today = new Date();
        expect(entryDate.toDateString()).toBe(today.toDateString());
      });
    });
  });

  describe('getUpcomingEntries', () => {
    test('should return upcoming entries within specified time range', async () => {
      const upcomingEntries = await timetableParser.getUpcomingEntries(60);
      
      // Should be an array (might be empty if no upcoming entries)
      expect(Array.isArray(upcomingEntries)).toBe(true);
      
      // All entries should be within the next 60 minutes
      const now = new Date();
      const futureTime = new Date(now.getTime() + 60 * 60 * 1000);
      
      upcomingEntries.forEach(entry => {
        const entryTime = new Date(entry.startTime);
        expect(entryTime.getTime()).toBeGreaterThanOrEqual(now.getTime());
        expect(entryTime.getTime()).toBeLessThanOrEqual(futureTime.getTime());
      });
    });
  });

  describe('error handling', () => {
    test('should handle malformed CSV gracefully', async () => {
      const malformedFile = path.join(__dirname, 'malformed.csv');
      const malformedData = `Invalid,CSV,Format
No time slots here,Just random data`;
      
      fs.writeFileSync(malformedFile, malformedData);
      const malformedParser = new TimetableParser(malformedFile);
      
      const result = await malformedParser.parseTimetable();
      
      // Should handle gracefully and return empty or filtered results
      expect(result.entries.length).toBe(0);
      
      // Clean up
      fs.unlinkSync(malformedFile);
    });
  });
});