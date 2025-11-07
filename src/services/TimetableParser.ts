import * as fs from 'fs';
import csv from 'csv-parser';
import moment from 'moment';
import { TimetableEntry, ParsedTimetable } from '../types';

export class TimetableParser {
  private timetableFile: string;

  constructor(timetableFile: string) {
    this.timetableFile = timetableFile;
  }

  async parseTimetable(): Promise<ParsedTimetable> {
    return new Promise((resolve, reject) => {
      const entries: TimetableEntry[] = [];
      const results: any[] = [];

      fs.createReadStream(this.timetableFile)
        .pipe(csv())
        .on('data', (data: any) => results.push(data))
        .on('end', () => {
          try {
            for (const row of results) {
              const entry = this.parseTimeSlot(row['Time Slot'], row['Activity']);
              if (entry) {
                entries.push(entry);
              }
            }

            const parsedTimetable: ParsedTimetable = {
              entries,
              metadata: {
                totalEntries: entries.length,
                dateRange: this.getDateRange(entries),
                lastUpdated: new Date()
              }
            };

            resolve(parsedTimetable);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  private parseTimeSlot(timeSlot: string, activity: string): TimetableEntry | null {
    try {
      // Parse time slot format: "5:00 AM to 5:30 AM" or "12:00 PM to 12:30 PM"
      const timeRegex = /(\d{1,2}:\d{2}\s*(AM|PM))\s*to\s*(\d{1,2}:\d{2}\s*(AM|PM))/i;
      const match = timeSlot.match(timeRegex);

      if (!match) {
        console.warn(`Could not parse time slot: ${timeSlot}`);
        return null;
      }

      const startTimeStr = match[1];
      const endTimeStr = match[3];

      // Get today's date for parsing
      const today = moment();
      const startTime = moment(`${today.format('YYYY-MM-DD')} ${startTimeStr}`, 'YYYY-MM-DD h:mm A');
      const endTime = moment(`${today.format('YYYY-MM-DD')} ${endTimeStr}`, 'YYYY-MM-DD h:mm A');

      // Handle case where end time is next day (e.g., 11:00 PM to 1:00 AM)
      if (endTime.isBefore(startTime)) {
        endTime.add(1, 'day');
      }

      return {
        timeSlot,
        activity: activity.trim(),
        startTime: startTime.toDate(),
        endTime: endTime.toDate()
      };
    } catch (error) {
      console.error(`Error parsing time slot "${timeSlot}":`, error);
      return null;
    }
  }

  private getDateRange(entries: TimetableEntry[]): string {
    if (entries.length === 0) {
      return 'No entries';
    }

    const startTimes = entries.map(e => moment(e.startTime));
    const earliest = moment.min(startTimes);
    const latest = moment.max(startTimes);

    return `${earliest.format('h:mm A')} - ${latest.format('h:mm A')}`;
  }

  async validateTimetableFile(): Promise<boolean> {
    try {
      return fs.existsSync(this.timetableFile);
    } catch (error) {
      console.error('Error validating timetable file:', error);
      return false;
    }
  }

  async getTodaySchedule(): Promise<TimetableEntry[]> {
    const parsedTimetable = await this.parseTimetable();
    const today = moment();
    
    return parsedTimetable.entries.filter(entry => {
      const entryDay = moment(entry.startTime);
      return entryDay.isSame(today, 'day');
    });
  }

  async getUpcomingEntries(minutesAhead: number = 60): Promise<TimetableEntry[]> {
    const todaySchedule = await this.getTodaySchedule();
    const now = moment();
    const futureTime = moment().add(minutesAhead, 'minutes');

    return todaySchedule.filter(entry => {
      const entryTime = moment(entry.startTime);
      return entryTime.isBetween(now, futureTime, 'minute', '[]');
    });
  }
}