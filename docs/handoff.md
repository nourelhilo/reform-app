# Reform handoff

The local `reform/pose-and-ui` branch contains the pose fixes, functionality checks, and a pastel interface based on the two design references. GitHub publication is deferred. The workout flow and signed-in pages share the new palette; signed-in mobile navigation uses the pill layout.

- **Move / Sync:** Lavender and lilac as the main colors, with butter orange, periwinkle and hot pink accents. Rounded cards, bold black type, playful card illustrations, and a pill-shaped bottom nav.
- **Health score:** Warm ivory background, black type, dusty pink, powder blue, soft yellow and sage. Keep the clear score hierarchy and comfortable spacing.
- Starting palette: ivory `#F7F1E2`, ink `#191919`, lavender `#DACAF8`, lilac `#BB9AF5`, periwinkle `#929FF6`, butter orange `#FFBE59`, soft yellow `#F4DB76`, pink `#F2ADD1`, powder blue `#B8CEEE`, sage `#A4B773`. Start with the light theme and ink text on pastel cards. Check contrast and the mobile nav. The screenshots are visual inspiration; their text and features are not requirements.

## When you return

1. Check out the branch and follow the README. Try a guest workout first; it needs no account or database.
2. Bring a few labeled clips per exercise, with expected rep counts, including at least one partial rep and one interruption. Follow the [pose validation plan](pose-validation.md) before claiming webcam accuracy.
3. Try the workout flow on your own phone and desktop camera, then check sign-in, saving, and history with your Firebase and MongoDB project. Keep any further style changes consistent with the palette above.
4. **Future feature: Workout Tracker.** Add a dedicated section to log workouts by date with exercises, sets, reps, optional weights, and notes. Let users add a completed webcam session. Decide later whether planned workouts and a calendar belong in the first version. This is separate from the current workout history.

The branch can be reviewed locally without a deployment or migration. Older workout scores were calculated with different rules.
