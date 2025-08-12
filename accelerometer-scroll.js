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
            this.updateStatus('Checking device capabilities...');
            
            // Check if DeviceOrientationEvent is supported
            if (!window.DeviceOrientationEvent) {
                throw new Error('Device orientation not supported on this browser');
            }
            
            // Check if we're on HTTPS (required for most modern browsers)
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                throw new Error('HTTPS required for accelerometer access');
            }
            
            this.updateStatus('Device orientation supported, checking permissions...');
            
            // Request permission for iOS 13+ and other browsers that require it
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                this.updateStatus('Permission required - tap to request access');
                
                // Create a button to request permission (user gesture required)
                this.createPermissionButton();
                return; // Wait for user to click the button
            }
            
            // For Android and other browsers, try to start directly
            this.finishInitialization();
            
        } catch (error) {
            console.error('Failed to initialize accelerometer scrolling:', error);
            this.updateStatus(`Error: ${error.message}`);
            this.showFallbackMessage();
        }
    }
    
    createPermissionButton() {
        const button = document.createElement('button');
        button.textContent = '🔓 Enable Accelerometer Access';
        button.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            padding: 15px 25px;
            font-size: 16px;
            background: #007AFF;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        `;
        
        button.onclick = async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                button.remove();
                
                if (permission === 'granted') {
                    this.finishInitialization();
                } else {
                    throw new Error('Permission denied by user');
                }
            } catch (error) {
                button.remove();
                this.updateStatus(`Permission error: ${error.message}`);
                console.error('Permission request failed:', error);
            }
        };
        
        document.body.appendChild(button);
    }
    
    finishInitialization() {
        this.attachEventListeners();
        this.startScrollLoop();
        this.updateStatus('Ready! Press spacebar to activate or use controls below');
        console.log('Accelerometer scrolling initialized successfully');
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
        
        // Debug logging (remove in production)
        if (Math.random() < 0.01) { // Log occasionally to avoid spam
            console.log(`Orientation: beta=${beta.toFixed(1)}, gamma=${gamma.toFixed(1)}`);
        }
        
        // Calculate scroll velocities based on tilt
        // Normalize and apply threshold (much more sensitive ranges)
        const normalizedY = this.applyThreshold(beta / 20); // Now 20° = 1.0 (much more responsive)
        const normalizedX = this.applyThreshold(gamma / 15); // Now 15° = 1.0 (more responsive)
        
        // Apply sensitivity and speed limits (negative Y to reverse direction for gravity effect)
        const targetY = this.clamp(-normalizedY * this.sensitivity, -this.maxScrollSpeed, this.maxScrollSpeed);
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
