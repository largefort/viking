class MobileVikingSettlementTycoon {
    constructor() {
        this.gameVersion = '1.0.0';
        this.deviceInfo = this.collectDeviceInfo();
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.camera = { x: 0, y: 0, scale: 1 };
        this.resources = {
            food: 100,
            wood: 50,
            iron: 25,
            gold: 10
        };
        this.population = 5;
        this.buildings = [];
        this.selectedBuilding = null;
        this.placementMode = false;
        
        // Day/Night cycle (mobile optimized)
        this.gameTime = 0;
        this.dayLength = 3600; // 60 minutes per full day/night cycle (30 min day + 30 min night) 
        this.timeSpeed = 1; // Normal speed for realistic experience
        
        // Mobile-specific properties
        this.activeTab = 'buildings';
        // Enhanced touch handling for zoom
        this.touchStartTime = 0;
        this.longPressThreshold = 800; // 800ms for long press
        this.longPressTimer = null;
        this.lastTapTime = 0;
        this.doubleTapThreshold = 300; // 300ms for double tap
        this.pinchStartDistance = 0;
        this.pinchStartScale = 1;
        this.isPinching = false;
        
        // Enhanced infinite terrain system (mobile optimized)
        this.chunkSize = 256; // Smaller chunks for mobile performance
        this.tileSize = 16; // Smaller tiles for mobile optimization
        this.loadedChunks = new Map(); // Map of chunk coordinates to chunk data
        this.chunkLoadRadius = 2; // Reduced for mobile performance
        this.seed = Math.random() * 10000; // Seed for consistent generation
        
        // Exploration system
        this.fogOfWar = new Map(); // Map of chunk coordinates to fog canvas
        this.scouts = [];
        this.exploredAreas = new Set();
        this.revealAnimations = [];
        
        // Lightning system (mobile optimized)
        this.lightningSystem = {
            enabled: true,
            strikes: [],
            nextStrike: 0,
            minInterval: 8000,  // Longer intervals for mobile
            maxInterval: 45000,
            stormChance: 0.25,  // Slightly reduced for performance
            normalChance: 0.015 // Reduced frequency
        };
        
        // Touch handling
        this.touchState = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0
        };
        
        // Game loop
        this.lastUpdate = 0;
        this.gameRunning = true;
        
        this.init();
    }
    
    collectDeviceInfo() {
        // Collect minimal, privacy-respecting device information
        const info = {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            pixelRatio: window.devicePixelRatio || 1,
            platform: this.getPlatformInfo(),
            browser: this.getBrowserInfo(),
            touchSupport: 'ontouchstart' in window,
            orientation: screen.orientation ? screen.orientation.type : 'unknown'
        };
        
        return info;
    }
    
    getPlatformInfo() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('android')) return 'Android';
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
        if (userAgent.includes('mobile')) return 'Mobile';
        return 'Unknown';
    }
    
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return 'Unknown';
    }
    
    init() {
        this.setupCanvas();
        this.setupMobileUI();
        this.loadNearbyChunks();
        
        // Enhanced settlers system for animated behavior
        this.settlers = [];
        this.maxSettlers = 20;
        
        // Ocean wave system
        this.waveSystem = {
            time: 0,
            smallWaves: [],
            largeWaves: [],
            waveSpeed: 0.002,
            amplitude: 3
        };
        this.initializeWaveSystem();
        
        // Firefly system for nighttime beauty
        this.fireflies = [];
        this.maxFireflies = 15; // Fewer for mobile performance
        
        // Check for saved game
        const hasSavedGame = localStorage.getItem('vikingSettlementMobile');
        if (!hasSavedGame) {
            this.spawnInitialScout();
            this.spawnInitialSettlers();
            // Remove automatic building placement for new players
            this.showMobileNotification('Welcome to Viking Settlement Tycoon! Build your settlement from scratch!', 'success');
        } else {
            this.loadGame();
        }
        
        this.setupMobileEventListeners();
        this.gameLoop();
    }

    initializeWaveSystem() {
        // Initialize small ripple waves
        for (let i = 0; i < 8; i++) {
            this.waveSystem.smallWaves.push({
                offset: Math.random() * Math.PI * 2,
                frequency: 0.05 + Math.random() * 0.03,
                amplitude: 0.8 + Math.random() * 0.4,
                speed: 0.001 + Math.random() * 0.001
            });
        }
        
        // Initialize large oceanic swells
        for (let i = 0; i < 4; i++) {
            this.waveSystem.largeWaves.push({
                offset: Math.random() * Math.PI * 2,
                frequency: 0.01 + Math.random() * 0.01,
                amplitude: 2.0 + Math.random() * 1.0,
                speed: 0.0005 + Math.random() * 0.0005
            });
        }
    }
    
    spawnInitialSettlers() {
        const centerX = this.camera.x + this.canvas.width / (2 * this.camera.scale);
        const centerY = this.camera.y + this.canvas.height / (2 * this.camera.scale);
        
        for (let i = 0; i < 5; i++) {
            this.settlers.push({
                x: centerX + (Math.random() - 0.5) * 100,
                y: centerY + (Math.random() - 0.5) * 100,
                type: ['farmer', 'worker', 'child', 'gatherer'][Math.floor(Math.random() * 4)],
                targetX: centerX,
                targetY: centerY,
                speed: 15 + Math.random() * 10,
                activityTimer: 0,
                activityDuration: 3000 + Math.random() * 5000,
                carryingResource: null,
                workBuilding: null,
                age: Math.random() * 1000
            });
        }
    }
    
    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        };
        
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => {
            setTimeout(resize, 100);
        });
    }
    
    setupMobileUI() {
        // Update device info display
        document.getElementById('gameVersion').textContent = this.gameVersion;
        document.getElementById('screenSize').textContent = `${this.deviceInfo.screenWidth}×${this.deviceInfo.screenHeight}`;
        document.getElementById('platformInfo').textContent = this.deviceInfo.platform;
        document.getElementById('browserInfo').textContent = this.deviceInfo.browser;
        
        this.updateMobileResourceDisplay();
        this.updateMobilePopulationDisplay();
        this.updateMobileStatsDisplay();
    }
    
    setupMobileEventListeners() {
        // Tab navigation
        document.querySelectorAll('.mobile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Building selection
        document.querySelectorAll('.mobile-building-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const buildingType = card.dataset.building;
                this.selectMobileBuilding(buildingType);
            });
        });
        
        // Action buttons
        document.getElementById('mobileNewTerritoryBtn').addEventListener('click', () => {
            this.resetGameProgress();
            this.showMobileNotification('New territory discovered!', 'success');
        });
        
        document.getElementById('mobileSaveBtn').addEventListener('click', () => {
            this.saveMobileGame();
        });
        
        document.getElementById('mobileInfoBtn').addEventListener('click', () => {
            this.showDeviceInfoModal();
        });
        
        document.getElementById('mobileHelpBtn').addEventListener('click', () => {
            this.showHelpModal();
        });
        
        // Modal close buttons
        document.querySelectorAll('.mobile-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.mobile-modal').classList.remove('active');
            });
        });
        
        // Canvas touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Prevent context menu on long press
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.mobile-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.mobile-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`mobile${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
        
        this.activeTab = tabName;
    }
    
    selectMobileBuilding(buildingType) {
        this.selectedBuilding = buildingType;
        this.placementMode = true;
        
        // Update UI
        document.querySelectorAll('.mobile-building-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-building="${buildingType}"]`).classList.add('selected');
        
        this.showMobileNotification(`Tap the map to place ${buildingType}`, 'success');
    }
    
    getTouchDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getTouchCenter(touch1, touch2) {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
        };
    }

    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            // Check for double tap
            const now = Date.now();
            if (now - this.lastTapTime < this.doubleTapThreshold) {
                this.handleDoubleTap(touch.clientX - rect.left, touch.clientY - rect.top);
                this.lastTapTime = 0; // Reset to prevent triple tap
                return;
            }
            this.lastTapTime = now;
            
            this.touchState = {
                active: true,
                startX: touch.clientX - rect.left,
                startY: touch.clientY - rect.top,
                currentX: touch.clientX - rect.left,
                currentY: touch.clientY - rect.top,
                startTime: Date.now()
            };
            
            // Start long press timer
            this.longPressTimer = setTimeout(() => {
                if (this.touchState.active) {
                    this.handleLongPress();
                }
            }, this.longPressThreshold);
        } else if (e.touches.length === 2) {
            // Start pinch zoom
            this.isPinching = true;
            this.pinchStartDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            this.pinchStartScale = this.camera.scale;
            
            // Clear any existing timers
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.touchState.active && !this.isPinching) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            
            this.touchState.currentX = touch.clientX - rect.left;
            this.touchState.currentY = touch.clientY - rect.top;
            
            // Calculate movement distance
            const dx = this.touchState.currentX - this.touchState.startX;
            const dy = this.touchState.currentY - this.touchState.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If moved too much, cancel long press
            if (distance > 20 && this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            
            // Pan camera
            this.camera.x -= dx * 0.8 / this.camera.scale;
            this.camera.y -= dy * 0.8 / this.camera.scale;
            
            this.touchState.startX = this.touchState.currentX;
            this.touchState.startY = this.touchState.currentY;
        } else if (e.touches.length === 2 && this.isPinching) {
            // Handle pinch zoom
            const currentDistance = this.getTouchDistance(e.touches[0], e.touches[1]);
            const scaleFactor = currentDistance / this.pinchStartDistance;
            
            // Apply zoom with limits
            const newScale = Math.max(0.3, Math.min(3, this.pinchStartScale * scaleFactor));
            
            // Get touch center for zoom focus
            const rect = this.canvas.getBoundingClientRect();
            const center = this.getTouchCenter(e.touches[0], e.touches[1]);
            const centerX = center.x - rect.left;
            const centerY = center.y - rect.top;
            
            // Convert to world coordinates
            const worldX = (centerX / this.camera.scale) + this.camera.x;
            const worldY = (centerY / this.camera.scale) + this.camera.y;
            
            // Apply new scale
            const oldScale = this.camera.scale;
            this.camera.scale = newScale;
            
            // Adjust camera position to zoom towards touch center
            this.camera.x = worldX - (centerX / this.camera.scale);
            this.camera.y = worldY - (centerY / this.camera.scale);
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        if (e.touches.length === 0) {
            // All touches ended
            if (this.touchState.active && !this.isPinching) {
                const touchDuration = Date.now() - this.touchState.startTime;
                const dx = Math.abs(this.touchState.currentX - this.touchState.startX);
                const dy = Math.abs(this.touchState.currentY - this.touchState.startY);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // If it was a quick tap (not a drag or long press)
                if (touchDuration < this.longPressThreshold && distance < 20) {
                    // Wait a bit to check for double tap, otherwise handle as single tap
                    setTimeout(() => {
                        if (Date.now() - this.lastTapTime > this.doubleTapThreshold) {
                            this.handleTap(this.touchState.currentX, this.touchState.currentY);
                        }
                    }, this.doubleTapThreshold + 50);
                }
            }
            
            this.touchState.active = false;
            this.isPinching = false;
        } else if (e.touches.length === 1 && this.isPinching) {
            // One finger lifted during pinch, end pinch mode
            this.isPinching = false;
        }
    }
    
    handleDoubleTap(x, y) {
        // Zoom in on double tap
        const zoomFactor = this.camera.scale < 1.5 ? 1.8 : 0.6;
        
        // Convert tap position to world coordinates
        const worldX = (x / this.camera.scale) + this.camera.x;
        const worldY = (y / this.camera.scale) + this.camera.y;
        
        // Apply new scale with limits
        this.camera.scale = Math.max(0.3, Math.min(3, this.camera.scale * zoomFactor));
        
        // Adjust camera to keep the tapped point centered
        this.camera.x = worldX - (x / this.camera.scale);
        this.camera.y = worldY - (y / this.camera.scale);
        
        this.showMobileNotification(
            this.camera.scale > 1.5 ? 'Zoomed in!' : 'Zoomed out!', 
            'success'
        );
    }
    
    handleTap(x, y) {
        if (this.placementMode && this.selectedBuilding) {
            this.tryPlaceMobileBuilding(x, y);
        }
    }
    
    handleLongPress() {
        const worldPos = this.screenToWorld(this.touchState.currentX, this.touchState.currentY);
        this.sendScoutToExplore(worldPos.x, worldPos.y);
    }
    
    sendScoutToExplore(x, y) {
        if (this.scouts.length === 0) {
            this.showMobileNotification('No scouts available!', 'warning');
            return;
        }
        
        const scout = this.scouts[0];
        scout.target = { x, y };
        scout.exploring = true;
        
        this.showMobileNotification('Scout dispatched!', 'success');
    }
    
    tryPlaceMobileBuilding(screenX, screenY) {
        const worldPos = this.screenToWorld(screenX, screenY);
        const buildingData = this.getBuildingData(this.selectedBuilding);
        
        if (!buildingData) return;
        
        if (!this.canAfford(buildingData.cost)) {
            this.showMobileNotification('Not enough resources!', 'error');
            return;
        }
        
        if (!this.isValidPlacement(worldPos.x, worldPos.y)) {
            this.showMobileNotification('Invalid location!', 'warning');
            return;
        }
        
        this.addBuilding(this.selectedBuilding, worldPos.x, worldPos.y);
        this.spendResources(buildingData.cost);
        this.cancelMobilePlacement();
        
        this.showMobileNotification(`${buildingData.name} built!`, 'success');
    }
    
    cancelMobilePlacement() {
        this.selectedBuilding = null;
        this.placementMode = false;
        
        document.querySelectorAll('.mobile-building-card').forEach(card => {
            card.classList.remove('selected');
        });
    }
    
    showMobileNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `mobile-notification ${type}`;
        notification.textContent = message;
        
        document.getElementById('mobileNotifications').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    showDeviceInfoModal() {
        document.getElementById('mobileDeviceModal').classList.add('active');
    }
    
    showHelpModal() {
        document.getElementById('mobileHelpModal').classList.add('active');
    }
    
    updateMobileResourceDisplay() {
        // Calculate production rates
        const productionRates = { food: 0, wood: 0, iron: 0, gold: 0 };
        
        this.buildings.forEach(building => {
            if (building.produces) {
                for (const [resource, amount] of Object.entries(building.produces)) {
                    if (productionRates.hasOwnProperty(resource)) {
                        productionRates[resource] += amount / 3;
                    }
                }
            }
        });
        
        document.getElementById('mobileFood').textContent = Math.floor(this.resources.food);
        document.querySelector('#mobileFood').nextElementSibling.textContent = `(${productionRates.food > 0 ? '+' : ''}${productionRates.food.toFixed(1)}/s)`;
        
        document.getElementById('mobileWood').textContent = Math.floor(this.resources.wood);
        document.querySelector('#mobileWood').nextElementSibling.textContent = `(${productionRates.wood > 0 ? '+' : ''}${productionRates.wood.toFixed(1)}/s)`;
        
        document.getElementById('mobileIron').textContent = Math.floor(this.resources.iron);
        document.querySelector('#mobileIron').nextElementSibling.textContent = `(${productionRates.iron > 0 ? '+' : ''}${productionRates.iron.toFixed(1)}/s)`;
        
        document.getElementById('mobileGold').textContent = Math.floor(this.resources.gold);
        document.querySelector('#mobileGold').nextElementSibling.textContent = `(${productionRates.gold > 0 ? '+' : ''}${productionRates.gold.toFixed(1)}/s)`;
    }
    
    updateMobilePopulationDisplay() {
        document.getElementById('mobilePop').textContent = this.population;
    }
    
    updateMobileStatsDisplay() {
        // Calculate stats based on buildings
        const temples = this.buildings.filter(b => b.type === 'temple').length;
        const happiness = Math.min(100, 50 + temples * 15);
        
        const blacksmiths = this.buildings.filter(b => b.type === 'blacksmith').length;
        const defense = Math.min(100, blacksmiths * 20);
        
        const tradingPosts = this.buildings.filter(b => b.type === 'tradingpost').length;
        const prosperity = Math.min(100, 30 + tradingPosts * 25);
        
        document.getElementById('mobileHappinessBar').style.width = `${happiness}%`;
        document.getElementById('mobileDefenseBar').style.width = `${defense}%`;
        document.getElementById('mobileProsperityBar').style.width = `${prosperity}%`;
    }
    
    saveMobileGame() {
        try {
            // Convert fog of war data to serializable format
            const fogOfWarData = {};
            for (const [chunkKey, fogData] of this.fogOfWar) {
                try {
                    fogOfWarData[chunkKey] = fogData.canvas.toDataURL();
                } catch (e) {
                    console.warn(`Failed to serialize fog data for chunk ${chunkKey}:`, e);
                    // Skip this chunk's fog data
                }
            }

            const gameState = {
                version: this.gameVersion,
                resources: this.resources,
                population: this.population,
                buildings: this.buildings,
                camera: this.camera,
                scouts: this.scouts,
                seed: this.seed,
                exploredAreas: Array.from(this.exploredAreas),
                fogOfWarData: fogOfWarData,
                deviceInfo: this.deviceInfo,
                saveTime: Date.now()
            };
            
            // Try to serialize the game state
            const serializedData = JSON.stringify(gameState);
            
            // Check if the data is too large for localStorage
            if (serializedData.length > 5000000) { // ~5MB limit
                console.warn('Save data too large, compressing...');
                // Remove fog of war data to reduce size
                delete gameState.fogOfWarData;
                localStorage.setItem('vikingSettlementMobile', JSON.stringify(gameState));
                this.showMobileNotification('Game saved (without fog data)', 'warning');
            } else {
                localStorage.setItem('vikingSettlementMobile', serializedData);
                this.showMobileNotification('Game saved!', 'success');
            }
        } catch (error) {
            console.error('Failed to save mobile game:', error);
            
            // Try saving without fog of war data as fallback
            try {
                const minimalGameState = {
                    version: this.gameVersion,
                    resources: this.resources,
                    population: this.population,
                    buildings: this.buildings,
                    camera: this.camera,
                    scouts: this.scouts,
                    seed: this.seed,
                    exploredAreas: Array.from(this.exploredAreas),
                    saveTime: Date.now()
                };
                
                localStorage.setItem('vikingSettlementMobile', JSON.stringify(minimalGameState));
                this.showMobileNotification('Game saved (minimal)', 'warning');
            } catch (fallbackError) {
                console.error('Even fallback save failed:', fallbackError);
                this.showMobileNotification('Failed to save game!', 'error');
            }
        }
    }
    
    loadGame() {
        try {
            const saved = localStorage.getItem('vikingSettlementMobile');
            if (!saved) return false;

            const gameState = JSON.parse(saved);
            
            // Verify version compatibility
            if (!gameState.version || gameState.version !== this.gameVersion) {
                console.warn('Version mismatch or missing version in save');
                this.showMobileNotification('Save version different, loading anyway...', 'warning');
            }

            // Validate save data integrity
            if (!this.validateSaveData(gameState)) {
                this.showMobileNotification('Save data corrupted, starting fresh', 'error');
                localStorage.removeItem('vikingSettlementMobile');
                return false;
            }
            
            this.resources = gameState.resources || { food: 100, wood: 50, iron: 25, gold: 10 };
            this.population = gameState.population || 5;
            this.buildings = gameState.buildings || [];
            
            if (gameState.camera) {
                this.camera = { ...gameState.camera };
            }
            
            this.scouts = [];
            if (gameState.scouts && Array.isArray(gameState.scouts) && gameState.scouts.length > 0) {
                this.scouts = gameState.scouts;
            } else {
                this.spawnInitialScout();
            }
            
            if (gameState.seed !== undefined) {
                this.seed = gameState.seed;
            }
            
            if (gameState.exploredAreas && Array.isArray(gameState.exploredAreas)) {
                this.exploredAreas = new Set(gameState.exploredAreas);
            }
            
            // Load chunks first
            this.loadNearbyChunks();
            
            // Restore fog of war data if available
            if (gameState.fogOfWarData && typeof gameState.fogOfWarData === 'object') {
                this.restoreFogOfWarFromSave(gameState.fogOfWarData);
            } else {
                // Fallback to basic restoration
                this.restoreFogOfWar();
            }
            
            this.updateMobileResourceDisplay();
            this.updateMobilePopulationDisplay();
            this.updateMobileStatsDisplay();
            
            this.showMobileNotification('Game loaded!', 'success');
            return true;
        } catch (error) {
            console.error('Failed to load mobile game:', error);
            this.showMobileNotification('Failed to load save!', 'error');
            
            // Clear corrupted save
            try {
                localStorage.removeItem('vikingSettlementMobile');
            } catch (clearError) {
                console.error('Failed to clear corrupted save:', clearError);
            }
            
            return false;
        }
    }

    validateSaveData(gameState) {
        try {
            // Check if required fields exist and are of correct type
            if (!gameState || typeof gameState !== 'object') return false;
            if (typeof gameState.resources !== 'object' || gameState.resources === null) return false;
            if (typeof gameState.population !== 'number' || isNaN(gameState.population)) return false;
            if (!Array.isArray(gameState.buildings)) return false;
            if (typeof gameState.camera !== 'object' || gameState.camera === null) return false;
            if (!Array.isArray(gameState.scouts)) return false;
            if (typeof gameState.seed !== 'number' || isNaN(gameState.seed)) return false;
            
            // Validate resources
            const requiredResources = ['food', 'wood', 'iron', 'gold'];
            for (const resource of requiredResources) {
                if (typeof gameState.resources[resource] !== 'number' || isNaN(gameState.resources[resource])) {
                    return false;
                }
            }
            
            // Validate camera
            if (typeof gameState.camera.x !== 'number' || isNaN(gameState.camera.x) ||
                typeof gameState.camera.y !== 'number' || isNaN(gameState.camera.y) ||
                typeof gameState.camera.scale !== 'number' || isNaN(gameState.camera.scale)) {
                return false;
            }
            
            // Validate buildings array
            if (!Array.isArray(gameState.buildings)) return false;
            for (const building of gameState.buildings) {
                if (!building || typeof building !== 'object') return false;
                if (typeof building.x !== 'number' || isNaN(building.x)) return false;
                if (typeof building.y !== 'number' || isNaN(building.y)) return false;
                if (typeof building.type !== 'string') return false;
            }
            
            return true;
        } catch (error) {
            console.error('Mobile save data validation failed:', error);
            return false;
        }
    }

    restoreFogOfWarFromSave(fogOfWarData) {
        try {
            const loadPromises = [];
            
            for (const [chunkKey, dataURL] of Object.entries(fogOfWarData)) {
                if (typeof dataURL !== 'string' || !dataURL.startsWith('data:image/')) {
                    console.warn(`Invalid fog data for chunk ${chunkKey}`);
                    continue;
                }
                
                const promise = new Promise((resolve) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        try {
                            // Get or create fog canvas for this chunk
                            let fogData = this.fogOfWar.get(chunkKey);
                            if (!fogData) {
                                const [chunkX, chunkY] = chunkKey.split(',').map(Number);
                                if (isNaN(chunkX) || isNaN(chunkY)) {
                                    console.warn(`Invalid chunk coordinates: ${chunkKey}`);
                                    resolve();
                                    return;
                                }
                                this.initializeChunkFogOfWar(chunkX, chunkY);
                                fogData = this.fogOfWar.get(chunkKey);
                            }
                            
                            if (fogData && fogData.ctx) {
                                // Clear the canvas and draw the saved fog data
                                fogData.ctx.clearRect(0, 0, this.chunkSize, this.chunkSize);
                                fogData.ctx.drawImage(img, 0, 0);
                            }
                        } catch (error) {
                            console.warn(`Failed to restore fog for chunk ${chunkKey}:`, error);
                        }
                        resolve();
                    };
                    
                    img.onerror = () => {
                        console.warn(`Failed to load fog image for chunk ${chunkKey}`);
                        resolve();
                    };
                    
                    // Set timeout to prevent hanging
                    setTimeout(() => {
                        console.warn(`Timeout loading fog data for chunk ${chunkKey}`);
                        resolve();
                    }, 5000);
                    
                    img.src = dataURL;
                });
                
                loadPromises.push(promise);
            }
            
            // Wait for all fog data to load (with timeout)
            Promise.all(loadPromises).then(() => {
                console.log('Fog of war restoration completed');
            }).catch((error) => {
                console.error('Error during fog restoration:', error);
                // Fallback to basic restoration
                this.restoreFogOfWar();
            });
            
        } catch (error) {
            console.error('Failed to restore mobile fog of war:', error);
            // Fallback to basic restoration
            this.restoreFogOfWar();
        }
    }
    
    getBuildingData(type) {
        const buildings = {
            longhouse: {
                name: 'Longhouse',
                sprite: 'longhouse_sprite.png',
                cost: { wood: 20, food: 10 },
                produces: { population: 3 },
                size: 32
            },
            farm: {
                name: 'Farm',
                sprite: 'farm_sprite.png',
                cost: { wood: 15 },
                produces: { food: 2 },
                size: 28
            },
            lumbermill: {
                name: 'Lumber Mill',
                sprite: 'lumbermill_sprite.png',
                cost: { wood: 25, iron: 5 },
                produces: { wood: 3 },
                size: 30
            },
            blacksmith: {
                name: 'Blacksmith',
                sprite: 'blacksmith_sprite.png',
                cost: { wood: 30, iron: 10 },
                produces: { iron: 2 },
                size: 26
            },
            tradingpost: {
                name: 'Trading Post',
                sprite: 'tradingpost_sprite.png',
                cost: { wood: 40, gold: 5 },
                produces: { gold: 1 },
                size: 30
            },
            temple: {
                name: 'Temple',
                sprite: 'temple_sprite.png',
                cost: { wood: 50, iron: 20, gold: 15 },
                produces: { happiness: 10 },
                size: 36
            }
        };
        
        return buildings[type];
    }
    
    canAfford(cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            if (this.resources[resource] < amount) {
                return false;
            }
        }
        return true;
    }
    
    spendResources(cost) {
        for (const [resource, amount] of Object.entries(cost)) {
            this.resources[resource] -= amount;
        }
        this.updateMobileResourceDisplay();
    }
    
    addBuilding(type, x, y) {
        const buildingData = this.getBuildingData(type);
        if (!buildingData) return;
        
        const building = {
            type,
            x,
            y,
            ...buildingData,
            level: 1,
            production: 0,
            lastUpdate: Date.now()
        };
        
        this.buildings.push(building);
        this.updateMobileStatsDisplay();
    }
    
    isValidPlacement(x, y) {
        // Simplified validation for mobile
        for (const building of this.buildings) {
            const distance = Math.sqrt((building.x - x) ** 2 + (building.y - y) ** 2);
            if (distance < building.size) {
                return false;
            }
        }
        return true;
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.camera.scale) + this.camera.x,
            y: (screenY / this.camera.scale) + this.camera.y
        };
    }
    
    loadNearbyChunks() {
        const cameraChunk = this.getChunkCoords(this.camera.x + this.canvas.width / (2 * this.camera.scale), 
                                                this.camera.y + this.canvas.height / (2 * this.camera.scale));
        
        // Load chunks in a radius around camera
        for (let x = cameraChunk.x - this.chunkLoadRadius; x <= cameraChunk.x + this.chunkLoadRadius; x++) {
            for (let y = cameraChunk.y - this.chunkLoadRadius; y <= cameraChunk.y + this.chunkLoadRadius; y++) {
                const chunkKey = this.getChunkKey(x, y);
                if (!this.loadedChunks.has(chunkKey)) {
                    this.generateChunk(x, y);
                }
            }
        }
        
        // Unload distant chunks to save memory
        this.unloadDistantChunks(cameraChunk.x, cameraChunk.y);
    }
    
    getChunkCoords(worldX, worldY) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize)
        };
    }
    
    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }
    
    generateChunk(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        const worldX = chunkX * this.chunkSize;
        const worldY = chunkY * this.chunkSize;
        
        // Create chunk data structure
        const chunk = {
            x: chunkX,
            y: chunkY,
            worldX: worldX,
            worldY: worldY,
            tiles: [],
            textureCanvas: document.createElement('canvas'),
            detailCanvas: document.createElement('canvas'),
            generated: false
        };
        
        // Setup canvases
        chunk.textureCanvas.width = this.chunkSize;
        chunk.textureCanvas.height = this.chunkSize;
        chunk.textureCtx = chunk.textureCanvas.getContext('2d');
        
        chunk.detailCanvas.width = this.chunkSize;
        chunk.detailCanvas.height = this.chunkSize;
        chunk.detailCtx = chunk.detailCanvas.getContext('2d');
        
        // Generate tiles for this chunk
        this.generateChunkTerrain(chunk);
        
        // Render chunk textures
        this.renderChunkTextures(chunk);
        
        // Initialize fog of war for this chunk
        this.initializeChunkFogOfWar(chunkX, chunkY);
        
        // Store chunk
        this.loadedChunks.set(chunkKey, chunk);
        chunk.generated = true;
    }
    
    generateChunkTerrain(chunk) {
        const tilesPerChunk = this.chunkSize / this.tileSize;
        
        for (let tileX = 0; tileX < tilesPerChunk; tileX++) {
            for (let tileY = 0; tileY < tilesPerChunk; tileY++) {
                const worldTileX = chunk.worldX + (tileX * this.tileSize);
                const worldTileY = chunk.worldY + (tileY * this.tileSize);
                
                // Generate biome-based terrain
                const biomeData = this.getBiomeAt(worldTileX, worldTileY);
                const tileType = this.generateBiomeTerrain(worldTileX, worldTileY, biomeData);
                
                chunk.tiles.push({
                    localX: tileX * this.tileSize,
                    localY: tileY * this.tileSize,
                    worldX: worldTileX,
                    worldY: worldTileY,
                    type: tileType,
                    biome: biomeData.primary,
                    biomeStrength: biomeData.strength,
                    elevation: biomeData.elevation,
                    temperature: biomeData.temperature,
                    moisture: biomeData.moisture,
                    noise: this.seededNoise(worldTileX * 0.02, worldTileY * 0.02),
                    detailNoise: this.seededNoise(worldTileX * 0.05, worldTileY * 0.05)
                });
            }
        }
    }
    
    getBiomeAt(x, y) {
        // Enhanced biome determination with new types
        const scale = 0.003;
        const temperatureNoise = this.seededNoise(x * scale + this.seed, y * scale + this.seed);
        const moistureNoise = this.seededNoise(x * scale + this.seed + 1000, y * scale + this.seed + 1000);
        const elevationNoise = this.seededNoise(x * scale * 0.5 + this.seed + 2000, y * scale * 0.5 + this.seed + 2000);
        const volcanicNoise = this.seededNoise(x * scale * 0.8 + this.seed + 3000, y * scale * 0.8 + this.seed + 3000);
        
        const temperature = (temperatureNoise + 1) * 0.5;
        const moisture = (moistureNoise + 1) * 0.5;
        const elevation = (elevationNoise + 1) * 0.5;
        const volcanic = (volcanicNoise + 1) * 0.5;
        
        let primaryBiome = 'temperate_plains';
        
        // Polar ice seas (extremely cold, high moisture)
        if (temperature < 0.15) {
            primaryBiome = 'polar_ice';
        }
        // Arctic tundra (very cold)
        else if (temperature < 0.25) {
            primaryBiome = 'arctic_tundra';
        }
        // Volcanic regions (high volcanic activity)
        else if (volcanic > 0.8) {
            primaryBiome = 'volcanic_region';
        }
        // Tropical forests (hot, wet)
        else if (temperature > 0.75 && moisture > 0.6) {
            primaryBiome = 'tropical_forest';
        }
        // Boreal forests (cold, wet)
        else if (temperature < 0.5 && moisture > 0.4) {
            primaryBiome = 'boreal_forest';
        }
        // Mountain regions
        else if (elevation > 0.7) {
            primaryBiome = 'highland_mountains';
        }
        // Fjord landscapes (high moisture, moderate temp, medium elevation)
        else if (moisture > 0.6 && temperature > 0.4 && temperature < 0.7 && elevation > 0.3 && elevation < 0.6) {
            primaryBiome = 'coastal_fjords';
        }
        // Grassland meadows (moderate conditions)
        else if (moisture > 0.3 && moisture < 0.7 && temperature > 0.4 && temperature < 0.8) {
            primaryBiome = 'grassland_meadows';
        }
        
        // Calculate transition zones between biomes
        const transitionNoise = this.seededNoise(x * 0.01 + this.seed + 4000, y * 0.01 + this.seed + 4000);
        const biomeStrength = Math.max(0.3, Math.min(1.0, 1.0 + transitionNoise * 0.3));
        
        return {
            primary: primaryBiome,
            strength: biomeStrength,
            temperature,
            moisture,
            elevation,
            volcanic
        };
    }
    
    generateBiomeTerrain(x, y, biomeData) {
        const detailNoise = this.seededNoise(x * 0.02 + this.seed, y * 0.02 + this.seed);
        const microNoise = this.seededNoise(x * 0.05 + this.seed + 500, y * 0.05 + this.seed + 500);
        
        // Enhanced biome generation with volcanic and polar regions
        switch (biomeData.primary) {
            case 'arctic_tundra':
                return this.generateArcticTerrain(biomeData, detailNoise, microNoise);
            
            case 'boreal_forest':
                return this.generateBorealTerrain(biomeData, detailNoise, microNoise);
                
            case 'tropical_forest':
                return this.generateTropicalTerrain(biomeData, detailNoise, microNoise);
            
            case 'coastal_fjords':
                return this.generateCoastalTerrain(biomeData, detailNoise, microNoise);
                
            case 'volcanic_region':
                return this.generateVolcanicTerrain(biomeData, detailNoise, microNoise);
                
            case 'polar_ice':
                return this.generatePolarTerrain(biomeData, detailNoise, microNoise);
            
            case 'highland_mountains':
                return this.generateMountainTerrain(biomeData, detailNoise, microNoise);
                
            case 'grassland_meadows':
                return this.generateMeadowTerrain(biomeData, detailNoise, microNoise);
            
            case 'temperate_plains':
            default:
                return this.generateTemperateTerrain(biomeData, detailNoise, microNoise);
        }
    }

    generateArcticTerrain(biomeData, detailNoise, microNoise) {
        // Arctic tundra: mostly snow, some ice, sparse vegetation
        if (biomeData.elevation < 0.2) {
            return detailNoise < -0.3 ? 'arctic_ice' : 'snow';
        } else if (biomeData.elevation < 0.4 && detailNoise > 0.2) {
            return 'tundra_grass';
        } else if (microNoise > 0.4 && biomeData.moisture > 0.3) {
            return 'sparse_forest';
        }
        return 'snow';
    }
    
    generateBorealTerrain(biomeData, detailNoise, microNoise) {
        // Boreal forest: dense coniferous forests, lakes, rocky areas
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.6) {
            return detailNoise < -0.2 ? 'boreal_lake' : 'wetland';
        } else if (biomeData.moisture > 0.4) {
            return detailNoise > 0.2 ? 'dense_conifer_forest' : 'conifer_forest';
        } else if (biomeData.elevation > 0.6) {
            return 'rocky_terrain';
        }
        return microNoise > 0 ? 'conifer_forest' : 'boreal_clearing';
    }
    
    generateTropicalTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.7) {
            return detailNoise < -0.3 ? 'tropical_lagoon' : 'mangrove_swamp';
        } else if (biomeData.moisture > 0.6) {
            return detailNoise > 0.2 ? 'dense_tropical_forest' : 'tropical_rainforest';
        } else if (biomeData.elevation > 0.6) {
            return 'tropical_plateau';
        }
        return microNoise > 0 ? 'tropical_grassland' : 'palm_grove';
    }
    
    generateVolcanicTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.8) {
            return detailNoise > 0.3 ? 'volcanic_peak' : 'lava_flow';
        } else if (biomeData.elevation > 0.5) {
            return microNoise > 0.2 ? 'volcanic_slope' : 'obsidian_field';
        } else if (biomeData.temperature > 0.7) {
            return 'hot_springs';
        }
        return detailNoise > 0 ? 'volcanic_ash' : 'pumice_field';
    }
    
    generatePolarTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.1) {
            return 'polar_ocean';
        } else if (biomeData.elevation < 0.3) {
            return detailNoise < -0.2 ? 'sea_ice' : 'ice_shelf';
        } else if (microNoise > 0.4) {
            return 'glacier';
        }
        return 'frozen_tundra';
    }
    
    generateMeadowTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.6) {
            return 'meadow_stream';
        } else if (biomeData.moisture > 0.4) {
            return detailNoise > 0.1 ? 'wildflower_meadow' : 'rolling_grassland';
        } else if (microNoise > 0.3) {
            return 'prairie_grass';
        }
        return 'meadow_grass';
    }
    
    generateTemperateTerrain(biomeData, detailNoise, microNoise) {
        // Temperate plains: varied grasslands, deciduous forests, rivers
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.7) {
            return detailNoise < -0.2 ? 'river' : 'wetland';
        } else if (biomeData.moisture > 0.5 && detailNoise > 0.1) {
            return microNoise > 0.3 ? 'deciduous_forest' : 'mixed_forest';
        } else if (biomeData.moisture < 0.3 && detailNoise < -0.2) {
            return 'dry_grassland';
        } else if (microNoise > 0.4) {
            return 'flowering_meadow';
        }
        return 'grass';
    }
    
    seededNoise(x, y) {
        // Seeded multi-octave noise for consistent infinite generation
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        
        for (let i = 0; i < 3; i++) { // Reduced octaves for mobile performance
            const px = x * frequency;
            const py = y * frequency;
            
            // Simple seeded noise function
            const n = Math.sin(px * 2.3 + py * 1.7 + this.seed) * 
                     Math.cos(px * 1.9 + py * 2.1 + this.seed) * 
                     Math.sin(px * 3.1 + py * 2.9 + this.seed * 2);
            
            value += n * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return Math.max(-1, Math.min(1, value * 0.5));
    }
    
    renderChunkTextures(chunk) {
        const ctx = chunk.textureCtx;
        const detailCtx = chunk.detailCtx;
        
        // Render base terrain
        chunk.tiles.forEach(tile => {
            this.drawEnhancedTerrainTile(ctx, tile.type, tile.localX, tile.localY, this.tileSize, tile.noise, tile.detailNoise, tile.moisture);
        });
        
        // Add detail overlay
        chunk.tiles.forEach(tile => {
            this.drawTerrainDetails(detailCtx, tile.type, tile.localX, tile.localY, this.tileSize, tile.detailNoise);
        });
    }
    
    drawEnhancedTerrainTile(ctx, tileType, x, y, size, noise, detailNoise, moisture) {
        switch (tileType) {
            // Basic terrain types
            case 'grass':
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'snow':
                this.drawEnhancedSnowTile(ctx, x, y, size, detailNoise);
                break;
            case 'water':
            case 'shallow_water':
                this.drawEnhancedWaterTile(ctx, x, y, size, '#1976d2', '#2196f3', '#64b5f6');
                break;
            case 'deep_fjord_water':
                this.drawDeepFjordTile(ctx, x, y, size);
                break;
            case 'beach':
                this.drawEnhancedBeachTile(ctx, x, y, size, moisture);
                break;
            case 'hills':
                this.drawEnhancedHillsTile(ctx, x, y, size, detailNoise);
                break;
            case 'mountains':
            case 'highland_mountains':
                this.drawEnhancedMountainTile(ctx, x, y, size, detailNoise);
                break;
            
            // Forest types
            case 'conifer_forest':
                this.drawConiferForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'dense_conifer_forest':
                this.drawDenseConiferTile(ctx, x, y, size, detailNoise);
                break;
            case 'deciduous_forest':
                this.drawDeciduousForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'mixed_forest':
                this.drawMixedForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'sparse_forest':
                this.drawSparseForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_forest':
                this.drawAlpineForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'mountain_forest':
                this.drawMountainForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'coastal_forest':
                this.drawCoastalForestTile(ctx, x, y, size, detailNoise);
                break;
            
            // Arctic biome
            case 'arctic_ice':
                this.drawArcticIceTile(ctx, x, y, size);
                break;
            case 'tundra_grass':
                this.drawTundraGrassTile(ctx, x, y, size, detailNoise);
                break;
            
            // Boreal biome
            case 'boreal_lake':
                this.drawBorealLakeTile(ctx, x, y, size);
                break;
            case 'wetland':
                this.drawWetlandTile(ctx, x, y, size, moisture);
                break;
            case 'boreal_clearing':
                this.drawBorealClearingTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_terrain':
                this.drawRockyTerrainTile(ctx, x, y, size, detailNoise);
                break;
            
            // Coastal biome
            case 'rocky_shore':
                this.drawRockyShoreTile(ctx, x, y, size, detailNoise);
                break;
            case 'sea_cliff':
                this.drawSeaCliffTile(ctx, x, y, size, detailNoise);
                break;
            case 'coastal_grass':
                this.drawCoastalGrassTile(ctx, x, y, size, moisture);
                break;
            
            // Mountain biome
            case 'snow_peak':
                this.drawSnowPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_peak':
                this.drawRockyPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_slope':
                this.drawRockySlopeTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_meadow':
                this.drawAlpineMeadowTile(ctx, x, y, size, detailNoise);
                break;
            case 'mountain_stream':
                this.drawMountainStreamTile(ctx, x, y, size);
                break;
            
            // Temperate biome
            case 'river':
                this.drawRiverTile(ctx, x, y, size);
                break;
            case 'dry_grassland':
                this.drawDryGrasslandTile(ctx, x, y, size, detailNoise);
                break;
            case 'flowering_meadow':
                this.drawFloweringMeadowTile(ctx, x, y, size, detailNoise);
                break;
            
            // Default fallback
            default:
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture);
                break;
        }
    }
    
    drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture) {
        // Grass color variation based on moisture and detail noise
        const baseGreen = moisture > 0 ? '#4caf50' : '#7cb342';
        const lightGreen = moisture > 0 ? '#66bb6a' : '#8bc34a';
        const darkGreen = moisture > 0 ? '#388e3c' : '#689f38';
        
        // Create varied grass base
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, lightGreen);
        gradient.addColorStop(0.7, baseGreen);
        gradient.addColorStop(1, darkGreen);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Grass texture patches
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = detailNoise > 0 ? lightGreen : darkGreen;
        for (let i = 0; i < Math.max(2, Math.floor(size / 4)); i++) {
            const patchX = x + Math.random() * size;
            const patchY = y + Math.random() * size;
            const patchSize = Math.max(1, 2 + Math.random() * 2);
            ctx.fillRect(patchX, patchY, patchSize, patchSize);
        }
        ctx.globalAlpha = 1;
        
        // Varied flowers
        if (moisture > 0.3 && Math.random() < 0.2) {
            const colors = ['#ffeb3b', '#e91e63', '#9c27b0', '#ffffff'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            const flowerX = x + size * 0.3 + Math.random() * size * 0.4;
            const flowerY = y + size * 0.3 + Math.random() * size * 0.4;
            ctx.beginPath();
            ctx.arc(flowerX, flowerY, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawEnhancedSnowTile(ctx, x, y, size, detailNoise) {
        // Snow base
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#f8f8ff');
        gradient.addColorStop(1, '#e6e6fa');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Snow texture variations
        ctx.fillStyle = '#fffafa';
        for (let i = 0; i < Math.max(3, Math.floor(size / 4)); i++) {
            const snowX = x + Math.random() * size;
            const snowY = y + Math.random() * size;
            const snowSize = Math.max(1, 1 + Math.random() * 2);
            ctx.beginPath();
            ctx.arc(snowX, snowY, snowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Snow drifts
        if (detailNoise > 0.2) {
            ctx.fillStyle = '#f0f8ff';
            for (let i = 0; i < Math.max(1, Math.floor(size / 12)); i++) {
                const driftX = x + Math.random() * size;
                const driftY = y + Math.random() * size;
                ctx.beginPath();
                ctx.ellipse(driftX, driftY, Math.max(2, size / 6), Math.max(1, size / 8), Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Sparkles in the snow
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < Math.max(2, Math.floor(size / 6)); i++) {
            const sparkleX = x + Math.random() * size;
            const sparkleY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(sparkleX, sparkleY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawEnhancedWaterTile(ctx, x, y, size, deep, mid, light) {
        // Enhanced water with Perlin noise wave simulation
        this.waveSystem.time += 0.016;
        
        // Calculate wave height at this position
        let waveHeight = 0;
        
        // Small ripples
        this.waveSystem.smallWaves.forEach(wave => {
            const waveX = x * wave.frequency + this.waveSystem.time * wave.speed + wave.offset;
            const waveY = y * wave.frequency + this.waveSystem.time * wave.speed * 0.7 + wave.offset;
            waveHeight += Math.sin(waveX) * Math.cos(waveY) * wave.amplitude;
        });
        
        // Large oceanic swells
        this.waveSystem.largeWaves.forEach(wave => {
            const waveX = x * wave.frequency + this.waveSystem.time * wave.speed + wave.offset;
            const waveY = y * wave.frequency + this.waveSystem.time * wave.speed * 1.3 + wave.offset;
            waveHeight += Math.sin(waveX) * Math.sin(waveY) * wave.amplitude;
        });
        
        // Normalize wave height
        waveHeight = Math.max(-3, Math.min(3, waveHeight));
        
        // Create depth-based water rendering
        const depthVariation = 0.5 + (waveHeight + 3) / 12; // Convert to 0-1 range
        
        // Shallow water (transparent with visible seabed)
        if (depthVariation < 0.3) {
            // Seabed
            ctx.fillStyle = '#d2b48c';
            ctx.fillRect(x, y, size, size);
            
            // Transparent shallow water
            const alpha = 0.3 + depthVariation * 0.4;
            ctx.fillStyle = `rgba(64, 164, 223, ${alpha})`;
            ctx.fillRect(x, y, size, size);
        } else {
            // Deep ocean with darker gradients
            const darkness = Math.min(0.8, depthVariation);
            const deepColor = this.interpolateColor('#1565c0', '#0d47a1', darkness);
            const midColor = this.interpolateColor('#1976d2', '#1565c0', darkness);
            const lightColor = this.interpolateColor('#42a5f5', '#1976d2', darkness);
            
            const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
            gradient.addColorStop(0, lightColor);
            gradient.addColorStop(0.5, midColor);
            gradient.addColorStop(1, deepColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, size, size);
        }
        
        // Water surface effects
        ctx.save();
        ctx.globalAlpha = 0.4;
        
        // Wave highlights
        if (waveHeight > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${waveHeight / 6})`;
            ctx.fillRect(x, y + Math.floor(waveHeight), size, Math.max(1, Math.floor(size / 8)));
        }
        
        // Wave foam
        if (waveHeight > 1.5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            for (let i = 0; i < 3; i++) {
                const foamX = x + Math.random() * size;
                const foamY = y + Math.random() * size;
                ctx.beginPath();
                ctx.arc(foamX, foamY, Math.max(1, waveHeight / 3), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }

    interpolateColor(color1, color2, factor) {
        // Convert hex to RGB
        const hex1 = color1.slice(1);
        const hex2 = color2.slice(1);
        
        const r1 = parseInt(hex1.substr(0, 2), 16);
        const g1 = parseInt(hex1.substr(2, 2), 16);
        const b1 = parseInt(hex1.substr(4, 2), 16);
        
        const r2 = parseInt(hex2.substr(0, 2), 16);
        const g2 = parseInt(hex2.substr(2, 2), 16);
        const b2 = parseInt(hex2.substr(4, 2), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    drawEnhancedBeachTile(ctx, x, y, size, moisture) {
        // Varied sand colors based on moisture
        const baseColor = moisture > 0.5 ? '#9ccc65' : '#8bc34a';
        const lightColor = moisture > 0.5 ? '#aed581' : '#9ccc65';
        const darkColor = '#689f38';
        
        // Base gradient
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, darkColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Coastal grass patches (hardy, wind-bent)
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = darkColor;
        for (let i = 0; i < Math.max(3, Math.floor(size / 5)); i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            const grassSize = Math.max(1, 1 + Math.random() * 2);
            // Slightly bent grass (coastal wind effect)
            ctx.fillRect(grassX, grassY, grassSize, Math.max(2, size / 6));
            ctx.fillRect(grassX + 1, grassY - 1, 1, Math.max(1, size / 8));
        }
        ctx.globalAlpha = 1;
        
        // Salt-resistant plants
        if (moisture < 0.4 && Math.random() < 0.15) {
            ctx.fillStyle = '#cddc39';
            const plantX = x + size * 0.3 + Math.random() * size * 0.4;
            const plantY = y + size * 0.3 + Math.random() * size * 0.4;
            ctx.beginPath();
            ctx.arc(plantX, plantY, Math.max(1, size / 20), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Occasional driftwood or beach debris
        if (Math.random() < 0.08) {
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(x + size * 0.6, y + size * 0.7, Math.max(2, size / 8), Math.max(1, size / 16));
        }
    }
    
    drawConiferForestTile(ctx, x, y, size, detailNoise) {
        // Base forest floor
        ctx.fillStyle = '#1b5e20';
        ctx.fillRect(x, y, size, size);
        
        // Coniferous trees (pine/spruce style)
        const treeCount = Math.max(2, Math.floor(size / 8));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/3;
            const treeHeight = Math.max(3, size / 5);
            
            // Tree trunk
            ctx.fillStyle = '#3e2723';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            // Conifer shape (triangular)
            ctx.fillStyle = '#0d4f0d';
            ctx.beginPath();
            ctx.moveTo(treeX, treeY - treeHeight * 1.5);
            ctx.lineTo(treeX - size/10, treeY - 1);
            ctx.lineTo(treeX + size/10, treeY - 1);
            ctx.closePath();
            ctx.fill();
            
            // Tree shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(treeX + 1, treeY - treeHeight * 1.4);
            ctx.lineTo(treeX - size/12, treeY);
            ctx.lineTo(treeX + size/8, treeY);
            ctx.closePath();
            ctx.fill();
        }
        
        // Forest floor details
        if (detailNoise > 0.2) {
            ctx.fillStyle = '#2e4d2e';
            for (let i = 0; i < Math.max(3, Math.floor(size / 6)); i++) {
                const detailX = x + Math.random() * size;
                const detailY = y + Math.random() * size;
                ctx.fillRect(detailX, detailY, 1, 1);
            }
        }
    }

    drawDenseConiferTile(ctx, x, y, size, detailNoise) {
        // Darker base for dense forest
        ctx.fillStyle = '#0d3f0f';
        ctx.fillRect(x, y, size, size);
        
        // More trees packed together
        const treeCount = Math.max(4, Math.floor(size / 6));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 3) * size/3 + Math.random() * size/4;
            const treeY = y + Math.floor(i / 3) * size/3 + Math.random() * size/4;
            const treeHeight = Math.max(2, size / 6);
            
            // Tree trunk
            ctx.fillStyle = '#2d1b14';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            // Dense conifer canopy
            ctx.fillStyle = '#0a3a0a';
            ctx.beginPath();
            ctx.moveTo(treeX, treeY - treeHeight * 1.3);
            ctx.lineTo(treeX - size/12, treeY - 1);
            ctx.lineTo(treeX + size/12, treeY - 1);
            ctx.closePath();
            ctx.fill();
        }
        
        // Very dense undergrowth
        ctx.fillStyle = '#1a4d1a';
        for (let i = 0; i < Math.max(5, Math.floor(size * 0.8)); i++) {
            const undergrowthX = x + Math.random() * size;
            const undergrowthY = y + Math.random() * size;
            ctx.fillRect(undergrowthX, undergrowthY, 1, Math.max(1, size / 12));
        }
    }

    drawSparseForestTile(ctx, x, y, size, detailNoise) {
        // Grass base with scattered trees
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(x, y, size, size);
        
        // Few scattered coniferous trees
        const treeCount = Math.max(1, Math.floor(size / 12));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + Math.random() * size;
            const treeY = y + Math.random() * size;
            const treeHeight = Math.max(3, size / 4);
            
            // Tree trunk
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            // Sparse conifer
            ctx.fillStyle = '#2e7d32';
            ctx.beginPath();
            ctx.moveTo(treeX, treeY - treeHeight * 1.2);
            ctx.lineTo(treeX - size/14, treeY - 1);
            ctx.lineTo(treeX + size/14, treeY - 1);
            ctx.closePath();
            ctx.fill();
        }
        
        // Grass details
        ctx.fillStyle = '#66bb6a';
        for (let i = 0; i < Math.max(4, Math.floor(size * 0.5)); i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, Math.max(1, size / 8));
        }
    }

    drawCoastalForestTile(ctx, x, y, size, detailNoise) {
        // Coastal forest base (mixed grass/sand)
        ctx.fillStyle = '#7cb342';
        ctx.fillRect(x, y, size, size);
        
        // Coastal trees (adapted to salt air)
        const treeCount = Math.max(2, Math.floor(size / 10));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/3;
            const treeHeight = Math.max(3, size / 6);
            
            // Weathered trunk
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            // Wind-bent coastal conifer
            ctx.fillStyle = '#388e3c';
            ctx.beginPath();
            ctx.moveTo(treeX + size/20, treeY - treeHeight * 1.4); // Slightly bent
            ctx.lineTo(treeX - size/12, treeY - 1);
            ctx.lineTo(treeX + size/8, treeY - 1);
            ctx.closePath();
            ctx.fill();
        }
        
        // Coastal vegetation
        if (detailNoise > 0.1) {
            const coastalColors = ['#8bc34a', '#cddc39', '#ffeb3b'];
            ctx.fillStyle = coastalColors[Math.floor(Math.random() * coastalColors.length)];
            ctx.beginPath();
            ctx.arc(x + size * 0.7, y + size * 0.3, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawDeciduousForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Deciduous trees with seasonal variation (mobile optimized)
        const treeCount = Math.max(2, Math.floor(size / 10));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/3;
            const treeHeight = Math.max(3, size / 6);
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            const leafColors = ['#32cd32', '#90ee90', '#ffff00', '#ffa500'];
            ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)];
            ctx.beginPath();
            ctx.arc(treeX, treeY - treeHeight/2, Math.max(2, size / 10), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawMixedForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(x, y, size, size);
        
        // Mixed forest (both conifer and deciduous) (mobile optimized)
        const treeCount = Math.max(2, Math.floor(size / 12));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/3 + Math.random() * size/3;
            const treeHeight = Math.max(3, size / 6);
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            if (i % 2 === 0) {
                // Conifer
                ctx.fillStyle = '#228b22';
                ctx.beginPath();
                ctx.moveTo(treeX, treeY - treeHeight * 1.5);
                ctx.lineTo(treeX - size/12, treeY - 1);
                ctx.lineTo(treeX + size/12, treeY - 1);
                ctx.closePath();
                ctx.fill();
            } else {
                // Deciduous
                ctx.fillStyle = '#32cd32';
                ctx.beginPath();
                ctx.arc(treeX, treeY - treeHeight/2, Math.max(2, size / 12), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawAlpineForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2f4f2f';
        ctx.fillRect(x, y, size, size);
        
        // Alpine trees (hardy conifers) (mobile optimized)
        const treeCount = Math.max(1, Math.floor(size / 12));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/3;
            const treeHeight = Math.max(2, size / 8);
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            ctx.fillStyle = '#006400';
            ctx.beginPath();
            ctx.moveTo(treeX, treeY - treeHeight * 1.5);
            ctx.lineTo(treeX - size/16, treeY - 1);
            ctx.lineTo(treeX + size/16, treeY - 1);
            ctx.closePath();
            ctx.fill();
        }
        
        // Alpine flowers
        if (detailNoise > 0.3) {
            const colors = ['#ff69b4', '#9370db', '#00bfff'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(x + size * 0.7, y + size * 0.8, Math.max(1, size / 20), 0, Math.PI);
            ctx.fill();
        }
    }
    
    drawMountainForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Mountain forest (mixed trees) (mobile optimized)
        const treeCount = Math.max(1, Math.floor(size / 10));
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (i % 2) * size/2 + Math.random() * size/3;
            const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/3;
            const treeHeight = Math.max(3, size / 6);
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(treeX - 1, treeY, 1, treeHeight);
            
            if (Math.random() > 0.5) {
                // Conifer
                ctx.fillStyle = '#006400';
                ctx.beginPath();
                ctx.moveTo(treeX, treeY - treeHeight * 1.5);
                ctx.lineTo(treeX - size/12, treeY - 1);
                ctx.lineTo(treeX + size/12, treeY - 1);
                ctx.closePath();
                ctx.fill();
            } else {
                // Deciduous
                ctx.fillStyle = '#32cd32';
                ctx.beginPath();
                ctx.arc(treeX, treeY - treeHeight/2, Math.max(2, size / 12), 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawDeepFjordTile(ctx, x, y, size) {
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#191970');
        gradient.addColorStop(0.5, '#4169e1');
        gradient.addColorStop(1, '#0000cd');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Deep water effects
        ctx.fillStyle = '#4169e1';
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
            const waveY = y + i * size/3 + Math.sin(Date.now() * 0.001 + i) * 2;
            ctx.fillRect(x, waveY, size, 2);
        }
        ctx.globalAlpha = 1;
    }
    
    drawRockyShoreTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#696969';
        ctx.fillRect(x, y, size, size);
        
        // Rocky shore elements
        ctx.fillStyle = '#2f4f4f';
        for (let i = 0; i < 6; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            const rockSize = 3 + Math.random() * 5;
            ctx.beginPath();
            ctx.arc(rockX, rockY, rockSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Seaweed patches
        if (detailNoise > 0.1) {
            ctx.fillStyle = '#006400';
            ctx.fillRect(x + size * 0.2, y + size * 0.8, 3, 6);
            ctx.fillRect(x + size * 0.7, y + size * 0.6, 2, 5);
        }
    }
    
    drawSeaCliffTile(ctx, x, y, size, detailNoise) {
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#d3d3d3');
        gradient.addColorStop(0.6, '#a9a9a9');
        gradient.addColorStop(1, '#696969');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Cliff face detail
        ctx.strokeStyle = '#2f4f4f';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + i * size/4);
            ctx.lineTo(x + size, y + i * size/4 + Math.random() * 4 - 2);
            ctx.stroke();
        }
        
        // Seabirds
        if (detailNoise > 0.4) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px Arial';
            ctx.fillText('ᵛ', x + size * 0.7, y + size * 0.3);
            ctx.fillText('ᵛ', x + size * 0.5, y + size * 0.2);
        }
    }
    
    drawRockySlopeTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#a9a9a9';
        ctx.fillRect(x, y, size, size);
        
        // Sloped rocky terrain (mobile optimized)
        ctx.fillStyle = '#696969';
        const rockCount = Math.max(2, Math.floor(size / 8));
        for (let i = 0; i < rockCount; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            const rockSize = Math.max(1, 1 + Math.random() * (size / 8));
            ctx.beginPath();
            ctx.ellipse(rockX, rockY, rockSize, rockSize/2, Math.PI/4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Scree (loose rock)
        ctx.fillStyle = '#778899';
        const screeCount = Math.max(3, Math.floor(size / 6));
        for (let i = 0; i < screeCount; i++) {
            const screeX = x + Math.random() * size;
            const screeY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(screeX, screeY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawAlpineMeadowTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#adff2f';
        ctx.fillRect(x, y, size, size);
        
        // Alpine grass (mobile optimized)
        ctx.fillStyle = '#7cfc00';
        const grassCount = Math.max(5, Math.floor(size * 0.6));
        for (let i = 0; i < grassCount; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, Math.max(1, size / 10));
        }
        
        // Mountain flowers
        const flowers = ['#ff1493', '#ffd700', '#ff69b4', '#dda0dd', '#00bfff'];
        const flowerCount = Math.max(2, Math.floor(size / 8));
        for (let i = 0; i < flowerCount; i++) {
            ctx.fillStyle = flowers[Math.floor(Math.random() * flowers.length)];
            const flowerX = x + Math.random() * size;
            const flowerY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(flowerX, flowerY, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawMountainStreamTile(ctx, x, y, size) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Mountain stream (mobile optimized)
        ctx.strokeStyle = '#87ceeb';
        ctx.lineWidth = Math.max(1, size / 8);
        ctx.beginPath();
        ctx.moveTo(x, y + size/4);
        ctx.quadraticCurveTo(x + size/2, y + size/2, x + size, y + 3*size/4);
        ctx.stroke();
        
        // Stream bed
        ctx.strokeStyle = '#4682b4';
        ctx.lineWidth = Math.max(1, size / 12);
        ctx.beginPath();
        ctx.moveTo(x, y + size/4);
        ctx.quadraticCurveTo(x + size/2, y + size/2, x + size, y + 3*size/4);
        ctx.stroke();
        
        // Stream rocks
        ctx.fillStyle = '#696969';
        const rockCount = Math.max(1, Math.floor(size / 10));
        for (let i = 0; i < rockCount; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(rockX, rockY, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawRiverTile(ctx, x, y, size) {
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(x, y, size, size);
        
        // River water (mobile optimized)
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = Math.max(2, size / 6);
        ctx.beginPath();
        ctx.moveTo(x, y + size/3);
        ctx.quadraticCurveTo(x + size/2, y + 2*size/3, x + size, y + size/2);
        ctx.stroke();
        
        // River banks
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = Math.max(1, size / 16);
        ctx.beginPath();
        ctx.moveTo(x, y + size/3 - 2);
        ctx.quadraticCurveTo(x + size/2, y + 2*size/3 - 2, x + size, y + size/2 - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + size/3 + 2);
        ctx.quadraticCurveTo(x + size/2, y + 2*size/3 + 2, x + size, y + size/2 + 2);
        ctx.stroke();
    }
    
    drawDryGrasslandTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#daa520';
        ctx.fillRect(x, y, size, size);
        
        // Dry grass (mobile optimized)
        ctx.fillStyle = '#b8860b';
        const grassCount = Math.max(6, Math.floor(size * 0.8));
        for (let i = 0; i < grassCount; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, Math.max(1, size / 8));
        }
        
        // Scattered wildflowers
        if (detailNoise > 0.4) {
            const colors = ['#ff69b4', '#dda0dd'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.beginPath();
            ctx.arc(x + size * 0.6, y + size * 0.4, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawFloweringMeadowTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x, y, size, size);
        
        // Meadow grass (mobile optimized)
        ctx.fillStyle = '#32cd32';
        const grassCount = Math.max(5, Math.floor(size * 0.6));
        for (let i = 0; i < grassCount; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, Math.max(1, size / 10));
        }
        
        // Abundant wildflowers
        const flowers = ['#ff1493', '#ffd700', '#ff69b4', '#dda0dd', '#00bfff'];
        const flowerCount = Math.max(3, Math.floor(size / 6));
        for (let i = 0; i < flowerCount; i++) {
            ctx.fillStyle = flowers[Math.floor(Math.random() * flowers.length)];
            const flowerX = x + Math.random() * size;
            const flowerY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(flowerX, flowerY, Math.max(1, size / 16), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawCoastalGrassTile(ctx, x, y, size, moisture) {
        // Coastal grass with salt-tolerant characteristics
        const baseColor = moisture > 0.5 ? '#9ccc65' : '#8bc34a';
        const lightColor = moisture > 0.5 ? '#aed581' : '#9ccc65';
        const darkColor = '#689f38';
        
        // Base gradient
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.7, baseColor);
        gradient.addColorStop(1, darkColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Coastal grass patches (hardy, wind-bent)
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = darkColor;
        for (let i = 0; i < Math.max(3, Math.floor(size / 5)); i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            const grassSize = Math.max(1, 1 + Math.random() * 2);
            // Slightly bent grass (coastal wind effect)
            ctx.fillRect(grassX, grassY, grassSize, Math.max(2, size / 6));
            ctx.fillRect(grassX + 1, grassY - 1, 1, Math.max(1, size / 8));
        }
        ctx.globalAlpha = 1;
        
        // Salt-resistant plants
        if (moisture < 0.4 && Math.random() < 0.15) {
            ctx.fillStyle = '#cddc39';
            const plantX = x + size * 0.3 + Math.random() * size * 0.4;
            const plantY = y + size * 0.3 + Math.random() * size * 0.4;
            ctx.beginPath();
            ctx.arc(plantX, plantY, Math.max(1, size / 20), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Occasional driftwood or beach debris
        if (Math.random() < 0.08) {
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(x + size * 0.6, y + size * 0.7, Math.max(2, size / 8), Math.max(1, size / 16));
        }
    }
    
    drawTerrainDetails(ctx, tileType, x, y, size, detailNoise) {
        ctx.globalAlpha = 0.4;
        
        // Add ambient details based on terrain type
        switch(tileType) {
            case 'grass':
                if (Math.random() < 0.3) {
                    ctx.fillStyle = '#2e7d32';
                    ctx.fillRect(x + Math.random() * size, y + Math.random() * size, 1, 1);
                }
                break;
            case 'conifer_forest':
            case 'dense_conifer_forest':
                if (Math.random() < 0.2) {
                    ctx.fillStyle = '#3e2723';
                    ctx.fillRect(x + Math.random() * size, y + Math.random() * size, 1, 2);
                }
                break;
        }
        
        ctx.globalAlpha = 1;
    }
    
    unloadDistantChunks(centerChunkX, centerChunkY) {
        const unloadDistance = this.chunkLoadRadius + 1;
        const chunksToUnload = [];
        
        for (const [chunkKey, chunk] of this.loadedChunks) {
            const distance = Math.max(
                Math.abs(chunk.x - centerChunkX),
                Math.abs(chunk.y - centerChunkY)
            );
            
            if (distance > unloadDistance) {
                chunksToUnload.push(chunkKey);
            }
        }
        
        // Unload chunks
        chunksToUnload.forEach(chunkKey => {
            this.loadedChunks.delete(chunkKey);
            this.fogOfWar.delete(chunkKey);
        });
    }
    
    initializeChunkFogOfWar(chunkX, chunkY) {
        const chunkKey = this.getChunkKey(chunkX, chunkY);
        
        const fogCanvas = document.createElement('canvas');
        fogCanvas.width = this.chunkSize;
        fogCanvas.height = this.chunkSize;
        const fogCtx = fogCanvas.getContext('2d');
        
        fogCtx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        fogCtx.fillRect(0, 0, this.chunkSize, this.chunkSize);
        
        this.fogOfWar.set(chunkKey, { canvas: fogCanvas, ctx: fogCtx });
    }
    
    spawnInitialScout() {
        const scout = {
            x: this.camera.x + this.canvas.width / (2 * this.camera.scale),
            y: this.camera.y + this.canvas.height / (2 * this.camera.scale),
            speed: 20,
            target: null,
            exploring: false,
            health: 100,
            range: 40
        };
        
        this.scouts.push(scout);
        this.revealArea(scout.x, scout.y, 60);
    }
    
    revealArea(x, y, radius) {
        const chunkCoords = this.getChunkCoords(x, y);
        const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.y);
        const fogData = this.fogOfWar.get(chunkKey);
        
        if (!fogData) return;
        
        this.revealAnimations.push({
            x, y, radius: 0, targetRadius: radius,
            startTime: Date.now(),
            duration: 800,
            chunkX: chunkCoords.x,
            chunkY: chunkCoords.y
        });
    }
    
    resetGameProgress() {
        try {
            this.resources = { food: 100, wood: 50, iron: 25, gold: 10 };
            this.population = 5;
            this.buildings = [];
            this.camera = { x: 0, y: 0, scale: 1 };
            this.scouts = [];
            this.exploredAreas.clear();
            this.revealAnimations = [];
            this.loadedChunks.clear();
            this.fogOfWar.clear();
            this.seed = Math.random() * 10000;
            
            this.loadNearbyChunks();
            this.spawnInitialScout();
            this.spawnInitialSettlers();
            
            this.updateMobileResourceDisplay();
            this.updateMobilePopulationDisplay();
            this.updateMobileStatsDisplay();
            
            this.cancelMobilePlacement();
            
            // Clear mobile save data
            localStorage.removeItem('vikingSettlementMobile');
        } catch (error) {
            console.error('Failed to reset mobile game:', error);
            this.showMobileNotification('Reset failed, please refresh', 'error');
        }
    }
    
    restoreFogOfWar() {
        // Simplified fog restoration for mobile
        for (const areaKey of this.exploredAreas) {
            const [tileX, tileY] = areaKey.split(',').map(Number);
            this.revealArea(tileX, tileY, 30);
        }
    }
    
    getDayNightInfo() {
        const cycleProgress = (this.gameTime % this.dayLength) / this.dayLength;
        const sunAngle = cycleProgress * Math.PI * 2 - Math.PI;
        
        let phase = 'day';
        let lightLevel = 1.0;
        
        if (cycleProgress < 0.25) {
            phase = 'night';
            lightLevel = 0.4; // Slightly brighter for mobile visibility
        } else if (cycleProgress < 0.35) {
            phase = 'dawn';
            lightLevel = 0.6 + (cycleProgress - 0.25) * 4;
        } else if (cycleProgress < 0.65) {
            phase = 'day';
            lightLevel = 1.0;
        } else if (cycleProgress < 0.75) {
            phase = 'dusk';
            lightLevel = 1.0 - (cycleProgress - 0.65) * 4;
        } else {
            phase = 'night';
            lightLevel = 0.6 - (cycleProgress - 0.75) * 0.8;
        }
        
        const sunX = Math.cos(sunAngle);
        const sunY = Math.sin(sunAngle);
        
        let ambientColor, sunColor;
        switch (phase) {
            case 'dawn':
                ambientColor = `rgba(255, 180, 120, ${lightLevel * 0.08})`;
                sunColor = `rgba(255, 200, 100, ${lightLevel * 0.25})`;
                break;
            case 'day':
                ambientColor = `rgba(255, 255, 220, ${lightLevel * 0.04})`;
                sunColor = `rgba(255, 255, 200, ${lightLevel * 0.15})`;
                break;
            case 'dusk':
                ambientColor = `rgba(255, 120, 80, ${lightLevel * 0.12})`;
                sunColor = `rgba(255, 150, 80, ${lightLevel * 0.35})`;
                break;
            case 'night':
                ambientColor = `rgba(80, 80, 150, ${0.15 - lightLevel * 0.3})`;
                sunColor = `rgba(180, 180, 255, 0.08)`;
                break;
            default:
                ambientColor = `rgba(255, 255, 255, 0.04)`;
                sunColor = `rgba(255, 255, 255, 0.08)`;
        }
        
        return {
            phase,
            lightLevel,
            cycleProgress,
            sunAngle,
            sunX,
            sunY,
            ambientColor,
            sunColor
        };
    }
    
    update(deltaTime) {
        // Update game time for day/night cycle
        this.gameTime += (deltaTime / 1000) * this.timeSpeed;
        
        const dayNightInfo = this.getDayNightInfo();
        
        // Update fireflies only during night
        this.updateFireflies(deltaTime, dayNightInfo);
        
        // Update animated settlers
        this.updateSettlers(deltaTime);
        
        this.loadNearbyChunks();
        
        const now = Date.now();
        this.buildings.forEach(building => {
            const timeSince = now - building.lastUpdate;
            if (timeSince > 3000) {
                if (building.produces) {
                    for (const [resource, amount] of Object.entries(building.produces)) {
                        if (resource === 'population') {
                            this.population += amount;
                        } else if (this.resources.hasOwnProperty(resource)) {
                            this.resources[resource] += amount;
                        }
                    }
                }
                building.lastUpdate = now;
            }
        });
        
        // Update lightning system
        this.updateLightning(deltaTime);
        
        this.updateScouts(deltaTime);
        this.updateRevealAnimations();
        
        this.updateMobileResourceDisplay();
        this.updateMobilePopulationDisplay();
    }
    
    updateFireflies(deltaTime, dayNightInfo) {
        // Only spawn and update fireflies during night time
        if (dayNightInfo.phase === 'night') {
            // Spawn fireflies if we don't have enough
            while (this.fireflies.length < this.maxFireflies) {
                const screenBounds = {
                    left: this.camera.x,
                    right: this.camera.x + this.canvas.width / this.camera.scale,
                    top: this.camera.y,
                    bottom: this.camera.y + this.canvas.height / this.camera.scale
                };
                
                this.fireflies.push({
                    x: screenBounds.left + Math.random() * (screenBounds.right - screenBounds.left),
                    y: screenBounds.top + Math.random() * (screenBounds.bottom - screenBounds.top),
                    vx: (Math.random() - 0.5) * 20, // Slow movement
                    vy: (Math.random() - 0.5) * 20,
                    brightness: 0.3 + Math.random() * 0.7,
                    pulseSpeed: 0.001 + Math.random() * 0.002, // Slow pulsing
                    pulseTime: Math.random() * Math.PI * 2,
                    size: 1 + Math.random() * 2
                });
            }
            
            // Update existing fireflies
            this.fireflies.forEach(firefly => {
                // Move firefly
                firefly.x += firefly.vx * (deltaTime / 1000);
                firefly.y += firefly.vy * (deltaTime / 1000);
                
                // Update pulsing
                firefly.pulseTime += firefly.pulseSpeed * deltaTime;
                firefly.brightness = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(firefly.pulseTime));
                
                // Gentle direction change
                if (Math.random() < 0.01) {
                    firefly.vx += (Math.random() - 0.5) * 10;
                    firefly.vy += (Math.random() - 0.5) * 10;
                    
                    // Limit speed
                    const speed = Math.sqrt(firefly.vx * firefly.vx + firefly.vy * firefly.vy);
                    if (speed > 30) {
                        firefly.vx = (firefly.vx / speed) * 30;
                        firefly.vy = (firefly.vy / speed) * 30;
                    }
                }
            });
            
            // Keep fireflies in visible area
            const screenBounds = {
                left: this.camera.x - 100,
                right: this.camera.x + this.canvas.width / this.camera.scale + 100,
                top: this.camera.y - 100,
                bottom: this.camera.y + this.canvas.height / this.camera.scale + 100
            };
            
            this.fireflies = this.fireflies.filter(firefly => {
                return firefly.x >= screenBounds.left && firefly.x <= screenBounds.right &&
                       firefly.y >= screenBounds.top && firefly.y <= screenBounds.bottom;
            });
        } else {
            // Clear fireflies during day
            this.fireflies = [];
        }
    }
    
    updateSettlers(deltaTime) {
        this.settlers.forEach(settler => {
            settler.age += deltaTime;
            settler.activityTimer += deltaTime;
            
            // Update settler behavior based on type and surroundings
            if (settler.activityTimer >= settler.activityDuration) {
                this.assignSettlerActivity(settler);
                settler.activityTimer = 0;
                settler.activityDuration = 2000 + Math.random() * 6000;
            }
            
            // Move toward target
            const dx = settler.targetX - settler.x;
            const dy = settler.targetY - settler.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const moveX = (dx / distance) * settler.speed * (deltaTime / 1000);
                const moveY = (dy / distance) * settler.speed * (deltaTime / 1000);
                settler.x += moveX;
                settler.y += moveY;
            } else {
                // Reached target, perform activity
                this.performSettlerActivity(settler);
            }
        });
        
        // Spawn new settlers based on population
        while (this.settlers.length < Math.min(this.maxSettlers, Math.floor(this.population * 0.8))) {
            this.spawnNewSettler();
        }
    }

    assignSettlerActivity(settler) {
        const nearbyBuildings = this.buildings.filter(building => {
            const dist = Math.sqrt((building.x - settler.x) ** 2 + (building.y - settler.y) ** 2);
            return dist < 150;
        });
        
        switch (settler.type) {
            case 'farmer':
                const farms = nearbyBuildings.filter(b => b.type === 'farm');
                if (farms.length > 0) {
                    const farm = farms[Math.floor(Math.random() * farms.length)];
                    settler.targetX = farm.x + Math.random() * farm.size;
                    settler.targetY = farm.y + Math.random() * farm.size;
                    settler.workBuilding = farm;
                    settler.carryingResource = null;
                } else {
                    this.assignRandomMovement(settler);
                }
                break;
                
            case 'worker':
                const workBuildings = nearbyBuildings.filter(b => 
                    ['lumbermill', 'blacksmith', 'tradingpost'].includes(b.type)
                );
                if (workBuildings.length > 0) {
                    const building = workBuildings[Math.floor(Math.random() * workBuildings.length)];
                    settler.targetX = building.x + Math.random() * building.size;
                    settler.targetY = building.y + Math.random() * building.size;
                    settler.workBuilding = building;
                    settler.carryingResource = this.getResourceForBuilding(building.type);
                } else {
                    this.assignRandomMovement(settler);
                }
                break;
                
            case 'child':
                // Children play in open areas
                settler.targetX = settler.x + (Math.random() - 0.5) * 80;
                settler.targetY = settler.y + (Math.random() - 0.5) * 80;
                settler.speed = 25 + Math.random() * 15; // Children move faster
                break;
                
            case 'gatherer':
                // Move to resource-rich areas
                const resourceTile = this.findNearbyResourceTile(settler.x, settler.y);
                if (resourceTile) {
                    settler.targetX = resourceTile.x;
                    settler.targetY = resourceTile.y;
                    settler.carryingResource = resourceTile.resource;
                } else {
                    this.assignRandomMovement(settler);
                }
                break;
        }
    }

    assignRandomMovement(settler) {
        settler.targetX = settler.x + (Math.random() - 0.5) * 100;
        settler.targetY = settler.y + (Math.random() - 0.5) * 100;
    }

    getResourceForBuilding(buildingType) {
        const resourceMap = {
            'lumbermill': 'wood',
            'blacksmith': 'iron',
            'tradingpost': 'gold',
            'farm': 'food'
        };
        return resourceMap[buildingType] || null;
    }

    findNearbyResourceTile(x, y) {
        for (let i = 0; i < 10; i++) {
            const testX = x + (Math.random() - 0.5) * 200;
            const testY = y + (Math.random() - 0.5) * 200;
            const tileType = this.getTileAt(testX, testY);
            
            if (['conifer_forest', 'deciduous_forest'].includes(tileType)) {
                return { x: testX, y: testY, resource: 'wood' };
            }
            if (['rocky_terrain', 'mountains'].includes(tileType)) {
                return { x: testX, y: testY, resource: 'iron' };
        }
        return null;
    }

    performSettlerActivity(settler) {
        if (settler.workBuilding && settler.carryingResource) {
            // Simulate resource transport
            if (Math.random() < 0.3) {
                const amount = 0.5 + Math.random() * 0.5;
                if (this.resources[settler.carryingResource] !== undefined) {
                    this.resources[settler.carryingResource] += amount;
                }
            }
        }
    }

    spawnNewSettler() {
        const longhouses = this.buildings.filter(b => b.type === 'longhouse');
        if (longhouses.length === 0) return;
        
        const spawnBuilding = longhouses[Math.floor(Math.random() * longhouses.length)];
        const types = ['farmer', 'worker', 'child', 'gatherer'];
        
        this.settlers.push({
            x: spawnBuilding.x + Math.random() * spawnBuilding.size,
            y: spawnBuilding.y + Math.random() * spawnBuilding.size,
            type: types[Math.floor(Math.random() * types.length)],
            targetX: spawnBuilding.x,
            targetY: spawnBuilding.y,
            speed: 15 + Math.random() * 10,
            activityTimer: 0,
            activityDuration: 3000 + Math.random() * 5000,
            carryingResource: null,
            workBuilding: null,
            age: 0
        });
    }
    
    updateLightning(deltaTime) {
        const now = Date.now();
        const dayNightInfo = this.getDayNightInfo();
        
        // Determine lightning chance based on conditions
        let lightningChance = this.lightningSystem.normalChance;
        if (dayNightInfo.phase === 'night' || dayNightInfo.phase === 'dusk') {
            lightningChance *= 1.5; // Less dramatic increase for mobile
        }
        
        // Simple weather simulation
        const weatherNoise = this.seededNoise(now * 0.0001, this.seed);
        const isStormy = weatherNoise > 0.4; // Higher threshold for mobile
        if (isStormy) {
            lightningChance = this.lightningSystem.stormChance;
        }
        
        // Check if it's time for lightning
        if (now > this.lightningSystem.nextStrike && Math.random() < lightningChance) {
            this.createLightningStrike();
            
            // Schedule next potential strike
            const interval = this.lightningSystem.minInterval + 
                           Math.random() * (this.lightningSystem.maxInterval - this.lightningSystem.minInterval);
            this.lightningSystem.nextStrike = now + interval;
        }
        
        // Update active lightning strikes
        this.lightningSystem.strikes = this.lightningSystem.strikes.filter(strike => {
            strike.age += deltaTime;
            strike.alpha = Math.max(0, 1 - (strike.age / strike.duration));
            return strike.age < strike.duration;
        });
    }
    
    createLightningStrike() {
        // Random position in visible area (mobile optimized)
        const screenBounds = {
            left: this.camera.x,
            right: this.camera.x + this.canvas.width / this.camera.scale,
            top: this.camera.y,
            bottom: this.camera.y + this.canvas.height / this.camera.scale
        };
        
        const startX = screenBounds.left + Math.random() * (screenBounds.right - screenBounds.left);
        const startY = screenBounds.top - 150; // Start above visible area
        const endX = startX + (Math.random() - 0.5) * 200; // Less variance for mobile
        const endY = screenBounds.bottom + 50; // End below visible area
        
        // Create lightning bolt (simplified for mobile)
        const lightning = {
            segments: this.generateLightningPath(startX, startY, endX, endY),
            branches: this.generateLightningBranches(startX, startY, endX, endY),
            color: `hsl(${200 + Math.random() * 60}, 100%, ${80 + Math.random() * 20}%)`,
            width: 2 + Math.random() * 3, // Thinner for mobile
            alpha: 1,
            age: 0,
            duration: 150 + Math.random() * 200, // Shorter duration
            flash: {
                intensity: 0.6 + Math.random() * 0.3, // Less intense flash
                duration: 80 + Math.random() * 80,
                age: 0
            }
        };
        
        this.lightningSystem.strikes.push(lightning);
        
        // Optional haptic feedback for mobile
        if ('vibrate' in navigator) {
            navigator.vibrate(50); // Short vibration
        }
    }
    
    generateLightningPath(startX, startY, endX, endY) {
        const segments = [];
        const numSegments = 12 + Math.floor(Math.random() * 10); // Fewer segments for mobile
        
        let currentX = startX;
        let currentY = startY;
        
        for (let i = 0; i < numSegments; i++) {
            const progress = i / numSegments;
            const targetX = startX + (endX - startX) * progress;
            const targetY = startY + (endY - startY) * progress;
            
            // Reduced jitter for mobile performance
            const jitterX = (Math.random() - 0.5) * 30 * (1 - progress * 0.5);
            const jitterY = (Math.random() - 0.5) * 20;
            
            const nextX = targetX + jitterX;
            const nextY = targetY + jitterY;
            
            segments.push({
                startX: currentX,
                startY: currentY,
                endX: nextX,
                endY: nextY
            });
            
            currentX = nextX;
            currentY = nextY;
        }
        
        return segments;
    }
    
    generateLightningBranches(mainStartX, mainStartY, mainEndX, mainEndY) {
        const branches = [];
        const numBranches = 1 + Math.floor(Math.random() * 2); // Fewer branches for mobile
        
        for (let i = 0; i < numBranches; i++) {
            const branchPoint = 0.3 + Math.random() * 0.4;
            const branchStartX = mainStartX + (mainEndX - mainStartX) * branchPoint;
            const branchStartY = mainStartY + (mainEndY - mainStartY) * branchPoint;
            
            const branchAngle = (Math.random() - 0.5) * Math.PI * 0.6;
            const branchLength = 60 + Math.random() * 120; // Shorter branches
            
            const branchEndX = branchStartX + Math.cos(branchAngle) * branchLength;
            const branchEndY = branchStartY + Math.sin(branchAngle) * branchLength;
            
            const branchSegments = this.generateLightningPath(branchStartX, branchStartY, branchEndX, branchEndY);
            branches.push({
                segments: branchSegments.slice(0, Math.max(3, branchSegments.length / 3)), // Much shorter
                alpha: 0.5 + Math.random() * 0.3
            });
        }
        
        return branches;
    }
    
    renderFireflies() {
        if (this.fireflies.length === 0) return;
        
        this.ctx.save();
        
        this.fireflies.forEach(firefly => {
            this.ctx.globalAlpha = firefly.brightness;
            
            // Firefly glow effect
            this.ctx.shadowColor = '#ffff88';
            this.ctx.shadowBlur = 6;
            this.ctx.fillStyle = '#ffff88';
            
            this.ctx.beginPath();
            this.ctx.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Additional glow
            this.ctx.globalAlpha = firefly.brightness * 0.3;
            this.ctx.shadowBlur = 12;
            this.ctx.beginPath();
            this.ctx.arc(firefly.x, firefly.y, firefly.size * 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    renderLightning() {
        if (!this.lightningSystem.enabled || this.lightningSystem.strikes.length === 0) return;
        
        this.ctx.save();
        
        this.lightningSystem.strikes.forEach(lightning => {
            this.ctx.globalAlpha = lightning.alpha;
            this.ctx.strokeStyle = lightning.color;
            this.ctx.lineWidth = lightning.width;
            this.ctx.lineCap = 'round';
            this.ctx.shadowColor = lightning.color;
            this.ctx.shadowBlur = 6; // Reduced blur for mobile
            
            // Render main lightning bolt
            this.ctx.beginPath();
            lightning.segments.forEach((segment, index) => {
                if (index === 0) {
                    this.ctx.moveTo(segment.startX, segment.startY);
                }
                this.ctx.lineTo(segment.endX, segment.endY);
            });
            this.ctx.stroke();
            
            // Render branches (simplified)
            lightning.branches.forEach(branch => {
                this.ctx.globalAlpha = lightning.alpha * branch.alpha;
                this.ctx.lineWidth = lightning.width * 0.5;
                
                this.ctx.beginPath();
                branch.segments.forEach((segment, index) => {
                    if (index === 0) {
                        this.ctx.moveTo(segment.startX, segment.startY);
                    }
                    this.ctx.lineTo(segment.endX, segment.endY);
                });
                this.ctx.stroke();
            });
            
            // Screen flash effect (reduced for mobile)
            if (lightning.flash.age < lightning.flash.duration) {
                const flashAlpha = (1 - (lightning.flash.age / lightning.flash.duration)) * lightning.flash.intensity * 0.2;
                
                this.ctx.save();
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.globalAlpha = flashAlpha;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
                
                lightning.flash.age += 16;
            }
        });
        
        this.ctx.restore();
    }
    
    renderSunRays(dayNightInfo) {
        if (dayNightInfo.phase === 'night') return;
        
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Sun position on screen
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 3;
        
        // Create sun rays gradient
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(this.canvas.width, this.canvas.height));
        gradient.addColorStop(0, dayNightInfo.sunColor);
        gradient.addColorStop(0.3, `rgba(255, 220, 150, ${dayNightInfo.lightLevel * 0.02})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.restore();
    }
    
    applyDayNightLighting(dayNightInfo) {
        // Apply day/night overlay
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        if (dayNightInfo.phase === 'night') {
            // Night overlay
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = `rgba(80, 80, 150, ${0.7 - dayNightInfo.lightLevel * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else if (dayNightInfo.phase === 'dawn' || dayNightInfo.phase === 'dusk') {
            // Twilight overlay
            const twilightColor = dayNightInfo.phase === 'dawn' ? 
                `rgba(255, 180, 120, ${0.2 - dayNightInfo.lightLevel * 0.1})` :
                `rgba(255, 120, 80, ${0.25 - dayNightInfo.lightLevel * 0.1})`;
            
            this.ctx.globalCompositeOperation = 'multiply';
            this.ctx.fillStyle = twilightColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this.ctx.restore();
    }
    
    renderSettlers() {
        this.settlers.forEach(settler => {
            // Settler shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.beginPath();
            this.ctx.ellipse(settler.x + 1, settler.y + 1, 4, 2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Settler body based on type
            const colors = {
                'farmer': '#8bc34a',
                'worker': '#ff9800',
                'child': '#e91e63',
                'gatherer': '#795548'
            };
            
            this.ctx.fillStyle = colors[settler.type] || '#2196f3';
            this.ctx.beginPath();
            this.ctx.arc(settler.x, settler.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Activity indicators
            if (settler.carryingResource) {
                const resourceColors = {
                    'wood': '#8d6e63',
                    'iron': '#9e9e9e',
                    'food': '#4caf50',
                    'gold': '#ffc107'
                };
                
                this.ctx.fillStyle = resourceColors[settler.carryingResource] || '#666';
                this.ctx.fillRect(settler.x - 2, settler.y - 8, 4, 3);
            }
            
            // Movement trail for children (playing)
            if (settler.type === 'child' && settler.age % 100 < 50) {
                this.ctx.strokeStyle = 'rgba(233, 30, 99, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(settler.x, settler.y, 8, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const dayNightInfo = this.getDayNightInfo();
        
        this.ctx.save();
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.renderTerrain();
        this.renderBuildings();
        this.renderSettlers();
        this.renderScouts();
        
        // Render fireflies (in world space)
        this.renderFireflies();
        
        // Render lightning (in world space)
        this.renderLightning();
        
        this.renderFogOfWar();
        
        this.ctx.restore();
        
        // Apply day/night lighting
        this.applyDayNightLighting(dayNightInfo);
        
        // Render sun rays
        this.renderSunRays(dayNightInfo);
        
        // Mobile time display in status bar
        this.renderMobileTimeDisplay(dayNightInfo);
    }
    
    renderMobileTimeDisplay(dayNightInfo) {
        const timePercent = (this.gameTime % this.dayLength) / this.dayLength;
        
        let timeString = '';
        if (timePercent < 0.25) {
            const nightProgress = timePercent / 0.25;
            const hour = Math.floor(21 + nightProgress * 9) % 24;
            timeString = `${hour.toString().padStart(2, '0')}:00`;
        } else if (timePercent < 0.5) {
            const morningProgress = (timePercent - 0.25) / 0.25;
            const hour = Math.floor(6 + morningProgress * 6);
            timeString = `${hour.toString().padStart(2, '0')}:00`;
        } else if (timePercent < 0.75) {
            const dayProgress = (timePercent - 0.5) / 0.25;
            const hour = Math.floor(12 + dayProgress * 6);
            timeString = `${hour.toString().padStart(2, '0')}:00`;
        } else {
            const eveningProgress = (timePercent - 0.75) / 0.25;
            const hour = Math.floor(18 + eveningProgress * 3);
            timeString = `${hour.toString().padStart(2, '0')}:00`;
        }
        
        // Update DOM element for mobile time display
        const timeElement = document.getElementById('mobileTime');
        if (timeElement) {
            timeElement.textContent = `${dayNightInfo.phase} ${timeString}`;
        }
    }
    
    renderTerrain() {
        const viewBounds = {
            left: this.camera.x,
            right: this.camera.x + this.canvas.width / this.camera.scale,
            top: this.camera.y,
            bottom: this.camera.y + this.canvas.height / this.camera.scale
        };
        
        for (const [chunkKey, chunk] of this.loadedChunks) {
            if (chunk.worldX + this.chunkSize < viewBounds.left || 
                chunk.worldX > viewBounds.right ||
                chunk.worldY + this.chunkSize < viewBounds.top || 
                chunk.worldY > viewBounds.bottom) {
                continue;
            }
            
            // Draw base terrain
            this.ctx.drawImage(chunk.textureCanvas, chunk.worldX, chunk.worldY);
            
            // Draw detail overlay with reduced opacity for mobile performance
            this.ctx.globalAlpha = 0.4;
            this.ctx.drawImage(chunk.detailCanvas, chunk.worldX, chunk.worldY);
            this.ctx.globalAlpha = 1;
        }
    }
    
    renderBuildings() {
        this.buildings.forEach(building => {
            // Building shadow
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(building.x + 2, building.y + 2, building.size, building.size);
            
            // Load and render building sprite
            if (building.sprite && !building.spriteImage) {
                building.spriteImage = new Image();
                building.spriteImage.src = building.sprite;
            }
            
            if (building.spriteImage && building.spriteImage.complete) {
                // Draw building sprite
                this.ctx.drawImage(
                    building.spriteImage,
                    building.x,
                    building.y,
                    building.size,
                    building.size
                );
            } else {
                // Fallback rendering while sprite loads
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(building.x, building.y, building.size, building.size);
                
                // Building icon as fallback
                this.ctx.fillStyle = '#f0f0f0';
                this.ctx.font = `${building.size * 0.6}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    building.icon || '🏘️',
                    building.x + building.size / 2,
                    building.y + building.size * 0.7
                );
            }
        });
    }
    
    renderScouts() {
        this.scouts.forEach(scout => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.beginPath();
            this.ctx.arc(scout.x + 1, scout.y + 1, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = scout.exploring ? '#ff5722' : '#2196f3';
            this.ctx.beginPath();
            this.ctx.arc(scout.x, scout.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('👤', scout.x, scout.y + 3);
        });
    }
    
    renderFogOfWar() {
        const viewBounds = {
            left: this.camera.x,
            right: this.camera.x + this.canvas.width / this.camera.scale,
            top: this.camera.y,
            bottom: this.camera.y + this.canvas.height / this.camera.scale
        };
        
        for (const [chunkKey, chunk] of this.loadedChunks) {
            if (chunk.worldX + this.chunkSize < viewBounds.left || 
                chunk.worldX > viewBounds.right ||
                chunk.worldY + this.chunkSize < viewBounds.top || 
                chunk.worldY > viewBounds.bottom) {
                continue;
            }
            
            const fogData = this.fogOfWar.get(chunkKey);
            if (fogData) {
                this.ctx.drawImage(fogData.canvas, chunk.worldX, chunk.worldY);
            }
        }
    }
    
    getTileAt(x, y) {
        const chunkCoords = this.getChunkCoords(x, y);
        const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.y);
        const chunk = this.loadedChunks.get(chunkKey);
        
        if (!chunk) return 'grass'; // Default for unloaded chunks
        
        const localX = x - chunk.worldX;
        const localY = y - chunk.worldY;
        const tileX = Math.floor(localX / this.tileSize) * this.tileSize;
        const tileY = Math.floor(localY / this.tileSize) * this.tileSize;
        
        const tile = chunk.tiles.find(t => t.localX === tileX && t.localY === tileY);
        return tile ? tile.type : 'grass';
    }
    
    gameLoop() {
        const now = performance.now();
        const deltaTime = now - this.lastUpdate;
        
        if (this.gameRunning) {
            this.update(deltaTime);
            this.render();
        }
        
        this.lastUpdate = now;
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the mobile game when page loads
window.addEventListener('load', () => {
    const game = new MobileVikingSettlementTycoon();
    
    // Auto-save every 2 minutes
    setInterval(() => {
        game.saveMobileGame();
    }, 120000);
    
    // Try to load saved game after initialization
    setTimeout(() => {
        game.loadGame();
    }, 100);
});

// Handle visibility change to pause/resume game
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Game will continue running but at reduced performance when hidden
        console.log('Game backgrounded - reducing performance');
    } else {
        console.log('Game foregrounded - restoring performance');
    }
});