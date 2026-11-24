import React, { useEffect, useRef } from 'react';

const connections = [
  [11, 12], [12, 24], [24, 23], [23, 11], [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
];

export function SkeletonOverlay({ landmarks, activeJoints = [], faultJoints = [], width, height }) {
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
      const fault = faultJoints.includes(a) && faultJoints.includes(b);
      const color = fault ? '#ff5d73' : '#e9d0ff';
      ctx.strokeStyle = active || fault ? color : '#f4f7ed99';
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(...point(a));
      ctx.lineTo(...point(b));
      if (active || fault) {
        ctx.strokeStyle = '#36224a';
        ctx.lineWidth = fault ? 7 : 5;
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = fault ? 4 : 2.5;
      }
      ctx.stroke();
    }
    for (const joint of new Set([...activeJoints, ...faultJoints])) {
      if (!valid(joint)) continue;
      const fault = faultJoints.includes(joint);
      ctx.beginPath();
      ctx.arc(...point(joint), fault ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = fault ? '#ff5d73' : '#e9d0ff';
      ctx.fill();
    }
  }, [landmarks, activeJoints, faultJoints, width, height]);
  return <canvas ref={canvas} width={width} height={height} aria-hidden="true" className="camera-skeleton" />;
}
