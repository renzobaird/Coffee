/* ============================================
   BREW LOGIC — Main Script
   Scene Scaling · Navigation · Drip Animation · Glass Fill
   ============================================ */

(function () {
    'use strict';

    /* ── Audio ──────────────────────────────────────────────────
       audio/music.mp3 : background loop, starts on page load
       audio/sfx.wav   : SFX clip (~25 s); plays immediately on
                         drink selection. Drip fires 18 s in and
                         lasts 7 s (matching the end of the clip).
    ── ─────────────────────────────────────────────────────── */
    var _audio = {
        music: new Audio('audio/music.mp3'),
        sfx:   new Audio('audio/sfx.wav')
    };
    _audio.music.loop   = true;
    _audio.music.volume = 0;     // silent until fade-in completes
    _audio.sfx.volume   = 0.85;

    /* holds the 18-second countdown before the drip starts */
    var _sfxDelayTimer = null;

    /* ── Music fade-in helper (used once on load) ── */
    function _musicFadeIn(targetVol, durationMs) {
        _audio.music.volume = 0;
        var STEPS    = 80;
        var stepTime = durationMs / STEPS;
        var stepVol  = targetVol / STEPS;
        var i = 0;
        var iv = setInterval(function () {
            i++;
            _audio.music.volume = Math.min(targetVol, parseFloat((stepVol * i).toFixed(4)));
            if (i >= STEPS) clearInterval(iv);
        }, stepTime);
    }

    /* ── Stop SFX immediately ── */
    function _stopSFX() {
        try { _audio.sfx.pause(); _audio.sfx.currentTime = 0; } catch(e) {}
    }

    /* ── State ── */
    let currentPanel = 'home';
    let isTransitioning = false;
    let animTimers = [];

    /* ── Drink data ── */
    const drinkData = {
        latte: {
            salesPercent: 21.3,
            avgAge: 28,
            ageDist: [
                { bin: '18–24', count: 52 },
                { bin: '25–34', count: 84 },
                { bin: '35–44', count: 38 },
                { bin: '45–54', count: 19 },
                { bin: '55+',   count:  8 }
            ],
            timeDist: { Morning: 45, Afternoon: 72, Evening: 25 },
            favCount: 142
        },
        cappuccino: {
            salesPercent: 18.7,
            avgAge: 31,
            ageDist: [
                { bin: '18–24', count: 22 },
                { bin: '25–34', count: 68 },
                { bin: '35–44', count: 58 },
                { bin: '45–54', count: 28 },
                { bin: '55+',   count: 12 }
            ],
            timeDist: { Morning: 58, Afternoon: 48, Evening: 22 },
            favCount: 98
        },
        americano: {
            salesPercent: 22.1,
            avgAge: 34,
            ageDist: [
                { bin: '18–24', count: 18 },
                { bin: '25–34', count: 55 },
                { bin: '35–44', count: 74 },
                { bin: '45–54', count: 42 },
                { bin: '55+',   count: 22 }
            ],
            timeDist: { Morning: 88, Afternoon: 42, Evening: 26 },
            favCount: 156
        },
        cortado: {
            salesPercent: 15.4,
            avgAge: 30,
            ageDist: [
                { bin: '18–24', count: 28 },
                { bin: '25–34', count: 76 },
                { bin: '35–44', count: 44 },
                { bin: '45–54', count: 18 },
                { bin: '55+',   count:  6 }
            ],
            timeDist: { Morning: 28, Afternoon: 52, Evening: 19 },
            favCount: 67
        },
        espresso: {
            salesPercent: 10.2,
            avgAge: 36,
            ageDist: [
                { bin: '18–24', count: 12 },
                { bin: '25–34', count: 44 },
                { bin: '35–44', count: 68 },
                { bin: '45–54', count: 52 },
                { bin: '55+',   count: 24 }
            ],
            timeDist: { Morning: 41, Afternoon: 48, Evening: 22 },
            favCount: 53
        }
    };

    /* ── Glass body height in CSS px (must match .glass-body height) ── */
    const GLASS_BODY_HEIGHT = 200;

    /* ============================================
       INIT
       ============================================ */
    document.addEventListener('DOMContentLoaded', () => {
        scaleScene();
        window.addEventListener('resize', scaleScene);
        initNavigation();
        initDrinkCards();
        initScreenHint();
        populateAllDrinks();
        initExpandedCards();

        /* ── Background music: start on page load, fade in over 4 s ──
           Browsers require a user gesture for autoplay.
           We try immediately and fall back to the first interaction. */
        var _musicStarted = false;
        function _startMusic() {
            if (_musicStarted) return;
            _musicStarted = true;
            _audio.music.play().then(function () {
                _musicFadeIn(0.18, 4000);
            }).catch(function () { /* still blocked — give up quietly */ });
        }
        /* Attempt instant autoplay */
        _startMusic();
        /* Fallback: first click/touch on the page */
        document.addEventListener('click',      _startMusic, { once: true });
        document.addEventListener('touchstart', _startMusic, { once: true });
    });

    /* ============================================
       0. SCENE SCALING
       Uniformly scales the 1920×1080 scene to
       FIT (contain) inside the browser viewport.
       White letterbox fills any remaining space.
       ============================================ */
    function scaleScene() {
        const scene = document.getElementById('scene');
        if (!scene) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const scaleX = vw / 1920;
        const scaleY = vh / 1080;
        const scale = Math.min(scaleX, scaleY);           // contain — nothing cropped

        const scaledW = 1920 * scale;
        const scaledH = 1080 * scale;
        const offsetX = (vw - scaledW) / 2;
        const offsetY = (vh - scaledH) / 2;

        scene.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';
    }

    /* ============================================
       1. NAVIGATION — screen buttons
       ============================================ */
    function initNavigation() {
        document.querySelectorAll('.screen-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var target = btn.getAttribute('data-target');
                if (target && target !== currentPanel && !isTransitioning) {
                    navigateTo(target);
                }
            });
        });
    }

    /* ── Drink cards on home panel ── */
    function initDrinkCards() {
        document.querySelectorAll('.drink-card').forEach(function (card) {
            card.addEventListener('click', function () {
                var drink = card.getAttribute('data-drink');
                if (drink && drink !== currentPanel && !isTransitioning) {
                    navigateTo(drink);
                }
            });
        });
    }

    /* ── Navigate between panels ── */
    function navigateTo(target) {
        if (isTransitioning || target === currentPanel) return;
        isTransitioning = true;

        var oldPanel = document.getElementById('panel-' + currentPanel);
        var newPanel = document.getElementById('panel-' + target);
        if (!oldPanel || !newPanel) { isTransitioning = false; return; }

        /* Stop running pour animation */
        cancelAnimTimers();
        resetGlass();
        hideSalesKPI();

        /* Animate old panel out */
        oldPanel.classList.add('leaving');
        oldPanel.classList.remove('active');

        /* After out-transition, animate new panel in */
        setTimeout(function () {
            oldPanel.classList.remove('leaving');
            newPanel.classList.add('active');
            updateNavHighlight(target);
            currentPanel = target;

            if (target !== 'home') {
                renderDrinkCharts(target);
                showSalesKPI(target);

                /* ── SFX plays immediately at full volume over the music ── */
                _stopSFX();
                _audio.sfx.currentTime = 0;
                _audio.sfx.volume = 0.85;
                try { _audio.sfx.play().catch(function(){}); } catch(e) {}

                /* ── 18 s after click → start the 7-second drip animation ── */
                _sfxDelayTimer = setTimeout(function () {
                    _sfxDelayTimer = null;
                    startPourAnimation(target);
                }, 18000);

            } else {
                hideSalesKPI();
                /* returning home: stop SFX, music keeps going */
                _stopSFX();
            }

            setTimeout(function () { isTransitioning = false; }, 500);
        }, 450);
    }

    /* ============================================
       SALES SHARE KPI — right of the glass
       ============================================ */
    function showSalesKPI(drink) {
        var kpi = document.getElementById('sales-kpi');
        var val = document.getElementById('sales-kpi-value');
        if (!kpi || !val) return;
        var data = drinkData[drink];
        if (data) {
            val.textContent = data.salesPercent.toFixed(1) + '%';
        }
        kpi.classList.add('visible');
    }

    function hideSalesKPI() {
        var kpi = document.getElementById('sales-kpi');
        if (kpi) kpi.classList.remove('visible');
    }

    /* ============================================
       3. THREE DATA VISUALISATIONS
       Histogram · Column Chart · Horizontal Bar
       ============================================ */
    function renderDrinkCharts(drink) {
        var data = drinkData[drink];
        if (!data) return;
        renderAgeHistogram(drink, data);
        renderTimeColumnChart(drink, data);
        renderFavHBarChart(drink, data);
    }

    function ageBinIndex(avg) {
        if (avg < 25) return 0;
        if (avg < 35) return 1;
        if (avg < 45) return 2;
        if (avg < 55) return 3;
        return 4;
    }

    /* KPI + histogram of age distribution */
    function renderAgeHistogram(drink, data) {
        var el = document.getElementById(drink + '-chart-age');
        if (!el) return;
        var max     = Math.max.apply(null, data.ageDist.map(function (d) { return d.count; }));
        var peakIdx = ageBinIndex(data.avgAge);

        var html = '<div class="stat-label">Avg. Age of Buyer</div>';
        html += '<div class="kpi-num">' + data.avgAge + '<span class="kpi-unit">yrs</span></div>';
        html += '<div class="hist-chart">';
        data.ageDist.forEach(function (d, i) {
            var pct = (d.count / max * 100).toFixed(1);
            var cls = i === peakIdx ? ' hist-peak' : '';
            html += '<div class="hist-col' + cls + '">';
            html += '<div class="hist-bar" style="height:0" data-h="' + pct + '%"></div>';
            html += '<span class="hist-lbl">' + d.bin + '</span>';
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;

        setTimeout(function () {
            el.querySelectorAll('.hist-bar').forEach(function (bar) {
                bar.style.height = bar.getAttribute('data-h');
            });
        }, 100);
    }

    /* Vertical column chart of purchase counts by time of day */
    function renderTimeColumnChart(drink, data) {
        var el = document.getElementById(drink + '-chart-time');
        if (!el) return;
        var periods = ['Morning', 'Afternoon', 'Evening'];
        var labels  = ['AM', 'PM', 'EVE'];
        var vals    = periods.map(function (p) { return data.timeDist[p] || 0; });
        var max     = Math.max.apply(null, vals);
        var peakP   = periods[vals.indexOf(max)];

        var html = '<div class="stat-label">Purchases by Time</div>';
        html += '<div class="col-chart">';
        periods.forEach(function (p, i) {
            var pct = (vals[i] / max * 100).toFixed(1);
            var cls = p === peakP ? ' col-peak' : '';
            html += '<div class="col-group' + cls + '">';
            html += '<span class="col-val">' + vals[i] + '</span>';
            html += '<div class="col-bar-wrap"><div class="col-bar" style="height:0" data-h="' + pct + '%"></div></div>';
            html += '<span class="col-lbl">' + labels[i] + '</span>';
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;

        setTimeout(function () {
            el.querySelectorAll('.col-bar').forEach(function (bar) {
                bar.style.height = bar.getAttribute('data-h');
            });
        }, 100);
    }

    /* Horizontal ranked bar chart of survey favorites */
    function renderFavHBarChart(drink, data) {
        var el = document.getElementById(drink + '-chart-fav');
        if (!el) return;
        var maxFav = Math.max.apply(null, Object.keys(drinkData).map(function (k) { return drinkData[k].favCount; }));
        var sorted = Object.keys(drinkData).slice().sort(function (a, b) {
            return drinkData[b].favCount - drinkData[a].favCount;
        });

        var html = '<div class="stat-label">Reported as Favorite</div>';
        html += '<div class="fav-chart">';
        sorted.forEach(function (d) {
            var count = drinkData[d].favCount;
            var pct   = (count / maxFav * 100).toFixed(1);
            var label = d.charAt(0).toUpperCase() + d.slice(1);
            var cls   = d === drink ? ' fav-active' : '';
            html += '<div class="fav-row' + cls + '">';
            html += '<span class="fav-row-label">' + label + '</span>';
            html += '<div class="fav-track"><div class="fav-fill" style="width:0" data-w="' + pct + '%"></div></div>';
            html += '<span class="fav-val">' + count + '</span>';
            html += '</div>';
        });
        html += '</div>';
        el.innerHTML = html;

        setTimeout(function () {
            el.querySelectorAll('.fav-fill').forEach(function (fill) {
                fill.style.width = fill.getAttribute('data-w');
            });
        }, 100);
    }

    /* ============================================
       4. RANKED SALES SHARE BAR CHART
       Renders animated horizontal bars for all drinks
       with the active drink highlighted in copper.
       ============================================ */
    function renderSalesChart(activeDrink) {
        var container = document.getElementById(activeDrink + '-sales-vis');
        if (!container) return;

        var allPcts = Object.keys(drinkData).map(function (k) { return drinkData[k].salesPercent; });
        var maxPct  = Math.max.apply(null, allPcts);

        /* Sort all drinks highest → lowest for ranking view */
        var sorted = Object.keys(drinkData).slice().sort(function (a, b) {
            return drinkData[b].salesPercent - drinkData[a].salesPercent;
        });

        var html = '<div class="vis-header">Sales Share vs. All Drinks</div>';
        sorted.forEach(function (drink) {
            var pct   = drinkData[drink].salesPercent;
            var barW  = ((pct / maxPct) * 100).toFixed(2);
            var label = drink.charAt(0).toUpperCase() + drink.slice(1);
            var cls   = drink === activeDrink ? ' vis-active' : '';
            html += '<div class="vis-row' + cls + '" data-bar-w="' + barW + '">';
            html += '<span class="vis-name">' + label + '</span>';
            html += '<div class="vis-bar-track"><div class="vis-bar" style="width:0"></div></div>';
            html += '<span class="vis-val">' + pct.toFixed(1) + '%</span>';
            html += '</div>';
        });
        container.innerHTML = html;

        /* Animate bars in after paint */
        setTimeout(function () {
            container.querySelectorAll('.vis-row').forEach(function (row) {
                var bar = row.querySelector('.vis-bar');
                if (bar) bar.style.width = row.getAttribute('data-bar-w') + '%';
            });
        }, 80);
    }

    /* ============================================
       EXPANDED CARD OVERLAY
       Click a stat card → enlarged popup
       Mouseleave → dismisses it
       ============================================ */
    var _expandHideTimer = null;
    var _expandedCard = null;

    function initExpandedCards() {
        var scene = document.getElementById('scene');
        if (!scene) return;

        /* Open on hover — only re-render if it's a different card */
        scene.addEventListener('mouseover', function (e) {
            var card = e.target.closest('.stat-card');
            if (card) {
                clearTimeout(_expandHideTimer);
                if (card !== _expandedCard) {
                    _expandedCard = card;
                    showExpandedCard(card);
                }
            }
        });

        /* Start hide timer when leaving a card */
        scene.addEventListener('mouseout', function (e) {
            var card = e.target.closest('.stat-card');
            if (card) {
                /* Only start timer if we're not moving into the overlay */
                var related = e.relatedTarget;
                var overlay = document.getElementById('expanded-card-overlay');
                if (overlay && related && (overlay === related || overlay.contains(related))) return;
                _expandHideTimer = setTimeout(hideExpandedCard, 120);
            }
        });

        /* Cancel hide when entering overlay; hide when leaving it */
        var overlay = document.getElementById('expanded-card-overlay');
        if (overlay) {
            overlay.addEventListener('mouseenter', function () {
                clearTimeout(_expandHideTimer);
            });
            overlay.addEventListener('mouseleave', hideExpandedCard);
        }
    }

    function showExpandedCard(cardEl) {
        var overlay = document.getElementById('expanded-card-overlay');
        if (!overlay) return;

        /* Copy the card's inner HTML into the larger overlay */
        overlay.innerHTML = '<div class="expanded-close-hint">Move cursor away to close</div>' + cardEl.innerHTML;

        /* Reset all animated elements to 0 so they can re-animate */
        overlay.querySelectorAll('.hist-bar').forEach(function (bar) {
            bar.style.transition = 'none';
            bar.style.height = '0';
        });
        overlay.querySelectorAll('.col-bar').forEach(function (bar) {
            bar.style.transition = 'none';
            bar.style.height = '0';
        });
        overlay.querySelectorAll('.fav-fill').forEach(function (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0';
        });

        /* Make visible */
        overlay.style.display = 'block';
        void overlay.offsetWidth;              /* force reflow */
        overlay.classList.add('visible');

        /* Re-trigger bar grow animations */
        setTimeout(function () {
            overlay.querySelectorAll('.hist-bar').forEach(function (bar) {
                bar.style.transition = 'height 0.75s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                bar.style.height = bar.getAttribute('data-h');
            });
            overlay.querySelectorAll('.col-bar').forEach(function (bar) {
                bar.style.transition = 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                bar.style.height = bar.getAttribute('data-h');
            });
            overlay.querySelectorAll('.fav-fill').forEach(function (fill) {
                fill.style.transition = 'width 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                fill.style.width = fill.getAttribute('data-w');
            });
        }, 40);
    }

    function hideExpandedCard() {
        var overlay = document.getElementById('expanded-card-overlay');
        if (!overlay) return;
        _expandedCard = null;
        overlay.classList.remove('visible');
        setTimeout(function () {
            if (!overlay.classList.contains('visible')) {
                overlay.style.display = 'none';
            }
        }, 250);
    }

    /* ── Screen hint — dismiss on first interaction ── */
    function initScreenHint() {
        var hint = document.getElementById('screen-hint');
        if (!hint) return;

        hint.addEventListener('click', function (e) {
            e.stopPropagation();
            hint.classList.add('hidden');
        }, { once: true });
    }

    /* ── Highlight active screen button ── */
    function updateNavHighlight(active) {
        document.querySelectorAll('.screen-btn').forEach(function (btn) {
            var t = btn.getAttribute('data-target');
            if (t === active) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    /* ============================================
       2. SCREEN LABELS
       ============================================ */
    function updateScreenLabels(drink) {
        var data = drinkData[drink];
        var nameEl = document.getElementById('screen-drink-label');
        var pctEl  = document.getElementById('screen-pct-label');
        if (nameEl) {
            nameEl.textContent = drink.charAt(0).toUpperCase() + drink.slice(1);
            nameEl.style.opacity = '1';
        }
        if (pctEl && data) {
            pctEl.textContent = data.salesPercent.toFixed(1) + '% of sales';
            pctEl.style.opacity = '1';
        }
    }

    function clearScreenLabels() {
        var nameEl = document.getElementById('screen-drink-label');
        var pctEl  = document.getElementById('screen-pct-label');
        if (nameEl) nameEl.style.opacity = '0';
        if (pctEl)  pctEl.style.opacity  = '0';
    }

    /* ============================================
       3. GLASS SHOW / HIDE / RESET
       ============================================ */
    function showGlass() {
        var glass = document.getElementById('glass-group');
        if (glass) glass.style.opacity = '1';
    }

    function hideGlass() {
        var glass = document.getElementById('glass-group');
        if (glass) glass.style.opacity = '0';
    }

    function resetGlass() {
        var liquidFill    = document.getElementById('liquid-fill');
        var liquidSurface = document.getElementById('liquid-surface');
        var streamL       = document.getElementById('stream-left');
        var streamR       = document.getElementById('stream-right');

        if (liquidFill)    { liquidFill.style.transition = 'none';    liquidFill.style.height = '0'; }
        if (liquidSurface) { liquidSurface.style.transition = 'none'; liquidSurface.style.opacity = '0'; }
        if (streamL)       { streamL.style.transition = 'none'; streamL.style.height = '0'; streamL.style.opacity = '0'; }
        if (streamR)       { streamR.style.transition = 'none'; streamR.style.height = '0'; streamR.style.opacity = '0'; }

        stopDripDrops();

        /* cancel the 18-second pre-drip countdown if still pending */
        if (_sfxDelayTimer) { clearTimeout(_sfxDelayTimer); _sfxDelayTimer = null; }

        /* stop SFX immediately (music keeps playing unaffected) */
        _stopSFX();

        var dripGroup = document.getElementById('drip-group');
        if (dripGroup) dripGroup.style.opacity = '0';
    }

    /* ============================================
       4. POUR ANIMATION — Drip + Glass Fill
       ============================================ */
    function cancelAnimTimers() {
        animTimers.forEach(function (t) { clearTimeout(t); });
        animTimers = [];
    }

    function startPourAnimation(drink) {
        var data = drinkData[drink];
        if (!data) return;

        var fillPercent = data.salesPercent;
        var fillHeight  = (fillPercent / 100) * GLASS_BODY_HEIGHT;

        var dripGroup    = document.getElementById('drip-group');
        var streamL      = document.getElementById('stream-left');
        var streamR      = document.getElementById('stream-right');
        var liquidFill   = document.getElementById('liquid-fill');
        var liquidSurface = document.getElementById('liquid-surface');

        /* Phase 0: Show drip group */
        if (dripGroup) dripGroup.style.opacity = '1';

        /* Phase 1 (100ms): Start thin streams */
        animTimers.push(setTimeout(function () {
            if (streamL) {
                streamL.style.transition = 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease';
                streamL.style.opacity = '0.9';
                /* extended to reach cup rim (154px gap between drip-top and cup-top) */
                streamL.style.height  = '154px';
            }
            if (streamR) {
                streamR.style.transition = 'height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease';
                streamR.style.opacity = '0.85';
                streamR.style.height  = '154px';
            }
        }, 100));

        /* Phase 2 (300ms): Start drip drops */
        animTimers.push(setTimeout(function () {
            startDripDrops();
        }, 300));

        /* Phase 3 (700ms): Begin filling the glass — total drip = 7 s
           700 (phase3 start) + fillDuration + 200 (phase4 buffer) = 7000
           → fillDuration = 6100 ms */
        var fillDuration = 6100;
        animTimers.push(setTimeout(function () {
            if (liquidFill) {
                liquidFill.style.transition = 'height ' + fillDuration + 'ms cubic-bezier(0.22, 0.61, 0.36, 1)';
                liquidFill.style.height = fillHeight + 'px';
            }
        }, 700));

        /* Phase 4 (fill done): Stop drips, show crema + percentage */
        animTimers.push(setTimeout(function () {
            /* Stop streams */
            if (streamL) {
                streamL.style.transition = 'height 0.4s ease-in, opacity 0.4s ease';
                streamL.style.height  = '0';
                streamL.style.opacity = '0';
            }
            if (streamR) {
                streamR.style.transition = 'height 0.4s ease-in, opacity 0.4s ease';
                streamR.style.height  = '0';
                streamR.style.opacity = '0';
            }

            stopDripDrops();

            /* SFX clip naturally ends with the drip; stop it in case it's still going */
            _stopSFX();

            /* Show crema */
            if (liquidSurface) {
                liquidSurface.style.transition = 'opacity 0.5s ease';
                liquidSurface.style.opacity = '0.9';
            }
        }, 700 + fillDuration + 200));
    }

    /* ── Drip drops (CSS animation toggle) ── */
    function startDripDrops() {
        document.querySelectorAll('.drip-drop').forEach(function (d) {
            d.classList.add('dripping');
        });
    }

    function stopDripDrops() {
        document.querySelectorAll('.drip-drop').forEach(function (d) {
            d.classList.remove('dripping');
            d.style.animation = 'none';
            d.style.opacity = '0';
            /* Force reflow so animation can restart later */
            void d.offsetWidth;
            d.style.animation = '';
        });
    }

    /* ============================================
       5. POPULATE DATA INTO PANELS
       ============================================ */
    function populateAllDrinks() {
        Object.keys(drinkData).forEach(function (drink) {
            populateDrinkPanel(drink, drinkData[drink]);
        });
    }

    function populateDrinkPanel(drink, data) { /* chart rendering now handled by renderDrinkCharts() */ }

    /* ============================================
       6. PUBLIC API
       ============================================ */
    window.BrewLogic = {
        navigateTo: navigateTo,
        drinkData: drinkData,
        populateDrinkPanel: populateDrinkPanel,
        populateAllDrinks: populateAllDrinks,
        scaleScene: scaleScene
    };

})();