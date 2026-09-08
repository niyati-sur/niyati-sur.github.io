const data = window.PORTFOLIO || {};

const emailLink = document.getElementById('emailLink');
if (emailLink && data.email) {
  emailLink.href = `mailto:${data.email}`;
}

const linkedinLink = document.getElementById('linkedinLink');
if (linkedinLink && data.linkedin) {
  linkedinLink.href = data.linkedin;
}

document.getElementById('year').textContent = new Date().getFullYear();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const orb = document.querySelector('.cursor-orb');
window.addEventListener('pointermove', (e) => {
  if (!orb) return;
  orb.style.left = `${e.clientX}px`;
  orb.style.top = `${e.clientY}px`;
});


// ------------------------------------------------------------
// SAE Aero: MLX90640 + dual-PTC thermal docking visualization
// ------------------------------------------------------------
(() => {
  const scene = document.getElementById('thermalDockScene');
  const camera = document.getElementById('thermalCamera');
  if (!scene || !camera) return;

  const ctx = scene.getContext('2d');
  const tctx = camera.getContext('2d');
  const playButton = document.getElementById('thermalPlay');
  const resetButton = document.getElementById('thermalReset');
  const disturbButton = document.getElementById('thermalDisturb');

  const ui = {
    mode: document.getElementById('thermalMode'),
    help: document.getElementById('thermalModeHelp'),
    distance: document.getElementById('thermalDistance'),
    error: document.getElementById('thermalError'),
    sep: document.getElementById('thermalSep'),
    blob: document.getElementById('thermalBlob'),
    confidenceText: document.getElementById('thermalConfidenceText'),
    confidenceBar: document.getElementById('thermalConfidenceBar')
  };

  const SENSOR_W = 24;
  const SENSOR_H = 32;
  const SENSOR_CENTER_X = 11.5;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !reducedMotion;
  let state;
  let previousTime = performance.now();

  function resetSimulation() {
    state = {
      distanceIn: 58,
      lateralPx: 5.4,
      filteredTargetX: SENSOR_CENTER_X,
      docked: false
    };
  }

  function appearanceForDistance(distanceIn) {
    // Illustrative approximation only. The real project will replace this
    // relationship with measurements from calibration testing.
    const n = Math.max(0, Math.min(1, (60 - distanceIn) / 54));
    return {
      separationPx: 3 + 16 * n,
      blobWidthPx: 1.5 + 7.5 * n,
      blobAreaPx: 3 + 57 * n
    };
  }

  function controllerMode(distanceIn) {
    if (distanceIn > 36) return { name:'FAR', kp:.18, speed:.70, help:'Large corrections are allowed while there is room.' };
    if (distanceIn > 18) return { name:'MEDIUM', kp:.14, speed:.48, help:'Corrections become more controlled as the PTC blobs separate and grow.' };
    if (distanceIn > 9) return { name:'CLOSE', kp:.10, speed:.28, help:'The payload slows down and starts trusting more precise blob geometry.' };
    return { name:'FINAL', kp:.07, speed:.13, help:'Tiny corrections only. The inner PTC edges define the final opening.' };
  }

  function computeFrame() {
    const visual = appearanceForDistance(state.distanceIn);
    const rawTargetX = SENSOR_CENTER_X + state.lateralPx;
    state.filteredTargetX = .30 * rawTargetX + .70 * state.filteredTargetX;

    let errorPx = state.filteredTargetX - SENSOR_CENTER_X;
    if (Math.abs(errorPx) < .65) errorPx = 0;

    const mode = controllerMode(state.distanceIn);
    let steering = mode.kp * errorPx;
    const alignmentFactor = Math.max(0, 1 - Math.abs(errorPx) / 7);
    let forward = mode.speed * alignmentFactor;

    if (Math.abs(errorPx) > 5) forward = 0;
    if (mode.name === 'FINAL' && Math.abs(errorPx) > 2.5) {
      forward = 0;
      steering = Math.max(-.20, Math.min(.20, steering));
    }

    const confidence = Math.max(.45, Math.min(.98,
      .60 + (60 - state.distanceIn) / 105 + Math.max(0, 1 - Math.abs(errorPx) / 10) * .17
    ));

    return { ...visual, rawTargetX, errorPx, mode, steering, forward, confidence };
  }

  function updateSimulation(dt) {
    if (!playing || state.docked) return;
    const f = computeFrame();

    // Differential steering reduces the lateral error while forward motion
    // reduces distance. This is a visual model, not the payload dynamics.
    state.lateralPx -= f.steering * dt * 1.9;
    state.distanceIn -= Math.max(0, f.forward) * dt * 8.0;
    state.distanceIn = Math.max(5.8, state.distanceIn);

    if (state.distanceIn <= 6.3 && Math.abs(state.lateralPx) < .55) {
      state.docked = true;
    }
  }

  function drawScene(f) {
    const w = scene.width;
    const h = scene.height;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#111827');
    bg.addColorStop(1, '#090c12');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Grid / centerline
    ctx.strokeStyle = 'rgba(216,255,96,.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(216,255,96,.35)';
    ctx.setLineDash([7, 10]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w/2, 92); ctx.lineTo(w/2, h-35); ctx.stroke();
    ctx.setLineDash([]);

    // Reattachment opening + PTCs
    const dockY = 78;
    const halfOpening = 104;
    const leftPTC = w/2 - halfOpening;
    const rightPTC = w/2 + halfOpening;
    ctx.fillStyle = '#242934';
    ctx.fillRect(122, 28, w - 244, 31);
    ctx.fillStyle = '#d9d2df';
    ctx.font = '700 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REATTACHMENT AREA', w/2, 49);

    [leftPTC, rightPTC].forEach((x) => {
      const glow = ctx.createRadialGradient(x, dockY, 2, x, dockY, 38);
      glow.addColorStop(0, '#fff3a9');
      glow.addColorStop(.25, '#ffbc4b');
      glow.addColorStop(.55, 'rgba(255,101,48,.62)');
      glow.addColorStop(1, 'rgba(255,101,48,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, dockY, 38, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#ff7540';
      ctx.beginPath(); ctx.arc(x, dockY, 12, 0, Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = '#818899';
    ctx.fillRect(leftPTC + 21, dockY - 5, rightPTC - leftPTC - 42, 10);

    // Payload position in the demo world.
    const payloadY = 424 - (58 - state.distanceIn) * 6.25;
    const payloadX = w/2 + state.lateralPx * 19;

    // Sensor rays
    ctx.strokeStyle = 'rgba(157,130,255,.31)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(payloadX, payloadY - 25); ctx.lineTo(leftPTC, dockY);
    ctx.moveTo(payloadX, payloadY - 25); ctx.lineTo(rightPTC, dockY);
    ctx.stroke();

    // Correction arrow
    if (Math.abs(f.errorPx) > .05 && !state.docked) {
      const direction = -Math.sign(f.errorPx);
      const length = Math.min(78, 28 + Math.abs(f.errorPx) * 8);
      ctx.strokeStyle = '#d8ff60';
      ctx.fillStyle = '#d8ff60';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(payloadX, payloadY + 47); ctx.lineTo(payloadX + direction * length, payloadY + 47); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(payloadX + direction*length, payloadY+47);
      ctx.lineTo(payloadX + direction*(length-14), payloadY+39);
      ctx.lineTo(payloadX + direction*(length-14), payloadY+55);
      ctx.closePath(); ctx.fill();
    }

    // Payload
    ctx.save();
    ctx.translate(payloadX, payloadY);
    ctx.fillStyle = state.docked ? '#d8ff60' : '#f4efe7';
    ctx.beginPath();
    ctx.roundRect(-40, -24, 80, 48, 14);
    ctx.fill();
    ctx.fillStyle = '#211b2a';
    ctx.fillRect(-25, -10, 50, 20);
    ctx.fillStyle = '#6d42e5';
    ctx.beginPath(); ctx.arc(0, -24, 7, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = '#ffb077';
    ctx.fillText('PTC', leftPTC, dockY - 37);
    ctx.fillText('PTC', rightPTC, dockY - 37);
    ctx.fillStyle = state.docked ? '#d8ff60' : '#a8a2af';
    ctx.fillText(state.docked ? 'DOCKED / ALIGNED' : `${f.mode.name} APPROACH`, w/2, h - 15);
  }

  function thermalColor(tempC) {
    const n = Math.max(0, Math.min(1, (tempC - 28) / 42));
    if (n < .25) return `rgb(${Math.round(20+45*n)},${Math.round(24+65*n)},${Math.round(42+130*n)})`;
    if (n < .65) return `rgb(${Math.round(50+250*n)},${Math.round(60+115*n)},${Math.round(115-90*n)})`;
    return `rgb(255,${Math.round(192-125*n)},${Math.round(72-45*n)})`;
  }

  function drawThermalCamera(f) {
    const cellW = camera.width / SENSOR_W;
    const cellH = camera.height / SENSOR_H;
    const centerY = 14.5;
    const radiusX = Math.max(.65, f.blobWidthPx / 2.4);
    const radiusY = Math.max(.9, f.blobWidthPx / 1.7);
    const leftX = SENSOR_CENTER_X + state.lateralPx - f.separationPx/2;
    const rightX = SENSOR_CENTER_X + state.lateralPx + f.separationPx/2;

    for (let y=0; y<SENSOR_H; y++) {
      for (let x=0; x<SENSOR_W; x++) {
        let temp = 28;
        [leftX, rightX].forEach((cx) => {
          const dx = (x - cx) / radiusX;
          const dy = (y - centerY) / radiusY;
          const r2 = dx*dx + dy*dy;
          if (r2 <= 1) temp = Math.max(temp, 28 + 42*(1 - .30*r2));
        });
        tctx.fillStyle = thermalColor(temp);
        tctx.fillRect(x*cellW, y*cellH, cellW+.6, cellH+.6);
      }
    }

    // Sensor center + detected target lines.
    tctx.strokeStyle = 'rgba(255,255,255,.65)';
    tctx.lineWidth = 2;
    tctx.beginPath(); tctx.moveTo((SENSOR_CENTER_X+.5)*cellW,0); tctx.lineTo((SENSOR_CENTER_X+.5)*cellW,camera.height); tctx.stroke();
    tctx.strokeStyle = '#d8ff60';
    tctx.lineWidth = 3;
    tctx.beginPath(); tctx.moveTo((f.rawTargetX+.5)*cellW,0); tctx.lineTo((f.rawTargetX+.5)*cellW,camera.height); tctx.stroke();
  }

  function updateUI(f) {
    ui.mode.textContent = state.docked ? 'DOCKED' : f.mode.name;
    ui.help.textContent = state.docked ? 'The target is centered and the simulated attachment point has been reached.' : f.mode.help;
    ui.distance.textContent = state.distanceIn.toFixed(1);
    ui.error.textContent = f.errorPx.toFixed(2);
    ui.sep.textContent = f.separationPx.toFixed(1);
    ui.blob.textContent = f.blobWidthPx.toFixed(1);
    const pct = Math.round(f.confidence * 100);
    ui.confidenceText.textContent = `${pct}%`;
    ui.confidenceBar.style.width = `${pct}%`;
  }

  function animationFrame(now) {
    const dt = Math.min(.035, (now - previousTime) / 1000);
    previousTime = now;
    updateSimulation(dt);
    const f = computeFrame();
    drawScene(f);
    drawThermalCamera(f);
    updateUI(f);
    requestAnimationFrame(animationFrame);
  }

  playButton.addEventListener('click', () => {
    playing = !playing;
    playButton.textContent = playing ? 'Pause' : 'Play';
  });
  resetButton.addEventListener('click', () => {
    resetSimulation();
    playing = true;
    playButton.textContent = 'Pause';
  });
  disturbButton.addEventListener('click', () => {
    state.lateralPx += state.lateralPx >= 0 ? 3.8 : -3.8;
    state.docked = false;
  });

  resetSimulation();
  playButton.textContent = playing ? 'Pause' : 'Play';
  requestAnimationFrame(animationFrame);
})();
