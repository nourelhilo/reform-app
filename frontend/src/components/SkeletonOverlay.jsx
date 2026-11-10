import React, { useEffect, useRef } from 'react';

const connections = [
  [11, 12], [12, 24], [24, 23], [23, 11], [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
];

export function SkeletonOverlay({ landmarks, activeJoints = [], width, height }) {
  const canvas = useRef(null);
  useEffect(() => {
    const ctx = canvas.current.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    if (!landmarks) return;
    const valid = joint => landmarks[joint]?.visibility >= .55;
    const point = joint => [(1 - landmarks[joint].x) * width, landmarks[joint].y * height];
    ctx.lineCap = 'round';
    for (const [a, b] of connections) {
      if (!valid(a) || !valid(b)) continue;
      const active = activeJoints.includes(a) && activeJoints.includes(b);
      ctx.strokeStyle = active ? '#e9d0ff' : '#f4f7ed99';
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(...point(a));
      ctx.lineTo(...point(b));
      if (active) {
        ctx.strokeStyle = '#36224a';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.strokeStyle = '#e9d0ff';
        ctx.lineWidth = 2.5;
      }
      ctx.stroke();
    }
    for (const joint of activeJoints) {
      if (!valid(joint)) continue;
      ctx.beginPath();
      ctx.arc(...point(joint), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#e9d0ff';
      ctx.fill();
    }
  }, [landmarks, activeJoints, width, height]);
  return <canvas ref={canvas} width={width} height={height} aria-hidden="true" className="camera-skeleton" />;
}
