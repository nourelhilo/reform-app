export const exercises = {
  squat: { name: 'Squats', area: 'Lower body', view: 'Side view', angle: 'Knee angle', key: 'kneeAngle', target: '≤95° at the bottom', guide: 'Turn sideways. Keep one shoulder, hip, knee and ankle in frame.' },
  pushup: { name: 'Push-ups', area: 'Upper body', view: 'Side view', angle: 'Elbow angle', key: 'elbowAngle', target: '≤95° at the bottom', guide: 'Place the camera low and to your side. Show your full plank, from shoulder to ankle.' },
  curl: { name: 'Bicep curls', area: 'Upper body', view: 'Side view', angle: 'Elbow angle', key: 'elbowAngle', target: '≤55° at the top', guide: 'Turn sideways. Keep the working wrist, elbow, shoulder and hip in frame.' },
  lunge: { name: 'Forward lunges', area: 'Lower body', view: 'Side view', angle: 'Lead knee angle', key: 'leadKneeAngle', target: '≤95° at the bottom', guide: 'Turn sideways. Keep both legs and shoes in frame, with room to step forward and back.' },
  jumping_jack: { name: 'Jumping jacks', area: 'Full body', view: 'Front view', angle: 'Arm elevation', key: 'armElevation', target: '≥150° with feet apart', guide: 'Face the camera. Leave room for both arms overhead and your feet to move apart.' },
};

export function getExerciseList(value) {
  const supported = Array.isArray(value) ? [...new Set(value.filter(id => Object.hasOwn(exercises, id)))] : [];
  return supported.length ? supported : ['squat'];
}
