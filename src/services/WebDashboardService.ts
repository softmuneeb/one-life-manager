import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { DailyTracking, IDailyTracking } from '../models/DailyTracking';
import { TimetableParser } from './TimetableParser';
import moment from 'moment';

/**
 * Web Dashboard Service for BarakahTracker
 * Provides web interface to view target vs actual daily timeline
 */
export class WebDashboardService {
  private app: Express;
  private server: any;
  private port: number;
  private timetableParser: TimetableParser;
  private isRunning = false;

  constructor(port: number, timetableParser: TimetableParser) {
    this.port = port;
    this.timetableParser = timetableParser;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Enable CORS for all origins
    this.app.use(cors());
    
    // Parse JSON bodies
    this.app.use(express.json());
    
    // Parse URL-encoded bodies
    this.app.use(express.urlencoded({ extended: true }));
    
    // Static files (for CSS, JS, images)
    this.app.use('/static', express.static('public'));
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'BarakahTracker Web Dashboard',
        uptime: process.uptime()
      });
    });

    // Main dashboard route - today's diary
    this.app.get('/', async (req: Request, res: Response) => {
      try {
        const today = new Date();
        await this.renderDiary(req, res, today);
      } catch (error) {
        this.handleError(res, error, 'Failed to load today\'s diary');
      }
    });

    // Specific date diary route
    this.app.get('/diary/:date', async (req: Request, res: Response) => {
      try {
        const dateStr = req.params.date;
        const date = moment(dateStr, 'DD-MMM-YYYY').toDate();
        
        if (!moment(date).isValid()) {
          res.status(400).json({ error: 'Invalid date format. Use DD-MMM-YYYY (e.g., 10-Nov-2025)' });
          return;
        }
        
        await this.renderDiary(req, res, date);
      } catch (error) {
        this.handleError(res, error, 'Failed to load diary for specified date');
      }
    });

    // API endpoint to get diary data as JSON
    this.app.get('/api/diary/:date', async (req: Request, res: Response) => {
      try {
        const dateStr = req.params.date;
        const date = moment(dateStr, 'DD-MMM-YYYY').toDate();
        
        const diaryData = await this.getDiaryData(date);
        res.json(diaryData);
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch diary data');
      }
    });

    // API endpoint to get today's diary data as JSON
    this.app.get('/api/diary', async (req: Request, res: Response) => {
      try {
        const date = new Date();
        const diaryData = await this.getDiaryData(date);
        res.json(diaryData);
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch diary data');
      }
    });

    // API endpoint to get statistics
    this.app.get('/api/stats/:days', async (req: Request, res: Response) => {
      try {
        const days = parseInt(req.params.days || '7', 10);
        const stats = await this.getStats(days);
        res.json(stats);
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch statistics');
      }
    });

    // API endpoint to get default statistics (7 days)
    this.app.get('/api/stats', async (req: Request, res: Response) => {
      try {
        const days = 7;
        const stats = await this.getStats(days);
        res.json(stats);
      } catch (error) {
        this.handleError(res, error, 'Failed to fetch statistics');
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Page not found',
        suggestion: 'Try /diary/10-Nov-2025 for specific date or / for today'
      });
    });
  }

  /**
   * Render the main diary page
   */
  private async renderDiary(req: Request, res: Response, date: Date): Promise<void> {
    try {
      const diaryData = await this.getDiaryData(date);
      const html = this.generateDiaryHTML(diaryData, date);
      res.send(html);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get diary data for a specific date
   */
  private async getDiaryData(date: Date): Promise<{
    date: Date;
    plannedSchedule: any[];
    actualActivities: any[];
    completionRate: number;
    summary: any;
  }> {
    try {
      // Get planned schedule from timetable
      const plannedSchedule = await this.timetableParser.getTodaySchedule();
      
      // Get actual activities from database (with graceful fallback)
      let tracking = null;
      try {
        tracking = await DailyTracking.getByDate(date);
      } catch (dbError) {
        // Database not connected yet (before WhatsApp auth) - return planned schedule only
        console.log('ℹ️  Database not connected - showing planned schedule only');
        tracking = null;
      }
      
      // Create 30-minute time slots for the entire day
      const timeSlots = this.generateTimeSlots();
      
      // Merge planned and actual data
      const mergedData = timeSlots.map(slot => {
        // Find planned activity
        const planned = plannedSchedule.find(entry => 
          this.timeSlotMatches(entry.timeSlot, slot)
        );
        
        // Find actual activity
        const actual = tracking?.entries.find(entry => 
          this.timeSlotMatches(entry.timeSlot, slot)
        );
        
        return {
          timeSlot: slot,
          plannedActivity: planned?.activity || 'Free time',
          actualActivity: actual?.actualActivity || '',
          isCompleted: actual?.isCompleted || false,
          mood: actual?.mood || '',
          notes: actual?.notes || '',
          timestamp: actual?.timestamp || null
        };
      });

      // Calculate completion rate
      const completedSlots = mergedData.filter(item => item.isCompleted).length;
      const completionRate = timeSlots.length > 0 ? (completedSlots / timeSlots.length) * 100 : 0;

      return {
        date,
        plannedSchedule: mergedData,
        actualActivities: mergedData.filter(item => item.isCompleted),
        completionRate,
        summary: tracking?.getSummary() || {
          date,
          totalSlots: timeSlots.length,
          completedSlots,
          pendingSlots: timeSlots.length - completedSlots,
          completionRate,
          lastUpdate: new Date()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get diary data:', error);
      throw error;
    }
  }

  /**
   * Generate 30-minute time slots for the entire day
   */
  private generateTimeSlots(): string[] {
    const slots: string[] = [];
    const start = moment().startOf('day'); // 12:00 AM
    
    for (let i = 0; i < 48; i++) { // 24 hours * 2 (30-min slots)
      const startTime = start.clone().add(i * 30, 'minutes');
      const endTime = startTime.clone().add(30, 'minutes');
      
      slots.push(`${startTime.format('h:mm A')} - ${endTime.format('h:mm A')}`);
    }
    
    return slots;
  }

  /**
   * Check if two time slots match (allowing for slight format variations)
   */
  private timeSlotMatches(slot1: string, slot2: string): boolean {
    // Normalize both slots to compare
    const normalize = (slot: string) => slot.replace(/\s+/g, ' ').trim().toLowerCase();
    return normalize(slot1) === normalize(slot2);
  }

  /**
   * Get statistics for the last N days
   */
  private async getStats(days: number = 7): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let stats = null;
      try {
        stats = await (DailyTracking as any).getStats(startDate, endDate);
      } catch (dbError) {
        console.log('ℹ️  Database not connected - returning placeholder stats');
        stats = [];
      }
      
      return {
        period: `Last ${days} days`,
        startDate,
        endDate,
        stats: stats[0] || {
          totalEntries: 0,
          completedEntries: 0,
          completionRate: 0,
          avgMood: []
        }
      };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Generate HTML for diary page
   */
  private generateDiaryHTML(data: any, date: Date): string {
    const dateStr = moment(date).format('MMMM Do, YYYY');
    const today = moment().format('DD-MMM-YYYY');
    const currentDate = moment(date).format('DD-MMM-YYYY');
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BarakahTracker Diary - ${dateStr}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .header h1 {
            color: #4a5568;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .header .date {
            color: #718096;
            font-size: 1.3em;
            margin-bottom: 20px;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }
        
        .stat-item {
            background: #f7fafc;
            border-radius: 10px;
            padding: 15px 25px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #2d3748;
        }
        
        .stat-label {
            color: #718096;
            font-size: 0.9em;
        }
        
        .diary-container {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .diary-header {
            background: #4a5568;
            color: white;
            padding: 20px;
            display: grid;
            grid-template-columns: 120px 1fr 1fr 100px;
            gap: 20px;
            font-weight: bold;
        }
        
        .diary-row {
            display: grid;
            grid-template-columns: 120px 1fr 1fr 100px;
            gap: 20px;
            padding: 15px 20px;
            border-bottom: 1px solid #e2e8f0;
            align-items: center;
        }
        
        .diary-row:nth-child(even) {
            background: #f7fafc;
        }
        
        .diary-row:hover {
            background: #edf2f7;
        }
        
        .time-slot {
            font-weight: bold;
            color: #2d3748;
            font-size: 0.9em;
        }
        
        .activity {
            padding: 10px;
            border-radius: 8px;
        }
        
        .planned {
            background: #bee3f8;
            border-left: 4px solid #3182ce;
        }
        
        .actual {
            background: #c6f6d5;
            border-left: 4px solid #38a169;
        }
        
        .actual.empty {
            background: #fed7d7;
            border-left: 4px solid #e53e3e;
            color: #718096;
            font-style: italic;
        }
        
        .status {
            text-align: center;
            font-size: 1.2em;
        }
        
        .completed {
            color: #38a169;
        }
        
        .pending {
            color: #ed8936;
        }
        
        .mood {
            font-size: 1.2em;
        }
        
        .navigation {
            text-align: center;
            margin-top: 30px;
        }
        
        .nav-button {
            background: white;
            color: #4a5568;
            padding: 12px 24px;
            margin: 0 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            font-size: 1em;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        
        .nav-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
        
        .notes {
            font-size: 0.85em;
            color: #666;
            margin-top: 5px;
            font-style: italic;
        }
        
        @media (max-width: 768px) {
            .diary-header, .diary-row {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .stats {
                flex-direction: column;
            }
            
            .container {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 BarakahTracker Diary</h1>
            <div class="date">${dateStr}</div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${data.completionRate.toFixed(1)}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.summary.completedSlots}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.summary.pendingSlots}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.summary.totalSlots}</div>
                    <div class="stat-label">Total Slots</div>
                </div>
            </div>
        </div>
        
        <div class="diary-container">
            <div class="diary-header">
                <div>Time Slot</div>
                <div>📋 Planned Activity</div>
                <div>✅ Actual Activity</div>
                <div>Status</div>
            </div>
            
            ${data.plannedSchedule.map((item: any) => `
                <div class="diary-row">
                    <div class="time-slot">${item.timeSlot}</div>
                    
                    <div class="activity planned">
                        ${item.plannedActivity}
                    </div>
                    
                    <div class="activity ${item.actualActivity ? 'actual' : 'actual empty'}">
                        ${item.actualActivity || 'No response recorded'}
                        ${item.mood ? `<div class="mood">${item.mood}</div>` : ''}
                        ${item.notes ? `<div class="notes">${item.notes}</div>` : ''}
                    </div>
                    
                    <div class="status">
                        ${item.isCompleted ? 
                          '<span class="completed">✅</span>' : 
                          '<span class="pending">⏳</span>'
                        }
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="navigation">
            ${currentDate !== today ? `<a href="/" class="nav-button">📅 Today</a>` : ''}
            <a href="/diary/${moment(date).subtract(1, 'day').format('DD-MMM-YYYY')}" class="nav-button">⬅️ Previous Day</a>
            <a href="/diary/${moment(date).add(1, 'day').format('DD-MMM-YYYY')}" class="nav-button">➡️ Next Day</a>
            <a href="/api/diary/${currentDate}" class="nav-button">📊 JSON Data</a>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Handle errors and send appropriate response
   */
  private handleError(res: Response, error: any, message: string): void {
    console.error(`❌ ${message}:`, error);
    res.status(500).json({
      error: message,
      details: error.message || 'Unknown error occurred'
    });
  }

  /**
   * Start the web dashboard server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Web Dashboard is already running');
      return;
    }

    try {
      this.server = this.app.listen(this.port, '0.0.0.0', () => {
        console.log(`🌐 BarakahTracker Web Dashboard running on port ${this.port}`);
        console.log(`📊 Visit http://localhost:${this.port} to view today's diary`);
        console.log(`📅 Visit http://localhost:${this.port}/diary/10-Nov-2025 for specific dates`);
      });

      this.isRunning = true;
    } catch (error) {
      console.error('❌ Failed to start Web Dashboard:', error);
      throw error;
    }
  }

  /**
   * Stop the web dashboard server
   */
  public async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Web Dashboard stopped');
        this.isRunning = false;
        resolve();
      });
    });
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isRunning: boolean;
    port: number;
    uptime: number;
  } {
    return {
      isRunning: this.isRunning,
      port: this.port,
      uptime: process.uptime()
    };
  }
}