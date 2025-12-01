# How to Seed the Database with Sample Data

This guide explains how to upload the sample data from `seedDatabase.ts` to your Firebase Firestore database.

## Prerequisites

1. **Firebase is set up** - Make sure you've completed the Firebase setup (see `FIREBASE_SETUP.md`)
2. **Dev server is running** - Your Next.js app should be running on `http://localhost:3000`
3. **Firebase credentials configured** - Your `.env.local` file should have `FIREBASE_SERVICE_ACCOUNT` set

## Method 1: Using PowerShell (Recommended for Windows)

1. Open PowerShell in your project directory
2. Run this command:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/seed" -Method POST -ContentType "application/json"
```

You should see a response like:
```json
{
  "success": true,
  "message": "Seeded 50 clients and 30 PSW workers",
  "data": {
    "clientsCount": 50,
    "workersCount": 30
  }
}
```

## Method 2: Using cURL (Mac/Linux/Windows with Git Bash)

```bash
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json"
```

## Method 3: Using Browser Developer Tools

1. Open your browser and go to `http://localhost:3000`
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Paste and run:

```javascript
fetch('/api/seed', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err));
```

## Method 4: Using Postman or Similar Tool

1. Open Postman (or similar API client)
2. Create a new POST request
3. URL: `http://localhost:3000/api/seed`
4. Headers: `Content-Type: application/json`
5. Click Send

## What Gets Seeded?

The seed script will:
- **Generate 50 clients** with random names, ages, and Ontario locations
- **Generate 30 PSW workers** with:
  - Random names and ages
  - Ontario locations
  - 3-5 working days per week (Monday-Friday)
  - Random specialties (elderly care, mobility assist, etc.)
  - Hourly rates between $15-$35
- **Clear existing data** in `clients` and `psw_workers` collections before adding new data

## Important Notes

⚠️ **Warning**: The seed script **deletes all existing clients and PSW workers** before adding new ones. If you want to preserve existing data, you'll need to modify `app/api/seed/route.ts` to comment out the deletion code (lines 16-25).

## Verify the Data

After seeding, you can verify the data in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. You should see:
   - `clients` collection with 50 documents
   - `psw_workers` collection with 30 documents

## Troubleshooting

### Check Server Logs First

**Most Important**: Check the terminal where `npm run dev` is running. The seed endpoint now logs detailed information:
- "Starting database seed..."
- "Generating sample data..."
- "Connecting to Firestore..."
- Any error messages with full details

### Common Issues

**Error: "FIREBASE_SERVICE_ACCOUNT not set"**
- Make sure your `.env.local` file exists and contains the Firebase service account JSON
- Restart your dev server after adding/updating `.env.local`
- The JSON should be on one line, no quotes around it

**Error: "Cannot connect to localhost:3000"**
- Make sure your dev server is running (`npm run dev`)
- Check that the server started successfully
- Try accessing `http://localhost:3000` in your browser first

**Error: "Permission denied" or Firebase errors**
- Check your Firestore security rules
- For development, make sure you're in "test mode" or have proper read/write rules
- Verify your Firebase project ID matches the one in your service account
- Make sure the Firestore database was created in the correct project

**Error: "FIREBASE_SERVICE_ACCOUNT is not valid JSON"**
- Check that the JSON in `.env.local` is valid
- Make sure there are no line breaks in the JSON
- The format should be: `FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}`

**Data not appearing in Firebase**
- Check the server console for any error messages
- The seed script now logs each step - look for error messages
- Verify your Firebase project ID matches the one in your service account
- Make sure the Firestore database was created in the correct project

### Testing the Connection

You can test if the endpoint is accessible:

1. **Browser**: Go to `http://localhost:3000/api/seed` (GET request) - should show a message
2. **PowerShell**: 
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/api/seed" -Method GET
   ```
3. **Node.js test script**: Run `node test-seed.js` (if you have Node.js installed)

## Re-seeding the Database

You can run the seed command multiple times. Each time it will:
1. Delete all existing clients and PSW workers
2. Generate fresh random data
3. Add the new data to Firestore

This is useful for testing or resetting your database with new sample data.

