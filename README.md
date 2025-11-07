# 🤖 Cute99 Virtual Assistant - Timetable Reminder Bot

A Node.js TypeScript chatbot that sends WhatsApp reminders based on your personal timetable. The bot parses a CSV timetable file and automatically sends reminders before your scheduled activities.

## 📋 Features

- ✅ **CSV Timetable Parsing**: Reads and parses timetable data from CSV files
- ✅ **Smart Scheduling**: Automatically calculates and schedules reminders
- ✅ **WhatsApp Integration**: Sends reminders via WhatsApp (with mock mode for testing)
- ✅ **Configurable Reminders**: Set custom reminder times and messages
- ✅ **Comprehensive Testing**: Full test suite with 44+ test cases
- ✅ **TypeScript Support**: Fully typed for better development experience
- ✅ **Environment Configuration**: Easy setup with environment variables

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- WhatsApp Business API credentials (for production use)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd cute99-virtual-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Prepare your timetable**
   - Update `muneeb-timetable.csv` with your schedule
   - Follow the CSV format (see [CSV Format](#csv-format) section)

5. **Run the bot**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start

   # Run tests
   npm test
   ```

## 📊 CSV Format

Your timetable CSV should have the following structure:

```csv
Day,Time,Subject,Type,Location
Monday,09:00,Mathematics,Lecture,Room 101
Monday,11:00,Physics,Lab,Science Building
Tuesday,10:00,Chemistry,Tutorial,Room 203
Wednesday,14:00,Computer Science,Practical,Computer Lab
...
```

### Required Columns:
- **Day**: Day of the week (Monday, Tuesday, etc.)
- **Time**: Start time in HH:MM format (24-hour)
- **Subject**: Name of the subject/activity
- **Type**: Type of activity (Lecture, Lab, Tutorial, etc.)
- **Location**: Where the activity takes place

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Timetable Configuration
TIMETABLE_FILE=muneeb-timetable.csv

# Reminder Settings
REMINDER_MINUTES_BEFORE=15
CUSTOM_REMINDER_MESSAGE="🔔 Reminder: You have {subject} ({type}) in {minutesBefore} minutes at {location}!"

# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER=+1234567890
USE_MOCK_WHATSAPP=true
USE_WHATSAPP_WEB=true
WHATSAPP_SESSION_NAME=cute99-assistant

# For Business API (alternative to WhatsApp Web)
# WHATSAPP_API_KEY=your_whatsapp_api_key_here
# WHATSAPP_API_URL=https://api.whatsapp.com/v1

# Application Settings
NODE_ENV=development
LOG_LEVEL=info
```

### Configuration Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TIMETABLE_FILE` | Path to your CSV timetable | `muneeb-timetable.csv` | ✅ |
| `REMINDER_MINUTES_BEFORE` | Minutes before event to send reminder | `15` | ❌ |
| `CUSTOM_REMINDER_MESSAGE` | Custom reminder message template | Auto-generated | ❌ |
| `WHATSAPP_PHONE_NUMBER` | Your WhatsApp phone number | `+1234567890` | ✅ |
| `USE_MOCK_WHATSAPP` | Use mock WhatsApp for testing | `true` | ❌ |
| `WHATSAPP_API_KEY` | WhatsApp Business API key | - | ✅ (production) |
| `WHATSAPP_API_URL` | WhatsApp API endpoint | - | ✅ (production) |

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- **Unit Tests**: All services and utilities
- **Integration Tests**: Complete workflow testing
- **Mock Testing**: WhatsApp service with stubs
- **Configuration Tests**: Validation and error handling

## 📁 Project Structure

```
├── src/
│   ├── index.ts                 # Application entry point
│   ├── ReminderChatBot.ts       # Main chatbot application
│   ├── config/
│   │   └── ConfigService.ts     # Configuration management
│   ├── services/
│   │   ├── TimetableParser.ts   # CSV parsing service
│   │   ├── WhatsAppService.ts   # WhatsApp messaging service
│   │   └── SchedulerService.ts  # Reminder scheduling service
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── __tests__/                   # Test files
├── muneeb-timetable.csv        # Your timetable data
├── .env                        # Environment configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── jest.config.js             # Jest testing configuration
```

## 🔧 Development

### Available Scripts

```bash
npm run build        # Build TypeScript to JavaScript
npm run dev          # Run in development mode with auto-reload
npm start           # Run the built application
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run lint        # Run code linting
npm run format      # Format code with Prettier
```

### Adding New Features

1. **Add new services** in `src/services/`
2. **Update types** in `src/types/index.ts`
3. **Write tests** in `__tests__/`
4. **Update configuration** if needed

## 📱 WhatsApp Integration

### 🔥 **Quick Setup (5 minutes) - WhatsApp Web.js:**

**The easiest way! No API keys needed - just scan QR code:**

1. **Update your `.env`:**
   ```bash
   USE_MOCK_WHATSAPP=false
   USE_WHATSAPP_WEB=true
   ```

2. **Start the bot:**
   ```bash
   npm start
   ```

3. **Scan QR code** with your WhatsApp when prompted
4. **Done!** 🎉 Your bot now sends real WhatsApp messages

### 📋 **All WhatsApp Options:**

| Method | Cost | Setup Time | Difficulty |
|--------|------|------------|------------|
| **WhatsApp Web.js** ⭐ | Free | 5 minutes | Easy |
| WhatsApp Business API | $0.005/msg | Days | Hard |
| Twilio WhatsApp | $0.0075/msg | Hours | Medium |

### 📖 **Detailed Setup Guide:**
👉 **See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for complete instructions**

### Mock Mode (Development)
- Set `USE_MOCK_WHATSAPP=true`
- Messages are logged to console instead of sent
- Perfect for testing and development

## 🔄 How It Works

1. **Startup**: Bot reads configuration and parses timetable CSV
2. **Scheduling**: Calculates reminder times for each timetable entry
3. **Monitoring**: Continuously checks for upcoming events
4. **Reminders**: Sends WhatsApp messages at configured times
5. **Logging**: Tracks all activities and errors

## 🐛 Troubleshooting

### Common Issues

1. **CSV Parsing Errors**
   - Check CSV format matches the required structure
   - Ensure no extra commas or quotes in data
   - Verify time format is HH:MM (24-hour)

2. **WhatsApp Not Working**
   - Verify API credentials in `.env`
   - Check phone number format (+country code)
   - Test with mock mode first

3. **Scheduling Issues**
   - Check system timezone
   - Verify reminder time configuration
   - Look at console logs for scheduling info

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run tests: `npm test`
5. Commit changes: `git commit -m "Add feature"`
6. Push to branch: `git push origin feature-name`
7. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the test files for usage examples
3. Create an issue on GitHub
4. Contact the maintainer

## 🚧 Roadmap

- [ ] Web dashboard for timetable management
- [ ] Multiple timezone support
- [ ] SMS backup notifications
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] AI-powered scheduling suggestions
- [ ] Multi-user support
- [ ] Mobile app

---

**Made with ❤️ for better time management**