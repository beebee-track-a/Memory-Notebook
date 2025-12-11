---
name: mic-soundwave-refresh
overview: Refresh the mic control and waveform inside a shared rectangular card that mirrors the standalone HTML prototype while keeping it wired to the existing Gemini Live voice pipeline.
todos:
  - id: audit-current
    content: Review existing mic + waveform components/hooks
    status: pending
  - id: card-build
    content: Implement rectangular mic+wave card component
    status: pending
  - id: mic-visual
    content: Update mic button styles/state logic
    status: pending
  - id: app-wire
    content: Replace old layout with new card
    status: pending
---

# Mic/Soundwave Refresh Plan

## 1. Understand current mic + waveform pipeline

- Inspect `components/MicButton.tsx`, `components/VoiceWaveform.tsx`, `components/SoundWave.tsx`, and `hooks/useGeminiLive.ts` to capture how mic state (idle/listening/sending) and audio amplitude currently feed the UI.
- Note existing Tailwind/CSS tokens so the new visuals align without breaking the app theme.

## 2. Build the rectangular mic+wave card component

- Translate the layout from `soundwave.html` into a reusable React component that renders a dark, rounded rectangle with the animated bars on the left and the mic button on the right, matching the exact positioning concern.
```
29:101:soundwave.html
.visualizer { display:flex; gap:4px; height:40px; }
.mic-btn { width:44px; height:44px; border-radius:50%; background:#1a1a1a; }
```

- Allow props for amplitude arrays, mic state, title/placeholder text, and optional width so the component can be placed wherever needed.

## 3. Enhance mic button visuals and states

- Update `components/MicButton.tsx` so the button reflects recording states (idle → neutral, listening → glow, muted → warning) and keeps the mic on the right edge of the card.
- Integrate the SVG look and hover/active transitions from the prototype; include focus-visible outlines for accessibility.

## 4. Wire into the main UI

- Replace the old mic/wave layout inside `App.tsx` (or the parent view) with the new card, ensuring the card sits in a single horizontal row (soundwave left, mic right).
- Feed real-time amplitude data from `useGeminiLive` (or `audioStreamer`) into the bar props; ensure the UI degrades gracefully when data is missing.
- Sanity-check that tapping the mic toggles state and the bars animate