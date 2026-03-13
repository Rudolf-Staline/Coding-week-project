/* ═══════════════════════════════════════════════════════════════════════════
   AppendixAI — Main JavaScript
   ═══════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initCounters();
  initBodyDiagram();
  initFormProgress();
  initFormSubmit();
  initSymptomMarkers();
});

/* ── Navbar scroll effect ──────────────────────────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
  }
}

/* ── Scroll reveal (IntersectionObserver) ──────────────────────────────── */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}

/* ── Animated counters ─────────────────────────────────────────────────── */
function initCounters() {
  const counters = document.querySelectorAll('.stat-value[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const isFloat = target % 1 !== 0;
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = eased * target;

    el.textContent = isFloat ? current.toFixed(1) : Math.round(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* ── Body diagram interactions ─────────────────────────────────────────── */
function initBodyDiagram() {
  const zones = document.querySelectorAll('.body-zone');
  if (!zones.length) return;

  zones.forEach(zone => {
    zone.addEventListener('click', () => {
      const target = zone.dataset.target;
      if (!target) return;

      // Activate zone
      zones.forEach(z => z.classList.remove('active'));
      zone.classList.add('active');

      // Open + highlight section
      const section = document.getElementById('section-' + target);
      if (section) {
        // Close other sections
        document.querySelectorAll('.form-section').forEach(s => {
          if (s !== section) s.classList.remove('highlight');
        });

        // Open and scroll
        if (!section.classList.contains('open')) {
          toggleSection(target);
        }

        section.classList.add('highlight');
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Remove highlight after a moment
        setTimeout(() => section.classList.remove('highlight'), 2000);
      }
    });
  });
}

/* ── Toggle form sections ──────────────────────────────────────────────── */
function toggleSection(key) {
  const section = document.getElementById('section-' + key);
  if (!section) return;
  section.classList.toggle('open');
}
// Make globally available for onclick
window.toggleSection = toggleSection;

/* ── Form progress tracking ────────────────────────────────────────────── */
function initFormProgress() {
  const form = document.getElementById('diagnosisForm');
  if (!form) return;

  const bar = document.getElementById('formProgress');
  const text = document.getElementById('formProgressText');
  if (!bar || !text) return;

  function updateProgress() {
    const inputs = form.querySelectorAll('input[type="number"], select');
    const toggles = form.querySelectorAll('.toggle-input');
    let filled = 0;
    let total = inputs.length;

    inputs.forEach(input => {
      if (input.type === 'number' && input.value !== '') filled++;
      if (input.tagName === 'SELECT' && input.value !== '') filled++;
    });
    // Toggles count as filled if checked
    toggles.forEach(t => { if (t.checked) filled++; });
    total += toggles.length;

    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    bar.style.width = pct + '%';
    text.textContent = pct + '%';
  }

  form.addEventListener('input', updateProgress);
  form.addEventListener('change', updateProgress);
  updateProgress();
}

/* ── Form submit loading state ─────────────────────────────────────────── */
function initFormSubmit() {
  const form = document.getElementById('diagnosisForm');
  const btn = document.getElementById('submitBtn');
  if (!form || !btn) return;

  form.addEventListener('submit', () => {
    const text = btn.querySelector('.btn-text');
    const loading = btn.querySelector('.btn-loading');
    if (text) text.style.display = 'none';
    if (loading) loading.style.display = 'flex';
    btn.disabled = true;
    btn.style.opacity = '.7';
  });
}

/* ── Smooth scroll for anchor links ────────────────────────────────────── */
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;

  e.preventDefault();
  const target = document.querySelector(link.getAttribute('href'));
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   SYMPTOM MARKERS — Red dots on body image
   ═══════════════════════════════════════════════════════════════════════════ */

const symptomZoneMapping = {
  // Patient info (head — center ~100, y ~35-70)
  'Age':              { zone: 'patient_info', x: 100, y: 35, label: 'Âge' },
  'Sex':              { zone: 'patient_info', x: 88, y: 48, label: 'Sexe' },
  'Height':           { zone: 'patient_info', x: 112, y: 40, label: 'Taille' },
  'Weight':           { zone: 'patient_info', x: 85, y: 60, label: 'Poids' },
  'BMI':              { zone: 'patient_info', x: 115, y: 55, label: 'IMC' },
  'Body_Temperature': { zone: 'patient_info', x: 100, y: 68, label: 'Température' },

  // Blood (thorax — center ~100, y ~105-150)
  'WBC_Count':             { zone: 'blood', x: 88, y: 110, label: 'Leucocytes' },
  'Neutrophil_Percentage': { zone: 'blood', x: 112, y: 115, label: 'Neutrophiles' },
  'Segmented_Neutrophils': { zone: 'blood', x: 85, y: 125, label: 'N. segmentés' },
  'Neutrophilia':          { zone: 'blood', x: 115, y: 130, label: 'Neutrophilie' },
  'RBC_Count':             { zone: 'blood', x: 90, y: 140, label: 'Globules rouges' },
  'Hemoglobin':            { zone: 'blood', x: 110, y: 142, label: 'Hémoglobine' },
  'RDW':                   { zone: 'blood', x: 100, y: 148, label: 'IDR' },
  'Thrombocyte_Count':     { zone: 'blood', x: 95, y: 105, label: 'Plaquettes' },
  'CRP':                   { zone: 'blood', x: 105, y: 152, label: 'CRP' },

  // Abdominal (center ~100, y ~170-215)
  'Migratory_Pain':                    { zone: 'abdominal', x: 100, y: 172, label: 'Douleur migratrice' },
  'Lower_Right_Abd_Pain':              { zone: 'abdominal', x: 118, y: 200, label: 'Douleur FID' },
  'Contralateral_Rebound_Tenderness':  { zone: 'abdominal', x: 82, y: 195, label: 'Défense controlatérale' },
  'Coughing_Pain':                     { zone: 'abdominal', x: 100, y: 182, label: 'Douleur toux' },
  'Nausea':                            { zone: 'abdominal', x: 90, y: 177, label: 'Nausées' },
  'Loss_of_Appetite':                  { zone: 'abdominal', x: 110, y: 185, label: 'Anorexie' },
  'Peritonitis':                       { zone: 'abdominal', x: 100, y: 210, label: 'Péritonite' },
  'Psoas_Sign':                        { zone: 'abdominal', x: 120, y: 205, label: 'Signe psoas' },
  'Ipsilateral_Rebound_Tenderness':    { zone: 'abdominal', x: 80, y: 205, label: 'Défense ipsilatérale' },
  'Stool':                             { zone: 'abdominal', x: 100, y: 218, label: 'Selles' },

  // Urinary (center ~100, y ~228-250)
  'Ketones_in_Urine': { zone: 'urinary', x: 93, y: 230, label: 'Cétones' },
  'RBC_in_Urine':     { zone: 'urinary', x: 107, y: 235, label: 'Hématurie' },
  'WBC_in_Urine':     { zone: 'urinary', x: 95, y: 244, label: 'Leucocyturie' },
  'Dysuria':          { zone: 'urinary', x: 108, y: 248, label: 'Dysurie' },

  // Imaging — echo (left arm area, x ~35-50, y ~140-210)
  'US_Performed':                  { zone: 'imaging', x: 42, y: 145, label: 'Échographie' },
  'Appendix_on_US':                { zone: 'imaging', x: 38, y: 155, label: 'Appendice visible' },
  'Appendix_Diameter':             { zone: 'imaging', x: 44, y: 165, label: 'Diamètre' },
  'Free_Fluids':                   { zone: 'imaging', x: 36, y: 175, label: 'Liquide libre' },
  'Appendix_Wall_Layers':          { zone: 'imaging', x: 42, y: 185, label: 'Paroi' },
  'Target_Sign':                   { zone: 'imaging', x: 38, y: 195, label: 'Cible' },
  'Appendicolith':                 { zone: 'imaging', x: 44, y: 140, label: 'Appendicolithe' },
  'Perfusion':                     { zone: 'imaging', x: 36, y: 160, label: 'Perfusion' },
  'Perforation':                   { zone: 'imaging', x: 42, y: 170, label: 'Perforation' },
  'Surrounding_Tissue_Reaction':   { zone: 'imaging', x: 38, y: 180, label: 'Réaction tissulaire' },
  'Appendicular_Abscess':          { zone: 'imaging', x: 44, y: 190, label: 'Abcès' },
  'Pathological_Lymph_Nodes':      { zone: 'imaging', x: 36, y: 200, label: 'Ganglions' },
  'Bowel_Wall_Thickening':         { zone: 'imaging', x: 42, y: 150, label: 'Paroi intestinale' },
  'Ileus':                         { zone: 'imaging', x: 38, y: 168, label: 'Iléus' },
  'Coprostasis':                   { zone: 'imaging', x: 44, y: 205, label: 'Coprostase' },
  'Meteorism':                     { zone: 'imaging', x: 36, y: 135, label: 'Météorisme' },
  'Enteritis':                     { zone: 'imaging', x: 42, y: 130, label: 'Entérite' },

  // Scores (right arm area, x ~150-165, y ~140-200)
  'Alvarado_Score':                { zone: 'scores', x: 158, y: 165, label: 'Alvarado' },
  'Paedriatic_Appendicitis_Score': { zone: 'scores', x: 155, y: 180, label: 'PAS' },
  'Length_of_Stay':                { zone: 'scores', x: 160, y: 195, label: 'Séjour' },
};

function initSymptomMarkers() {
  const form = document.getElementById('diagnosisForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('change', () => updateSymptomMarker(input));
    input.addEventListener('input', () => updateSymptomMarker(input));
  });
  inputs.forEach(input => updateSymptomMarker(input));
}

function updateSymptomMarker(input) {
  const fieldName = input.name;
  const mapping = symptomZoneMapping[fieldName];
  if (!mapping) return;

  const container = document.getElementById('symptomMarkersContainer');
  if (!container) return;

  const markerId = 'marker-' + fieldName;
  let marker = document.getElementById(markerId);
  const isActive = isFieldActive(input);

  if (isActive) {
    if (!marker) {
      marker = createMarkerElement(fieldName, mapping);
      container.appendChild(marker);
      setTimeout(() => marker.classList.add('active'), 10);
    }
  } else {
    if (marker) {
      marker.classList.remove('active');
      setTimeout(() => marker.remove(), 300);
    }
  }
  updateZoneSymptomCount(mapping.zone);
}

function isFieldActive(input) {
  if (input.type === 'checkbox') return input.checked;
  if (input.type === 'hidden') return false;
  if (input.tagName === 'SELECT') {
    const v = input.value;
    return v !== '' && v !== '0' && v !== 'no' && v !== 'none' && v !== 'normal';
  }
  if (input.type === 'number') return input.value !== '' && parseFloat(input.value) > 0;
  return input.value.trim() !== '';
}

function createMarkerElement(fieldName, mapping) {
  const NS = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('id', 'marker-' + fieldName);
  g.setAttribute('class', 'symptom-marker');
  g.setAttribute('transform', 'translate(' + mapping.x + ',' + mapping.y + ')');

  const pulse = document.createElementNS(NS, 'circle');
  pulse.setAttribute('r', '6');
  pulse.setAttribute('class', 'marker-pulse');
  g.appendChild(pulse);

  const dot = document.createElementNS(NS, 'circle');
  dot.setAttribute('r', '3');
  dot.setAttribute('class', 'marker-dot');
  g.appendChild(dot);

  const title = document.createElementNS(NS, 'title');
  title.textContent = mapping.label;
  g.appendChild(title);

  return g;
}

function updateZoneSymptomCount(zoneName) {
  let count = 0;
  Object.entries(symptomZoneMapping).forEach(([fn, m]) => {
    if (m.zone === zoneName) {
      const marker = document.getElementById('marker-' + fn);
      if (marker && marker.classList.contains('active')) count++;
    }
  });

  document.querySelectorAll('.body-zone[data-target="' + zoneName + '"]').forEach(z => {
    z.classList.toggle('has-symptoms', count > 0);
  });
  document.querySelectorAll('.legend-pill[data-target="' + zoneName + '"]').forEach(p => {
    p.classList.toggle('has-symptoms', count > 0);
    if (count > 0) p.setAttribute('title', count + ' symptôme(s)');
    else p.removeAttribute('title');
  });
}
