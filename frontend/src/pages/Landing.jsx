import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Play, ArrowRight, Activity, Shield, Volume2 } from 'lucide-react';

export const Landing = () => {
  const { user } = useAuth();
  const [activeDemo, setActiveDemo] = useState('squat');

  const DEMO_DATA = {
    squat: {
      title: 'Squat Engine',
      phase: 'BOTTOM_INFLECTION',
      rep: 8,
      formScore: 94,
      angles: { knee: '86°', hip: '78°', torso: '14°' },
      guidance: 'Depth verified. Push evenly through midfoot.',
    },
    pushup: {
      title: 'Push-Up Engine',
      phase: 'DESCENDING',
      rep: 14,
      formScore: 91,
      angles: { elbow: '82°', spine: '176°', hip: '179°' },
      guidance: 'Spine neutral. Avoid flaring elbows beyond 45°.',
    },
    curl: {
      title: 'Bicep Curl Engine',
      phase: 'PEAK_CONTRACTION',
      rep: 10,
      formScore: 97,
      angles: { elbow: '42°', shoulder: '8°', torso: '3°' },
      guidance: 'Elbow stable at torso. Peak squeeze detected.',
    },
  };

  const currentDemo = DEMO_DATA[activeDemo];

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 sm:py-8">
      {/* Hero Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Direct Value Proposition */}
        <div className="lg:col-span-6 flex flex-col items-start">
          <h1 className="text-3xl sm:text-5xl lg:text-5.5xl font-bold tracking-tight text-white leading-[1.1] mb-4">
            Real-time form tracking through your webcam.
          </h1>

          <p className="text-sm sm:text-base text-text-muted font-normal leading-relaxed mb-6 max-w-lg">
            Reform runs computer vision directly in your browser. It calculates 3D joint angles, detects movement phases, counts repetitions, and provides live audio coaching.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Link
              to={user ? '/workout/setup' : '/register'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white text-xs font-semibold px-6 py-3 rounded-xl transition-all shadow-md shadow-accent/20 tracking-wider uppercase font-mono"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Start Workout
            </Link>
            <Link
              to={user ? '/dashboard' : '/login'}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#141219] hover:bg-[#1C1A23] border border-white/[0.08] text-white text-xs font-medium px-5 py-3 rounded-xl transition-colors"
            >
              {user ? 'Open Dashboard' : 'Sign In'}
              <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
            </Link>
          </div>

          {/* Quick Specs */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-white/[0.07] w-full max-w-lg">
            <div>
              <p className="text-base font-semibold text-white font-mono">33 pts</p>
              <p className="text-[11px] text-text-muted mt-0.5">Pose landmarks</p>
            </div>
            <div>
              <p className="text-base font-semibold text-white font-mono">&lt;20ms</p>
              <p className="text-[11px] text-text-muted mt-0.5">Inference latency</p>
            </div>
            <div>
              <p className="text-base font-semibold text-white font-mono">100%</p>
              <p className="text-[11px] text-text-muted mt-0.5">Local webcam stream</p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live HUD Preview */}
        <div className="lg:col-span-6">
          <div className="bg-[#121017] border border-white/[0.1] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-[11px] font-mono text-text-muted ml-2">live_feed.cv</span>
              </div>

              <div className="flex items-center gap-1 bg-[#191621] border border-white/[0.06] rounded-lg p-0.5">
                {['squat', 'pushup', 'curl'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveDemo(type)}
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded transition-colors ${
                      activeDemo === type
                        ? 'bg-accent text-white font-medium shadow-sm'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live Viewport */}
            <div className="relative rounded-xl bg-[#08070B] border border-white/[0.06] aspect-[4/3] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Simulated Skeleton Geometry */}
              <svg className="w-full h-full p-6" viewBox="0 0 200 200" fill="none">
                {activeDemo === 'squat' && (
                  <g stroke="#F3F0F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                    <circle cx="100" cy="40" r="10" stroke="#8B1E3F" strokeWidth="2" fill="#141219" />
                    <line x1="100" y1="50" x2="98" y2="100" />
                    <line x1="80" y1="60" x2="120" y2="60" />
                    <polyline points="98,100 70,135 78,175" stroke="#22c55e" strokeWidth="3" />
                    <polyline points="98,100 126,135 118,175" stroke="#22c55e" strokeWidth="3" />
                    <circle cx="70" cy="135" r="4" fill="#22c55e" />
                    <circle cx="126" cy="135" r="4" fill="#22c55e" />
                  </g>
                )}

                {activeDemo === 'pushup' && (
                  <g stroke="#F3F0F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                    <circle cx="50" cy="100" r="10" stroke="#8B1E3F" strokeWidth="2" fill="#141219" />
                    <line x1="60" y1="105" x2="165" y2="105" stroke="#22c55e" strokeWidth="3" />
                    <polyline points="75,105 65,130 80,150" stroke="#8B1E3F" strokeWidth="2.5" />
                    <line x1="165" y1="105" x2="165" y2="150" />
                    <circle cx="65" cy="130" r="4" fill="#8B1E3F" />
                  </g>
                )}

                {activeDemo === 'curl' && (
                  <g stroke="#F3F0F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                    <circle cx="100" cy="35" r="10" stroke="#8B1E3F" strokeWidth="2" fill="#141219" />
                    <line x1="100" y1="45" x2="100" y2="110" />
                    <polyline points="100,55 80,95 90,60" stroke="#22c55e" strokeWidth="3" />
                    <polyline points="100,55 120,95 120,135" />
                    <line x1="100" y1="110" x2="88" y2="180" />
                    <line x1="100" y1="110" x2="112" y2="180" />
                    <circle cx="80" cy="95" r="4" fill="#22c55e" />
                  </g>
                )}
              </svg>

              {/* Floating Angle Badges */}
              <div className="absolute top-2.5 left-2.5 bg-[#16141E]/90 border border-white/10 backdrop-blur-md rounded-lg p-2 text-[10px] font-mono text-white space-y-0.5">
                {Object.entries(currentDemo.angles).map(([joint, angle]) => (
                  <div key={joint} className="flex items-center justify-between gap-2.5">
                    <span className="text-text-muted capitalize">{joint}:</span>
                    <span className="text-emerald-400 font-semibold">{angle}</span>
                  </div>
                ))}
              </div>

              {/* State Phase Tag */}
              <div className="absolute top-2.5 right-2.5 bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-accent">
                {currentDemo.phase}
              </div>

              {/* Live Audio Coaching Bubble */}
              <div className="absolute bottom-2.5 inset-x-2.5 bg-[#181622]/95 border border-white/10 backdrop-blur-md rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                  <p className="text-[11px] text-white font-medium">{currentDemo.guidance}</p>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">
                  {currentDemo.formScore}% FORM
                </span>
              </div>
            </div>

            {/* Bottom Rep Summary Bar */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
              <div>
                <span className="text-[9px] font-mono uppercase text-text-muted">Target Exercise</span>
                <p className="text-xs font-semibold text-white">{currentDemo.title}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono uppercase text-text-muted">Valid Reps</span>
                <p className="text-xs font-bold font-mono text-white">{currentDemo.rep} <span className="text-[10px] font-normal text-text-muted">/ 15</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 mt-6 border-t border-white/[0.07]">
        <div className="bg-[#121016] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between hover:border-white/[0.12] transition-colors">
          <div>
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-accent mb-3">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-white mb-1">3D Coordinate Extraction</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Extracts 33 normalized landmark coordinates per frame to calculate precision joint angles.
            </p>
          </div>
        </div>

        <div className="bg-[#121016] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between hover:border-white/[0.12] transition-colors">
          <div>
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-accent mb-3">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-white mb-1">Multi-Phase State Machines</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Verifies inflection depths and prevents cheat reps through deterministic range-of-motion thresholds.
            </p>
          </div>
        </div>

        <div className="bg-[#121016] border border-white/[0.07] rounded-xl p-5 flex flex-col justify-between hover:border-white/[0.12] transition-colors">
          <div>
            <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-accent mb-3">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-white mb-1">Spoken Feedback Engine</h3>
            <p className="text-[11px] text-text-muted leading-relaxed">
              Delivers voice cues with smart cooldowns so you can fix your knee alignment or back posture mid-set.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
