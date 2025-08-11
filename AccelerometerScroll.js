class AccelerometerScroll {
    constructor(options = {}) {
        this.sensitivity = options.sensitivity || 2;
        this.threshold = options.threshold || 0.5;
        this.maxScrollSpeed = options.maxScrollSpeed || 20;
        this.smoothing = options.smoothing || 0.8;
        
        this.currentVelocity = { x: 0, y: 0 };
        this.isActive = false;
        this.animationId = null;
        
        this.init();
    }
    
    async init() {
        try {
            // Check if DeviceOrientationEvent is supported
            if (!window.DeviceOrientationEvent) {
                throw new Error('Device orientation not supported');
            }
            
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    throw new Error('Device orientation permission denied');
                }
            }
            
            this.attachEventListeners();
            this.startScrollLoop();
            console.log('Accelerometer scrolling initialized');
            
        } catch (error) {
            console.error('Failed to initialize accelerometer scrolling:', error);
            this.showFallbackMessage();
        }
    }
    
    attachEventListeners() {
        // Use deviceorientation for tilt-based scrolling
        window.addEventListener('deviceorientation', (event) => {
            this.handleOrientation(event);
        });
        
        // Add toggle functionality
        document.addEventListener('keydown', (event) => {
            if (event.key === ' ') { // Spacebar to toggle
                event.preventDefault();
                this.toggle();
            }
        });
    }
    
    handleOrientation(event) {
        if (!this.isActive) return;
        
        // Get tilt values (beta = front-back, gamma = left-right)
        const beta = event.beta || 0;   // -180 to 180 (front/back tilt)
        const gamma = event.gamma || 0; // -90 to 90 (left/right tilt)
        
        // Calculate scroll velocities based on tilt
        // Normalize and apply threshold
        const normalizedY = this.applyThreshold(beta / 90); // Normalize to -2 to 2 range
        const normalizedX = this.applyThreshold(gamma / 45); // Normalize to -2 to 2 range
        
        // Apply sensitivity and speed limits
        const targetY = this.clamp(normalizedY * this.sensitivity, -this.maxScrollSpeed, this.maxScrollSpeed);
        const targetX = this.clamp(normalizedX * this.sensitivity, -this.maxScrollSpeed, this.maxScrollSpeed);
        
        // Apply smoothing to prevent jittery movement
        this.currentVelocity.y = this.lerp(this.currentVelocity.y, targetY, 1 - this.smoothing);
        this.currentVelocity.x = this.lerp(this.currentVelocity.x, targetX, 1 - this.smoothing);
    }
    
    applyThreshold(value) {
        return Math.abs(value) > this.threshold ? value : 0;
    }
    
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    startScrollLoop() {
        const scroll = () => {
            if (this.isActive && (Math.abs(this.currentVelocity.x) > 0.1 || Math.abs(this.currentVelocity.y) > 0.1)) {
                window.scrollBy(this.currentVelocity.x, this.currentVelocity.y);
            }
            this.animationId = requestAnimationFrame(scroll);
        };
        scroll();
    }
    
    start() {
        this.isActive = true;
        this.updateStatus('Active - Tilt your device to scroll');
    }
    
    stop() {
        this.isActive = false;
        this.currentVelocity = { x: 0, y: 0 };
        this.updateStatus('Inactive - Press spacebar to activate');
    }
    
    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('accelerometer-status');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = this.isActive ? 'status active' : 'status inactive';
        }
    }
    
    showFallbackMessage() {
        const statusElement = document.getElementById('accelerometer-status');
        if (statusElement) {
            statusElement.textContent = 'Accelerometer not available - use regular scrolling';
            statusElement.className = 'status error';
        }
    }
    
    destroy() {
        this.stop();
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('deviceorientation', this.handleOrientation);
        document.removeEventListener('keydown', this.toggle);
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.accelerometerScroll = new AccelerometerScroll({
        sensitivity: 3,
        threshold: 0.3,
        maxScrollSpeed: 15,
        smoothing: 0.7
    });
});