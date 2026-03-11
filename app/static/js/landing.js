/* ═══════════════════════════════════════════════════════════
   PediAppend – landing.js
   Script spécifique à la page d'accueil (index.html).
   Gère : animation des statistiques, navigation par slides
   (clavier, molette, flèches, points latéraux) et particules.
   ═══════════════════════════════════════════════════════════ */

/** Durée (ms) de l'animation de comptage des statistiques. */
const STAT_ANIMATION_DURATION = 1500;

/** Seuil de visibilité (0–1) déclenchant l'animation des stats. */
const STAT_OBSERVER_THRESHOLD = 0.3;

/** Délai anti-rebond (ms) entre deux navigations à la molette. */
const WHEEL_COOLDOWN_MS = 800;

/** Nombre de particules décoratives générées sur la page d'accueil. */
const PARTICLE_COUNT = 20;

document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Animation de comptage des statistiques ── */

    /**
     * Anime un compteur numérique de 0 jusqu'à `target` avec un easing cubique.
     * @param {HTMLElement} el     - Élément contenant le compteur.
     * @param {number}      target - Valeur cible à atteindre.
     */
    function animateCounter(el, target) {
        const start = performance.now();
        /**
         * Tick d'animation appelé à chaque frame via requestAnimationFrame.
         * @param {number} now - Timestamp courant (ms).
         */
        function tick(now) {
            const progress = Math.min((now - start) / STAT_ANIMATION_DURATION, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = (target * eased).toFixed(1);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /**
     * Observer déclenché quand une grille de statistiques devient visible.
     * Pour chaque `.stat-value[data-count]`, lance le compteur animé
     * ou affiche directement la valeur si les animations sont réduites.
     */
    const statObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.querySelectorAll('.stat-value[data-count]').forEach(el => {
                const target = parseFloat(el.dataset.count);
                if (prefersReducedMotion) {
                    el.textContent = target.toFixed(1);
                } else {
                    animateCounter(el, target);
                }
            });
            statObserver.unobserve(entry.target);
        });
    }, { threshold: STAT_OBSERVER_THRESHOLD });

    document.querySelectorAll('.stats-grid').forEach(el => statObserver.observe(el));

    /* ── Navigation par slides de la landing page ── */
    const sideSteps = document.querySelectorAll('.side-step');
    const landingSections = document.querySelectorAll('.landing-step');
    let currentSlide = 0;
    let slideAnimating = false;

    /**
     * Navigue vers la slide à l'index donné avec une animation de transition.
     * En mode `prefers-reduced-motion`, la transition est instantanée.
     * Aucun effet si une animation est déjà en cours, si l'index est identique,
     * ou s'il est hors des bornes.
     * @param {number} index - Index (base 0) de la slide cible.
     */
    function goToSlide(index) {
        if (slideAnimating || index === currentSlide || index < 0 || index >= landingSections.length) return;
        slideAnimating = true;

        if (prefersReducedMotion) {
            const prev = landingSections[currentSlide];
            const next = landingSections[index];
            prev.classList.remove('active', 'slide-exit-up', 'slide-exit-down');
            next.classList.add('active');
            sideSteps.forEach((s, i) => s.classList.toggle('active', i === index));
            next.querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));
            if (next.querySelector('.stats-grid')) {
                next.querySelectorAll('.stat-value[data-count]').forEach(el => {
                    el.textContent = (parseFloat(el.dataset.count) || 0).toFixed(1);
                });
            }
            currentSlide = index;
            slideAnimating = false;
            return;
        }

        const goingDown = index > currentSlide;
        const prev = landingSections[currentSlide];
        const next = landingSections[index];

        /* Sortie de la slide courante */
        prev.classList.remove('active');
        prev.classList.add(goingDown ? 'slide-exit-up' : 'slide-exit-down');

        /* Positionnement initial de la slide entrante (sans transition) */
        next.style.transition = 'none';
        next.style.transform = goingDown ? 'translateY(40px)' : 'translateY(-40px)';
        next.style.opacity = '0';
        next.classList.add('active');

        /* Force un reflow pour que la transition CSS s'applique correctement */
        void next.offsetHeight;
        next.style.transition = '';
        next.style.transform = '';
        next.style.opacity = '';

        /* Mise à jour des indicateurs latéraux */
        sideSteps.forEach((s, i) => s.classList.toggle('active', i === index));
        next.querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));

        /* Lance les compteurs si la slide cible contient des statistiques */
        if (next.querySelector('.stats-grid')) {
            next.querySelectorAll('.stat-value[data-count]').forEach(el => {
                animateCounter(el, parseFloat(el.dataset.count));
            });
        }

        currentSlide = index;
        setTimeout(() => {
            prev.classList.remove('slide-exit-up', 'slide-exit-down');
            slideAnimating = false;
        }, 550);
    }

    if (landingSections.length) {
        /* Clic sur les points de navigation latéraux */
        sideSteps.forEach(s => {
            s.addEventListener('click', e => {
                e.preventDefault();
                goToSlide(parseInt(s.dataset.goto));
            });
        });

        /* Clic sur les boutons flèches (précédent / suivant) */
        document.querySelectorAll('.slide-arrow-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.dataset.dir === 'next') goToSlide(currentSlide + 1);
                else goToSlide(currentSlide - 1);
            });
        });

        /* Liens data-goto (ex: bouton "Comment ça marche" du hero) */
        document.querySelectorAll('[data-goto]').forEach(el => {
            if (el.classList.contains('side-step') || el.classList.contains('slide-arrow-btn')) return;
            el.addEventListener('click', e => {
                e.preventDefault();
                goToSlide(parseInt(el.dataset.goto));
            });
        });

        /* Navigation au clavier (flèches haut/bas, gauche/droite) */
        document.addEventListener('keydown', e => {
            if (!document.querySelector('.slides-viewport')) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goToSlide(currentSlide + 1); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goToSlide(currentSlide - 1); }
        });

        /**
         * Gestion de la molette souris : navigue entre les slides avec un
         * cooldown de WHEEL_COOLDOWN_MS ms pour éviter les sauts multiples.
         * L'événement est annulé (preventDefault) pour bloquer le scroll natif.
         */
        const viewport = document.getElementById('slidesViewport');
        let wheelCooldown = false;
        if (viewport) {
            viewport.addEventListener('wheel', e => {
                e.preventDefault();
                if (wheelCooldown || slideAnimating) return;
                wheelCooldown = true;
                if (e.deltaY > 0) goToSlide(currentSlide + 1);
                else goToSlide(currentSlide - 1);
                setTimeout(() => { wheelCooldown = false; }, WHEEL_COOLDOWN_MS);
            }, { passive: false });
        }

        /* Initialisation : active la première slide */
        landingSections[0].classList.add('active');
        landingSections[0].querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));
    }

    /* ── Particules décoratives ── */

    /**
     * Génère PARTICLE_COUNT éléments `.particle` dans le conteneur `#particles`.
     * Chaque particule reçoit une position, taille, délai et durée d'animation
     * aléatoires. Ignoré si `prefers-reduced-motion` est actif.
     */
    function createParticles() {
        const container = document.getElementById('particles');
        if (!container || prefersReducedMotion) return;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const dot = document.createElement('span');
            dot.className = 'particle';
            dot.style.left = Math.random() * 100 + '%';
            dot.style.top = Math.random() * 100 + '%';
            dot.style.animationDelay = Math.random() * 6 + 's';
            dot.style.animationDuration = (4 + Math.random() * 6) + 's';
            dot.style.width = dot.style.height = (2 + Math.random() * 4) + 'px';
            container.appendChild(dot);
        }
    }

    createParticles();

});
