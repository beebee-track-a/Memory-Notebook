# Firebase Setup Guide

This guide walks you through setting up Firebase for chat messages (Firestore) and photo uploads (Storage) in the Memory Notebook application.

## Table of Contents

1. [Create Firebase Project](#1-create-firebase-project)
2. [Enable Firebase Products](#2-enable-firebase-products)
3. [Create Web App](#3-create-web-app)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Deploy Security Rules](#5-deploy-security-rules)
6. [Enable Authentication](#6-enable-authentication)
7. [Set Up Billing (Required for Storage)](#7-set-up-billing)
8. [Usage Examples](#8-usage-examples)

---

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., `memory-notebook`)
4. **Google Analytics**: Enable only if needed (optional for this app)
5. Click **"Create project"**
6. Note your **Project ID** (you'll need this later)

---

## 2. Enable Firebase Products

### Enable Firestore Database

1. In Firebase Console, go to **Build > Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll deploy custom rules)
4. Select a Firestore location (choose closest to your users)
5. Click **"Enable"**

### Enable Cloud Storage

1. Go to **Build > Storage**
2. Click **"Get started"**
3. Click **"Next"** (we'll deploy custom rules)
4. Select a Storage location (same as Firestore is recommended)
5. Click **"Done"**

---

## 3. Create Web App

1. In Firebase Console, go to **Project settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click the **Web icon** (`</>`)
4. Enter app nickname (e.g., `Memory Notebook Web`)
5. **Do NOT** check "Also set up Firebase Hosting"
6. Click **"Register app"**
7. Copy the Firebase configuration values:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Firebase configuration:

```env
# Gemini AI API Key (existing)
VITE_GEMINI_API_KEY=your_existing_gemini_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional: Firebase Emulators (for local development)
VITE_USE_FIREBASE_EMULATORS=false
```

3. **Important**: Never commit your `.env` file to git (it's already in `.gitignore`)

---

## 5. Deploy Security Rules

### Deploy Firestore Rules

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   - Select **Firestore** and **Storage**
   - Choose your project
   - For Firestore rules: use `firestore.rules`
   - For Storage rules: use `storage.rules`
   - Skip creating indexes for now

4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

### What the Rules Do

**Firestore Rules** (`firestore.rules`):
- ✅ Users can only read/write their own data
- ✅ Chat participants can read/write messages in their chats
- ✅ Validates message size (max 10,000 characters)
- ✅ Ensures serverTimestamp is used for message creation
- ✅ Prevents unauthorized data access

**Storage Rules** (`storage.rules`):
- ✅ Users can only upload to their own folder (`uploads/{uid}/`)
- ✅ Only image files allowed
- ✅ Max file size: 10MB
- ✅ Authenticated users can read all images (for chat sharing)
- ✅ Users can only delete their own files

---

## 6. Enable Authentication

1. In Firebase Console, go to **Build > Authentication**
2. Click **"Get started"**
3. Enable the authentication methods you want:

### Recommended: Anonymous Authentication
- Click **Anonymous** → Toggle **Enable** → Save
- Good for quick access without registration

### Optional: Email/Password
- Click **Email/Password** → Toggle **Enable** → Save
- Allows users to create accounts

### Optional: Google Sign-In
- Click **Google** → Toggle **Enable**
- Enter project support email
- Save

---

## 7. Set Up Billing (Required for Storage)

⚠️ **Important**: Cloud Storage requires a Firebase billing plan

1. Go to **Spark Plan** (bottom left)
2. Click **"Upgrade"**
3. Choose **Blaze Plan** (Pay as you go)
4. Add payment method
5. Set up **budget alerts**:
   - Go to Google Cloud Console
   - Navigate to **Billing > Budgets & alerts**
   - Create budget (e.g., $5-10/month)
   - Set email alerts at 50%, 90%, 100%

### Free Tier Limits (Generous)
- **Firestore**: 1GB storage, 50K reads/day, 20K writes/day
- **Storage**: 5GB storage, 1GB/day downloads
- **Authentication**: Unlimited (free)

Most small-to-medium apps stay within free limits!

---

## 8. Usage Examples

### Sign In Anonymously

```typescript
import { signInAnonymous } from './services/auth';

async function quickStart() {
  try {
    const user = await signInAnonymous();
    console.log('Signed in:', user.uid);
  } catch (error) {
    console.error('Sign in failed:', error);
  }
}
```

### Send a Message

```typescript
import { sendMessage } from './services/firebaseAPI';

async function sendChatMessage(chatId: string) {
  try {
    const messageId = await sendMessage(chatId, {
      text: 'Hello, world!',
      metadata: {
        voiceDetected: true,
      }
    });
    console.log('Message sent:', messageId);
  } catch (error) {
    console.error('Send failed:', error);
  }
}
```

### Upload a Photo

```typescript
import { uploadPhoto } from './services/firebaseAPI';

async function handlePhotoUpload(file: File, chatId: string) {
  try {
    const result = await uploadPhoto({
      file,
      chatId,
      onProgress: (progress) => {
        console.log(`Upload: ${progress.toFixed(1)}%`);
      }
    });

    console.log('Photo uploaded:', result.downloadURL);

    // Send message with photo attachment
    await sendMessage(chatId, {
      text: 'Check out this photo!',
      attachments: [result.attachment]
    });
  } catch (error) {
    console.error('Upload failed:', error);
  }
}
```

### Subscribe to Messages (Real-time)

```typescript
import { subscribeToMessages } from './services/firebaseAPI';

function setupMessageListener(chatId: string) {
  const unsubscribe = subscribeToMessages(
    chatId,
    (messages) => {
      console.log('Messages updated:', messages);
      // Update UI with new messages
    },
    50 // Limit to last 50 messages
  );

  // Clean up when component unmounts
  return unsubscribe;
}
```

### Create a New Chat

```typescript
import { createChat } from './services/firebaseAPI';

async function startNewChat() {
  try {
    const chatId = await createChat('My Conversation');
    console.log('Chat created:', chatId);
    return chatId;
  } catch (error) {
    console.error('Create chat failed:', error);
  }
}
```

---

## Troubleshooting

### "Firebase not initialized" error
- Check that all `VITE_FIREBASE_*` variables are set in `.env`
- Restart your dev server after changing `.env`

### "Permission denied" errors
- Make sure you're signed in (check `auth.currentUser`)
- Verify security rules are deployed correctly
- Check that user UID matches the data they're trying to access

### Upload fails
- Verify file is an image and under 10MB
- Check billing is enabled for your project
- Ensure user is authenticated

### Messages not appearing
- Check that user is a participant in the chat
- Verify Firestore rules allow read access
- Check browser console for errors

---

## Development with Emulators (Optional)

For local development without touching production data:

1. Install emulators:
   ```bash
   firebase init emulators
   ```
   Select: Authentication, Firestore, Storage

2. Start emulators:
   ```bash
   firebase emulators:start
   ```

3. Enable in `.env`:
   ```env
   VITE_USE_FIREBASE_EMULATORS=true
   ```

4. Access emulator UI at: http://localhost:4000

---

## Next Steps

1. ✅ Complete steps 1-7 above
2. 🔧 Test authentication in your app
3. 💬 Create a chat and send messages
4. 📸 Upload and share photos
5. 📊 Monitor usage in Firebase Console
6. 🔒 Review security rules periodically

---

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Storage Documentation](https://firebase.google.com/docs/storage)
- [Security Rules Guide](https://firebase.google.com/docs/rules)

---

**Happy building! 🚀**
