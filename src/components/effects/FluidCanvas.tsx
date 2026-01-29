import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// ... shaders ...

export interface FluidCanvasRef {
    splat: (x: number, y: number, dx: number, dy: number, color: number[]) => void;
}

const FluidCanvas = forwardRef<FluidCanvasRef, { className?: string }>(({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const splatRef = useRef<((x: number, y: number, dx: number, dy: number, color: number[]) => void) | null>(null);

    useImperativeHandle(ref, () => ({
        splat: (x, y, dx, dy, color) => {
            if (splatRef.current) splatRef.current(x, y, dx, dy, color);
        }
    }));

    // Simulation Config
    // ...

    // Simulation Config
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const config = {
        SIM_RESOLUTION: isMobile ? 64 : 128, // V6.0 Mobile Optimization
        DYE_RESOLUTION: isMobile ? 256 : 512,
        DENSITY_DISSIPATION: 0.98,
        VELOCITY_DISSIPATION: 0.99,
        PRESSURE_ITERATIONS: isMobile ? 5 : 10,
        SPLAT_RADIUS: 0.005,
        SPLAT_FORCE: 6000
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Context Setup
        const params = { alpha: true, depth: false, stencil: false, antialias: false };
        let gl = canvas.getContext('webgl', params);
        if (!gl) return;
        glRef.current = gl;

        // Extension Check
        const ext = gl.getExtension('OES_texture_half_float');
        const supportLinear = gl.getExtension('OES_texture_half_float_linear'); // Optional

        // --- GL HELPERS ---
        function createProgram(vertexSource: string, fragmentSource: string) {
            if (!gl) return null;
            function compileShader(type: number, source: string) {
                const shader = gl!.createShader(type);
                gl!.shaderSource(shader!, source);
                gl!.compileShader(shader!);
                if (!gl!.getShaderParameter(shader!, gl!.COMPILE_STATUS)) return shader;
                console.error(gl!.getShaderInfoLog(shader!));
                return null;
            }
            const vs = compileShader(gl.VERTEX_SHADER, vertexSource);
            const fs = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
            const p = gl.createProgram();
            gl.attachShader(p!, vs!);
            gl.attachShader(p!, fs!);
            gl.linkProgram(p!);
            if (!gl.getProgramParameter(p!, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p!));
            return p;
        }

        function createDoubleFBO(w: number, h: number) {
            let fbo1 = createFBO(w, h);
            let fbo2 = createFBO(w, h);
            return {
                get read() { return fbo1; },
                get write() { return fbo2; },
                swap() { let temp = fbo1; fbo1 = fbo2; fbo2 = temp; }
            };
        }

        function createFBO(w: number, h: number) {
            if (!gl) return { texture: null, fbo: null, width: w, height: h, attach: () => { } };
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            // Use ext.HALF_FLOAT_OES for proper physics support
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, ext ? ext.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);

            const fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            return {
                texture,
                fbo,
                width: w,
                height: h,
                attach(id: number) {
                    if (!gl) return;
                    gl.activeTexture(gl.TEXTURE0 + id);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    return id;
                }
            };
        }

        // --- PROGRAMS ---
        const splatProgram = createProgram(baseVertexShader, splatShader);
        const advectionProgram = createProgram(baseVertexShader, advectionShader);
        const divergenceProgram = createProgram(baseVertexShader, divergenceShader);
        const pressureProgram = createProgram(baseVertexShader, pressureShader);
        const gradientSubtractProgram = createProgram(baseVertexShader, gradientSubtractShader);
        const displayProgram = createProgram(baseVertexShader, displayShader);

        // --- BUFFERS ---
        const blit = (() => {
            gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
            return (destination: any) => {
                gl!.bindFramebuffer(gl!.FRAMEBUFFER, destination ? destination.fbo : null);
                gl!.viewport(0, 0, destination ? destination.width : canvas.width, destination ? destination.height : canvas.height);
                gl!.drawElements(gl!.TRIANGLES, 6, gl!.UNSIGNED_SHORT, 0);
            };
        })();

        // --- STATE ---
        let velocity = createDoubleFBO(config.SIM_RESOLUTION, config.SIM_RESOLUTION);
        let density = createDoubleFBO(config.DYE_RESOLUTION, config.DYE_RESOLUTION);
        let divergence = createFBO(config.SIM_RESOLUTION, config.SIM_RESOLUTION);
        let pressure = createDoubleFBO(config.SIM_RESOLUTION, config.SIM_RESOLUTION);

        // --- EVENTS ---
        const lastMouse = { x: 0, y: 0 };
        function splat(x: number, y: number, dx: number, dy: number, color: number[]) {
            if (!gl || !splatProgram) return;

            gl.useProgram(splatProgram);
            const uTarget = gl.getUniformLocation(splatProgram, 'uTarget');
            const uAspectRatio = gl.getUniformLocation(splatProgram, 'aspectRatio');
            const uColor = gl.getUniformLocation(splatProgram, 'color');
            const uPoint = gl.getUniformLocation(splatProgram, 'point');
            const uRadius = gl.getUniformLocation(splatProgram, 'radius');

            gl.uniform1i(uTarget, velocity.read.attach(0));
            gl.uniform1f(uAspectRatio, canvas.width / canvas.height);
            gl.uniform2f(uPoint, x, y);
            gl.uniform3f(uColor, dx, dy, 1.0); // Velocity acts as color for velocity texture
            gl.uniform1f(uRadius, config.SPLAT_RADIUS);
            blit(velocity.write);
            velocity.swap();

            gl.uniform1i(uTarget, density.read.attach(0));
            gl.uniform3fv(uColor, color);
            blit(density.write);
            density.swap();
        }

        const handleMove = (e: MouseEvent | TouchEvent) => {
            let x = 0, y = 0;
            if (e instanceof MouseEvent) {
                x = e.offsetX;
                y = e.offsetY;
            } else {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                x = touch.clientX - rect.left;
                y = touch.clientY - rect.top;
            }

            const nx = x / canvas.width;
            const ny = 1.0 - y / canvas.height;
            const dx = (nx - lastMouse.x) * config.SPLAT_FORCE;
            const dy = (ny - lastMouse.y) * config.SPLAT_FORCE;

            // Neon Palette
            const r = 0.2 + Math.random() * 0.8;
            const g = 0.2 + Math.random() * 0.8;
            const b = 1.0;

            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
                splat(nx, ny, dx, dy, [r, g, b]);
            }

            lastMouse.x = nx;
            lastMouse.y = ny;
        };

        canvas.addEventListener('mousemove', handleMove);
        canvas.addEventListener('touchmove', handleMove);

        // --- RENDER LOOP ---
        let lastTime = Date.now();
        function update() {
            if (!gl) return;
            const dt = Math.min((Date.now() - lastTime) / 1000, 0.016);
            lastTime = Date.now();

            gl.viewport(0, 0, config.SIM_RESOLUTION, config.SIM_RESOLUTION);

            // Advection
            if (advectionProgram) {
                gl.useProgram(advectionProgram);
                gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dt'), dt);
                gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.VELOCITY_DISSIPATION);
                gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
                gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), velocity.read.attach(0));
                gl.uniform2f(gl.getUniformLocation(advectionProgram, 'texelSize'), 1.0 / config.SIM_RESOLUTION, 1.0 / config.SIM_RESOLUTION);
                blit(velocity.write);
                velocity.swap();

                gl.uniform1f(gl.getUniformLocation(advectionProgram, 'dissipation'), config.DENSITY_DISSIPATION);
                gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uVelocity'), velocity.read.attach(0));
                gl.uniform1i(gl.getUniformLocation(advectionProgram, 'uSource'), density.read.attach(1));
                blit(density.write);
                density.swap();
            }

            // Divergence
            if (divergenceProgram) {
                gl.useProgram(divergenceProgram);
                gl.uniform1i(gl.getUniformLocation(divergenceProgram, 'uVelocity'), velocity.read.attach(0));
                gl.uniform2f(gl.getUniformLocation(divergenceProgram, 'texelSize'), 1.0 / config.SIM_RESOLUTION, 1.0 / config.SIM_RESOLUTION);
                blit(divergence);
            }

            // Pressure
            if (pressureProgram) {
                gl.useProgram(pressureProgram);
                gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uDivergence'), divergence.attach(0));
                gl.uniform2f(gl.getUniformLocation(pressureProgram, 'texelSize'), 1.0 / config.SIM_RESOLUTION, 1.0 / config.SIM_RESOLUTION);
                for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
                    gl.uniform1i(gl.getUniformLocation(pressureProgram, 'uPressure'), pressure.read.attach(1));
                    blit(pressure.write);
                    pressure.swap();
                }
            }

            // Gradient Subtract
            if (gradientSubtractProgram) {
                gl.useProgram(gradientSubtractProgram);
                gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uPressure'), pressure.read.attach(0));
                gl.uniform1i(gl.getUniformLocation(gradientSubtractProgram, 'uVelocity'), velocity.read.attach(1));
                gl.uniform2f(gl.getUniformLocation(gradientSubtractProgram, 'texelSize'), 1.0 / config.SIM_RESOLUTION, 1.0 / config.SIM_RESOLUTION);
                blit(velocity.write);
                velocity.swap();
            }

            // Display
            if (displayProgram) {
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.useProgram(displayProgram);
                gl.uniform1i(gl.getUniformLocation(displayProgram, 'uTexture'), density.read.attach(0));
                blit(null);
            }

            requestAnimationFrame(update);
        }

        update();

        // ASSIGN REF
        splatRef.current = splat;

        // SPLASH INIT
        splat(0.5, 0.5, 0, 100, [0.0, 1.0, 1.0]);

        return () => {
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('touchmove', handleMove);
        }
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={`w-full h-full block ${className}`}
            width={1024}
            height={1024}
        />
    );
});

export default FluidCanvas;
