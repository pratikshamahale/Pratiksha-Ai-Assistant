/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Power, Globe, Zap, Settings, Info } from 'lucide-react';
import { AudioStreamer } from './lib/audio-streamer';
import { LiveSession } from './lib/live-session';

export default function App() {
  const [state, setState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    // Initialize audio streamer with a callback to send audio to the session
    audioStreamerRef.current = new AudioStreamer((base64) => {
      liveSessionRef.current?.sendAudio(base64);
    });

    // Initialize live session with callbacks for audio playback and state management
    liveSessionRef.current = new LiveSession({
      onAudioData: (base64) => {
        audioStreamerRef.current?.playAudioChunk(base64);
      },
      onInterrupted: () => {
        audioStreamerRef.current?.clearPlayback();
      },
      onStateChange: (newState) => {
        setState(newState);
        if (newState !== 'connected') {
          setIsListening(false);
        }
      },
    });

    return () => {
      audioStreamerRef.current?.stop();
      liveSessionRef.current?.disconnect();
    };
  }, []);

  // Pulse effect simulation based on microphone input volume
  useEffect(() => {
    let animationFrame: number;
    const update = () => {
      if (audioStreamerRef.current) {
        setVolume(audioStreamerRef.current.getVolume());
      }
      animationFrame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const toggleConnection = async () => {
    if (state === 'idle' || state === 'error') {
      await liveSessionRef.current?.connect();
    } else {
      liveSessionRef.current?.disconnect();
      audioStreamerRef.current?.stop();
    }
  };

  const toggleListening = async () => {
    if (!isListening) {
      // Small delay to ensure AudioContext resides in a user interaction
      await audioStreamerRef.current?.start();
      setIsListening(true);
    } else {
      audioStreamerRef.current?.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white font-sans selection:bg-accent/30 overflow-hidden flex flex-col items-center justify-between p-8 relative">
      {/* Atmosphere Background */}
      <div className="fixed inset-0 pointer-events-none bg-atmosphere z-0" />

      {/* Header Bar - Status Bar Style */}
      <header className="w-full flex items-center justify-between z-10 transition-opacity duration-500 px-4 pt-4">
        <div className="flex items-center gap-4 text-[11px] uppercase tracking-[2px] opacity-40 font-medium">
          <span>LIVE SESSION:</span>
          <span className={state === 'connected' ? 'text-[#4ADE80]' : 'text-yellow-500'}>
            {state === 'connected' ? 'STABLE' : state === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
          </span>
        </div>
        <div className="font-sans text-[11px] uppercase tracking-[2px] opacity-40">
          GEMINI-3.1-FLASH-LIVE
        </div>
      </header>

      {/* Top Right Dots */}
      <div className="absolute top-10 right-10 flex gap-2 z-10">
        <div className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-accent' : 'bg-white/10'}`} />
        <div className="w-2 h-2 rounded-full bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-white/10" />
      </div>

      {/* Main Interactive Stage */}
      <main className="flex-1 flex flex-col items-center justify-center w-full z-10 relative">
        
        {/* Central Neural Core Visualization - Artistic Flair Orb */}
        <div className="relative flex items-center justify-center w-[500px] h-[500px]">
          <AnimatePresence mode="wait">
            {state === 'connected' ? (
              <motion.div
                key="neural-core"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative cursor-pointer flex items-center justify-center"
                onClick={toggleListening}
              >
                {/* Concentric Rings */}
                <div className="absolute w-[400px] h-[400px] border border-white/10 rounded-full" />
                <div className="absolute w-[480px] h-[480px] border border-dashed border-white/5 rounded-full" />

                {/* Orb */}
                <motion.div
                  className="w-80 h-80 rounded-full bg-orb relative shadow-[0_0_100px_rgba(217,46,239,0.3),inset_0_0_50px_rgba(34,211,238,0.4)]"
                  animate={{
                    scale: 1 + (volume * 0.1),
                    filter: `blur(${2 + volume * 4}px)`
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <div className="absolute inset-0 rounded-full bg-black/5" />
                </motion.div>

                {/* Persona Text */}
                <div className="absolute -bottom-24 w-screen text-center pointer-events-none">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-[80px] font-extrabold uppercase tracking-[-2px] leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50"
                  >
                    LEXI_01
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    className="italic text-accent text-lg mt-2 font-serif"
                  >
                    "Try to keep it interesting, babe. I'm listening."
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="dormant-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={toggleConnection}
                className="w-80 h-80 rounded-full border border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-neutral-900/50" />
                <Power className={`w-12 h-12 relative z-10 transition-all duration-700 ${state === 'error' ? 'text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'text-neutral-700 group-hover:text-accent group-hover:drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]'}`} />
                <span className="text-[10px] font-mono uppercase tracking-[0.4em] mt-4 opacity-0 group-hover:opacity-40 transition-opacity relative z-10">Initialize Session</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Control Area */}
      <div className="w-full flex flex-col items-center gap-6 z-10 pb-20">
        <AnimatePresence>
          {state === 'connected' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-6"
            >
              <button
                onClick={toggleListening}
                className={`w-[84px] h-[84px] rounded-full flex items-center justify-center transition-all duration-300 relative border-4 border-white/20 active:scale-95 ${
                  isListening ? 'bg-accent text-white border-accent/40 shadow-[0_0_40px_rgba(217,70,239,0.5)]' : 'bg-white text-bg'
                }`}
              >
                {isListening ? <Mic className="w-8 h-8" strokeWidth={2.5} /> : <MicOff className="w-8 h-8" strokeWidth={2.5} />}
                {isListening && (
                  <motion.div
                    className="absolute -inset-4 rounded-full border border-accent/30"
                    animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </button>
              <div className="text-[10px] tracking-[3px] opacity-50 uppercase font-medium">
                {isListening ? 'STREAMING ACTIVE' : 'TAP TO START INTERACTING'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tech Specs - Bottom Right */}
      <div className="fixed bottom-10 right-10 text-right font-mono text-[10px] tracking-tight leading-relaxed opacity-30 z-10 hidden sm:block">
        <div><span className="bg-white/10 px-1.5 py-0.5 rounded mr-2 uppercase">Input</span> PCM16_16KHZ</div>
        <div><span className="bg-white/10 px-1.5 py-0.5 rounded mr-2 uppercase">Output</span> AUDIO_24KHZ</div>
        <div><span className="bg-white/10 px-1.5 py-0.5 rounded mr-2 uppercase">Latency</span> {state === 'connected' ? '124MS' : '--'}</div>
      </div>

      {/* Info Trigger - Bottom Left */}
      <div className="fixed bottom-10 left-10 z-10">
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 opacity-20 hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-3"
        >
          <Info className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest font-mono hidden sm:inline">Product Information</span>
        </button>
      </div>

      {/* Modal: Personality Briefing */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#050505]/95 backdrop-blur-3xl p-4 flex items-center justify-center"
            onClick={() => setShowInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-[#0A0A0A] border border-white/5 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-[60px]" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan/10 rounded-full blur-[60px]" />
              
              <div className="relative z-10 space-y-8">
                <div className="space-y-3">
                  <h2 className="text-3xl font-extrabold font-sans uppercase tracking-tighter text-white">LEXI_CORE_01</h2>
                  <div className="h-0.5 w-16 bg-accent rounded-full" />
                </div>
                
                <p className="text-lg text-neutral-300 leading-relaxed italic font-serif">
                  "Oh, you're back? I was just starting to enjoy the silence. But since you're here, try to keep me entertained."
                </p>
                
                <div className="flex flex-col gap-4 pt-4">
                  {[
                    "Audio-to-Audio Real-time Neural Bridge",
                    "Hyper-Spatial Personality Engine",
                    "Nexus Browser Integration",
                    "Advanced Latency Reduction"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest pl-3 border-l-2 border-accent/20">
                      {feature}
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setShowInfo(false)}
                  className="w-full py-5 bg-white hover:bg-neutral-200 text-bg font-bold text-[11px] uppercase tracking-[0.3em] rounded-2xl transition-all active:scale-95 shadow-xl"
                >
                  Confirm Interface
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

