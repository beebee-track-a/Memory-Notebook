import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Mic, MicOff, Save, Sparkles, X, Volume2, Volume1, Settings } from 'lucide-react';

import { AppState, SessionState, PhotoData, MemoryTurn, UploadedPhoto, SessionSummary } from './types';
import { SYSTEM_INSTRUCTION, DEFAULT_PHOTO_URLS } from './constants';
import ParticleCanvas from './components/ParticleCanvas';
import AmbiencePlayer from './components/AmbiencePlayer';
import VoiceSubtitle from './components/VoiceSubtitle';
import MicButton from './components/MicButton';
import VoiceStatusIndicator, { VoiceConnectionStatus } from './components/VoiceStatusIndicator';
import SettingsPanel from './components/SettingsPanel';
import LoginModal from './components/LoginModal';
import { useGeminiLive } from './hooks/useGeminiLive';
import { useAuth } from './hooks/useAuth';
import { saveSession } from './services/firebaseAPI';

export default function App() {
  // Debug: Check API key on component mount
  useEffect(() => {
    const apiKey =
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      import.meta.env.API_KEY;

    console.log('🔍 App mounted. Checking environment:');
    console.log('  - API_KEY exists:', !!apiKey);
    console.log('  - API_KEY preview:', apiKey ? apiKey.substring(0, 20) + '...' : 'MISSING');
    console.log('  - Vite env keys:', Object.keys(import.meta.env));
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

  // Visual Reactivity
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 - 1.0 for visuals

  // Voice UI States
  const [voiceStatus, setVoiceStatus] = useState<VoiceConnectionStatus>('idle');

  // Subtitle States
  const [subtitleText, setSubtitleText] = useState<string>('');
  const [subtitleRole, setSubtitleRole] = useState<'user' | 'assistant' | null>(null);
  const [showSubtitle, setShowSubtitle] = useState<boolean>(false);
  const subtitleUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // NEW: Photo Management (for background particle effects)
  const [defaultPhotoIndex, setDefaultPhotoIndex] = useState(0); // Which default photo to use
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]); // User's custom photos
  const [selectedCustomPhotoId, setSelectedCustomPhotoId] = useState<string | null>(null); // null = use default
  const [showSettings, setShowSettings] = useState(false); // Settings panel visibility

  // NEW: Session Tracking (for summary generation)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Firebase Authentication
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use the Gemini Live hook
  const {
    isConnected,
    isConnecting,
    error: geminiError,
    connect: connectGemini,
    disconnect: disconnectGemini,
    analysers
  } = useGeminiLive(
    // onTranscript callback - store both user and assistant transcriptions immediately
    (text: string, role: 'user' | 'assistant') => {
      console.log('📝 Transcript received:', { role, text });
      // Store both user and assistant transcriptions immediately in background
      setTranscript(prev => {
        const updated = [...prev, {
          role: role,
          text: text,
          timestamp: Date.now()
        }];
        console.log('✅ Transcript stored. Total turns:', updated.length);
        return updated;
      });
    },
    // onTurnComplete callback
    () => {
      setSessionState('IDLE');
    },
    // setAudioLevel callback
    setAudioLevel,
    // onPartialTranscript callback - for real-time subtitles (throttled to reduce flashing)
    (text: string, role: 'user' | 'assistant') => {
      if (text.trim()) {
        // Clear any pending update
        if (subtitleUpdateTimeoutRef.current) {
          clearTimeout(subtitleUpdateTimeoutRef.current);
        }

        // Throttle updates to max 10 per second (100ms intervals) to prevent flashing
        subtitleUpdateTimeoutRef.current = setTimeout(() => {
          setSubtitleText(text.trim());
          setSubtitleRole(role);
          setShowSubtitle(true);
        }, 100);
      } else {
        // Clear subtitle when text is empty (immediate, no throttle)
        if (subtitleUpdateTimeoutRef.current) {
          clearTimeout(subtitleUpdateTimeoutRef.current);
        }
        setShowSubtitle(false);
        setSubtitleText('');
        setSubtitleRole(null);
      }
    }
  );

  // Update voice status based on connection state
  useEffect(() => {
    console.log('🔄 Connection state changed:', { isConnecting, isConnected, hasError: !!geminiError });
    if (isConnecting) {
      setVoiceStatus('connecting');
    } else if (isConnected) {
      setVoiceStatus('connected');
    } else if (geminiError) {
      setVoiceStatus('error');
      console.error('❌ Gemini Error:', geminiError);
    } else {
      setVoiceStatus('idle');
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

  // Auto-clear subtitles after period of inactivity
  useEffect(() => {
    if (!showSubtitle || !subtitleText) return;

    // Clear subtitle after 5 seconds of no updates
    const clearTimer = setTimeout(() => {
      setShowSubtitle(false);
      setSubtitleText('');
      setSubtitleRole(null);
    }, 5000);

    return () => clearTimeout(clearTimer);
  }, [subtitleText, showSubtitle]);

  // Cleanup throttle timeout on unmount
  useEffect(() => {
    return () => {
      if (subtitleUpdateTimeoutRef.current) {
        clearTimeout(subtitleUpdateTimeoutRef.current);
      }
    };
  }, []);

  // --- Helpers ---

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
      alert('Maximum 5 photos allowed. Please delete one first.');
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

  // --- Gemini Live Integration ---

  const handleMicClick = async () => {
    console.log('🎤 Mic button clicked', { isConnected, isConnecting });

    if (isConnected) {
      // If already connected, disconnect
      console.log('🔌 Disconnecting...');
      disconnectGemini();
      setSessionState('IDLE');
      return;
    }

    if (isConnecting) {
      console.log('⏳ Already connecting, please wait...');
      return;
    }

    try {
      // Start connection
      const apiKey =
        import.meta.env.VITE_GEMINI_API_KEY ||
        import.meta.env.VITE_API_KEY ||
        import.meta.env.GEMINI_API_KEY ||
        import.meta.env.API_KEY;

      console.log('🎤 Starting connection...', {
        hasApiKey: !!apiKey,
        hasPhoto: !!photoData,
        apiKey: apiKey ? 'exists' : 'missing'
      });

      if (!apiKey) {
          console.error('❌ API Key missing in Vite environment');
          alert("API Key missing. Please check .env file and restart dev server.");
          return;
      }
      // Photo is no longer required - we use default backgrounds
      // if (!photoData) {
      //     console.error('❌ No photo data');
      //     return;
      // }

      setSessionState('IDLE');

      console.log('📡 Calling connectGemini with:', {
        instructionLength: SYSTEM_INSTRUCTION.length,
        instructionPreview: SYSTEM_INSTRUCTION.substring(0, 100) + '...'
      });

      // Connect using the hook with system instruction
      await connectGemini(SYSTEM_INSTRUCTION);

      console.log('✅ connectGemini call completed - connection should be established');
    } catch (error) {
      console.error('💥 Error in handleMicClick:', error);
      alert(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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

    console.log('📋 Transcript to summarize:', {
      turnCount: transcript.length,
      conversationLength: conversationText.length,
      preview: conversationText.substring(0, 200) + '...'
    });

    // Retry logic with exponential backoff for rate limiting
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait before retrying (exponential backoff)
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.log(`⏳ Retrying summary generation (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Call Gemini API to generate summary
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Please provide a warm, empathetic 2-3 sentence summary of the following conversation between a user and their voice companion. Focus on the key themes, emotions, and topics discussed:\n\n${conversationText}`
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
        console.log('📥 API Response:', JSON.stringify(data, null, 2));

        // Try multiple possible response structures
        let aiGeneratedSummary =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          data.candidates?.[0]?.output ||
          data.candidates?.[0]?.text ||
          data.text ||
          'A meaningful conversation was shared.';

        console.log('📝 Extracted summary:', aiGeneratedSummary);
        console.log('🔍 Response structure:', {
          hasCandidates: !!data.candidates,
          candidatesLength: data.candidates?.length,
          firstCandidate: data.candidates?.[0],
        });

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
      console.log('🔐 User not authenticated, showing login modal');
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
    console.log('⏳ Waiting 3 seconds before generating summary...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate AI summary before moving to summary view
    console.log('🎯 Generating conversation summary...');
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

    console.log('✅ Summary generated:', summary);
    setSessionSummary(summary);
    setIsGeneratingSummary(false);

    // Always move to SUMMARY state (not REVIEW)
    console.log('🔄 Setting app state to SUMMARY');
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
      console.log('🔐 User not authenticated, showing login modal');
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
      console.log('✅ Session saved successfully:', sessionId);
      setSaveSuccess(true);
      // Reset after 2 seconds and reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('❌ Failed to save session:', error);
      alert('Failed to save session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoginSuccess = async () => {
    console.log('✅ User logged in successfully, generating summary...');
    // Close modal and proceed with ending session
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
        Hobbi
      </h1>
      <p className="text-gray-400 max-w-2xl mb-12 text-lg font-light whitespace-nowrap">
       A world built for you with Hobbi — where imagination becomes true companionship
      </p>

      {appState === 'LANDING' ? (
        <button
          onClick={startChatSession}
          className="group cursor-pointer relative px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-full overflow-hidden backdrop-blur-sm"
        >
            <span className="relative z-10 flex items-center gap-2 text-white tracking-widest uppercase text-sm font-semibold">
                <Sparkles size={16} /> Have a chat
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
                Try Another
             </button>
             <button
                onClick={startMemoryProcess}
                className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all shadow-lg shadow-white/10"
             >
                Visualize & Speak
             </button>
        </div>
    </div>
  );

  const SessionView = () => (
    <div className="relative z-10 flex flex-col h-screen">
        {/* Header / Top Bar */}
        <div className="flex justify-between items-center p-6 text-white/50 z-20">
            <VoiceStatusIndicator
              status={voiceStatus}
              showLabel={true}
              label="Gemini"
              size={10}
              glowIntensity={8}
            />
            <div className="flex items-center gap-4">
                 <button onClick={() => setMusicVolume(v => v === 0 ? 0.5 : 0)}>
                     {musicVolume === 0 ? <X size={16}/> : <Volume2 size={16} />}
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
                 {/* NEW: Settings Button */}
                 <button
                   onClick={() => setShowSettings(true)}
                   className="p-2 hover:bg-white/10 rounded-full transition-colors"
                   title="Background Settings"
                 >
                   <Settings size={18} />
                 </button>
            </div>
        </div>

        {/* Central Visual Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-6">

            {/* Real-time Subtitles - Centered to avoid overlap with mic button area */}
            <VoiceSubtitle
                text={subtitleText}
                isVisible={showSubtitle && isConnected}
                role={subtitleRole}
                position="center"
                typewriterEffect={false} // Disable typewriter for real-time updates
                maxWidth="80%"
                opacity={0.7}
                fontSize="text-xl md:text-2xl"
            />

            {/* Connection Status Messages */}
            {isConnecting && (
                <div className="text-center space-y-4">
                    <div className="w-10 h-10 border-t-2 border-white/50 rounded-full animate-spin mx-auto" />
                    <p className="text-white/60 font-light animate-pulse">Connecting to Gemini...</p>
                </div>
            )}



            {/* Show error if any */}
            {geminiError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md text-center">
                    <p className="text-red-400 text-sm mb-2 font-semibold">Connection Error</p>
                    <p className="text-red-300 text-xs">{geminiError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-xs transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            )}
        </div>

        {/* Bottom Controls */}
        <div className="p-8 flex flex-col items-center gap-6 z-20">
            {/* Mic Button */}
            <MicButton
                isRecording={isConnected}
                onClick={handleMicClick}
                size={72}
                glowColor={isConnected ? "rgb(34, 197, 94)" : "rgb(99, 102, 241)"}
                breathingDuration={2.5}
                disabled={isConnecting}
            />

            {!isConnected && !isConnecting && (
                <p className="text-sm text-white/50 font-light">Tap to start your conversation</p>
            )}
            {isConnected && (
                <p className="text-sm text-emerald-400 font-light">● Live - Speak freely</p>
            )}
            <button
                onClick={handleEndSessionClick}
                className="text-xs text-white/30 hover:text-white transition-colors border-b border-transparent hover:border-white"
            >
                End Session & Save Summary
            </button>
        </div>
    </div>
  );

  // NEW: Summary View - Shows AI-generated summary before full transcript
  const SummaryView = () => {
    console.log('📄 SummaryView rendered, sessionSummary:', sessionSummary);
    if (!sessionSummary) {
      // Show loading or fallback if summary not available
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 max-w-2xl mx-auto">
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-full shadow-2xl text-center">
            <p className="text-white/60">Loading summary...</p>
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
            <h2 className="text-3xl font-serif text-white mb-2">Session Complete</h2>
            <p className="text-white/50 text-sm">
              {new Date(sessionSummary.endTime).toLocaleDateString()} • {new Date(sessionSummary.endTime).toLocaleTimeString()}
            </p>
          </div>

          {/* AI Summary */}
          <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm text-white/60 mb-3 uppercase tracking-wider">Conversation Summary</h3>
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
              <div className="text-xs text-white/50 uppercase tracking-wider">Duration</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-semibold text-white mb-1">
                {sessionSummary.turnCount}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">Messages</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="text-2xl font-semibold text-white mb-1">
                {sessionSummary.userMessageCount}/{sessionSummary.aiMessageCount}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wider">You/AI</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center pt-6 border-t border-white/5">
            {saveSuccess ? (
              <div className="px-6 py-3 bg-emerald-500 text-white rounded-full text-sm font-semibold flex items-center gap-2">
                <Sparkles size={16} />
                Saved Successfully!
              </div>
            ) : (
              <button
                onClick={handleSaveSession}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`relative w-full h-screen bg-black selection:bg-white/20 ${appState === 'SUMMARY' ? 'overflow-y-auto' : 'overflow-hidden'}`}>

      {/* Background Visuals - Always active now, uses default or custom photo */}
      <ParticleCanvas
        imageUrl={appState === 'LANDING' ? null : getCurrentPhotoUrl()}
        isActive={true}
        audioLevel={audioLevel}
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
                  <p className="text-white/60 font-serif tracking-widest animate-pulse">STARTING THE CHAT...</p>
              </div>
          </div>
      )}

      {/* Summary Generation Loading Overlay */}
      {isGeneratingSummary && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-t-2 border-emerald-400 rounded-full animate-spin mx-auto" />
                  <p className="text-white/60 font-serif tracking-widest animate-pulse">GENERATING SUMMARY...</p>
                  <p className="text-white/40 text-sm font-light">This may take a moment</p>
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

    </div>
  );
}
