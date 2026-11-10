import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, Camera, Gauge, ScanLine, Volume2 } from 'lucide-react';

function PosePreview() {
  return <div className="pose-card">
    <div className="pose-card-top"><span><ScanLine size={16} /> Motion preview</span><span className="sample-tag">Sample</span></div>
    <div className="pose-art">
      <svg viewBox="0 0 480 330" role="img" aria-label="Illustrated side view of a squat with shoulder, hip, knee and ankle markers">
        <defs>
          <linearGradient id="kit" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#87966a"/><stop offset="1" stopColor="#3b4b33"/>
          </linearGradient>
          <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#b1a891"/><stop offset="1" stopColor="#746954"/>
          </linearGradient>
          <pattern id="preview-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0v24" fill="none" stroke="#d6fa70" strokeOpacity=".11"/></pattern>
          <radialGradient id="spot"><stop stopColor="#394725"/><stop offset="1" stopColor="#181e16"/></radialGradient>
        </defs>
        <rect width="480" height="330" fill="url(#spot)"/>
        <rect width="480" height="330" fill="url(#preview-grid)"/>
        <path d="M24 60V28h32m368 0h32v32M24 270v32h32m368 0h32v-32" fill="none" stroke="#b1cd7c" strokeOpacity=".55"/>
        <ellipse cx="253" cy="292" rx="153" ry="18" fill="#141913" opacity=".65"/>
        <path d="M45 294h391" stroke="#778961" strokeOpacity=".7" strokeDasharray="5 6"/>
        <path d="M215 202c-6 16 2 31 26 35l51 2 4 40-13 7v6h47l1-10-10-70c-2-10-10-14-23-14l-63-9Z" fill="#344231" stroke="#4d5c3f" strokeWidth="2"/>
        <path d="M266 117l39 19 49-14 9 4-3 11-53 22c-5 2-10 2-16 0l-43-18Z" fill="#887e69"/>
        <path d="M214 183c-9 11-13 29-3 39 8 9 24 11 36 10l65-5c-2 18-1 39-4 56l16 5c10-22 13-49 15-71 1-15-8-20-20-20l-79-7Z" fill="url(#kit)" stroke="#93a274" strokeOpacity=".5" strokeWidth="2"/>
        <path d="M310 282c9 2 14 1 21 2l28 7 2 7h-52l-6-5Z" fill="#c2c6b0"/>
        <path d="M285 76c-12-5-24 4-29 13l-13 18 18 14 15-19c8 1 16-2 18-8l2-11 7-4-6-9-2-12c-2-13-15-20-28-16-13 3-21 16-17 29 2 8 7 11 12 15" fill="url(#skin)"/>
        <path d="M250 76c-7-8-5-27 2-33 14-14 39-8 43 7l-9 9-10-2-6 7-4 14-6-2-4 6Z" fill="#2a3024"/>
        <path d="M257 93c12 4 16 17 10 32l-24 45-7 32-34-4c-5-9-3-21 2-31l19-46c8-18 19-30 34-28Z" fill="url(#kit)" stroke="#9fae80" strokeOpacity=".65" strokeWidth="2"/>
        <path d="M257 108c7 5 11 10 18 16l24 17 41-15 11-11 13-3 9 6-5 9-19 11-47 21c-7 3-14 2-20-2l-37-24c-13-8-3-31 12-25Z" fill="url(#skin)"/>
        <path d="M249 115 223 202 325 212 321 282m-72-167 49 35 50-17" fill="none" stroke="#d6fb68" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M292 209a33 33 0 0 0 31 36" fill="none" stroke="#d6fb68" strokeWidth="1.75"/>
        <path d="M320 212h92" stroke="#d6fb68" strokeOpacity=".55" strokeDasharray="4 4"/>
        {[[249,115],[223,202],[325,212],[321,282],[298,150],[348,133]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#212b18" stroke="#d6fb68" strokeWidth="2"/>)}
        <circle cx="325" cy="212" r="12" fill="none" stroke="#d6fb68" strokeOpacity=".45"/>
      </svg>
      <div className="pose-angle"><span>Knee angle</span><strong>92°</strong></div>
    </div>
    <div className="pose-card-bottom"><span><i /> Squat · bottom position</span><span>Side view</span></div>
  </div>;
}

const features = [
  [Camera, 'Set up your camera', 'Choose an exercise and follow the camera guide so the right joints stay in view.'],
  [Gauge, 'Track each rep', 'See the estimated joint angle and count each rep when you hit the target and return to start.'],
  [Volume2, 'Train with feedback', 'Follow short cues on screen or turn on voice coaching to keep your eyes off the screen.'],
];

export function Landing() {
  return <div className="landing-wrap">
    <section className="landing-hero">
      <div className="landing-copy">
        <div className="studio-kicker"><span /> THE WEBCAM WORKOUT COACH</div>
        <h1>Train with<br/>better <em>form.</em></h1>
        <p>Get live feedback on your reps and movement using the camera you already have.</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/workout/setup" className="studio-button">Start a workout <ArrowUpRight size={19} /></Link>
          <a href="#how-it-works" className="studio-button subtle">How it works <ArrowDown size={16} /></a>
        </div>
        <div className="hero-note"><Camera size={15}/> A camera and space to move are all you need.</div>
      </div>
      <PosePreview />
    </section>
    <section id="how-it-works" className="landing-steps">
      <div className="landing-section-label"><span className="studio-kicker">THE WORKOUT FLOW</span><h2>From setup to last rep.</h2></div>
      <div className="feature-grid">{features.map(([Icon, name, description], i) =>
        <article key={name}><div className="feature-top"><Icon size={22} /><span>0{i + 1}</span></div><h3>{name}</h3><p>{description}</p></article>)}</div>
    </section>
    <footer className="landing-footer"><span>REFORM / TRAINING STUDIO</span><Link to="/workout/setup">Choose a movement <ArrowRight size={15} /></Link></footer>
  </div>;
}
