/* ============================================================
   AppendixAI — Interactions Engine (Light Mode)
   Canvas grid, typing, wizard, tilt, scroll progress, counters
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initCanvas();
  initScrollProgress();
  initNavbar();
  initReveal();
  initCounters();
  initTyping();
  initGauge();
  initConfidenceRing();
  initFeatureBars();
  initWizard();
  initTiltCards();
  initFormEffects();
  initWhatIfAnalysis();
});

/* ───── ANIMATED DOT GRID (light-mode colors) ───── */
function initCanvas() {
  const canvas = document.getElementById("grid-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w, h, dots = [], mouse = { x: -1000, y: -1000 };
  const SPACING = 44, RADIUS = 1.2, INFLUENCE = 100;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    dots = [];
    for (let x = SPACING / 2; x < w; x += SPACING)
      for (let y = SPACING / 2; y < h; y += SPACING)
        dots.push({ x, y, ox: x, oy: y });
  }
  window.addEventListener("resize", resize);
  resize();

  document.addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      const dx = mouse.x - d.ox, dy = mouse.y - d.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let fx = 0, fy = 0;
      if (dist < INFLUENCE) {
        const force = (1 - dist / INFLUENCE) * 10;
        fx = (dx / dist) * force;
        fy = (dy / dist) * force;
      }
      d.x += (d.ox + fx - d.x) * 0.12;
      d.y += (d.oy + fy - d.y) * 0.12;

      const alpha = dist < INFLUENCE ? 0.12 + (1 - dist / INFLUENCE) * 0.35 : 0.06;
      const r = dist < INFLUENCE ? RADIUS + (1 - dist / INFLUENCE) * 1.8 : RADIUS;

      ctx.beginPath();
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = dist < INFLUENCE
        ? `rgba(99,102,241,${alpha})`
        : `rgba(148,163,184,${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ───── SCROLL PROGRESS ───── */
function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  window.addEventListener("scroll", () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = total > 0 ? (scrolled / total * 100) + "%" : "0%";
  }, { passive: true });
}

/* ───── NAVBAR ───── */
function initNavbar() {
  const nav = document.getElementById("navbar");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  window.addEventListener("scroll", () => {
    nav?.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
  toggle?.addEventListener("click", () => links?.classList.toggle("open"));
}

/* ───── THEME TOGGLE ───── */
function initThemeToggle() {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  const savedTheme = localStorage.getItem("appendixai-theme") || "light";
  if (savedTheme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  toggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("appendixai-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("appendixai-theme", "dark");
    }
  });
}

/* ───── REVEAL ───── */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const siblings = e.target.parentElement?.querySelectorAll(".reveal") || [];
        const idx = Array.from(siblings).indexOf(e.target);
        setTimeout(() => e.target.classList.add("visible"), Math.max(0, idx) * 65);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -20px 0px" });
  els.forEach((el) => obs.observe(el));
}

/* ───── COUNTERS ───── */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  els.forEach((el) => obs.observe(el));
}

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const hasDec = target % 1 !== 0;
  const dur = 1100, step = 16, total = dur / step;
  let n = 0;
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const timer = setInterval(() => {
    n++;
    const v = target * ease(n / total);
    el.textContent = hasDec ? v.toFixed(1) : Math.round(v);
    if (n >= total) { el.textContent = hasDec ? target.toFixed(1) : Math.round(target); clearInterval(timer); }
  }, step);
}

/* ───── TYPING ───── */
function initTyping() {
  const el = document.getElementById("typed-text");
  if (!el) return;
  const text = el.dataset.text || el.textContent;
  el.textContent = "";
  el.classList.add("typing-cursor");
  let i = 0;
  function typeChar() {
    if (i < text.length) { el.textContent += text.charAt(i); i++; setTimeout(typeChar, 40 + Math.random() * 30); }
    else { setTimeout(() => el.classList.remove("typing-cursor"), 2500); }
  }
  setTimeout(typeChar, 500);
}

/* ───── GAUGE ───── */
function initGauge() {
  const fill = document.querySelector(".gauge-fill");
  const needle = document.querySelector(".gauge-needle");
  if (!fill) return;
  const pct = parseFloat(fill.dataset.percent) / 100;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        fill.style.strokeDashoffset = 251.2 * (1 - pct);
        if (needle) needle.setAttribute("transform", `rotate(${pct * 180 - 90}, 100, 100)`);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(fill);
}

/* ───── CONFIDENCE RING ───── */
function initConfidenceRing() {
  const circ = document.querySelector(".confidence-circle");
  if (!circ) return;
  const pct = parseFloat(circ.dataset.percent) / 100;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { circ.style.strokeDashoffset = 326.7 * (1 - pct); obs.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  obs.observe(circ);
}

/* ───── FEATURE BARS ───── */
function initFeatureBars() {
  const bars = document.querySelectorAll(".feature-bar-fill");
  if (!bars.length) return;
  const container = document.getElementById("feature-bars-card");
  if (!container) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        bars.forEach((b, i) => setTimeout(() => { b.style.width = (b.dataset.width || 0) + "%"; }, i * 80));
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  obs.observe(container);
}

/* ───── WIZARD ───── */
function initWizard() {
  const panels = document.querySelectorAll(".wizard-panel");
  const indicators = document.querySelectorAll(".step-indicator");
  const connectors = document.querySelectorAll(".step-connector");
  if (!panels.length) return;
  let current = 0;

  function showStep(idx) {
    if (idx < 0 || idx >= panels.length) return;
    panels.forEach((p) => p.classList.remove("active"));
    panels[idx].classList.add("active");
    indicators.forEach((ind, i) => {
      ind.classList.remove("active", "done");
      if (i < idx) ind.classList.add("done");
      else if (i === idx) ind.classList.add("active");
    });
    connectors.forEach((c, i) => c.classList.toggle("filled", i < idx));
    current = idx;
    panels[idx].querySelectorAll(".reveal:not(.visible)").forEach((el) => el.classList.add("visible"));
  }

  indicators.forEach((ind, i) => ind.addEventListener("click", () => showStep(i)));
  document.querySelectorAll("[data-wizard-next]").forEach((btn) => btn.addEventListener("click", (e) => { e.preventDefault(); showStep(current + 1); }));
  document.querySelectorAll("[data-wizard-prev]").forEach((btn) => btn.addEventListener("click", (e) => { e.preventDefault(); showStep(current - 1); }));
  showStep(0);
}

/* ───── 3D TILT CARDS ───── */
function initTiltCards() {
  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.01)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(800px) rotateY(0) rotateX(0) scale(1)";
    });
  });
}

/* ───── FORM EFFECTS ───── */
function initFormEffects() {
  const form = document.getElementById("diagnosis-form");
  if (!form) return;

  form.addEventListener("submit", () => {
    const btnC = form.querySelector(".btn-content");
    const btnL = form.querySelector(".btn-loading");
    const btn = form.querySelector("#submit-btn");
    if (btnC && btnL) { btnC.style.display = "none"; btnL.style.display = "flex"; btn.disabled = true; }
  });

  const hI = document.getElementById("Height"), wI = document.getElementById("Weight"), bI = document.getElementById("BMI");
  if (hI && wI && bI) {
    const calc = () => { const h = parseFloat(hI.value) / 100, w = parseFloat(wI.value); if (h > 0 && w > 0) bI.value = (w / (h * h)).toFixed(1); };
    hI.addEventListener("input", calc);
    wI.addEventListener("input", calc);
  }

  form.querySelectorAll(".form-input,.form-select").forEach((inp) => {
    inp.addEventListener("focus", () => inp.closest(".form-group")?.classList.add("focused"));
    inp.addEventListener("blur", () => inp.closest(".form-group")?.classList.remove("focused"));
  });
}

/* ───── SMOOTH ANCHOR ───── */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const t = document.querySelector(a.getAttribute("href"));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); }
  });
});

/* ───── WHAT-IF ANALYSIS ───── */
function initWhatIfAnalysis() {
  const sliders = document.querySelectorAll('.what-if-slider');
  if (!sliders.length) return;
  const scriptTag = document.getElementById('initial-features');
  if (!scriptTag) return;
  
  let features = {};
  try { features = JSON.parse(scriptTag.textContent); } catch(e) {}
  let timeout = null;

  sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const feat = e.target.dataset.feature;
      const valSpan = document.getElementById(`val-${feat}`);
      if(valSpan) valSpan.textContent = Number(e.target.value).toFixed(1);
      
      features[feat] = Number(e.target.value);
      clearTimeout(timeout);
      timeout = setTimeout(() => runWhatIfPredict(features), 200);
    });
  });
}

async function runWhatIfPredict(features) {
  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features)
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    
    // Update Gauge
    const fill = document.querySelector(".gauge-fill");
    const needle = document.querySelector(".gauge-needle");
    const num = document.querySelector(".gauge-number");
    if (fill) fill.style.strokeDashoffset = 251.2 * (1 - (data.risk_score / 100));
    if (needle) needle.setAttribute("transform", `rotate(${ (data.risk_score/100) * 180 - 90 }, 100, 100)`);
    if (num) num.textContent = data.risk_score.toFixed(1);

    // Update Confidence
    const circ = document.querySelector(".confidence-circle");
    const confVal = document.querySelector(".confidence-value");
    if (circ) circ.style.strokeDashoffset = 326.7 * (1 - (data.confidence / 100));
    if (confVal) confVal.textContent = data.confidence.toFixed(1);

    // Update Feature Bars
    const container = document.querySelector(".feature-bars");
    if (container && data.top_features && data.top_features.length > 0) {
       let html = "";
       const maxAbs = data.top_features[0].abs_value;
       data.top_features.forEach(feat => {
          const isPos = feat.value > 0;
          const pct = Math.round((feat.abs_value / maxAbs) * 100);
          const valFmt = isPos ? `+${feat.value.toFixed(3)}` : feat.value.toFixed(3);
          html += `
          <div class="feature-bar-item">
              <div class="feature-bar-label">
                  <span class="feature-name">${feat.label}</span>
                  <span class="feature-impact ${isPos ? 'positive' : 'negative'}">${valFmt}</span>
              </div>
              <div class="feature-bar-track">
                  <div class="feature-bar-fill ${isPos ? 'positive' : 'negative'}" style="width:${pct}%"></div>
              </div>
          </div>`;
       });
       container.innerHTML = html;
    }
  } catch (err) {
    console.error("What-If Prediction Error:", err);
  }
}

