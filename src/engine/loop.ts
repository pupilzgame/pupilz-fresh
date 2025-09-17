// Game engine loop - handles requestAnimationFrame timing
export function startLoop(update: (dt: number) => void) {
  let raf = 0;
  let last = performance.now();

  const tick = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000); // cap at 50ms (20 FPS minimum)
    last = t;
    update(dt);
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  // Return cleanup function
  return () => cancelAnimationFrame(raf);
}

// Fixed timestep loop for physics-heavy games
export function startFixedLoop(
  update: (dt: number) => void,
  render: () => void,
  targetFPS: number = 60
) {
  const targetDt = 1 / targetFPS;
  let raf = 0;
  let last = performance.now();
  let accumulator = 0;

  const tick = (t: number) => {
    const frameTime = Math.min((t - last) / 1000, 0.05); // cap frame time
    last = t;
    accumulator += frameTime;

    // Fixed timestep updates
    while (accumulator >= targetDt) {
      update(targetDt);
      accumulator -= targetDt;
    }

    // Render with interpolation factor
    render();
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}