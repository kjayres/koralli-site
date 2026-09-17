(function () {

    const instances = {
        hero: null,
        descent: null,
        reef: null
    };

    function attachHero(canvas, options = {}) {
        // initialise hero animation on canvas
        if (!canvas) return null;

        const reduced = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const traceProblems = [
            { n: 'AI GOVERNANCE', r: 0.66 },
            { n: 'DATA INFRASTRUCTURE', r: 0.42 },
            { n: 'ENTERING A NEW MARKET', r: 0.5 },
            { n: 'AI IN OPERATIONS', r: 0.33 },
            { n: 'MODEL RISK & ASSURANCE', r: 0.7 }
        ];

        const glyphPts = [
            [0,1],[0.02,0.72],[0,0.45],[0.05,0.18],
            [-0.28,0.6],[-0.46,0.4],[0.3,0.58],[0.5,0.42],
            [-0.2,0.3],[-0.34,0.1],[0.22,0.27],[0.4,0.08]
        ];

        const glyphEdges = [
            [0,1],[1,2],[2,3],[1,4],[4,5],[1,6],
            [6,7],[2,8],[8,9],[2,10],[10,11]
        ];

        // creates the field of points for the hero animation
        function seedHero(s) {
            if (!s.w) return;

            s.grid = [];

            const step = Math.max(
                70,
                150 - (options.density ?? 80) * 0.7
            );

            for (let gy = step * 0.7; gy < s.h - 40; gy += step) {
                for (let gx = 40; gx < s.w - 40; gx += step) {
                    if (Math.random() < 0.22) continue;

                    s.grid.push({
                        x: gx + (Math.random() - 0.5) * step * 0.5,
                        y: gy + (Math.random() - 0.5) * step * 0.5,
                        ph: Math.random() * 6.28
                    });
                }
            }

            s.trace = null;
            s.cool = 30;
            s.pIdx = 0;
        }

        //creates a new network shape to be drawn in the hero animation
        function newTrace(s) {
            if (s.grid.length < 20) return;

            const sc = Math.min(s.w, s.h) *
                (0.26 + Math.random() * 0.1);

            const rot = (Math.random() - 0.5) * 1.1;

            const cx = s.w * (0.44 + Math.random() * 0.36);
            const cy = s.h * (0.3 + Math.random() * 0.24);

            const cos = Math.cos(rot);
            const sin = Math.sin(rot);

            const used = new Set();

            const nodes = glyphPts.map(p => {
                const gx = p[0] * sc;
                const gy = (p[1] - 0.55) * sc;

                const tx = cx + gx * cos - gy * sin;
                const ty = cy + gx * sin + gy * cos;

                let best = -1;
                let bd = Infinity;

                s.grid.forEach((g, i) => {
                    if (used.has(i)) return;

                    const d =
                        (g.x - tx) * (g.x - tx) +
                        (g.y - ty) * (g.y - ty);

                    if (d < bd) {
                        bd = d;
                        best = i;
                    }
                });

                used.add(best);
                return best;
            });

            const firstEdge = glyphPts.map(() => 99);

            glyphEdges.forEach((e, k) => {
                firstEdge[e[0]] = Math.min(firstEdge[e[0]], k);
                firstEdge[e[1]] = Math.min(firstEdge[e[1]], k);
            });

            const pr =
                traceProblems[
                    (s.pIdx = (s.pIdx || 0) + 1) %
                    traceProblems.length
                ];

            const nR = Math.round(glyphPts.length * pr.r);

            const order = glyphPts
                .map((_, i) => i)
                .sort(() => Math.random() - 0.5);

            const cols = [];

            order.forEach((oi, rank) => {
                cols[oi] =
                    rank < nR
                        ? '36,78,255'
                        : '255,102,85';
            });

            s.trace = {nodes, firstEdge, cols, name: pr.n,
                comp:
                    nR + ' RESEARCHERS · ' +
                    (glyphPts.length - nR) + ' OPERATORS',
                prog: 0, hold: 300, fade: 1, phase: 'draw'
            };
        }

        //advances the animation by one step
        function stepHero(s) {
            const mv =
                (options.motion ?? 'calm') === 'lively'
                    ? 1.7
                    : 1;

            if (!s.trace) {
                if (--s.cool <= 0) {
                    newTrace(s);
                }
            } else {
                const t = s.trace;

                if (reduced && t.prog < 1) {
                    t.prog = 1;
                }

                if (t.phase === 'draw') {
                    t.prog += 0.011 * mv;

                    if (t.prog >= 1) {
                        t.prog = 1;
                        t.phase = 'hold';
                    }
                } else if (t.phase === 'hold') {
                    if (--t.hold <= 0) {
                        t.phase = 'fade';
                    }
                } else {
                    t.fade -= 0.02;

                    if (t.fade <= 0) {
                        s.trace = null;
                        s.cool = 46;
                    }
                }
            }

            drawHero(s);
        }

        //calculates the position of a point in the hero animation
        function heroPos(s, i) {
            const g = s.grid[i];

            return {
                x: g.x +
                    Math.sin(s.t * 0.006 + g.ph) * 1.6,
                y: g.y +
                    Math.cos(s.t * 0.005 + g.ph) * 1.6
            };
        }

        //draws the hero animation on the canvas
        function drawHero(s) {
            const { ctx } = s;

            ctx.clearRect(0, 0, s.w, s.h);
            ctx.fillStyle = 'rgba(17,17,17,0.22)';

            for (const g of s.grid) {
                const x =
                    g.x +
                    Math.sin(s.t * 0.006 + g.ph) * 1.6;

                const y =
                    g.y +
                    Math.cos(s.t * 0.005 + g.ph) * 1.6;

                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, 6.3);
                ctx.fill();
            }

            const t = s.trace;

            if (t && !reduced && t.phase === 'draw') {
                for (let j = 0; j < 6; j++) {
                    const i =
                        (Math.floor(s.t * 0.7) + j * 37) %
                        s.grid.length;

                    const p = heroPos(s, i);

                    ctx.fillStyle =
                        j % 2
                            ? 'rgba(36,78,255,0.2)'
                            : 'rgba(255,102,85,0.2)';

                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2.5, 0, 6.3);
                    ctx.fill();
                }
            }

            if (!t) return;

            const E = glyphEdges;
            const total = t.prog * E.length;
            const fl = Math.floor(total);
            const part = total - fl;

            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(17,17,17,' + (0.62 * t.fade).toFixed(3) +')';
            ctx.beginPath();

            for (let k = 0; k < Math.min(fl, E.length); k++) {
                const A = heroPos(s, t.nodes[E[k][0]]);
                const B = heroPos(s,t.nodes[E[k][1]]);
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(B.x, B.y);
            }

            if (fl < E.length && part > 0) {
                const A = heroPos(s,t.nodes[E[fl][0]]);
                const B = heroPos(s,t.nodes[E[fl][1]]);
                ctx.moveTo(A.x, A.y);
                ctx.lineTo(
                    A.x + (B.x - A.x) * part,
                    A.y + (B.y - A.y) * part
                );
            }

            ctx.stroke();

            for (let i = 0; i < t.nodes.length; i++) {
                if (
                    t.firstEdge[i] > fl - (t.firstEdge[i] === 0 ? 0 : 1) 
                    && t.firstEdge[i] >= fl
                ) {continue;}

                const p = heroPos(s, t.nodes[i]);
                const col = t.cols[i];

                ctx.fillStyle =
                    'rgba(' +
                    col +
                    ',' +
                    (0.95 * t.fade).toFixed(3) +
                    ')';

                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, 6.3);
                ctx.fill();

                ctx.strokeStyle =
                    'rgba(' +
                    col +
                    ',' +
                    (0.32 * t.fade).toFixed(3) +
                    ')';

                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.arc(p.x,p.y, 6.5 + Math.sin(s.t * 0.04 + i) * 1.2, 0, 6.3);
                ctx.stroke();

                ctx.lineWidth = 1.2;
            }

            if (fl >= 1) {
                const base = heroPos(s, t.nodes[0]);

                try {
                    ctx.letterSpacing = '2px';
                } catch (e) {}

                ctx.font =
                    '500 10px "IBM Plex Mono", monospace';

                ctx.fillStyle =
                    'rgba(17,17,17,' +
                    (0.8 * t.fade).toFixed(3) +
                    ')';

                ctx.textAlign = 'center';

                ctx.fillText(
                    t.name,
                    base.x,
                    base.y + 22
                );

                ctx.font =
                    '400 8.5px "IBM Plex Mono", monospace';

                ctx.fillStyle =
                    'rgba(17,17,17,' +
                    (0.5 * t.fade).toFixed(3) +
                    ')';

                ctx.fillText(
                    t.comp,
                    base.x,
                    base.y + 37
                );

                try {
                    ctx.letterSpacing = '0px';
                } catch (e) {}
            }
        }
        
        // Set up the canvas and animation lifecycle
        const ctx = canvas.getContext('2d');
        const state = {ctx, w: 0, h: 0, dpr: Math.min(window.devicePixelRatio || 1, 2), t: 0, visible: true };

        function fit() {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();

            state.w = rect.width;
            state.h = rect.height;

            canvas.width = Math.max(1, rect.width * state.dpr);
            canvas.height = Math.max(1, rect.height * state.dpr);

            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0 );
        }

        fit();
        seedHero(state);

        const resizeObserver = new ResizeObserver(() => {
            fit();
            seedHero(state);

            if (reduced) {
                state.t = 800;
                stepHero(state);
            }
        });

        resizeObserver.observe(canvas.parentElement);

        const intersectionObserver = new IntersectionObserver(entries => {
            state.visible = entries[0].isIntersecting;
        });

        intersectionObserver.observe(canvas.parentElement);

        if (reduced) {
            state.t = 800;
            stepHero(state);
        } else {
            function loop() {
                if (state.visible) {
                    state.t++;
                    stepHero(state);
                }

                state.raf = requestAnimationFrame(loop);
            }
            loop();
        }

        return {
            destroy() {
                cancelAnimationFrame(state.raf);
                resizeObserver.disconnect();
                intersectionObserver.disconnect();
            }
        };
    }

    function attachDescent(canvas) {
        // initialise descent animation on canvas
        
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');

        const state = {
            ctx,
            w: 0,
            h: 0,
            dpr: Math.min(window.devicePixelRatio || 1, 2),
            t: 0,
            visible: true,
            snow: []
        };

        function fit() {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();

            state.w = rect.width;
            state.h = rect.height;

            canvas.width = Math.max(1, rect.width * state.dpr);
            canvas.height = Math.max(1, rect.height * state.dpr);

            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';

            ctx.setTransform(
                state.dpr,
                0,
                0,
                state.dpr,
                0,
                0
            );
        }

        function seed() {
            if (!state.w) return;

            state.snow = [];

            for (let i = 0; i < 46; i++) {
                state.snow.push({
                    x: Math.random() * state.w,
                    y: Math.random() * state.h,
                    sp: 0.12 + Math.random() * 0.25,
                    ph: Math.random() * 6.28
                });
            }
        }

        function draw() {
            ctx.clearRect(0, 0, state.w, state.h);

            for (const particle of state.snow) {
                const depth = particle.y / state.h;

                ctx.fillStyle =
                    depth < 0.5
                        ? 'rgba(17,23,38,' +
                        (0.12 + 0.18 * (0.5 - depth)).toFixed(3) +
                        ')'
                        : 'rgba(243,240,232,' +
                        (0.1 + 0.3 * (depth - 0.5)).toFixed(3) +
                        ')';

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 1.4, 0, 6.3);
                ctx.fill();
            }

            ctx.lineWidth = 1;
            ctx.setLineDash([2, 8]);

            for (const level of [0.3, 0.44, 0.58, 0.72, 0.86]) {
                const y = level * state.h;

                ctx.strokeStyle =
                    level < 0.5
                        ? 'rgba(17,23,38,0.16)'
                        : 'rgba(243,240,232,0.16)';

                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(state.w, y);
                ctx.stroke();
            }

            ctx.setLineDash([]);
        }

        function step() {
            for (const particle of state.snow) {
                particle.y += particle.sp;
                particle.x +=
                    Math.sin(state.t * 0.008 + particle.ph) * 0.15;

                if (particle.y > state.h + 6) {
                    particle.y = -6;
                    particle.x = Math.random() * state.w;
                }
            }

            draw();
        }

        fit();
        seed();

        const resizeObserver = new ResizeObserver(() => {
            fit();
            seed();
        });

        resizeObserver.observe(canvas.parentElement);

        const intersectionObserver = new IntersectionObserver(entries => {
            state.visible = entries[0].isIntersecting;
        });

        intersectionObserver.observe(canvas.parentElement);

        function loop() {
            if (state.visible) {
                state.t++;
                step();
            }

            state.raf = requestAnimationFrame(loop);
        }

        loop();

        return {
            destroy() {
                cancelAnimationFrame(state.raf);
                resizeObserver.disconnect();
                intersectionObserver.disconnect();
            }
        };
    }

    

    function attachReef(canvas, options = {}) {
        // initialise reef animation on canvas

    }

    function destroy(name) {
        // cancel requestAnimationFrame

        // disconnect ResizeObserver

        // disconnect IntersectionObserver

        // clear stored instance

    }

    window.KoralliAnimations = {
        attachHero,
        attachDescent,
        attachReef,
        destroy
    };

})();