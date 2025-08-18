class MobileVibrantVisuals {
    constructor() {
        this.particleCanvas = document.getElementById('particleCanvas');
        this.particleCtx = this.particleCanvas ? this.particleCanvas.getContext('2d') : null;
        this.particles = [];
        this.runeSymbols = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];
        this.floatingRunes = document.querySelector('.floating-runes');
        this.isLowPerformanceDevice = this.detectLowPerformance();
        
        this.init();
    }
    
    detectLowPerformance() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const renderer = gl ? gl.getParameter(gl.RENDERER) : '';
        
        const isLowEnd = 
            navigator.hardwareConcurrency <= 2 ||
            window.innerWidth < 400 ||
            renderer.toLowerCase().includes('adreno 3') ||
            renderer.toLowerCase().includes('mali-4') ||
            renderer.toLowerCase().includes('powervr sgx');
        
        return isLowEnd;
    }
    
    init() {
        this.setupCanvas();
        this.createParticles();
        this.createFloatingRunes();
        this.animateParticles();
        this.setupMobileEffects();
        
        window.addEventListener('resize', () => this.setupCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.setupCanvas(), 100);
        });
    }
    
    setupCanvas() {
        if (this.particleCanvas) {
            this.particleCanvas.width = window.innerWidth;
            this.particleCanvas.height = window.innerHeight;
        }
    }
    
    createParticles() {
        const baseCount = this.isLowPerformanceDevice ? 30 : 60;
        const particleCount = Math.min(baseCount, Math.floor(window.innerWidth / 15));
        
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.3, 
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 2 + 1, 
                opacity: Math.random() * 0.6 + 0.3,
                color: this.getRandomColor(),
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.015 + 0.005 
            });
        }
    }
    
    getRandomColor() {
        const colors = [
            'rgba(212, 175, 55, ',
            'rgba(255, 236, 139, ',
            'rgba(64, 224, 208, ',
            'rgba(138, 43, 226, '
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    animateParticles() {
        if (!this.particleCtx) return;
        
        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        
        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            particle.pulse += particle.pulseSpeed;
            const pulseFactor = Math.sin(particle.pulse) * 0.3 + 0.7;
            
            if (particle.x < 0) particle.x = this.particleCanvas.width;
            if (particle.x > this.particleCanvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.particleCanvas.height;
            if (particle.y > this.particleCanvas.height) particle.y = 0;
            
            const opacity = particle.opacity * pulseFactor;
            
            this.particleCtx.beginPath();
            this.particleCtx.fillStyle = particle.color + opacity + ')';
            this.particleCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.particleCtx.fill();
        });
        
        if (!this.isLowPerformanceDevice) {
            this.drawSimpleConnections();
        }
        
        requestAnimationFrame(() => this.animateParticles());
    }
    
    drawSimpleConnections() {
        const maxDistance = 80; 
        this.particleCtx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
        this.particleCtx.lineWidth = 1;
        
        for (let i = 0; i < this.particles.length - 1; i += 2) { 
            for (let j = i + 1; j < this.particles.length; j += 2) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    this.particleCtx.beginPath();
                    this.particleCtx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.particleCtx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.particleCtx.stroke();
                }
            }
        }
    }
    
    createFloatingRunes() {
        if (!this.floatingRunes) return;
        
        const createRune = () => {
            const rune = document.createElement('div');
            rune.className = 'floating-rune';
            rune.textContent = this.runeSymbols[Math.floor(Math.random() * this.runeSymbols.length)];
            rune.style.left = Math.random() * 100 + '%';
            rune.style.animationDelay = Math.random() * 8 + 's';
            rune.style.animationDuration = (12 + Math.random() * 8) + 's'; 
            rune.style.fontSize = '1rem'; 
            
            this.floatingRunes.appendChild(rune);
            
            setTimeout(() => {
                if (rune.parentNode) {
                    rune.parentNode.removeChild(rune);
                }
            }, 20000);
        };
        
        const runeCount = this.isLowPerformanceDevice ? 3 : 5;
        for (let i = 0; i < runeCount; i++) {
            setTimeout(createRune, Math.random() * 4000);
        }
        
        setInterval(createRune, 5000);
    }
    
    setupMobileEffects() {
        this.setupTouchEffects();
        this.setupMobileLighting();
        this.setupMobileResourceEffects();
    }
    
    setupTouchEffects() {
        document.querySelectorAll('.mobile-building-card').forEach(card => {
            card.addEventListener('touchstart', (e) => {
                this.createTouchRipple(e.touches[0].clientX, e.touches[0].clientY);
            });
        });
        
        document.querySelectorAll('.mobile-action-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                this.createButtonPulse(btn);
            });
        });
    }
    
    createTouchRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.style.position = 'fixed';
        ripple.style.left = (x - 15) + 'px';
        ripple.style.top = (y - 15) + 'px';
        ripple.style.width = '30px';
        ripple.style.height = '30px';
        ripple.style.border = '2px solid rgba(212, 175, 55, 0.6)';
        ripple.style.borderRadius = '50%';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '9999';
        ripple.style.transition = 'all 0.8s ease-out';
        
        document.body.appendChild(ripple);
        
        setTimeout(() => {
            ripple.style.width = '100px';
            ripple.style.height = '100px';
            ripple.style.left = (x - 50) + 'px';
            ripple.style.top = (y - 50) + 'px';
            ripple.style.borderColor = 'rgba(212, 175, 55, 0)';
        }, 10);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 800);
    }
    
    createButtonPulse(button) {
        const originalTransform = button.style.transform;
        button.style.transition = 'transform 0.15s ease';
        button.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            button.style.transform = originalTransform;
        }, 150);
    }
    
    setupMobileLighting() {
        const updateLighting = () => {
            const time = Date.now() * 0.0005; 
            const lightIntensity = Math.sin(time) * 0.2 + 0.8;
            
            const aurora = document.querySelector('.aurora-overlay');
            if (aurora) {
                aurora.style.opacity = lightIntensity;
            }
        };
        
        setInterval(updateLighting, 200);
    }
    
    setupMobileResourceEffects() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    const resourceItem = mutation.target.closest('.mobile-resource');
                    if (resourceItem && !this.isLowPerformanceDevice) {
                        this.createMobileSparkle(resourceItem);
                    }
                }
            });
        });
        
        document.querySelectorAll('.mobile-resource-info span').forEach(element => {
            observer.observe(element, { childList: true, characterData: true, subtree: true });
        });
    }
    
    createMobileSparkle(element) {
        const rect = element.getBoundingClientRect();
        
        const sparkle = document.createElement('div');
        sparkle.style.position = 'fixed';
        sparkle.style.left = (rect.left + rect.width / 2) + 'px';
        sparkle.style.top = (rect.top + rect.height / 2) + 'px';
        sparkle.style.width = '3px';
        sparkle.style.height = '3px';
        sparkle.style.background = '#ffec8b';
        sparkle.style.borderRadius = '50%';
        sparkle.style.pointerEvents = 'none';
        sparkle.style.zIndex = '9999';
        sparkle.style.boxShadow = '0 0 5px rgba(255, 236, 139, 0.8)';
        sparkle.style.transition = 'all 0.8s ease-out';
        
        document.body.appendChild(sparkle);
        
        setTimeout(() => {
            sparkle.style.transform = 'translateY(-15px) scale(0)';
            sparkle.style.opacity = '0';
        }, 10);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 800);
    }
    
    triggerBuildingPlacementEffect(x, y) {
        if (this.isLowPerformanceDevice) return; 
        
        this.createMobileBuildingEffect(x, y);
    }
    
    createMobileBuildingEffect(x, y) {
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.background = '#8b4513';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            const angle = (Math.PI * 2 * i) / 8;
            const distance = 20 + Math.random() * 15;
            const targetX = x + Math.cos(angle) * distance;
            const targetY = y + Math.sin(angle) * distance - 10;
            
            particle.style.transition = 'all 0.8s ease-out';
            document.body.appendChild(particle);
            
            setTimeout(() => {
                particle.style.transform = `translate(${targetX - x}px, ${targetY - y}px)`;
                particle.style.opacity = '0';
            }, 10);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 800);
        }
    }
    
    triggerExplorationEffect(x, y) {
        this.createMobileExplorationWave(x, y);
    }
    
    createMobileExplorationWave(x, y) {
        const wave = document.createElement('div');
        wave.style.position = 'fixed';
        wave.style.left = (x - 20) + 'px';
        wave.style.top = (y - 20) + 'px';
        wave.style.width = '40px';
        wave.style.height = '40px';
        wave.style.border = '1px solid rgba(212, 175, 55, 0.8)';
        wave.style.borderRadius = '50%';
        wave.style.pointerEvents = 'none';
        wave.style.zIndex = '9999';
        wave.style.transition = 'all 1s ease-out';
        
        document.body.appendChild(wave);
        
        setTimeout(() => {
            wave.style.width = '120px';
            wave.style.height = '120px';
            wave.style.left = (x - 60) + 'px';
            wave.style.top = (y - 60) + 'px';
            wave.style.borderColor = 'rgba(212, 175, 55, 0)';
        }, 10);
        
        setTimeout(() => {
            if (wave.parentNode) {
                wave.parentNode.removeChild(wave);
            }
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.mobileVibrantVisuals = new MobileVibrantVisuals();
});

window.triggerBuildingEffect = (x, y) => {
    if (window.mobileVibrantVisuals) {
        window.mobileVibrantVisuals.triggerBuildingPlacementEffect(x, y);
    }
};

window.triggerExplorationEffect = (x, y) => {
    if (window.mobileVibrantVisuals) {
        window.mobileVibrantVisuals.triggerExplorationEffect(x, y);
    }
};

window.adjustPerformance = (level) => {
    if (window.mobileVibrantVisuals) {
        if (level === 'low') {
            window.mobileVibrantVisuals.particles = window.mobileVibrantVisuals.particles.slice(0, 15);
        }
    }
};