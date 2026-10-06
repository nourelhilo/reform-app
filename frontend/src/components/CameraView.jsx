import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SkeletonOverlay } from './SkeletonOverlay';
import { Camera, CameraOff, AlertCircle } from 'lucide-react';

export const CameraView = ({
  landmarks,
  activeJoints = [],
  formScore = 100,
  onFrameCapture,
  targetFps = 20,
  showSkeleton = true,
  className = '',
}) => {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const [cameraState, setCameraState] = useState('requesting'); // 'ready', 'denied', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const frameIntervalRef = useRef(null);

  // Initialize Camera Stream
  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        setCameraState('requesting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraState('ready');
          };
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraState('denied');
          setErrorMessage('Camera access was denied. Please allow camera permissions in your browser.');
        } else {
          setCameraState('error');
          setErrorMessage(`Unable to access camera (${err.message}).`);
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  // Frame Capture Loop
  useEffect(() => {
    if (cameraState !== 'ready' || !onFrameCapture) return;

    const captureFrame = () => {
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      // Downsample slightly for efficient network & vision processing (640x360 / 640x480)
      const targetW = 640;
      const targetH = Math.round((height / width) * 640);

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onFrameCapture(blob);
          }
        },
        'image/jpeg',
        0.75
      );
    };

    const intervalMs = Math.round(1000 / targetFps);
    frameIntervalRef.current = setInterval(captureFrame, intervalMs);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [cameraState, onFrameCapture, targetFps]);

  return (
    <div className={`relative bg-surface rounded-2xl overflow-hidden border border-border-subtle aspect-video flex items-center justify-center ${className}`}>
      {/* Hidden capture canvas */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`w-full h-full object-cover -scale-x-100 ${cameraState === 'ready' ? 'block' : 'hidden'}`}
      />

      {/* Skeleton Overlay */}
      {cameraState === 'ready' && showSkeleton && (
        <SkeletonOverlay
          landmarks={landmarks}
          activeJoints={activeJoints}
          formScore={formScore}
        />
      )}

      {/* Loading / Error States */}
      {cameraState === 'requesting' && (
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Camera className="w-10 h-10 animate-pulse text-accent" />
          <p className="text-sm">Initializing camera stream...</p>
        </div>
      )}

      {cameraState === 'denied' && (
        <div className="flex flex-col items-center text-center p-6 max-w-md">
          <CameraOff className="w-12 h-12 text-status-error mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Camera Access Required</h3>
          <p className="text-sm text-text-muted">{errorMessage}</p>
        </div>
      )}

      {cameraState === 'error' && (
        <div className="flex flex-col items-center text-center p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-status-warning mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Camera Unavailable</h3>
          <p className="text-sm text-text-muted">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};
