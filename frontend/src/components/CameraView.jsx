import React, { useRef, useEffect, useState } from 'react';
import { SkeletonOverlay } from './SkeletonOverlay';
import { Camera, CameraOff, ScanLine } from 'lucide-react';

export function CameraView({ landmarks, activeJoints, onFrameCapture, onStatus, targetFps = 16 }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const [state, setState] = useState('requesting');
  const [size, setSize] = useState([640, 480]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ended = false;
    let stream;
    const element = video.current;
    setState('requesting');
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false,
        });
        if (ended) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        for (const track of stream.getVideoTracks()) {
          track.addEventListener('ended', () => { if (!ended) setState('unavailable'); }, { once: true });
        }
        element.srcObject = stream;
        await element.play();
        if (!ended) setState('ready');
      } catch (error) {
        stream?.getTracks().forEach(track => track.stop());
        if (!ended) setState(error.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    }
    open();
    return () => {
      ended = true;
      stream?.getTracks().forEach(track => track.stop());
      if (element) element.srcObject = null;
    };
  }, [attempt]);

  useEffect(() => { onStatus?.(state); }, [state, onStatus]);

  useEffect(() => {
    if (state !== 'ready' || !onFrameCapture) return;
    let active = true;
    let encoding = false;
    const surface = canvas.current;
    const timer = setInterval(() => {
      const source = video.current;
      if (encoding || !source?.videoWidth || source.readyState < 2) return;
      const scale = Math.min(1, 640 / Math.max(source.videoWidth, source.videoHeight));
      const w = Math.round(source.videoWidth * scale);
      const h = Math.round(source.videoHeight * scale);
      if (w !== surface.width || h !== surface.height) {
        surface.width = w;
        surface.height = h;
        setSize([w, h]);
      }
      surface.getContext('2d').drawImage(source, 0, 0, w, h);
      encoding = true;
      surface.toBlob(blob => {
        encoding = false;
        if (active && blob) onFrameCapture(blob);
      }, 'image/jpeg', .72);
    }, 1000 / targetFps);
    return () => { active = false; clearInterval(timer); };
  }, [state, onFrameCapture, targetFps]);

  return <div className="camera-stage">
    <canvas ref={canvas} className="hidden" width="640" height="480" />
    <video ref={video} muted playsInline className="camera-video" hidden={state !== 'ready'} />
    {state === 'ready' && <SkeletonOverlay landmarks={landmarks} activeJoints={activeJoints} width={size[0]} height={size[1]} />}
    <span className="camera-badge"><ScanLine size={15} /> Camera preview</span>
    {state !== 'ready' && <div className="camera-placeholder">
      {state === 'requesting' ? <Camera size={33} /> : <CameraOff size={33} />}
      <strong>{state === 'requesting' ? 'Waiting for camera access' : state === 'denied' ? 'Camera access is blocked' : 'Camera unavailable'}</strong>
      <span>{state === 'requesting' ? 'Allow your browser to use the camera.' : 'Check your browser permissions or connect a camera.'}</span>
      {state !== 'requesting' && <button className="studio-button subtle compact" onClick={() => setAttempt(a => a + 1)}>Try again</button>}
    </div>}
  </div>;
}
