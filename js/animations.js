(function () {

    const instances = {
        hero: null,
        descent: null,
        reef: null
    };

    function attachHero(canvas, options = {}) {
        // initialise hero animation on canvas

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