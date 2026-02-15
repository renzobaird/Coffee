/* ============================================
   BREW LOGIC — Main Script
   Navigation · Drip Animation · Glass Fill
   ============================================ */

(function () {
    'use strict';

    /* ── State ── */
    let currentPanel = 'home';
    let isTransitioning = false;
    let animTimers = [];

    /* ── Placeholder drink data (plug in real data next prompt) ── */
    const drinkData = {
        latte:      { salesPercent: 21.3, age: '28', time: 'Afternoon', timePeriod: 'Afternoon', fav: '142' },
        cappuccino: { salesPercent: 18.7, age: '31', time: 'Afternoon', timePeriod: 'Afternoon', fav: '98' },
        americano:  { salesPercent: 22.1, age: '34', time: 'Morning',   timePeriod: 'Morning',   fav: '156' },
        cortado:    { salesPercent: 15.4, age: '30', time: 'Afternoon', timePeriod: 'Afternoon', fav: '67' },
        espresso:   { salesPercent: 10.2, age: '36', time: 'Afternoon', timePeriod: 'Afternoon', fav: '53' }
    };

    /* ============================================
       INIT
       ============================================ */
    document.addEventListener('DOMContentLoaded', () => {
        initNavigation();
        initDrinkCards();
        populateAllDrinks();
    });

    /* ============================================
       1. NAVIGATION
       ============================================ */
    function initNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const target = btn.getAttribute('data-target');
                if (target && target !== currentPanel && !isTransitioning) {
                    navigateTo(target);
                }
            });
        });
    }

    function initDrinkCards() {
        document.querySelectorAll('.drink-card').forEach(card => {
            card.addEventListener('click', () => {
                const drink = card.getAttribute('data-drink');
                if (drink && drink !== currentPanel && !isTransitioning) {
                    navigateTo(drink);
                }
            });
        });
    }

    function navigateTo(target) {
        if (isTransitioning || target === currentPanel) return;
        isTransitioning = true;

        const oldPanel = document.getElementById('panel-' + currentPanel);
        const newPanel = document.getElementById('panel-' + target);
        if (!oldPanel || !newPanel) { isTransitioning = false; return; }

        /* Stop any running pour animation */
        cancelAnimTimers();
        resetGlass();

        /* Animate out */
        oldPanel.classList.add('leaving');
        oldPanel.classList.remove('active');

        /* After out-transition, animate in */
        setTimeout(() => {
            oldPanel.classList.remove('leaving');
            newPanel.classList.add('active');
            updateNavHighlight(target);
            currentPanel = target;

            /* Start pour if drink section */
            if (target !== 'home') {
                showGlass();
                startPourAnimation(target);
                updateScreenLabels(target);
            } else {
                hideGlass();
                clearScreenLabels();
            }

            setTimeout(() => { isTransitioning = false; }, 500);
        }, 450);
    }

    function updateNavHighlight(active) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const bg = btn.querySelector('.nav-btn-bg');
            const txt = btn.querySelector('.nav-btn-text');
            const t = btn.getAttribute('data-target');
            if (t === active) {
                bg.classList.add('active-nav');
                if (txt) { txt.setAttribute('fill', '#1a1a2e'); txt.setAttribute('font-weight', '600'); }
            } else {
                bg.classList.remove('active-nav');
                if (txt) { txt.setAttribute('fill', '#c8a97e'); txt.setAttribute('font-weight', '500'); }
            }
        });
    }

    /* ============================================
       2. SCREEN LABELS
       ============================================ */
    function updateScreenLabels(drink) {
        const data = drinkData[drink];
        const nameEl = document.getElementById('screen-drink-label');
        const pctEl = document.getElementById('screen-pct-label');
        if (nameEl) {
            nameEl.textContent = drink.charAt(0).toUpperCase() + drink.slice(1);
            nameEl.setAttribute('opacity', '1');
        }
        if (pctEl && data) {
            pctEl.textContent = data.salesPercent.toFixed(1) + '% of sales';
            pctEl.setAttribute('opacity', '1');
        }
    }

    function clearScreenLabels() {
        const nameEl = document.getElementById('screen-drink-label');
        const pctEl = document.getElementById('screen-pct-label');
        if (nameEl) nameEl.setAttribute('opacity', '0');
        if (pctEl) pctEl.setAttribute('opacity', '0');
    }

    /* ============================================
       3. GLASS SHOW / HIDE
       ============================================ */
    function showGlass() {
        const glass = document.getElementById('glass-group');
        if (glass) {
            glass.style.transition = 'opacity 0.4s ease';
            glass.setAttribute('opacity', '1');
        }
    }

    function hideGlass() {
        const glass = document.getElementById('glass-group');
        if (glass) {
            glass.style.transition = 'opacity 0.3s ease';
            glass.setAttribute('opacity', '0');
        }
    }

    function resetGlass() {
        const liquidFill = document.getElementById('liquid-fill');
        const liquidSurface = document.getElementById('liquid-surface');
        const glassPct = document.getElementById('glass-pct-text');
        const streamL = document.getElementById('stream-left');
        const streamR = document.getElementById('stream-right');
        const dripGroup = document.getElementById('drip-group');

        if (liquidFill) { liquidFill.setAttribute('y', '588'); liquidFill.setAttribute('height', '0'); liquidFill.style.transition = 'none'; }
        if (liquidSurface) { liquidSurface.setAttribute('y', '588'); liquidSurface.setAttribute('opacity', '0'); liquidSurface.style.transition = 'none'; }
        if (glassPct) { glassPct.setAttribute('opacity', '0'); }
        if (streamL) { streamL.setAttribute('height', '0'); streamL.setAttribute('opacity', '0'); streamL.style.transition = 'none'; }
        if (streamR) { streamR.setAttribute('height', '0'); streamR.setAttribute('opacity', '0'); streamR.style.transition = 'none'; }
        if (dripGroup) { dripGroup.setAttribute('opacity', '0'); }

        // Reset drip drops
        document.querySelectorAll('.drip-drop').forEach(d => {
            d.style.animation = 'none';
            d.setAttribute('opacity', '0');
        });
    }

    /* ============================================
       4. POUR ANIMATION (Drip + Glass Fill)
       ============================================ */
    function cancelAnimTimers() {
        animTimers.forEach(t => clearTimeout(t));
        animTimers = [];
    }

    function startPourAnimation(drink) {
        const data = drinkData[drink];
        if (!data) return;

        const fillPercent = data.salesPercent;
        /* Glass interior: y ranges from ~534 (top) to ~588 (bottom) = 54px total */
        const glassInnerHeight = 54;
        const fillHeight = (fillPercent / 100) * glassInnerHeight;
        const fillY = 588 - fillHeight;

        const dripGroup = document.getElementById('drip-group');
        const streamL = document.getElementById('stream-left');
        const streamR = document.getElementById('stream-right');
        const liquidFill = document.getElementById('liquid-fill');
        const liquidSurface = document.getElementById('liquid-surface');
        const glassPct = document.getElementById('glass-pct-text');
        const dripsL1 = document.querySelector('.drip-l1');
        const dripsL2 = document.querySelector('.drip-l2');
        const dripsR1 = document.querySelector('.drip-r1');
        const dripsR2 = document.querySelector('.drip-r2');

        /* Phase 0: Show drip group */
        if (dripGroup) dripGroup.setAttribute('opacity', '1');

        /* Phase 1 (0ms): Start thin streams growing down from spouts */
        animTimers.push(setTimeout(() => {
            if (streamL) {
                streamL.style.transition = 'height 0.5s ease-out, opacity 0.3s ease';
                streamL.setAttribute('opacity', '0.85');
                streamL.setAttribute('height', '14');
            }
            if (streamR) {
                streamR.style.transition = 'height 0.5s ease-out, opacity 0.3s ease';
                streamR.setAttribute('opacity', '0.85');
                streamR.setAttribute('height', '14');
            }
        }, 100));

        /* Phase 2 (300ms): Start drip drops falling */
        animTimers.push(setTimeout(() => {
            startDripDrops(dripsL1, dripsL2, dripsR1, dripsR2);
        }, 300));

        /* Phase 3 (700ms): Begin filling the glass */
        const fillDuration = 2200;
        animTimers.push(setTimeout(() => {
            if (liquidFill) {
                liquidFill.style.transition = `y ${fillDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1), height ${fillDuration}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
                liquidFill.setAttribute('y', String(fillY));
                liquidFill.setAttribute('height', String(fillHeight));
            }
        }, 700));

        /* Phase 4 (fill done): Show crema / surface, stop drips */
        animTimers.push(setTimeout(() => {
            /* Stop streams */
            if (streamL) {
                streamL.style.transition = 'height 0.4s ease-in, opacity 0.4s ease';
                streamL.setAttribute('height', '0');
                streamL.setAttribute('opacity', '0');
            }
            if (streamR) {
                streamR.style.transition = 'height 0.4s ease-in, opacity 0.4s ease';
                streamR.setAttribute('height', '0');
                streamR.setAttribute('opacity', '0');
            }

            /* Stop drip drops */
            stopDripDrops(dripsL1, dripsL2, dripsR1, dripsR2);

            /* Show crema surface */
            if (liquidSurface) {
                liquidSurface.style.transition = 'y 0.3s ease, opacity 0.5s ease';
                liquidSurface.setAttribute('y', String(fillY - 1));
                liquidSurface.setAttribute('opacity', '0.9');
            }

            /* Show percentage text */
            if (glassPct) {
                glassPct.textContent = fillPercent.toFixed(1) + '%';
                glassPct.style.transition = 'opacity 0.5s ease';
                glassPct.setAttribute('opacity', '1');
            }
        }, 700 + fillDuration + 200));
    }

    /* ── Drip drop animation (CSS keyframes via JS) ── */
    function startDripDrops(l1, l2, r1, r2) {
        const animateDropLeft = `dripFallLeft 0.7s ease-in infinite`;
        const animateDropRight = `dripFallRight 0.7s ease-in infinite`;
        const animateDropLeftSlow = `dripFallLeft 0.9s ease-in infinite 0.3s`;
        const animateDropRightSlow = `dripFallRight 0.9s ease-in infinite 0.35s`;

        if (l1) { l1.style.animation = animateDropLeft; }
        if (l2) { l2.style.animation = animateDropLeftSlow; }
        if (r1) { r1.style.animation = animateDropRight; }
        if (r2) { r2.style.animation = animateDropRightSlow; }
    }

    function stopDripDrops(l1, l2, r1, r2) {
        [l1, l2, r1, r2].forEach(d => {
            if (d) {
                d.style.animation = 'none';
                d.setAttribute('opacity', '0');
            }
        });
    }

    /* ============================================
       5. POPULATE DATA INTO PANELS
       ============================================ */
    function populateAllDrinks() {
        Object.keys(drinkData).forEach(drink => {
            populateDrinkPanel(drink, drinkData[drink]);
        });
    }

    function populateDrinkPanel(drink, data) {
        /* Age */
        const ageEl = document.getElementById(drink + '-age');
        if (ageEl) ageEl.textContent = data.age;

        const ageBar = document.getElementById(drink + '-age-bar');
        if (ageBar) {
            const ageNum = parseFloat(data.age);
            if (!isNaN(ageNum)) {
                const pct = ((ageNum - 18) / (65 - 18)) * 100;
                setTimeout(() => { ageBar.style.width = Math.min(100, Math.max(0, pct)) + '%'; }, 600);
            }
        }

        /* Time */
        const timeEl = document.getElementById(drink + '-time');
        if (timeEl) timeEl.textContent = data.time;

        const timeChart = document.getElementById(drink + '-time-chart');
        if (timeChart) {
            timeChart.querySelectorAll('.time-block').forEach(b => {
                b.classList.remove('peak');
                if (b.getAttribute('data-period') === data.timePeriod) {
                    b.classList.add('peak');
                }
            });
        }

        /* Favorite */
        const favEl = document.getElementById(drink + '-fav');
        if (favEl) favEl.textContent = data.fav;

        const dotsContainer = document.getElementById(drink + '-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            const favNum = parseInt(data.fav, 10);
            if (!isNaN(favNum)) {
                const maxDots = 20;
                const filled = Math.min(maxDots, Math.max(1, Math.round((favNum / 200) * maxDots)));
                for (let i = 0; i < maxDots; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'fav-dot' + (i < filled ? '' : ' empty');
                    dot.style.animationDelay = (i * 0.04) + 's';
                    dotsContainer.appendChild(dot);
                }
            }
        }

        /* Sales percent */
        const salesEl = document.getElementById(drink + '-sales-pct');
        if (salesEl) salesEl.textContent = data.salesPercent.toFixed(1) + '%';
    }

    /* ============================================
       6. INJECT DRIP KEYFRAMES
       ============================================ */
    function injectKeyframes() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes dripFallLeft {
                0%   { cy: 520; opacity: 0; ry: 2; }
                8%   { opacity: 0.9; ry: 2.8; }
                80%  { opacity: 0.7; ry: 3.5; }
                100% { cy: 536; opacity: 0; ry: 1.5; }
            }
            @keyframes dripFallRight {
                0%   { cy: 520; opacity: 0; ry: 2; }
                10%  { opacity: 0.9; ry: 2.8; }
                82%  { opacity: 0.7; ry: 3.5; }
                100% { cy: 536; opacity: 0; ry: 1.5; }
            }
        `;
        document.head.appendChild(style);
    }

    injectKeyframes();

    /* ============================================
       7. PUBLIC API
       ============================================ */
    window.BrewLogic = {
        navigateTo,
        drinkData,
        populateDrinkPanel,
        populateAllDrinks
    };

})();
