import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Mic, MicOff, Save, Sparkles, X, Volume2, Volume1, Settings, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppState, SessionState, PhotoData, MemoryTurn, UploadedPhoto, SessionSummary, HistoryViewState, HistoryEntry } from './types';
import { SYSTEM_INSTRUCTION, DEFAULT_PHOTO_URLS } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import AmbiencePlayer from './components/AmbiencePlayer';
import VoiceSubtitle from './components/VoiceSubtitle';
import MicButton, { MicButtonState } from './components/MicButton';
import VoiceStatusIndicator, { VoiceConnectionStatus } from './components/VoiceStatusIndicator';
import SettingsPanel from './components/SettingsPanel';
import { CalendarView, CarouselView, groupSessionsByDate } from './components/HistoryViews';
import SoundWave from './components/SoundWave';
import VoiceControlCard from './components/VoiceControlCard';
import LoginModal from './components/LoginModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useGeminiLive } from './hooks/useGeminiLive';
import { useAuth } from './hooks/useAuth';
import { saveSession, getUserSessions, deleteSession } from './services/firebaseAPI';
import type { SupportedLanguage } from './i18n/types';
import { formatDate, formatTime } from './i18n/utils';

export default function App() {
  // i18n hooks
  const { t, i18n } = useTranslation();

  // Debug: Check API key on component mount
  useEffect(() => {
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      import.meta.env.API_KEY;

  }, []);

  // State
  const [appState, setAppState] = useState<AppState>('LANDING');
  const [sessionState, setSessionState] = useState<SessionState>('IDLE');
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [transcript, setTranscript] = useState<MemoryTurn[]>([]);
  const [currentText, setCurrentText] = useState<string>('');

  // Audio Controls
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.5);

  // Disconnection state for better UX
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Visual Reactivity
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 - 1.0 for visuals
  const [inputAudioLevel, setInputAudioLevel] = useState(0); // 0.0 - 1.0 for input microphone level
  // Performance: Sync audio level to a ref to pass to canvas without re-rendering
  const audioLevelRef = useRef(0);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Voice UI States
  const [voiceStatus, setVoiceStatus] = useState<VoiceConnectionStatus>('idle');

  // Subtitle States
  const [subtitleText, setSubtitleText] = useState<string>('');
  const [subtitleRole, setSubtitleRole] = useState<'user' | 'assistant' | null>(null);
  const [showSubtitle, setShowSubtitle] = useState<boolean>(false);

  // NEW: Photo Management (for background particle effects)
  const [defaultPhotoIndex, setDefaultPhotoIndex] = useState(0); // Which default photo to use
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]); // User's custom photos
  const [selectedCustomPhotoId, setSelectedCustomPhotoId] = useState<string | null>(null); // null = use default
  const [showSettings, setShowSettings] = useState(false); // Settings panel visibility

  // NEW: Session Tracking (for summary generation)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Memory Garden State
  const [historyViewState, setHistoryViewState] = useState<HistoryViewState>('HIDDEN');
  const [selectedDateForHistory, setSelectedDateForHistory] = useState<string>('');
  const [selectedHistoryEntries, setSelectedHistoryEntries] = useState<HistoryEntry[]>([]);

  // Memory Garden Firebase Data
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, HistoryEntry[]>>({});
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Firebase Authentication
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use the Gemini Live hook
  const {
    isConnected,
    isConnecting,
    isPaused,
    error: geminiError,
    connect: connectGemini,
    disconnect: disconnectGemini,
    pause: pauseGemini,
    resume: resumeGemini,
    analysers
  } = useGeminiLive(
    // onTranscript callback - store transcriptions and show as subtitle
    (text: string, role: 'user' | 'assistant') => {
      // Store both user and assistant transcriptions immediately in background
      setTranscript(prev => [...prev, {
        role: role,
        text: text,
        timestamp: Date.now()
      }]);

      // Show complete text as subtitle
      setSubtitleText(text);
      setSubtitleRole(role);
      setShowSubtitle(true);
    },
    // onTurnComplete callback
    () => {
      setSessionState('IDLE');
    },
    // setAudioLevel callback
    setAudioLevel,
    // onPartialTranscript callback - not used for subtitles anymore
    undefined
  );

  // Update voice status based on connection state
  useEffect(() => {
    if (isConnecting) {
      setVoiceStatus('connecting');
    } else if (isConnected) {
      setVoiceStatus('connected');
      setIsDisconnecting(false); // Reset disconnecting state when connected
    } else if (geminiError) {
      setVoiceStatus('error');
      setIsDisconnecting(false); // Reset disconnecting state on error
      console.error('❌ Gemini Error:', geminiError);
    } else {
      setVoiceStatus('idle');
      setIsDisconnecting(false); // Reset disconnecting state when idle
    }
  }, [isConnecting, isConnected, geminiError]);

  // Monitor audio level to determine if AI is speaking
  useEffect(() => {
    if (audioLevel > 0.1) {
      setSessionState('SPEAKING');
    } else if (isConnected && audioLevel < 0.05) {
      const timer = setTimeout(() => setSessionState('IDLE'), 500);
      return () => clearTimeout(timer);
    }
  }, [audioLevel, isConnected]);

  // Monitor input audio level for SoundWave visualization
  // TEMPORARILY DISABLED FOR TESTING - Check if requestAnimationFrame loop is blocking React events
  useEffect(() => {
    if (!analysers.input || !isConnected) {
      setInputAudioLevel(0);
      return;
    }

    // TEMPORARILY DISABLED - Uncomment to restore
    /*
    const analyser = analysers.input;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationFrameId: number;

    const updateInputLevel = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume from frequency data
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;

      // Normalize to 0.0 - 1.0 range (byte values are 0-255)
      const normalizedLevel = average / 255;

      setInputAudioLevel(normalizedLevel);
      animationFrameId = requestAnimationFrame(updateInputLevel);
    };

    updateInputLevel();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    */
    
    // Keep audio level at 0 for testing
    setInputAudioLevel(0);
  }, [analysers.input, isConnected]);

  // Auto-clear subtitles after period of inactivity
  useEffect(() => {
    if (!showSubtitle || !subtitleText) return;

    // Clear subtitle after 10 seconds of no updates (increased for better readability)
    const clearTimer = setTimeout(() => {
      setShowSubtitle(false);
      setSubtitleText('');
      setSubtitleRole(null);
    }, 10000);

    return () => clearTimeout(clearTimer);
  }, [subtitleText, showSubtitle]);


  // --- Helpers ---

  // Map voice connection status to MicButton visual state
  const getMicButtonState = (): MicButtonState => {
    if (geminiError) return 'error';
    if (isDisconnecting) return 'disconnecting';
    if (isConnecting) return 'connecting';
    if (isPaused) return 'idle'; // Show as idle when paused
    if (isConnected) return 'connected';
    return 'idle';
  };

  // NEW: Get the current photo URL for particle effects
  const getCurrentPhotoUrl = (): string => {
    // If user selected a custom photo, use it
    if (selectedCustomPhotoId) {
      const customPhoto = uploadedPhotos.find(p => p.id === selectedCustomPhotoId);
      if (customPhoto) return customPhoto.previewUrl;
    }
    // Otherwise use default photo
    return DEFAULT_PHOTO_URLS[defaultPhotoIndex];
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 part
        const base64Data = result.split(',')[1];
        setPhotoData({
          file,
          previewUrl: result,
          base64Data,
          mimeType: file.type
        });
        setAppState('UPLOAD');
      };
      reader.readAsDataURL(file);
    }
  };

  // NEW: Start chat directly without photo upload requirement
  const startChatSession = () => {
    setAppState('RENDERING');
    // Simulate rendering time for effect
    setTimeout(() => {
      setAppState('SESSION');
      setIsMusicPlaying(true);
      setSessionStartTime(Date.now()); // Track when session starts
    }, 2500);
  };

  const startMemoryProcess = () => {
    setAppState('RENDERING');
    // Simulate rendering time for effect
    setTimeout(() => {
      setAppState('SESSION');
      // Don't auto-connect anymore - user will click mic button
      setIsMusicPlaying(true);
    }, 2500);
  };


  // NEW: Photo Management Handlers
  const handlePhotoUpload = (file: File) => {
    if (uploadedPhotos.length >= 5) {
      alert(t('errors:photos.uploadLimit'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];

      const newPhoto: UploadedPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        previewUrl: result,
        base64Data,
        mimeType: file.type,
        uploadedAt: Date.now(),
      };

      setUploadedPhotos(prev => [...prev, newPhoto]);
      // Auto-select the newly uploaded photo
      setSelectedCustomPhotoId(newPhoto.id);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoSelect = (photoId: string | null) => {
    setSelectedCustomPhotoId(photoId);
  };

  const handlePhotoDelete = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId));
    // If deleted photo was selected, revert to default
    if (selectedCustomPhotoId === photoId) {
      setSelectedCustomPhotoId(null);
    }
  };

  // --- Memory Garden Handlers ---
  const openHistoryCalendar = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    // Load sessions from Firebase
    setIsLoadingHistory(true);
    try {
      const sessions = await getUserSessions(90); // Last 90 days
      const grouped = groupSessionsByDate(sessions);
      setSessionsByDate(grouped);
      setHistoryViewState('CALENDAR');
    } catch (error) {
      console.error('Failed to load session history:', error);
      // Optionally show error message to user
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const closeHistory = () => setHistoryViewState('HIDDEN');

  const handleDateSelect = (date: string, entries: HistoryEntry[]) => {
    setSelectedDateForHistory(date);
    setSelectedHistoryEntries(entries);
    setHistoryViewState('CAROUSEL');
  };

  const handleDeleteHistoryEntry = async (id: string) => {
    try {
      // Delete from Firebase
      await deleteSession(id);

      // Remove from local state
      setSelectedHistoryEntries(prev => prev.filter(entry => entry.id !== id));

      // Also remove from sessionsByDate to update calendar
      setSessionsByDate(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(date => {
          updated[date] = updated[date].filter(entry => entry.id !== id);
          if (updated[date].length === 0) {
            delete updated[date]; // Remove empty dates
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
      // Optionally show error message
    }
  };

  // --- Gemini Live Integration ---

  const handleMicClick = async () => {
    if (isConnected) {
      // Toggle pause/resume instead of disconnecting
      if (isPaused) {
        resumeGemini();
        setSessionState('IDLE');
      } else {
        pauseGemini();
        setSessionState('IDLE');
      }
      return;
    }

    if (isConnecting) {
      return;
    }

    try {
      const apiKey =
        import.meta.env.VITE_GEMINI_API_KEY ||
        import.meta.env.VITE_API_KEY ||
        import.meta.env.GEMINI_API_KEY ||
        import.meta.env.API_KEY;

      if (!apiKey) {
        alert("API Key missing. Please check .env file and restart dev server.");
        return;
      }

      setSessionState('IDLE');
      await connectGemini(SYSTEM_INSTRUCTION);
    } catch (error) {
      console.error('Error in handleMicClick:', error);
      alert(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Helper function to generate language-specific summary prompts
  const getSummaryPrompt = (language: SupportedLanguage, conversationText: string): string => {
    const prompts: Record<SupportedLanguage, string> = {
      'en': `Please provide a warm, empathetic 2-3 sentence summary of the following conversation between a user and their voice companion. Focus on the key themes, emotions, and topics discussed:\n\n${conversationText}`,

      'zh-CN': `请为以下用户与语音伴侣之间的对话提供一个温暖、富有同理心的 2-3 句话摘要。重点关注讨论的关键主题、情感和话题：\n\n${conversationText}`,
    };

    return prompts[language] || prompts['en'];
  };

  // NEW: Generate AI summary of the conversation using Gemini API
  const generateSummary = async (): Promise<SessionSummary> => {
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      import.meta.env.API_KEY;

    if (!apiKey) {
      throw new Error('API key not found');
    }

    const endTime = Date.now();
    const duration = sessionStartTime ? Math.floor((endTime - sessionStartTime) / 1000) : 0;
    const userMessages = transcript.filter(t => t.role === 'user');
    const aiMessages = transcript.filter(t => t.role === 'assistant');

    // Build conversation text for AI to summarize
    const conversationText = transcript
      .map(t => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n\n');

    // Retry logic with exponential backoff for rate limiting
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait before retrying (exponential backoff)
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Get language-specific prompt
        const currentLanguage = i18n.language as SupportedLanguage;
        const summaryPrompt = getSummaryPrompt(currentLanguage, conversationText);

        // Call Gemini API to generate summary
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: summaryPrompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 10000,
              }
            })
          }
        );

        if (response.status === 429) {
          // Rate limited - will retry
          lastError = new Error(`Rate limited (429). Attempt ${attempt + 1}/${maxRetries}`);
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const aiGeneratedSummary =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          data.candidates?.[0]?.output ||
          data.candidates?.[0]?.text ||
          data.text ||
          'A meaningful conversation was shared.';

        return {
          aiGeneratedSummary,
          duration,
          turnCount: transcript.length,
          userMessageCount: userMessages.length,
          aiMessageCount: aiMessages.length,
          startTime: sessionStartTime || endTime,
          endTime,
        };
      } catch (error: any) {
        lastError = error;
        // If it's not a 429 error, don't retry
        if (error.message && !error.message.includes('429')) {
          break;
        }
      }
    }

    // All retries failed - return fallback summary
    console.error('Failed to generate summary after retries:', lastError);
    return {
      aiGeneratedSummary: 'Thank you for sharing this time together. Your thoughts and feelings matter.',
      duration,
      turnCount: transcript.length,
      userMessageCount: userMessages.length,
      aiMessageCount: aiMessages.length,
      startTime: sessionStartTime || endTime,
      endTime,
    };
  };

  const handleEndSessionClick = () => {
    // Check authentication BEFORE allowing summary generation
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    // User is authenticated, proceed with ending session
    endSession();
  };

  const endSession = async () => {
    disconnectGemini();
    setIsMusicPlaying(false);

    // Show loading UI for summary generation
    setIsGeneratingSummary(true);

    // Wait 3 seconds to let rate limits reset after Live API disconnection
    await new Promise(resolve => setTimeout(resolve, 3000));
    let summary: SessionSummary;
    try {
      summary = await generateSummary();
    } catch (error) {
      console.error('❌ Summary generation failed, using fallback:', error);
      // Create fallback summary
      const endTime = Date.now();
      summary = {
        aiGeneratedSummary: 'Thank you for sharing this time together. Your thoughts and feelings matter.',
        duration: sessionStartTime ? Math.floor((endTime - sessionStartTime) / 1000) : 0,
        turnCount: transcript.length,
        userMessageCount: transcript.filter(t => t.role === 'user').length,
        aiMessageCount: transcript.filter(t => t.role === 'assistant').length,
        startTime: sessionStartTime || endTime,
        endTime: endTime,
      };
    }

    setSessionSummary(summary);
    setIsGeneratingSummary(false);
    setAppState('SUMMARY');
  };

  // --- Save Session Handler ---

  const handleSaveSession = async () => {
    if (!sessionSummary) {
      console.error('❌ No session summary to save');
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    // Save session to Firebase
    setIsSaving(true);
    try {
      const sessionId = await saveSession({
        summary: sessionSummary,
        transcript: transcript,
      });
      setSaveSuccess(true);
      // Reset after 2 seconds and reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      alert(t('errors:session.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    // Wait a brief moment for auth state to update
    setTimeout(() => {
      endSession();
    }, 500);
  };

  // --- UI Components ---

  const LandingView = () => (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-5xl md:text-7xl font-serif tracking-wide mb-4 text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 animate-pulse">
        {t('common:brand')}
      </h1>
      <p className="text-gray-400 max-w-2xl mb-12 text-lg font-light whitespace-nowrap">
        {t('landing:subtitle', { brand: t('common:brand') })}
      </p>

      {appState === 'LANDING' ? (
        <button
          onClick={startChatSession}
          className="group cursor-pointer relative px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-full overflow-hidden backdrop-blur-sm"
        >
          <span className="relative z-10 flex items-center gap-2 text-white tracking-widest uppercase text-sm font-semibold">
            <Sparkles size={16} /> {t('landing:startButton')}
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : null}
    </div>
  );

  const UploadPreview = () => (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 animate-fade-in">
      {photoData && (
        <div className="relative w-full max-w-md aspect-[3/4] md:aspect-square rounded-lg overflow-hidden shadow-2xl border border-white/10 mb-8">
          <img src={photoData.previewUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
      <div className="flex gap-4">
        <button
          onClick={() => setAppState('LANDING')}
          className="px-6 py-3 rounded-full border border-white/20 text-white/60 hover:text-white hover:bg-white/5 transition-all"
        >
          {t('landing:tryAnother')}
        </button>
        <button
          onClick={startMemoryProcess}
          className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all shadow-lg shadow-white/10"
        >
          {t('landing:visualizeAndSpeak')}
        </button>
      </div>
    </div>
  );

  const SessionView = () => (
    <div className="relative z-10 flex flex-col h-screen" style={{ pointerEvents: 'auto' }}>
      {/* Left Sidebar: Memory Garden Trigger */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center z-30">
        <button
          onClick={openHistoryCalendar}
          className="group flex flex-col items-center gap-4 p-4 hover:bg-white/5 transition-all h-32 md:h-auto rounded-r-2xl border-y border-r border-transparent hover:border-white/10"
        >
          {/* Decorative line - Top - Saturn Yellow */}
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-[#EBD671]/60 to-transparent group-hover:via-[#EBD671] transition-all" />

          {/* Text - Saturn Yellow */}
          <span
            className={`text-[14px] uppercase tracking-[0.25em] text-[#EBD671]/70 group-hover:text-[#EBD671] transition-colors ${
              i18n.language === 'zh-CN' ? '' : 'rotate-180'
            }`}
            style={{
              writingMode: i18n.language === 'zh-CN' ? 'vertical-rl' : 'vertical-rl',
              textOrientation: i18n.language === 'zh-CN' ? 'upright' : 'mixed'
            }}
          >
            {t('history:memoryGarden')}
          </span>

          {/* Decorative line - Bottom - Saturn Yellow */}
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-[#EBD671]/60 to-transparent group-hover:via-[#EBD671] transition-all" />
        </button>
      </div>

      {/* Header / Top Bar */}
      <div className="flex justify-between items-center p-6 text-white/50 z-20 pl-20">
        <VoiceStatusIndicator
          status={voiceStatus}
          showLabel={true}
          label={t('session:controls.connectingLabel')}
          size={10}
          glowIntensity={8}
        />
        <div className="flex items-center gap-4">
          <button onClick={() => setMusicVolume(v => v === 0 ? 0.5 : 0)}>
            {musicVolume === 0 ? <X size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={musicVolume}
            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
            className="w-20 accent-white h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
          {/* Language Switcher */}
          <LanguageSwitcher />
          {/* NEW: Settings Button */}
          <button
            onClick={(e) => {
              console.log('Settings button clicked!', { isConnected, e });
              e.stopPropagation();
              setShowSettings(true);
            }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title={t('settings:title')}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Central Visual Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6" style={{ pointerEvents: 'none' }}>

        {/* Connection Status Messages */}
        {isConnecting && (
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-t-2 border-white/50 rounded-full animate-spin mx-auto" />
            <p className="text-white/60 font-light animate-pulse">{t('session:loading.connectingToGemini')}</p>
          </div>
        )}



        {/* Show error if any */}
        {geminiError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md text-center">
            <p className="text-red-400 text-sm mb-2 font-semibold">{t('session:errors.connectionError')}</p>
            <p className="text-red-300 text-xs">{geminiError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-xs transition-colors"
            >
              {t('session:errors.reloadPage')}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-8 flex flex-col items-center gap-6 z-20 pointer-events-auto">

        {/* Unified Voice Control Card - Soundwave + Mic Button */}
        <VoiceControlCard
          audioLevel={inputAudioLevel}
          isRecording={isConnected}
          micState={getMicButtonState()}
          onMicClick={handleMicClick}
          disabled={isConnecting || isDisconnecting}
          placeholder={
            !isConnected && !isConnecting && !isDisconnecting
              ? t('session:controls.tapToSpeak')
              : isConnecting
                ? t('common:status.connecting')
                : isDisconnecting
                  ? t('session:loading.disconnecting')
                  : ''
          }
          showPlaceholder={true}
          width="400px"
        />

        <button
          onClick={handleEndSessionClick}
          className="
            flex items-center gap-2
            text-sm text-[#0081A7] hover:text-[#00AFCC]
            transition-all duration-200
            px-4 py-2 rounded-lg
            border border-[#0081A7]/30 hover:border-[#00AFCC]/60
            bg-[#0081A7]/5 hover:bg-[#0081A7]/15
            mt-2 pointer-events-auto relative z-50
          "
        >
          <LogOut size={14} />
          <span>{t('session:controls.endSession')}</span>
        </button>
      </div>
    </div>
  );

  // NEW: Summary View - Shows AI-generated summary before full transcript
  const SummaryView = () => {
    if (!sessionSummary) {
      // Show loading or fallback if summary not available
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 max-w-2xl mx-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl text-center">
            <p className="text-white/60">{t('errors:summary.loadingSummary')}</p>
          </div>
        </div>
      );
    }

    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      if (mins === 0) return `${secs}s`;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 py-12 max-w-2xl mx-auto animate-fade-in">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl my-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-3xl font-serif text-white mb-2">{t('session:summary.title')}</h2>
            <p className="text-white/50 text-sm">
              {formatDate(sessionSummary.endTime, i18n.language as SupportedLanguage)} • {formatTime(sessionSummary.endTime, i18n.language as SupportedLanguage)}
            </p>
          </div>

          {/* AI Summary */}
          <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">{t('session:summary.conversationSummary')}</h3>
            <p className="text-white/90 text-lg leading-relaxed font-light italic">
              "{sessionSummary.aiGeneratedSummary}"
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-semibold text-white mb-1">
                {formatDuration(sessionSummary.duration)}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">{t('session:summary.duration')}</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-semibold text-white mb-1">
                {sessionSummary.turnCount}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">{t('session:summary.messages')}</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-semibold text-white mb-1">
                {sessionSummary.userMessageCount}/{sessionSummary.aiMessageCount}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">{t('session:summary.exchanges')}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-6 border-t border-white/5">
            {saveSuccess ? (
              <div className="px-6 py-3 bg-emerald-500 text-white rounded-full text-sm font-semibold flex items-center gap-2">
                <Sparkles size={16} />
                {t('session:summary.savedSuccessfully')}
              </div>
            ) : (
              <button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? t('session:loading.pleaseWait') : t('common:buttons.save')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`relative w-full h-screen bg-black selection:bg-white/20 ${appState === 'SUMMARY' ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ pointerEvents: 'auto' }}>

      {/* Background Visuals - Always active now, uses default or custom photo */}
      <ParticleCanvas
        imageUrl={appState === 'LANDING' ? null : getCurrentPhotoUrl()}
        isActive={true}
        audioLevel={audioLevel}
        audioRef={audioLevelRef}
      />

      {/* Audio Layer */}
      <AmbiencePlayer
        play={isMusicPlaying}
        ducking={sessionState === 'SPEAKING' || isConnected}
        volume={musicVolume}
      />

      {/* Rendering State Overlay */}
      {appState === 'RENDERING' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center">
            <div className="w-12 h-12 border-t-2 border-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 font-serif tracking-widest animate-pulse">{t('session:loading.startingChat')}</p>
          </div>
        </div>
      )}

      {/* Summary Generation Loading Overlay */}
      {isGeneratingSummary && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-t-2 border-emerald-400 rounded-full animate-spin mx-auto" />
            <p className="text-white/60 font-serif tracking-widest animate-pulse">{t('session:loading.generatingSummary')}</p>
            <p className="text-white/40 text-sm font-light">{t('session:loading.generatingSummaryHint')}</p>
          </div>
        </div>
      )}

      {/* Main Views */}
      {appState === 'LANDING' && <LandingView />}
      {appState === 'UPLOAD' && <UploadPreview />}
      {appState === 'SESSION' && <SessionView />}
      {appState === 'SUMMARY' && <SummaryView />}

      {/* NEW: Settings Panel (accessible from session view) */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        uploadedPhotos={uploadedPhotos}
        selectedCustomPhotoId={selectedCustomPhotoId}
        onPhotoUpload={handlePhotoUpload}
        onPhotoSelect={handlePhotoSelect}
        onPhotoDelete={handlePhotoDelete}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Memory Garden Loading Overlay */}
      {isLoadingHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-t-2 border-[#EBD671] rounded-full animate-spin mx-auto" />
            <p className="text-white/80 font-serif tracking-widest">{t('session:loading.loadingMemories')}</p>
          </div>
        </div>
      )}

      {/* Memory Garden Overlays */}
      {historyViewState === 'CALENDAR' && (
        <CalendarView
          onClose={closeHistory}
          onSelectDate={handleDateSelect}
          sessionsByDate={sessionsByDate}
        />
      )}

      {historyViewState === 'CAROUSEL' && (
        <CarouselView
          date={selectedDateForHistory}
          entries={selectedHistoryEntries}
          onBack={openHistoryCalendar}
          onClose={closeHistory}
          onDeleteEntry={handleDeleteHistoryEntry}
        />
      )}

    </div>
  );
}
