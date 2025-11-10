import express, { Request, Response } from 'express';
import cors from 'cors';
import moment from 'moment';

const app = express();
app.use(cors());
app.use(express.json());

// Mock data for November 10, 2025
const mockData = {
  date: '2025-11-10',
  entries: [
    { timeSlot: '5:00 AM to 5:30 AM', plannedActivity: 'Walk with audio books: Seerah Imams, Win FIP', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '5:30 AM to 6:00 AM', plannedActivity: 'FAJR Prayer', actualActivity: 'Prayed Fajr and recited Quran', isCompleted: true, mood: '�', notes: 'Peaceful morning start' },
    { timeSlot: '6:00 AM to 6:30 AM', plannedActivity: 'Read Quran Good Voice', actualActivity: 'Read Quran with beautiful recitation', isCompleted: true, mood: '😊', notes: 'Spiritual connection' },
    { timeSlot: '6:30 AM to 7:00 AM', plannedActivity: 'gas-removing diet, drive to gym', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '7:00 AM to 7:30 AM', plannedActivity: 'GYM with audio book', actualActivity: 'Workout while listening to motivation', isCompleted: true, mood: '💪', notes: 'Great energy boost' },
    { timeSlot: '7:30 AM to 8:00 AM', plannedActivity: 'GYM with audio book', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '8:00 AM to 8:30 AM', plannedActivity: 'Focused Office Work + Paratha Anda Shami Kebab Coffee', actualActivity: 'Started work with energizing breakfast', isCompleted: true, mood: '😊', notes: 'Perfect fuel for the day' },
    { timeSlot: '8:30 AM to 9:00 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Deep work on priority tasks', isCompleted: true, mood: '�', notes: 'High productivity mode' },
    { timeSlot: '9:00 AM to 9:30 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Continued focused development', isCompleted: true, mood: '🤔', notes: 'Complex problem solving' },
    { timeSlot: '9:30 AM to 10:00 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Code review and debugging', isCompleted: true, mood: '💪', notes: 'Found optimal solution' },
    { timeSlot: '10:00 AM to 10:30 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Implemented new features', isCompleted: true, mood: '�', notes: 'Good progress made' },
    { timeSlot: '10:30 AM to 11:00 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Team collaboration', isCompleted: true, mood: '�', notes: 'Productive discussions' },
    { timeSlot: '11:00 AM to 11:30 AM', plannedActivity: 'Focused Office Work', actualActivity: 'Documentation and planning', isCompleted: true, mood: '😐', notes: 'Important but tedious' },
    { timeSlot: '11:30 AM to 12:00 PM', plannedActivity: 'Focused Office Work', actualActivity: 'System optimization', isCompleted: true, mood: '💪', notes: 'Performance improvements' },
    { timeSlot: '12:00 PM to 12:30 PM', plannedActivity: 'Focused Office Work', actualActivity: 'Database queries optimization', isCompleted: true, mood: '🤔', notes: 'Complex database work' },
    { timeSlot: '12:30 PM to 1:00 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '1:00 PM to 1:30 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '1:30 PM to 2:00 PM', plannedActivity: 'ZUHR Prayer, Rest', actualActivity: 'Prayed Zuhr and took spiritual break', isCompleted: true, mood: '�', notes: 'Much needed pause' },
    { timeSlot: '2:00 PM to 2:30 PM', plannedActivity: 'Rest', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '2:30 PM to 3:00 PM', plannedActivity: 'Rest', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '3:00 PM to 3:30 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '3:30 PM to 4:00 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '4:00 PM to 4:30 PM', plannedActivity: 'ASR Prayer', actualActivity: 'Prayed Asr with gratitude', isCompleted: true, mood: '�', notes: 'Afternoon spiritual moment' },
    { timeSlot: '4:30 PM to 5:00 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '5:00 PM to 5:30 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '5:30 PM to 6:00 PM', plannedActivity: 'Focused Office Work', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '6:00 PM to 6:30 PM', plannedActivity: 'MAGHRIB Prayer', actualActivity: 'Prayed Maghrib at home', isCompleted: true, mood: '😊', notes: 'Evening gratitude' },
    { timeSlot: '6:30 PM to 7:00 PM', plannedActivity: 'Family Time', actualActivity: '', isCompleted: false, mood: '�', notes: '' },
    { timeSlot: '7:00 PM to 7:30 PM', plannedActivity: 'Dinner', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '7:30 PM to 8:00 PM', plannedActivity: 'ISHA Prayer', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '8:00 PM to 8:30 PM', plannedActivity: 'Personal Projects', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '8:30 PM to 9:00 PM', plannedActivity: 'Reading/Learning', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '9:00 PM to 9:30 PM', plannedActivity: 'Prepare for next day', actualActivity: '', isCompleted: false, mood: '😐', notes: '' },
    { timeSlot: '9:30 PM to 10:00 PM', plannedActivity: 'Sleep preparation', actualActivity: '', isCompleted: false, mood: '😐', notes: '' }
  ]
};

// Calculate statistics
const completedActivities = mockData.entries.filter(entry => entry.isCompleted).length;
const totalActivities = mockData.entries.length;
const completionRate = ((completedActivities / totalActivities) * 100).toFixed(1);

const stats = {
  totalActivities,
  completedActivities,
  completionRate: parseFloat(completionRate),
  pendingActivities: totalActivities - completedActivities,
  averageMoodScore: 3.2,
  productiveHours: Math.round(completedActivities * 0.5 * 10) / 10,
  date: mockData.date
};

// Routes
app.get('/', (req: Request, res: Response) => {
  const html = generateDashboardHTML(mockData, stats);
  res.send(html);
});

app.get('/diary/:date', (req: Request, res: Response) => {
  // For demo, always show the same data regardless of date
  const html = generateDashboardHTML(mockData, stats);
  res.send(html);
});

app.get('/api/diary/:date', (req: Request, res: Response) => {
  res.json({ ...mockData, stats });
});

app.get('/api/diary', (req: Request, res: Response) => {
  res.json({ ...mockData, stats });
});

app.get('/api/stats/:days', (req: Request, res: Response) => {
  res.json({
    ...stats,
    period: `Last ${req.params.days} days`,
    trend: 'improving'
  });
});

app.get('/api/stats', (req: Request, res: Response) => {
  res.json({
    ...stats,
    period: 'Last 7 days',
    trend: 'improving'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'BarakahTracker Demo',
    timestamp: new Date().toISOString(),
    database: 'mock data',
    features: ['activity tracking', 'mood monitoring', 'completion analytics']
  });
});

function generateDashboardHTML(data: any, stats: any): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BarakahTracker - Daily Timeline</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                color: #333;
            }
            
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            
            .header .date {
                font-size: 1.2em;
                opacity: 0.9;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                padding: 30px;
                background: #f8f9fa;
            }
            
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 15px;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s;
            }
            
            .stat-card:hover {
                transform: translateY(-2px);
            }
            
            .stat-number {
                font-size: 2.5em;
                font-weight: bold;
                color: #4CAF50;
                margin-bottom: 5px;
            }
            
            .stat-label {
                color: #666;
                font-size: 0.9em;
            }
            
            .progress-bar {
                width: 100%;
                height: 10px;
                background: #e0e0e0;
                border-radius: 5px;
                margin: 20px 0;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(to right, #4CAF50, #45a049);
                width: ${stats.completionRate}%;
                border-radius: 5px;
                transition: width 0.3s ease;
            }
            
            .timetable-container {
                padding: 30px;
                background: white;
            }
            
            .timetable-title {
                text-align: center;
                font-size: 1.8em;
                margin-bottom: 30px;
                color: #333;
            }
            
            .timetable {
                width: 100%;
                border-collapse: collapse;
                font-size: 14px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                overflow: hidden;
            }
            
            .timetable th {
                background: #f8f9fa;
                color: #333;
                padding: 15px 12px;
                text-align: left;
                font-weight: 600;
                border-bottom: 2px solid #e9ecef;
            }
            
            .timetable th:first-child {
                width: 180px;
            }
            
            .timetable th:nth-child(2) {
                width: 40%;
            }
            
            .timetable th:nth-child(3) {
                width: 40%;
            }
            
            .timetable td {
                padding: 12px;
                border-bottom: 1px solid #e9ecef;
                vertical-align: top;
            }
            
            .timetable tr:hover {
                background: #f8f9fa;
            }
            
            .time-slot {
                font-weight: 600;
                color: #495057;
                white-space: nowrap;
            }
            
            .completed-row {
                background: #d4edda !important;
            }
            
            .completed-row:hover {
                background: #c3e6cb !important;
            }
            
            .pending-row {
                background: #fff3cd;
            }
            
            .pending-row:hover {
                background: #ffeaa7 !important;
            }
            
            .target-activity {
                font-weight: 500;
                color: #333;
            }
            
            .actual-activity {
                color: #28a745;
                font-style: italic;
            }
            
            .actual-activity.empty {
                color: #6c757d;
                font-style: italic;
            }
            
            .mood-notes {
                display: flex;
                gap: 8px;
                margin-top: 5px;
                font-size: 12px;
            }
            
            .mood {
                font-size: 16px;
            }
            
            .notes {
                color: #6c757d;
                font-style: italic;
            }
            
            @media (max-width: 768px) {
                .timetable {
                    font-size: 12px;
                }
                
                .timetable th, .timetable td {
                    padding: 8px 6px;
                }
                
                .time-slot {
                    font-size: 11px;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .header h1 {
                    font-size: 2em;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 BarakahTracker Daily Timeline</h1>
                <div class="date">📅 ${moment(data.date).format('dddd, MMMM Do, YYYY')}</div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${stats.completedActivities}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.pendingActivities}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.completionRate}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${stats.productiveHours}h</div>
                    <div class="stat-label">Productive Hours</div>
                </div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            
            <div class="timetable-container">
                <h2 class="timetable-title">📋 Daily Activity Timeline</h2>
                <table class="timetable">
                    <thead>
                        <tr>
                            <th>Time Slot</th>
                            <th>Target Activities</th>
                            <th>Actual Activities</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.entries.map((entry: any) => `
                            <tr class="${entry.isCompleted ? 'completed-row' : 'pending-row'}">
                                <td class="time-slot">${entry.timeSlot}</td>
                                <td class="target-activity">${entry.plannedActivity}</td>
                                <td>
                                    <div class="actual-activity ${entry.actualActivity ? '' : 'empty'}">
                                        ${entry.actualActivity || '—'}
                                    </div>
                                    ${entry.isCompleted ? `
                                        <div class="mood-notes">
                                            <span class="mood">${entry.mood}</span>
                                            ${entry.notes ? `<span class="notes">${entry.notes}</span>` : ''}
                                        </div>
                                    ` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log('\n🎉 BarakahTracker Demo is Ready!');
  console.log('════════════════════════════════════════');
  console.log('');
  console.log('📊 Web Dashboard URLs:');
  console.log(`   Demo Dashboard: http://localhost:${PORT}/`);
  console.log(`   Specific Date:  http://localhost:${PORT}/diary/10-Nov-2025`);
  console.log(`   JSON API:       http://localhost:${PORT}/api/diary/10-Nov-2025`);
  console.log(`   Health Check:   http://localhost:${PORT}/health`);
  console.log('');
  console.log('📱 Features Demonstrated:');
  console.log('   ✅ Target vs Actual timeline comparison');
  console.log('   ✅ Mood tracking with emojis');
  console.log('   ✅ Activity notes and timestamps');
  console.log('   ✅ Real-time completion statistics');
  console.log('   ✅ Beautiful responsive design');
  console.log('   ✅ Progress visualization');
  console.log('');
  console.log('📊 Today\'s Summary:');
  console.log(`   • ${completedActivities}/${totalActivities} activities completed (${completionRate}%)`);
  console.log(`   • ${stats.productiveHours} hours of productive time tracked`);
  console.log(`   • Most productive period: Morning (5:00-12:00)`);
  console.log('');
  console.log('🚀 Press Ctrl+C to stop the demo');
});