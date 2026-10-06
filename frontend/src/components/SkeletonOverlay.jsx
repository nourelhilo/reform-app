import React, { useEffect, useRef } from 'react';

// MediaPipe standard 33 landmark connections
const POSE_CONNECTIONS = [
  // Torso
  [11, 12], [12, 24], [24, 23], [23, 11],
  // Left Arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right Arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left Leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right Leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
  // Head / Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10]
];

export const SkeletonOverlay = ({
  landmarks,
  activeJoints = [],
  formScore = 100,
  width = 640,
  height = 480,
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 33) return;

    // Determine color based on form score
    const isGoodForm = formScore >= 80;
    const isModerateForm = formScore >= 60;
    
    const boneColor = isGoodForm ? 'rgba(42, 123, 76, 0.75)' : isModerateForm ? 'rgba(217, 119, 6, 0.75)' : 'rgba(185, 28, 28, 0.75)';
    const jointColor = '#F3F0F2';
    const activeJointColor = isGoodForm ? '#22c55e' : '#e11d48';

    // 1. Draw Bones / Connections
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = boneColor;

    POSE_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];

      if (p1 && p2 && p1.visibility > 0.4 && p2.visibility > 0.4) {
        ctx.beginPath();
        // Mirror horizontally to match mirror camera feed
        ctx.moveTo((1 - p1.x) * width, p1.y * height);
        ctx.lineTo((1 - p2.x) * width, p2.y * height);
        ctx.stroke();
      }
    });

    // 2. Draw Landmarks / Joints
    landmarks.forEach((lm, index) => {
      if (lm.visibility < 0.4) return;

      const cx = (1 - lm.x) * width;
      const cy = lm.y * height;
      const isActive = activeJoints.includes(index);

      ctx.beginPath();
      ctx.arc(cx, cy, isActive ? 6 : 3.5, 0, 2 * Math.PI);

      if (isActive) {
        ctx.fillStyle = activeJointColor;
        ctx.shadowColor = activeJointColor;
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = jointColor;
        ctx.shadowBlur = 0;
      }

      ctx.fill();
    });

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [landmarks, activeJoints, formScore, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
    />
  );
};
