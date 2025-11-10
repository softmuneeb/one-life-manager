# 🔧 Environment Variables Setup Guide

This guide helps you configure the required environment variables for BarakahTracker.

## 🚨 Quick Check

Run this command to check if your environment is properly configured:

```bash
npm run check-env
```

## 📋 Required Environment Variables

### 1. 📱 WHATSAPP_PHONE_NUMBER
Your WhatsApp phone number (recipient of reminders)
```bash
WHATSAPP_PHONE_NUMBER="+1234567890"
```

### 2. 📄 TIMETABLE_FILE
Path to your CSV timetable file
```bash
TIMETABLE_FILE="muneeb-timetable.csv"
```

### 3. 🗃️ MONGO_URL
MongoDB connection string for activity tracking
```bash
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/database"
```

## ⚙️ Optional Environment Variables

### 4. ⏰ REMINDER_MINUTES_BEFORE
Minutes before each activity to send reminder (default: 15)
```bash
REMINDER_MINUTES_BEFORE="15"
```

### 5. 🧪 USE_MOCK_WHATSAPP
Whether to use mock WhatsApp for testing (default: false)
```bash
USE_MOCK_WHATSAPP="false"
```

### 6. 🌐 USE_WHATSAPP_WEB
Whether to use WhatsApp Web integration (default: true)
```bash
USE_WHATSAPP_WEB="true"
```

### 7. 🔧 NODE_ENV
Application environment (default: development)
```bash
NODE_ENV="production"
```

## 🛠️ Setup Instructions

### 1. Create .env file
```bash
touch .env
```

### 2. Add required variables
```bash
echo 'WHATSAPP_PHONE_NUMBER="+1234567890"' >> .env
echo 'TIMETABLE_FILE="muneeb-timetable.csv"' >> .env
echo 'MONGO_URL="mongodb+srv://user:password@cluster.mongodb.net/database"' >> .env
```

### 3. Update with your actual values
Edit the `.env` file with your real configuration:
- Replace `+1234567890` with your actual WhatsApp number
- Replace `muneeb-timetable.csv` with your CSV file path
- Replace the MongoDB URL with your actual cluster connection string

### 4. Verify configuration
```bash
npm run check-env
```

## 📚 Getting Your Configuration Values

### 📱 WhatsApp Phone Number
- Use your WhatsApp phone number with country code
- Format: `+countrycode1234567890`
- Example: `+923014440289` (Pakistan), `+15551234567` (US)

### 🗃️ MongoDB Setup
1. Go to [MongoDB Atlas](https://mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Get your connection string
5. Replace `<password>` and `<username>` in the connection string

### 📄 Timetable CSV File
Create a CSV file with your daily schedule. See `muneeb-timetable.csv` for format example.

## 🚨 Troubleshooting

### Application won't start
- Run `npm run check-env` to see missing variables
- Check that all required variables are set in `.env`
- Verify no typos in variable names

### MongoDB connection issues
- Check your connection string format
- Verify username/password are correct
- Ensure IP address is whitelisted in MongoDB Atlas

### WhatsApp not working
- For testing, set `USE_MOCK_WHATSAPP=true`
- Check phone number format includes country code
- Verify WhatsApp Web setup (see WHATSAPP_SETUP.md)

## 🎯 Example .env File

```bash
# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER="+923014440289"
USE_MOCK_WHATSAPP=false
USE_WHATSAPP_WEB=true

# Reminder Configuration  
REMINDER_MINUTES_BEFORE=15
TIMETABLE_FILE=muneeb-timetable.csv

# Database Configuration
MONGO_URL="mongodb+srv://user:password@cluster.mongodb.net/BarakahTrackerDB?retryWrites=true&w=majority"

# Environment
NODE_ENV=development
```

## ✅ Verification

After setup, you should see:
```
🎉 All environment variables are properly configured!
✅ You can start the application with: npm start
```

If you see this, you're ready to run BarakahTracker! 🚀