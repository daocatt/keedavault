import React, { useEffect, useRef, useState } from 'react';

export const FlowBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Detect dark mode
        const checkDarkMode = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();

        // Watch for theme changes
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let time = 0;

        // Configuration
        const particleCount = isDark ? 80 : 60;
        const connectionDistance = isDark ? 180 : 150;
        const moveSpeed = isDark ? 0.3 : 0.5;

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            baseX: number;
            baseY: number;

            constructor(w: number, h: number) {
                this.x = Math.random() * w;
                this.y = Math.random() * h;
                this.baseX = this.x;
                this.baseY = this.y;
                this.vx = (Math.random() - 0.5) * moveSpeed;
                this.vy = (Math.random() - 0.5) * moveSpeed;
                this.size = Math.random() * 2 + 1;
            }

            update(w: number, h: number, t: number) {
                this.x += this.vx;
                this.y += this.vy;

                // Add subtle wave motion in dark mode
                if (isDark) {
                    this.x += Math.sin(t * 0.001 + this.baseY * 0.01) * 0.2;
                    this.y += Math.cos(t * 0.001 + this.baseX * 0.01) * 0.2;
                }

                // Bounce off edges
                if (this.x < 0 || this.x > w) this.vx *= -1;
                if (this.y < 0 || this.y > h) this.vy *= -1;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                if (isDark) {
                    // Gradient particles in dark mode
                    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)'); // Indigo
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = 'rgba(100, 116, 139, 0.2)';
                }
                ctx.fill();
            }
        }

        const init = () => {
            particles = [];
            const { width, height } = canvas;
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(width, height));
            }
        };

        const drawGradientBackground = (width: number, height: number, t: number) => {
            if (!isDark) return;

            // Animated mesh gradient background for dark mode
            const gradient1 = ctx.createRadialGradient(
                width * 0.3 + Math.sin(t * 0.0005) * 100,
                height * 0.3 + Math.cos(t * 0.0007) * 100,
                0,
                width * 0.3,
                height * 0.3,
                width * 0.8
            );
            gradient1.addColorStop(0, 'rgba(99, 102, 241, 0.08)'); // Indigo
            gradient1.addColorStop(1, 'rgba(99, 102, 241, 0)');

            const gradient2 = ctx.createRadialGradient(
                width * 0.7 + Math.cos(t * 0.0006) * 100,
                height * 0.7 + Math.sin(t * 0.0008) * 100,
                0,
                width * 0.7,
                height * 0.7,
                width * 0.8
            );
            gradient2.addColorStop(0, 'rgba(139, 92, 246, 0.06)'); // Purple
            gradient2.addColorStop(1, 'rgba(139, 92, 246, 0)');

            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, width, height);

            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = gradient2;
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        };

        const animate = () => {
            const { width, height } = canvas;
            ctx.clearRect(0, 0, width, height);

            // Draw gradient background in dark mode
            drawGradientBackground(width, height, time);

            // Update and draw particles
            particles.forEach(p => {
                p.update(width, height, time);
                p.draw(ctx);
            });

            // Draw connections
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < connectionDistance) {
                        const opacity = (1 - distance / connectionDistance);
                        ctx.beginPath();
                        if (isDark) {
                            // Gradient lines in dark mode
                            const gradient = ctx.createLinearGradient(
                                particles[i].x, particles[i].y,
                                particles[j].x, particles[j].y
                            );
                            gradient.addColorStop(0, `rgba(99, 102, 241, ${0.2 * opacity})`);
                            gradient.addColorStop(1, `rgba(139, 92, 246, ${0.15 * opacity})`);
                            ctx.strokeStyle = gradient;
                            ctx.lineWidth = 1.5;
                        } else {
                            ctx.strokeStyle = `rgba(100, 116, 139, ${0.15 * opacity})`;
                            ctx.lineWidth = 1;
                        }
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            time++;
            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                init();
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isDark]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
};
