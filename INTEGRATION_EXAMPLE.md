# Firebase Integration Example

This document shows how to integrate Firebase chat and photo uploads into your existing Memory Notebook app.

## Quick Start

### 1. Add Authentication to Your App

Wrap your app with authentication state:

```tsx
// In App.tsx or your root component
import { useAuth } from './hooks/useAuth';
import { signInAnonymous } from './services/auth';

function App() {
  const { user, loading } = useAuth();

  // Auto sign-in anonymously if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      signInAnonymous().catch(console.error);
    }
  }, [loading, user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Your existing app */}
    </div>
  );
}
```

### 2. Create a Chat on Session Start

When a user starts a conversation session:

```tsx
import { createChat, sendMessage } from './services/firebaseAPI';

async function startSession() {
  try {
    // Create a new chat for this session
    const chatId = await createChat(`Session ${new Date().toLocaleString()}`);

    // Store chatId in state
    setChatId(chatId);

    // Send initial message
    await sendMessage(chatId, {
      text: 'Session started',
      metadata: { aiModel: 'gemini-1.5' }
    });
  } catch (error) {
    console.error('Failed to start session:', error);
  }
}
```

### 3. Save Messages to Firestore

When user speaks or AI responds:

```tsx
import { sendMessage } from './services/firebaseAPI';

async function saveConversationTurn(chatId: string, turn: MemoryTurn) {
  try {
    await sendMessage(chatId, {
      text: turn.text,
      metadata: {
        voiceDetected: true,
        aiModel: turn.role === 'assistant' ? 'gemini-1.5' : undefined,
      }
    });
  } catch (error) {
    console.error('Failed to save message:', error);
  }
}

// In your conversation handler
function handleUserSpeech(text: string) {
  // Add to local state
  const turn: MemoryTurn = {
    role: 'user',
    text,
    timestamp: Date.now(),
  };
  setMemory(prev => [...prev, turn]);

  // Save to Firestore
  if (currentChatId) {
    saveConversationTurn(currentChatId, turn);
  }
}

function handleAIResponse(text: string) {
  const turn: MemoryTurn = {
    role: 'assistant',
    text,
    timestamp: Date.now(),
  };
  setMemory(prev => [...prev, turn]);

  // Save to Firestore
  if (currentChatId) {
    saveConversationTurn(currentChatId, turn);
  }
}
```

### 4. Upload Photos with Messages

When a user uploads a photo:

```tsx
import { uploadPhoto, sendMessage } from './services/firebaseAPI';

async function handlePhotoUpload(file: File, chatId: string) {
  try {
    // Show upload progress
    setUploadProgress(0);

    // Upload to Firebase Storage
    const result = await uploadPhoto({
      file,
      chatId,
      onProgress: (progress) => {
        setUploadProgress(progress);
      }
    });

    // Send message with photo attachment
    await sendMessage(chatId, {
      text: 'Photo uploaded',
      attachments: [result.attachment]
    });

    // Add to local state
    const newPhoto: UploadedPhoto = {
      id: result.metadata.id,
      previewUrl: result.downloadURL,
      base64Data: '', // Not needed anymore, using Firebase URL
      mimeType: file.type,
      uploadedAt: Date.now(),
    };

    setUploadedPhotos(prev => [...prev, newPhoto]);

  } catch (error) {
    console.error('Upload failed:', error);
    alert('Failed to upload photo: ' + error.message);
  }
}
```

### 5. Display Chat Messages (Real-time)

Show messages from Firestore with real-time updates:

```tsx
import { useChatMessages } from './hooks/useChatMessages';

function ChatView({ chatId }: { chatId: string }) {
  const { messages, loading, error } = useChatMessages(chatId);

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="chat-messages">
      {messages.map(msg => (
        <div key={msg.id} className={`message ${msg.senderUid}`}>
          <div className="message-text">{msg.text}</div>

          {/* Show attachments */}
          {msg.attachments?.map(attachment => (
            <img
              key={attachment.id}
              src={attachment.downloadURL}
              alt={attachment.fileName}
              className="message-image"
            />
          ))}

          <div className="message-time">
            {new Date(msg.createdAt).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 6. Load User's Past Chats

Show a list of previous conversations:

```tsx
import { getUserChats } from './services/firebaseAPI';

function ChatList() {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    async function loadChats() {
      try {
        const userChats = await getUserChats();
        setChats(userChats);
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    }

    loadChats();
  }, []);

  return (
    <div className="chat-list">
      {chats.map(chat => (
        <div key={chat.id} onClick={() => openChat(chat.id)}>
          <h3>{chat.name}</h3>
          <p>{chat.lastMessageText}</p>
          <small>
            {new Date(chat.lastMessageAt || 0).toLocaleDateString()}
          </small>
        </div>
      ))}
    </div>
  );
}
```

## Complete Example Component

Here's a full example component that combines everything:

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChatMessages } from './hooks/useChatMessages';
import {
  createChat,
  sendMessage,
  uploadPhoto,
  signInAnonymous,
} from './services';

function ChatSession() {
  const { user, loading: authLoading } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const { messages, loading: messagesLoading } = useChatMessages(chatId || '');
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Auto sign-in and create chat
  useEffect(() => {
    async function initialize() {
      if (!authLoading && !user) {
        await signInAnonymous();
      }

      if (user && !chatId) {
        const newChatId = await createChat('New Session');
        setChatId(newChatId);
      }
    }

    initialize();
  }, [user, authLoading, chatId]);

  const handleSendMessage = async () => {
    if (!chatId || !inputText.trim()) return;

    try {
      await sendMessage(chatId, { text: inputText });
      setInputText('');
    } catch (error) {
      console.error('Send failed:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    try {
      setUploading(true);
      const result = await uploadPhoto({
        file,
        chatId,
        onProgress: (p) => console.log(`Upload: ${p}%`)
      });

      await sendMessage(chatId, {
        text: 'Photo uploaded',
        attachments: [result.attachment]
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || messagesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-session">
      {/* Messages */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <p>{msg.text}</p>
            {msg.attachments?.map(att => (
              <img key={att.id} src={att.downloadURL} alt="" />
            ))}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="input">
        <input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>

        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          disabled={uploading}
        />
      </div>
    </div>
  );
}
```

## Tips

### Offline Support
Firebase automatically caches data and syncs when back online. No extra code needed!

### Error Handling
Always wrap Firebase calls in try-catch:

```tsx
try {
  await sendMessage(chatId, { text: 'Hello' });
} catch (error) {
  if (error.code === 'permission-denied') {
    alert('You do not have permission to send messages');
  } else {
    alert('Failed to send message');
  }
  console.error(error);
}
```

### Performance
- Use the `limit` parameter in `subscribeToMessages` to avoid loading too many messages
- Unsubscribe from listeners when components unmount (hooks do this automatically)
- Consider pagination for long chat histories

### Security
- Never expose your `.env` file
- Review security rules before going to production
- Use Firebase App Check for production apps
- Monitor usage and set budget alerts

## Next Steps

1. ✅ Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) to configure Firebase
2. 🔧 Add authentication to your app
3. 💬 Integrate chat creation and messaging
4. 📸 Add photo upload functionality
5. 🎨 Style your chat UI
6. 🚀 Deploy and test!

Happy coding! 🚀
