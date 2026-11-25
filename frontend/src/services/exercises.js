// Every exercise Reform has offered. Names stay here so older history still reads well.
const catalog = {
  squat: { name: 'Squats', area: 'Lower body', view: 'Side view', angle: 'Knee angle', key: 'kneeAngle', target: '≤95° at the bottom', guide: 'Turn sideways. Keep one shoulder, hip, knee and ankle in frame.' },
  pushup: { name: 'Push-ups', area: 'Upper body', view: 'Side view', angle: 'Elbow angle', key: 'elbowAngle', target: '≤95° at the bottom', guide: 'Place the camera low and to your side. Show your full plank, from shoulder to ankle.' },
  curl: { name: 'Bicep curls', area: 'Upper body', view: 'Front or side view', angle: 'Elbow angle', key: 'elbowAngle', target: '≤65° at the top', guide: 'Face the camera or turn sideways. Keep your shoulders, elbows, wrists and hips in frame, upper arms at your sides.' },
  lunge: { name: 'Forward lunges', area: 'Lower body', view: 'Side view', angle: 'Lead knee angle', key: 'leadKneeAngle', target: '≤95° at the bottom', guide: 'Turn sideways. Keep both legs and shoes in frame, with room to step forward and back.' },
  shoulder_press: { name: 'Shoulder press', area: 'Upper body', view: 'Front view', angle: 'Elbow angle', key: 'elbowAngle', target: '≥155° with hands overhead', guide: 'Face the camera. Start with hands at shoulder height and leave room above your head.' },
  lateral_raise: { name: 'Lateral raises', area: 'Upper body', view: 'Front view', angle: 'Arm elevation', key: 'armElevation', target: '≥80°, up to shoulder height', guide: 'Face the camera. Keep both arms and your hips in frame.' },
  glute_bridge: { name: 'Glute bridges', area: 'Lower body', view: 'Side view', angle: 'Hip angle', key: 'hipAngle', target: '≥165° at the top', guide: 'Lie on your back, side-on to the camera, with your shoulder, hip, knee and ankle in frame.' },
  plank: { name: 'Plank', area: 'Core', view: 'Side view', angle: 'Body line', key: 'bodyLine', hold: true, band: [160, 180], target: 'Straight line, 160–180°', guide: 'Side-on to the camera on forearms or hands, with shoulder, hip and ankle in frame. Time only counts while your body is straight.' },
  side_plank: { name: 'Side plank', area: 'Core', view: 'Front view', angle: 'Body line', key: 'bodyLine', hold: true, band: [160, 180], target: 'Straight line, 160–180°', guide: 'Face the camera on one forearm with shoulder, hips and feet in frame. Keep your hips lifted.' },
  wall_sit: { name: 'Wall sit', area: 'Lower body', view: 'Side view', angle: 'Knee angle', key: 'kneeAngle', hold: true, band: [75, 115], target: 'Knees at about 90°', guide: 'Side-on to the camera with your back against a wall and hip, knee and ankle in frame.' },
  jumping_jack: { name: 'Jumping jacks', area: 'Full body', view: 'Front view', angle: 'Arm elevation', key: 'armElevation', target: '≥150° with feet apart', guide: 'Face the camera. Leave room for both arms overhead and your feet to move apart.' },
};

// Offered in workouts: only exercises whose counting held up on real exercise video
// (see docs/pose-validation.md). Keep in sync with ACTIVE in ai-engine/app/exercises/tracking.py.
export const ACTIVE = ['squat', 'pushup', 'curl', 'lunge', 'plank'];
export const exercises = Object.fromEntries(ACTIVE.map(id => [id, catalog[id]]));

export function getExerciseList(value) {
  const supported = Array.isArray(value) ? [...new Set(value.filter(id => Object.hasOwn(exercises, id)))] : [];
  return supported.length ? supported : ['squat'];
}

export const exerciseName = id => catalog[id]?.name || id;
export const isHold = id => Boolean(catalog[id]?.hold);

export const gradeFor = score => score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : 'D';

// Default set plan. Users change it on the setup screen.
export const defaultPlan = { sets: 2, repsPerSet: 10, holdSeconds: 30, restSeconds: 45, weights: {} };
// Exercises where people often hold a weight.
export const weighted = new Set(['curl', 'squat', 'lunge']);

export function getPlan(value) {
  const pick = (key, min, max) => {
    const number = Math.round(Number(value?.[key]));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : defaultPlan[key];
  };
  const weights = {};
  for (const [name, kg] of Object.entries(value?.weights || {})) {
    const number = Math.round(Number(kg) * 2) / 2;
    if (exercises[name] && number > 0 && number <= 500) weights[name] = number;
  }
  return { sets: pick('sets', 1, 6), repsPerSet: pick('repsPerSet', 3, 30), holdSeconds: pick('holdSeconds', 10, 300),
    restSeconds: pick('restSeconds', 10, 180), weights };
}
