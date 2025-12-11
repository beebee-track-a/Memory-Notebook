# Firebase Testing Guide

## Quick Start Testing

### Method 1: Use the Test Page (Easiest)

1. **Open the test page:**
   ```
   http://localhost:5173/test-firebase.html
   ```

2. **Test Authentication:**
   - Try Google Sign-In
   - Or create an email/password account
   - Watch the "Current User Status" update

3. **Test Firestore:**
   - Click "Save Test Session" (must be signed in)
   - Click "Get My Sessions" to verify it saved
   - Check the logs at the bottom

### Method 2: Test in Main App

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Test Flow:**
   ```
   Click "Have a chat"
   → Click mic button
   → Say something (or just wait)
   → Click "End Session & Save Summary"
   → Wait for summary generation
   → Click "Save" button
   → Login modal appears (if not logged in)
   → Sign in with Google or Email
   → Should save automatically after login
   ```

3. **Verify save worked:**
   - Check browser console for "✅ Session saved to Firebase: {id}"
   - Or check Firebase Console (see below)

### Method 3: Browser Console Testing

Open browser DevTools (F12) and run these commands:

```javascript
// Check if Firebase is initialized
console.log('Firebase Auth:', window.firebaseAuth);

// Check current user
import { getCurrentUser } from './services/auth';
console.log('Current user:', getCurrentUser());

// Save a test session (must be logged in)
import { saveSession } from './services/firebaseAPI';
await saveSession({
  summary: {
    aiGeneratedSummary: "Test summary",
    duration: 60,
    turnCount: 4,
    userMessageCount: 2,
    aiMessageCount: 2,
    startTime: Date.now() - 60000,
    endTime: Date.now()
  },
  transcript: [
    { role: 'user', text: 'Hello', timestamp: Date.now() - 60000 },
    { role: 'assistant', text: 'Hi there!', timestamp: Date.now() - 50000 }
  ]
});

// Get saved sessions
import { getUserSessions } from './services/firebaseAPI';
const sessions = await getUserSessions();
console.log('My sessions:', sessions);
```

## Verify in Firebase Console

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/hobbi-bfce4
   ```

2. **Navigate to Firestore Database:**
   - Click "Firestore Database" in left sidebar
   - You should see the data structure:
     ```
     users/
       {user-uid}/
         sessions/
           {session-id}/
             - summary
             - transcript
             - createdAt
             - tags
             - isFavorite
     ```

3. **Check Authentication:**
   - Click "Authentication" in left sidebar
   - Click "Users" tab
   - Should see your test accounts

## Common Issues & Solutions

### Issue: "Firebase Auth not initialized"
**Solution:** Make sure `.env` file has all Firebase credentials and restart dev server

### Issue: "User not authenticated"
**Solution:** Sign in first using the test page or login modal

### Issue: Can't see data in Firestore
**Solution:**
1. Check Firestore Rules allow write access
2. Check browser console for errors
3. Verify user is authenticated (check "Current User Status" in test page)

### Issue: Google Sign-In popup blocked
**Solution:** Allow popups in browser settings for localhost

## Firestore Security Rules

Your current rules should allow authenticated users to read/write their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Testing Checklist

- [ ] Email/Password Sign Up works
- [ ] Email/Password Sign In works
- [ ] Google Sign In works
- [ ] Sign Out works
- [ ] Save Session works (when authenticated)
- [ ] Get Sessions works
- [ ] Data appears in Firebase Console
- [ ] Login modal shows when trying to save while logged out
- [ ] Auto-save after login works
- [ ] Session data includes transcript and summary

## Next Steps

After testing, you can:
1. Build a "My Sessions" page to view saved conversations
2. Add search/filter for sessions
3. Add ability to mark favorites
4. Add session sharing features
5. Export sessions to PDF/JSON
