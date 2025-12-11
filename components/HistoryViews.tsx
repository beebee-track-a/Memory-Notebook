
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import { HistoryEntry, SessionData } from '../types';

// --- DATA TRANSFORMATION UTILITIES ---

// Format timestamp to YYYY-MM-DD
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toISOString().split('T')[0];
};

// Format timestamp to "11:51 AM"
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Generate title from AI summary (first sentence, max 50 chars)
const generateTitle = (aiSummary: string): string => {
  const firstSentence = aiSummary.split('.')[0].trim();
  return firstSentence.length > 50
    ? firstSentence.substring(0, 50) + '...'
    : firstSentence;
};

// Map SessionData to HistoryEntry
export const mapSessionToHistoryEntry = (session: SessionData): HistoryEntry => {
  return {
    id: session.id || '',
    date: formatDate(session.createdAt),
    title: generateTitle(session.summary.aiGeneratedSummary),
    summary: session.summary.aiGeneratedSummary, // AI summary from Firebase
    imageUrl: `https://picsum.photos/seed/${session.id}/400/600`, // Consistent placeholder
    timestamp: formatTime(session.createdAt),
    tags: session.tags || []
  };
};

// Group sessions by date for calendar display
export const groupSessionsByDate = (sessions: SessionData[]): Record<string, HistoryEntry[]> => {
  const grouped: Record<string, HistoryEntry[]> = {};

  sessions.forEach(session => {
    const entry = mapSessionToHistoryEntry(session);
    if (!grouped[entry.date]) {
      grouped[entry.date] = [];
    }
    grouped[entry.date].push(entry);
  });

  return grouped;
};

// --- SLIDE TO DELETE COMPONENT ---

interface SlideToDeleteProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const SlideToDelete: React.FC<SlideToDeleteProps> = ({ onConfirm, onCancel }) => {
  const [dragX, setDragX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const handleStart = (clientX: number) => {
    isDragging.current = true;
    startX.current = clientX;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || !trackRef.current) return;
    const trackWidth = trackRef.current.offsetWidth;
    const handleWidth = 48; // Width of the handle
    const maxDrag = trackWidth - handleWidth - 8; // 8px padding adjustment

    let offset = clientX - startX.current;
    // Allow dragging only forward
    offset = Math.max(0, Math.min(offset, maxDrag));
    setDragX(offset);
  };

  const handleEnd = () => {
    if (!isDragging.current || !trackRef.current) return;
    isDragging.current = false;

    const trackWidth = trackRef.current.offsetWidth;
    const handleWidth = 48;
    const maxDrag = trackWidth - handleWidth - 8;

    // Threshold to confirm delete (e.g., 90% of the way)
    if (dragX > maxDrag * 0.9) {
      onConfirm();
    } else {
      // Snap back
      setDragX(0);
    }
  };

  // Mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => handleEnd();

  // Touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
  const onTouchEnd = () => handleEnd();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-full max-h-[220px] bg-gradient-to-t from-[#1a0505] to-[#2a0a0a]/95 flex flex-col items-center justify-center p-6 z-20 backdrop-blur-xl border-t border-red-500/10 animate-fade-in"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
        {/* Close Button */}
        <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors p-2"
        >
            <X size={18} />
        </button>

        <div className="mb-8 text-center space-y-2">
             <h3 className="text-white/90 text-sm font-medium tracking-[0.2em] uppercase">Delete Memory?</h3>
             <p className="text-white/30 text-xs font-light">将会永久删除</p>
        </div>

        {/* Slider Track */}
        <div ref={trackRef} className="relative w-full h-14 bg-[#0a0000]/60 rounded-full overflow-hidden border border-white/5 box-border select-none">
            {/* Background Text */}
            <div className="absolute inset-0 flex items-center justify-center text-white/20 font-medium tracking-[0.15em] text-[10px] pointer-events-none pl-6">
                SLIDE TO DELETE
            </div>

            {/* Fill Track (Red reveal behind handle) */}
            <div
                className="absolute left-0 top-0 bottom-0 bg-red-900/10 transition-all duration-75 ease-linear"
                style={{ width: dragX + 24 }}
            />

            {/* Handle */}
            <div
                className="absolute top-1 bottom-1 w-12 bg-[#d93025] rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform duration-75 group z-10"
                style={{ transform: `translateX(${dragX}px)`, marginLeft: '4px' }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                <Trash2 size={20} className="text-white" />
            </div>
        </div>
    </div>
  );
};

// --- MEMORY CARD COMPONENT ---

interface MemoryCardProps {
    entry: HistoryEntry;
    onDelete: (id: string) => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ entry, onDelete }) => {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    return (
        <div className="snap-center shrink-0 w-[85vw] md:w-[400px] h-[65vh] md:h-[600px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative group hover:border-white/20 transition-all duration-500 flex flex-col">
            {/* Image Half */}
            <div className="h-1/2 overflow-hidden relative">
                <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#050505]" />
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-serif text-white mb-1 drop-shadow-lg">{entry.title}</h3>
                    <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">
                        <Clock size={12} /> {entry.timestamp}
                    </div>
                </div>

                {/* Delete Button - Top Right - Original Style */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-red-500/80 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-10"
                    title="Delete Memory"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {/* Text Half */}
            <div className="h-1/2 p-6 flex flex-col relative bg-[#050505]">
                {/* Decorative quote line */}
                <div className="w-8 h-[1px] bg-gradient-to-r from-pink-500 to-transparent mb-6" />

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <p className="text-white/70 font-light leading-7 text-sm md:text-base">
                        "{entry.summary}"
                    </p>
                </div>

                {/* Delete Confirmation Overlay - Placed at bottom of text area */}
                {showDeleteConfirm && (
                    <SlideToDelete
                        onConfirm={() => onDelete(entry.id)}
                        onCancel={() => setShowDeleteConfirm(false)}
                    />
                )}
            </div>
        </div>
    );
}

// --- CALENDAR VIEW ---

interface CalendarViewProps {
  onClose: () => void;
  onSelectDate: (date: string, entries: HistoryEntry[]) => void;
  sessionsByDate: Record<string, HistoryEntry[]>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onClose, onSelectDate, sessionsByDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const renderDays = () => {
    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entries = sessionsByDate[dateStr] || [];
      const hasEntries = entries.length > 0;

      days.push(
        <button
          key={d}
          onClick={() => hasEntries && onSelectDate(dateStr, entries)}
          className={`h-12 flex flex-col items-center justify-center relative group rounded-lg transition-colors ${hasEntries ? 'hover:bg-white/10 cursor-pointer' : 'text-white/20 cursor-default'}`}
        >
          <span className={`text-sm font-light ${hasEntries ? 'text-white' : 'text-white/20'}`}>{d}</span>

          {/* Dots indicating memory density */}
          {hasEntries && (
            <div className="flex gap-1 mt-1">
              {entries.map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-pink-400' : i === 1 ? 'bg-orange-300' : 'bg-blue-300'} shadow-[0_0_5px_rgba(255,255,255,0.5)]`}
                />
              ))}
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-md bg-[#0a0a0a]/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="mb-10">
          <h2 className="text-3xl font-serif text-white mb-2 tracking-wide">Day/night chron</h2>
          <p className="text-white/40 text-sm font-light leading-relaxed">
            You and I have memories,<br/>
            longer than the road that stretches out ahead
          </p>
          <p className="text-white/30 text-xs mt-2 uppercase tracking-widest">@Memory n Gemini</p>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-8 text-white/80 font-serif">
          <button onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
          <span className="text-lg tracking-widest">{monthNames[month]} {year}</span>
          <button onClick={handleNextMonth}><ChevronRight size={20} /></button>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 text-center mb-4 text-white/30 text-xs uppercase tracking-wider">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderDays()}
        </div>
      </div>
    </div>
  );
};

// --- CAROUSEL VIEW ---

interface CarouselViewProps {
  date: string;
  entries: HistoryEntry[];
  onBack: () => void;
  onClose: () => void;
  onDeleteEntry: (id: string) => void;
}

export const CarouselView: React.FC<CarouselViewProps> = ({ date, entries, onBack, onClose, onDeleteEntry }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col animate-fade-in">
        {/* Top Bar */}
        <div className="w-full flex justify-between items-center px-8 py-4 text-white z-10">
            <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
                <ChevronLeft size={20} /> Back to Calendar
            </button>
            <div className="font-serif text-xl tracking-widest text-white/80">
                {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
            </button>
        </div>

        {/* Cards Container */}
        <div className="flex-1 flex items-center overflow-x-auto snap-x snap-mandatory px-8 pb-12 gap-6 scrollbar-hide">
            {/* Spacer for centering */}
            <div className="w-4 md:w-32 flex-shrink-0" />

            {entries.length > 0 ? (
                entries.map((entry) => (
                    <MemoryCard
                        key={entry.id}
                        entry={entry}
                        onDelete={onDeleteEntry}
                    />
                ))
            ) : (
                <div className="w-full text-center text-white/30 italic">No memories left for this day.</div>
            )}

            <div className="w-4 md:w-32 flex-shrink-0" />
        </div>
    </div>
  );
};
