import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, Gauge, ScanLine } from 'lucide-react';

function PosePreview() {
  return <div className="pose-card">
    <div className="pose-card-top"><span><ScanLine size={16} /> live_feed.cv</span><span className="sample-tag">Sample</span></div>
    <div className="pose-art">
      <svg viewBox="0 0 480 330" role="img" aria-label="Illustrated side view of a squat with shoulder, hip, knee and ankle markers">
        <defs>
          <linearGradient id="kit" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#8666b3"/><stop offset="1" stopColor="#523878"/>
          </linearGradient>
          <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#e9bb9e"/><stop offset="1" stopColor="#be8b72"/>
          </linearGradient>
          <pattern id="preview-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#5d398b" strokeOpacity=".11"/></pattern>
          <radialGradient id="spot"><stop stopColor="#f0e5ff"/><stop offset="1" stopColor="#c8a9f7"/></radialGradient>
        </defs>
        <rect width="480" height="330" fill="url(#spot)"/>
        <rect width="480" height="330" fill="url(#preview-grid)"/>
        <path d="M24 60V28h32m368 0h32v32M24 270v32h32m368 0h32v-32" fill="none" stroke="#6d4b97" strokeOpacity=".55"/>
        <g transform="translate(116 107) rotate(14)" fill="#fbe18a" stroke="#c58a46" strokeWidth="1.25"><ellipse rx="17" ry="38"/><ellipse rx="17" ry="38" transform="rotate(60)"/><ellipse rx="17" ry="38" transform="rotate(120)"/><circle r="12" fill="#ffedac" stroke="none"/></g><ellipse cx="253" cy="292" rx="153" ry="18" fill="#9973c2" opacity=".65"/>
        <path d="M45 294h391" stroke="#805aab" strokeOpacity=".7" strokeDasharray="5 6"/>
        <path d="M215 202c-6 16 2 31 26 35l51 2 4 40-13 7v6h47l1-10-10-70c-2-10-10-14-23-14l-63-9Z" fill="#644688" stroke="#8d69b0" strokeWidth="2"/>
        <path d="M266 117l39 19 49-14 9 4-3 11-53 22c-5 2-10 2-16 0l-43-18Z" fill="#c89983"/>
        <path d="M214 183c-9 11-13 29-3 39 8 9 24 11 36 10l65-5c-2 18-1 39-4 56l16 5c10-22 13-49 15-71 1-15-8-20-20-20l-79-7Z" fill="url(#kit)" stroke="#523875" strokeOpacity=".5" strokeWidth="2"/>
        <path d="M310 282c9 2 14 1 21 2l28 7 2 7h-52l-6-5Z" fill="#fae38d"/>
        <path d="M285 76c-12-5-24 4-29 13l-13 18 18 14 15-19c8 1 16-2 18-8l2-11 7-4-6-9-2-12c-2-13-15-20-28-16-13 3-21 16-17 29 2 8 7 11 12 15" fill="url(#skin)"/>
        <path d="M250 76c-7-8-5-27 2-33 14-14 39-8 43 7l-9 9-10-2-6 7-4 14-6-2-4 6Z" fill="#30213b"/>
        <path d="M257 93c12 4 16 17 10 32l-24 45-7 32-34-4c-5-9-3-21 2-31l19-46c8-18 19-30 34-28Z" fill="url(#kit)" stroke="#6e4e98" strokeOpacity=".65" strokeWidth="2"/>
        <path d="M257 108c7 5 11 10 18 16l24 17 41-15 11-11 13-3 9 6-5 9-19 11-47 21c-7 3-14 2-20-2l-37-24c-13-8-3-31 12-25Z" fill="url(#skin)"/>
        <path d="M249 115 223 202 325 212 321 282m-72-167 49 35 50-17" fill="none" stroke="#fff5de" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M292 209a33 33 0 0 0 31 36" fill="none" stroke="#fff5de" strokeWidth="1.75"/>
        <path d="M320 212h92" stroke="#fff5de" strokeOpacity=".55" strokeDasharray="4 4"/>
        {[[249,115],[223,202],[325,212],[321,282],[298,150],[348,133]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#563480" stroke="#fff5de" strokeWidth="2"/>)}
        <circle cx="325" cy="212" r="12" fill="none" stroke="#fff5de" strokeOpacity=".45"/>
      </svg>
      <div className="pose-angle"><span>Knee angle</span><strong>92°</strong></div>
    </div>
    <div className="pose-card-bottom"><span><i /> Squat · bottom position</span><span>Side view</span></div>
  </div>;
}

const features = [
  [Activity, 'Pose Landmarks', 'Extracts 33 landmarks per frame to estimate joint angles.'],
  [Gauge, 'Multi-Phase State Machines', 'Counts a repetition when the movement reaches its range target and returns to the starting position.'],
];

export function Landing() {
  return <div className="landing-wrap">
    <section className="landing-hero">
      <div className="landing-copy">
        <h1>Real-time form tracking through your webcam.</h1>
        <p>Reform estimates joint angles, detects movement phases, and counts repetitions.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/workout/setup" className="studio-button">Start Workout <ArrowUpRight size={19} /></Link>
          <Link to="/dashboard" className="studio-button subtle">Open Dashboard <ArrowRight size={16} /></Link>
        </div>
      </div>
      <PosePreview />
    </section>
    <section className="landing-steps" aria-label="Reform features">
      <div className="feature-grid">{features.map(([Icon, name, description]) =>
        <article key={name}><div className="feature-top"><Icon size={22} /></div><h3>{name}</h3><p>{description}</p></article>)}</div>
    </section>
  </div>;
}
