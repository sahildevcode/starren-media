/* ==========================================================================
   Starren Media — Interactive Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initParticleCanvas();
  initEyesTracker();
  initBeforeAfterSlider();
  initOpticalButtons();
});

/* ==========================================================================
   1. Interactive Particle Canvas for "Starren Media"
   ========================================================================== */
function initParticleCanvas() {
  const container = document.getElementById('canvas-container');
  const canvas = document.getElementById('particle-canvas');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let particles = [];
  let animId = null;
  const mouse = { x: -2000, y: -2000, isHovering: false, isDown: false, startX: 0, startY: 0 };

  const config = {
    text: "Zonvia Agency",
    fontFamily: '"Inter", "Space Grotesk", sans-serif',
    fontWeight: "550",      // clean, elegant semi-medium weight (not overly heavy/bold)
    particleSize: 2.0,      // refined particle dot size
    densityStep: 2.1,       // balanced spacing
    mouseRadius: 100,       // interaction radius
    returnSpeed: 0.06,      // spring return force
    friction: 0.91,         // velocity damping
    scatterForce: 2.4,      // repulsion strength
    color: '#121417'        // premium soft dark tone
  };

  let isIntroAnimating = true;
  let introStartTime = 0;
  const INTRO_DURATION = 1800; // 1.8 seconds initial screen-wide convergence animation

  function resizeAndInitParticles(isInitialLoad = false) {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Increased height/size of text
    let fontSize = Math.min(Math.max(w * 0.118, 54), 108);

    ctx.fillStyle = config.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${config.fontWeight} ${fontSize}px ${config.fontFamily}`;

    // Measure text
    const textY = h / 2;
    const textX = w / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillText(config.text, textX, textY);

    // Read pixel data
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    particles = [];

    // Dense step so dots sit close together and the words are completely legible
    const step = Math.max(2, Math.round(config.densityStep * dpr * 0.75));
    const invDpr = 1 / dpr;

    // Window dimensions for the screen-wide scatter effect
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const canvasRect = canvas.getBoundingClientRect();

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 120) {
          const targetX = x * invDpr;
          const targetY = y * invDpr;

          // On initial page load: start widely dispersed all across the window/screen
          let startX = targetX;
          let startY = targetY;

          if (isInitialLoad) {
            // Disperse across whole screen width & height relative to canvas coordinates
            const screenX = (Math.random() - 0.5) * winW * 1.6 + (w / 2);
            const screenY = (Math.random() - 0.5) * winH * 1.4 + (h / 2);
            startX = screenX;
            startY = screenY;
          }

          particles.push({
            x: startX,
            y: startY,
            baseX: targetX,
            baseY: targetY,
            vx: isInitialLoad ? (Math.random() - 0.5) * 8 : 0,
            vy: isInitialLoad ? (Math.random() - 0.5) * 8 : 0,
            size: config.particleSize
          });
        }
      }
    }

    if (isInitialLoad) {
      isIntroAnimating = true;
      introStartTime = performance.now();
    }

    ctx.clearRect(0, 0, w, h);
  }

  // Animation Loop with Performance Auto-Sleep & Viewport Throttling
  let isRunning = false;
  let isInViewport = true;

  function wakeUpAnimation() {
    if (!isRunning && isInViewport) {
      isRunning = true;
      animId = requestAnimationFrame(animate);
    }
  }

  function animate(currentTime) {
    if (!isInViewport) {
      isRunning = false;
      return;
    }

    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = config.color;

    let totalMovement = 0;

    // Handle intro convergence phase
    let currentReturnSpeed = config.returnSpeed;
    let currentFriction = config.friction;

    if (isIntroAnimating) {
      const elapsed = currentTime - introStartTime;
      const progress = Math.min(1, elapsed / INTRO_DURATION);
      
      // Accelerate convergence as time progresses
      currentReturnSpeed = 0.04 + progress * 0.05;
      currentFriction = 0.88 + progress * 0.04;

      if (progress >= 1) {
        isIntroAnimating = false;
      }
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion (preserved exactly as before)
      if (mouse.isHovering) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.mouseRadius) {
          const force = (config.mouseRadius - dist) / config.mouseRadius;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force * config.scatterForce;
          p.vy -= Math.sin(angle) * force * config.scatterForce;
        }
      }

      // Spring back to base position (converging to form text)
      p.vx += (p.baseX - p.x) * currentReturnSpeed;
      p.vy += (p.baseY - p.y) * currentReturnSpeed;

      // Friction damping
      p.vx *= currentFriction;
      p.vy *= currentFriction;

      p.x += p.vx;
      p.y += p.vy;

      totalMovement += Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.baseX - p.x) + Math.abs(p.baseY - p.y);

      // Draw particle
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    // Auto-Sleep: If intro is done, mouse is not hovering, and particles settled, sleep RAF loop
    if (!isIntroAnimating && !mouse.isHovering && totalMovement < 0.25) {
      isRunning = false;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = config.color;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = p.baseX;
        p.y = p.baseY;
        p.vx = 0;
        p.vy = 0;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      return;
    }

    animId = requestAnimationFrame(animate);
  }

  // Intersection Observer: stops all canvas calculations when hero is scrolled out of view
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isInViewport = entry.isIntersecting;
        if (isInViewport) {
          wakeUpAnimation();
        } else {
          if (animId) cancelAnimationFrame(animId);
          isRunning = false;
        }
      });
    }, { threshold: 0.05 });
    observer.observe(container);
  }

  // Event Listeners for Interaction
  function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.isHovering = true;
    wakeUpAnimation();
  }

  canvas.addEventListener('mousemove', updateMousePos, { passive: true });
  canvas.addEventListener('mouseenter', () => {
    mouse.isHovering = true;
    wakeUpAnimation();
  }, { passive: true });
  canvas.addEventListener('mouseleave', () => {
    mouse.isHovering = false;
    mouse.x = -2000;
    mouse.y = -2000;
    wakeUpAnimation();
  }, { passive: true });

  // Touch Support
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.isHovering = true;
      wakeUpAnimation();
    }
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    mouse.isHovering = false;
    mouse.x = -2000;
    mouse.y = -2000;
    wakeUpAnimation();
  }, { passive: true });

  // Resize Debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeAndInitParticles();
      wakeUpAnimation();
    }, 150);
  });

  // Initialize with initial screen-wide convergence animation
  resizeAndInitParticles(true);
  wakeUpAnimation();
}

/* ==========================================================================
   2. Interactive Eye-Tracking & Auto-Blinking Pill (Home ke Just Baad)
   ========================================================================== */
function initEyesTracker() {
  const leftEye = document.getElementById('eye-left');
  const rightEye = document.getElementById('eye-right');
  const leftPupil = document.getElementById('pupil-left');
  const rightPupil = document.getElementById('pupil-right');
  const container = document.getElementById('eyes-container');
  if (!leftEye || !rightEye || !leftPupil || !rightPupil) return;

  const maxRadius = 13; // max travel radius in pixels within eyeball
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isTicking = false;

  function updatePupils() {
    [
      { eye: leftEye, pupil: leftPupil },
      { eye: rightEye, pupil: rightPupil }
    ].forEach(({ eye, pupil }) => {
      const rect = eye.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);
      const move = Math.min(dist / 14, maxRadius);

      const px = Math.cos(angle) * move;
      const py = Math.sin(angle) * move;

      pupil.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    });
    isTicking = false;
  }

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isTicking) {
      requestAnimationFrame(updatePupils);
      isTicking = true;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
      if (!isTicking) {
        requestAnimationFrame(updatePupils);
        isTicking = true;
      }
    }
  }, { passive: true });

  // Natural Random Blinking Animation
  function triggerBlink() {
    leftEye.classList.add('blinking');
    rightEye.classList.add('blinking');
    setTimeout(() => {
      leftEye.classList.remove('blinking');
      rightEye.classList.remove('blinking');
    }, 200);
  }

  function scheduleNextBlink() {
    const nextInterval = Math.random() * 3200 + 2400; // blink every 2.4s - 5.6s
    setTimeout(() => {
      triggerBlink();
      scheduleNextBlink();
    }, nextInterval);
  }

  // Click on pill triggers an instant blink / wink
  if (container) {
    container.addEventListener('click', () => {
      triggerBlink();
    });
  }

  // Initial call
  updatePupils();
  scheduleNextBlink();
}

/* ==========================================================================
   3. Interactive Before / After Thumbnail Comparison Slider (Click & Drag Only)
   ========================================================================== */
function initBeforeAfterSlider() {
  const stage = document.getElementById('before-after-container');
  if (!stage) return;

  const sliderStage = stage.querySelector('.ba-slider-stage');
  const beforeLayer = document.getElementById('ba-before-layer');
  const handle = document.getElementById('ba-handle');
  if (!sliderStage || !beforeLayer || !handle) return;

  let isDragging = false;

  function setSliderPosition(clientX) {
    const rect = sliderStage.getBoundingClientRect();
    let pos = (clientX - rect.left) / rect.width;
    pos = Math.max(0.01, Math.min(0.99, pos)); // constrain within 1% - 99%

    const pct = pos * 100;
    beforeLayer.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    handle.style.left = `${pct}%`;
  }

  // Pointer drag events - ONLY runs when clicked down
  function onPointerMove(e) {
    if (!isDragging) return;
    setSliderPosition(e.clientX);
  }

  function onPointerUp() {
    if (isDragging) {
      isDragging = false;
      sliderStage.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }
  }

  // Start drag ONLY when mouse button is pressed
  sliderStage.addEventListener('pointerdown', (e) => {
    isDragging = true;
    sliderStage.classList.add('is-dragging');
    setSliderPosition(e.clientX);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  });

  // Touch drag support (only when touching and moving)
  sliderStage.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      isDragging = true;
      setSliderPosition(e.touches[0].clientX);
    }
  }, { passive: true });

  sliderStage.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length > 0) {
      setSliderPosition(e.touches[0].clientX);
    }
  }, { passive: true });

  sliderStage.addEventListener('touchend', () => {
    isDragging = false;
  }, { passive: true });
}

/* ==========================================================================
   3. Optical Glass 3D Tilt & Light Specular Reflection
   ========================================================================== */
function initOpticalButtons() {
  const buttons = document.querySelectorAll('.optical-glass-btn');

  buttons.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6; // tilt up/down
      const rotateY = ((x - centerX) / centerX) * 6;  // tilt left/right

      btn.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;

      const tint = btn.querySelector('.btn-tint');
      if (tint) {
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        tint.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(255, 255, 255, 0.9), transparent 65%)`;
      }
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0px)';
      const tint = btn.querySelector('.btn-tint');
      if (tint) {
        tint.style.background = 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.8), transparent 70%)';
      }
    });
  });

  // Subtle 3D tilt & smooth lighting on Discipline Cards
  const cards = document.querySelectorAll('.discipline-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

/* ==========================================================================
   5. Portfolio Lightbox Modal
   ========================================================================== */
const collectionsData = {
  "Video Editing": {
    badge: "COLLECTION 01 / VIDEO PRODUCTION",
    title: "Video Editing Showcase",
    items: [
      {
        title: "High-Retention Talking Head Breakdown",
        desc: "Custom zoom cuts, sound design pacing, dynamic B-roll integration, and kinetic subtitle typography."
      },
      {
        title: "Documentary & Storytelling Sequence",
        desc: "Color-graded cinematic narrative with multi-track ambient sound layers and custom motion maps."
      },
      {
        title: "Viral TikTok / Instagram Shorts Suite",
        desc: "First 3-second hook retention strategies, rapid sound fx, and auto-reframed 9:16 vertical motion."
      },
      {
        title: "SaaS & Product Launch Explainer",
        desc: "Sleek UI animations, smooth mouse pointer motion, and clear feature callouts."
      }
    ]
  },
  "Thumbnail Design": {
    badge: "COLLECTION 02 / PACKAGING & PACKS",
    title: "High-CTR Thumbnail Portfolio",
    items: [
      {
        title: "High-Curiosity Challenge Concepts",
        desc: "High visual contrast, extreme facial expression enhancement, and curiosity trigger elements."
      },
      {
        title: "Creator Brand Personalization",
        desc: "Signature color scheme and consistent branding that stands out on home feed and recommended sidebars."
      },
      {
        title: "Before & After Retouching & Lighting",
        desc: "Photorealistic subject relighting, HDR pop, and 3D depth separation between subject and background."
      },
      {
        title: "Story Climax Visuals",
        desc: "Carefully composed scenes capturing the single most intriguing second of the entire video."
      }
    ]
  }
};

window.openModal = function(type) {
  const modal = document.getElementById('portfolio-modal');
  const badgeEl = document.getElementById('modal-badge');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');

  const data = collectionsData[type] || collectionsData["Video Editing"];

  badgeEl.textContent = data.badge;
  titleEl.textContent = data.title;

  bodyEl.innerHTML = `
    <div class="modal-grid">
      ${data.items.map(item => `
        <div class="modal-item">
          <h4 class="modal-item-title">${item.title}</h4>
          <p class="modal-item-desc">${item.desc}</p>
        </div>
      `).join('')}
    </div>
    <div style="margin-top: 24px; text-align: center;">
      <a href="#contact" onclick="closeModal()" class="submit-btn" style="display: inline-flex; padding: 12px 28px; text-decoration: none;">
        Book This Service
      </a>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  const modal = document.getElementById('portfolio-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

window.handleFormSubmit = function(e) {
  e.preventDefault();
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (form && success) {
    form.querySelector('.submit-btn').style.display = 'none';
    success.style.display = 'block';
  }
};
