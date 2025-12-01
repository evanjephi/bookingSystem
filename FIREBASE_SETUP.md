# Firebase Database Setup Guide

This app is configured to persist bookings and users to Firebase Firestore. Follow these steps to connect it:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a new project" (or select an existing one)
3. Name it (e.g., "Smart Calendar AI")
4. Enable Google Analytics if desired, then click "Create project"
5. Wait for the project to initialize

## Step 2: Create a Firestore Database

1. In your Firebase project, go to **Build** > **Firestore Database** (left sidebar)
2. Click **Create database**
3. Choose a location (default is fine)
4. Select **Start in test mode** (for development; configure security rules later)
5. Click **Create**

## Step 3: Generate a Service Account Key

1. Go to **Project Settings** (gear icon, top-left)
2. Click the **Service Accounts** tab
3. Click **Generate New Private Key**
4. A JSON file will download automatically — **save this securely**

## Step 4: Add the Key to `.env.local`

1. Open the downloaded service account JSON file in a text editor
2. Copy the **entire JSON content** (everything inside the `{}`)
3. In your project root, create or edit `.env.local`:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...rest of JSON...}
   ```
   - Paste the entire JSON on one line (no line breaks)
   - Do NOT add quotes around the JSON
   - **Do NOT commit `.env.local` to git**

4. Optionally, also add your OpenAI or Anthropic API key:
   ```
   OPENAI_API_KEY=sk-...
   ```
   or
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

## Step 5: Restart the Dev Server

```powershell
Stop-Process -Name node -Force 2>$null
Start-Sleep -Milliseconds 300
npm run dev
```

The server should now start without errors. You'll see:
```
✓ Ready in XXXX ms
- Environments: .env.local
```

## Step 6: Test the Connection

1. Visit http://localhost:3000
2. Submit a booking request (e.g., "book a meeting with evan, efrem for mondays at 9am in december")
3. Go to Firebase Console > Firestore Database > **Collections**
4. You should see a `bookings` collection with the created bookings

If bookings appear in Firestore, the integration is working! ✓

## Database Collections

### `bookings` Collection
Each booking document contains:
- `id` - unique booking ID
- `userId` - primary user ID
- `date` - Firestore Timestamp
- `startTime` - "HH:MM" format
- `endTime` - "HH:MM" format
- `title` - meeting name
- `attendees` - array of user IDs
- `description` - optional notes

### `users` Collection (optional)
To enable user syncing, send a POST request to `/api/users` with:
```json
{
  "users": [
    { "id": "user1", "name": "Evan", "email": "evan@example.com", "availability": "Mon-Fri 9AM-5PM" }
  ]
}
```

## Firestore Security Rules (Recommended for Production)

Replace the default rules in Firestore Console with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /users/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == resource.data.id;
    }
  }
}
```

For now, test mode allows all reads/writes. Tighten rules before going to production.

## Troubleshooting

**Error: "FIREBASE_SERVICE_ACCOUNT not set"**
- Ensure `.env.local` exists and contains the service account JSON
- Restart the dev server after adding `.env.local`

**Error: "FIREBASE_SERVICE_ACCOUNT is not valid JSON"**
- Check that the JSON is on one line with no surrounding quotes
- Ensure all special characters are preserved

**Bookings not appearing in Firestore**
- Check the browser console for errors when submitting a booking
- Check server logs for errors (terminal where `npm run dev` runs)
- Verify the Firestore database was created in the correct project

## Next Steps

- [ ] Set up proper Firestore security rules
- [ ] Add user authentication (Firebase Auth or custom)
- [ ] Add read endpoints to fetch bookings on app load
- [ ] Enable real-time sync with Firestore listeners
- [ ] Add data export/import features
