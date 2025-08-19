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
        
        // Check for saved game
        const hasSavedGame = localStorage.getItem('vikingSettlementMobile');
        if (!hasSavedGame) {
            this.spawnInitialScout();
            this.addBuilding('longhouse', 200, 150);
            this.addBuilding('farm', 150, 200);
            this.showMobileNotification('Welcome to Viking Settlement Tycoon!', 'success');
        } else {
            this.loadGame();
        }
        
        this.setupMobileEventListeners();
        this.gameLoop();
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
        const gameState = {
            version: this.gameVersion,
            resources: this.resources,
            population: this.population,
            buildings: this.buildings,
            camera: this.camera,
            scouts: this.scouts,
            seed: this.seed,
            exploredAreas: Array.from(this.exploredAreas),
            deviceInfo: this.deviceInfo,
            saveTime: Date.now()
        };
        
        localStorage.setItem('vikingSettlementMobile', JSON.stringify(gameState));
        this.showMobileNotification('Game saved!', 'success');
    }
    
    loadGame() {
        const saved = localStorage.getItem('vikingSettlementMobile');
        if (saved) {
            const gameState = JSON.parse(saved);
            
            // Verify version compatibility
            if (gameState.version !== this.gameVersion) {
                this.showMobileNotification('Save version mismatch, starting fresh', 'warning');
                return false;
            }
            
            this.resources = gameState.resources || this.resources;
            this.population = gameState.population || this.population;
            this.buildings = gameState.buildings || this.buildings;
            
            if (gameState.camera) {
                this.camera = { ...gameState.camera };
            }
            
            this.scouts = [];
            if (gameState.scouts && gameState.scouts.length > 0) {
                this.scouts = gameState.scouts;
            } else {
                this.spawnInitialScout();
            }
            
            if (gameState.seed !== undefined) {
                this.seed = gameState.seed;
            }
            
            if (gameState.exploredAreas) {
                this.exploredAreas = new Set(gameState.exploredAreas);
            }
            
            this.loadNearbyChunks();
            this.restoreFogOfWar();
            
            this.updateMobileResourceDisplay();
            this.updateMobilePopulationDisplay();
            this.updateMobileStatsDisplay();
            
            this.showMobileNotification('Game loaded!', 'success');
            return true;
        }
        return false;
    }
    
    getBuildingData(type) {
        const buildings = {
            longhouse: {
                name: 'Longhouse',
                icon: '🏘️',
                cost: { wood: 20, food: 10 },
                produces: { population: 3 },
                size: 32
            },
            farm: {
                name: 'Farm',
                icon: '🌾',
                cost: { wood: 15 },
                produces: { food: 2 },
                size: 28
            },
            lumbermill: {
                name: 'Lumber Mill',
                icon: '🪓',
                cost: { wood: 25, iron: 5 },
                produces: { wood: 3 },
                size: 30
            },
            blacksmith: {
                name: 'Blacksmith',
                icon: '⚒️',
                cost: { wood: 30, iron: 10 },
                produces: { iron: 2 },
                size: 26
            },
            tradingpost: {
                name: 'Trading Post',
                icon: '⛵',
                cost: { wood: 40, gold: 5 },
                produces: { gold: 1 },
                size: 30
            },
            temple: {
                name: 'Temple',
                icon: '⚡',
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
                
                // Enhanced biome-based terrain generation with multiple noise layers
                const biomeData = this.getBiomeAt(worldTileX, worldTileY);
                const tileType = this.generateBiomeTerrain(worldTileX, worldTileY, biomeData);
                
                // Add elevation and moisture data for better terrain variation
                const elevationNoise = this.seededNoise(worldTileX * 0.008, worldTileY * 0.008);
                const moistureNoise = this.seededNoise(worldTileX * 0.012 + 1000, worldTileY * 0.012 + 1000);
                const temperatureNoise = this.seededNoise(worldTileX * 0.006 + 2000, worldTileY * 0.006 + 2000);
                const detailNoise = this.seededNoise(worldTileX * 0.08, worldTileY * 0.08);
                const microNoise = this.seededNoise(worldTileX * 0.15 + 500, worldTileY * 0.15 + 500);
                
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
                    elevationNoise: elevationNoise,
                    moistureNoise: moistureNoise,
                    temperatureNoise: temperatureNoise,
                    noise: this.seededNoise(worldTileX * 0.02, worldTileY * 0.02),
                    detailNoise: detailNoise,
                    microNoise: microNoise,
                    // Add geological features
                    geologicalFeature: this.determineGeologicalFeature(worldTileX, worldTileY, biomeData),
                    // Add resource deposits
                    resourceDeposit: this.generateResourceDeposit(worldTileX, worldTileY, biomeData)
                });
            }
        }
    }
    
    getBiomeAt(x, y) {
        // Enhanced multi-layer noise for more complex biome generation
        const scale = 0.002; // Larger biomes for mobile
        const subScale = 0.008; // Sub-biome variation
        
        // Primary climate layers
        const temperatureNoise = this.multiOctaveNoise(x * scale + this.seed, y * scale + this.seed, 4);
        const moistureNoise = this.multiOctaveNoise(x * scale + this.seed + 1000, y * scale + this.seed + 1000, 4);
        const elevationNoise = this.multiOctaveNoise(x * scale * 0.5 + this.seed + 2000, y * scale * 0.5 + this.seed + 2000, 5);
        
        // Secondary variation layers
        const continentalNoise = this.multiOctaveNoise(x * 0.0005 + this.seed + 3000, y * 0.0005 + this.seed + 3000, 3);
        const coastalNoise = this.multiOctaveNoise(x * 0.003 + this.seed + 4000, y * 0.003 + this.seed + 4000, 3);
        const localVariationNoise = this.multiOctaveNoise(x * subScale + this.seed + 5000, y * subScale + this.seed + 5000, 2);
        
        // Normalize to 0-1 range
        const temperature = (temperatureNoise + 1) * 0.5;
        const moisture = (moistureNoise + 1) * 0.5;
        const elevation = Math.max(0, Math.min(1, (elevationNoise + continentalNoise * 0.3 + 1) * 0.5));
        const coastal = (coastalNoise + 1) * 0.5;
        const variation = (localVariationNoise + 1) * 0.5;
        
        // Enhanced biome determination with more variety
        let primaryBiome = 'temperate_plains';
        let biomeStrength = 1.0;
        
        // Continental vs oceanic influence
        const continentalFactor = (continentalNoise + 1) * 0.5;
        const isOceanic = continentalFactor < 0.3;
        const isContinental = continentalFactor > 0.7;
        
        // Polar regions (very cold)
        if (temperature < 0.2) {
            if (elevation > 0.6) {
                primaryBiome = 'polar_ice_caps';
            } else if (moisture > 0.4) {
                primaryBiome = 'arctic_tundra';
            } else {
                primaryBiome = 'arctic_desert';
            }
        }
        // Sub-arctic regions
        else if (temperature < 0.4) {
            if (elevation > 0.7) {
                primaryBiome = 'alpine_tundra';
            } else if (moisture > 0.6) {
                primaryBiome = 'boreal_forest';
            } else if (moisture > 0.3) {
                primaryBiome = 'taiga';
            } else {
                primaryBiome = 'cold_steppe';
            }
        }
        // Temperate regions
        else if (temperature < 0.7) {
            if (elevation > 0.8) {
                primaryBiome = 'highland_mountains';
            } else if (elevation > 0.6) {
                primaryBiome = 'temperate_mountains';
            } else if (coastal > 0.7 && elevation < 0.3) {
                primaryBiome = 'coastal_fjords';
            } else if (moisture > 0.7) {
                primaryBiome = 'temperate_rainforest';
            } else if (moisture > 0.5) {
                primaryBiome = 'deciduous_forest';
            } else if (moisture > 0.3) {
                primaryBiome = 'temperate_plains';
            } else {
                primaryBiome = 'temperate_grassland';
            }
        }
        // Warm regions
        else {
            if (elevation > 0.7) {
                primaryBiome = 'warm_mountains';
            } else if (coastal > 0.6 && elevation < 0.2) {
                primaryBiome = 'tropical_coast';
            } else if (moisture > 0.8) {
                primaryBiome = 'tropical_rainforest';
            } else if (moisture > 0.5) {
                primaryBiome = 'subtropical_forest';
            } else if (moisture > 0.2) {
                primaryBiome = 'savanna';
            } else {
                primaryBiome = 'desert';
            }
        }
        
        // Apply oceanic/continental modifiers
        if (isOceanic && elevation < 0.4) {
            if (temperature > 0.6) {
                primaryBiome = 'tropical_islands';
            } else if (temperature > 0.3) {
                primaryBiome = 'temperate_islands';
            } else {
                primaryBiome = 'arctic_islands';
            }
        }
        
        // Calculate transition zones with improved blending
        const transitionNoise = this.multiOctaveNoise(x * 0.015 + this.seed + 6000, y * 0.015 + this.seed + 6000, 2);
        biomeStrength = Math.max(0.4, Math.min(1.0, 0.7 + transitionNoise * 0.3 + variation * 0.2));
        
        return {
            primary: primaryBiome,
            strength: biomeStrength,
            temperature,
            moisture,
            elevation,
            coastal,
            continentalFactor,
            variation,
            transitionNoise,
            // Additional climate data
            seasonality: this.calculateSeasonality(temperature, moisture),
            windExposure: this.calculateWindExposure(x, y, elevation),
            drainageClass: this.calculateDrainage(elevation, moisture)
        };
    }
    
    multiOctaveNoise(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.improvedNoise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return value / maxValue;
    }
    
    improvedNoise(x, y) {
        // Enhanced Perlin-like noise with better distribution
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;
        
        // Smootherstep function for better interpolation
        const u = this.smootherstep(xf);
        const v = this.smootherstep(yf);
        
        // Get random values at grid points
        const aa = this.pseudoRandom(xi, yi);
        const ab = this.pseudoRandom(xi, yi + 1);
        const ba = this.pseudoRandom(xi + 1, yi);
        const bb = this.pseudoRandom(xi + 1, yi + 1);
        
        // Interpolate
        const x1 = this.lerp(aa, ba, u);
        const x2 = this.lerp(ab, bb, u);
        
        return this.lerp(x1, x2, v);
    }
    
    smootherstep(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    pseudoRandom(x, y) {
        let n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }
    
    calculateSeasonality(temperature, moisture) {
        // Higher values indicate more seasonal variation
        if (temperature < 0.3 || temperature > 0.8) return 0.2; // Extreme climates less seasonal
        if (moisture < 0.3) return 0.8; // Dry climates more seasonal
        return 0.5 + (Math.abs(temperature - 0.5) * 0.6);
    }
    
    calculateWindExposure(x, y, elevation) {
        // Simulate prevailing wind patterns
        const windNoise = this.multiOctaveNoise(x * 0.001, y * 0.001, 2);
        const exposureFactor = elevation > 0.6 ? 0.8 : 0.3;
        return Math.max(0, Math.min(1, exposureFactor + windNoise * 0.4));
    }
    
    calculateDrainage(elevation, moisture) {
        // Determine water drainage characteristics
        if (elevation < 0.2 && moisture > 0.7) return 'poorly_drained';
        if (elevation > 0.7) return 'well_drained';
        if (moisture < 0.3) return 'very_well_drained';
        return 'moderately_drained';
    }
    
    determineGeologicalFeature(x, y, biomeData) {
        const geologicalNoise = this.multiOctaveNoise(x * 0.005, y * 0.005, 3);
        const feature = {
            type: 'normal',
            intensity: 0
        };
        
        // Determine geological features based on biome and noise
        if (biomeData.elevation > 0.8) {
            if (geologicalNoise > 0.6) {
                feature.type = 'granite_outcrop';
                feature.intensity = 0.8;
            } else if (geologicalNoise > 0.3) {
                feature.type = 'rocky_terrain';
                feature.intensity = 0.6;
            }
        } else if (biomeData.elevation < 0.2 && biomeData.moisture > 0.6) {
            if (geologicalNoise > 0.4) {
                feature.type = 'wetland';
                feature.intensity = 0.7;
            }
        } else if (geologicalNoise > 0.7) {
            if (biomeData.temperature < 0.4) {
                feature.type = 'glacial_deposit';
                feature.intensity = 0.5;
            } else {
                feature.type = 'fertile_soil';
                feature.intensity = 0.6;
            }
        }
        
        return feature;
    }
    
    generateResourceDeposit(x, y, biomeData) {
        const resourceNoise = this.multiOctaveNoise(x * 0.008 + 7000, y * 0.008 + 7000, 2);
        const deposit = {
            type: 'none',
            richness: 0,
            accessibility: 1
        };
        
        // Generate resource deposits based on geological conditions
        if (resourceNoise > 0.8) {
            if (biomeData.elevation > 0.6) {
                // Mountain resources
                if (biomeData.temperature < 0.4) {
                    deposit.type = 'iron_ore';
                    deposit.richness = 0.8;
                    deposit.accessibility = 0.6;
                } else {
                    deposit.type = 'stone_quarry';
                    deposit.richness = 0.7;
                    deposit.accessibility = 0.8;
                }
            } else if (biomeData.moisture > 0.6) {
                // Forest/wetland resources
                deposit.type = 'peat_bog';
                deposit.richness = 0.6;
                deposit.accessibility = 0.4;
            } else {
                // Plains resources
                deposit.type = 'clay_deposit';
                deposit.richness = 0.5;
                deposit.accessibility = 0.9;
            }
        } else if (resourceNoise > 0.6) {
            if (biomeData.coastal > 0.7) {
                deposit.type = 'salt_deposit';
                deposit.richness = 0.7;
                deposit.accessibility = 0.8;
            } else if (biomeData.elevation < 0.3 && biomeData.moisture > 0.5) {
                deposit.type = 'fertile_soil';
                deposit.richness = 0.8;
                deposit.accessibility = 1.0;
            }
        }
        
        return deposit;
    }
    
    generateBiomeTerrain(x, y, biomeData) {
        const detailNoise = biomeData.transitionNoise || this.seededNoise(x * 0.02 + this.seed, y * 0.02 + this.seed);
        const microNoise = biomeData.variation || this.seededNoise(x * 0.05 + this.seed + 500, y * 0.05 + this.seed + 500);
        
        // Enhanced terrain generation with new biomes
        switch (biomeData.primary) {
            case 'polar_ice_caps':
                return this.generatePolarTerrain(biomeData, detailNoise, microNoise);
            
            case 'arctic_tundra':
                return this.generateArcticTerrain(biomeData, detailNoise, microNoise);
                
            case 'arctic_desert':
                return this.generateArcticDesertTerrain(biomeData, detailNoise, microNoise);
                
            case 'alpine_tundra':
                return this.generateAlpineTundraTerrain(biomeData, detailNoise, microNoise);
            
            case 'boreal_forest':
                return this.generateBorealTerrain(biomeData, detailNoise, microNoise);
                
            case 'taiga':
                return this.generateTaigaTerrain(biomeData, detailNoise, microNoise);
                
            case 'cold_steppe':
                return this.generateColdSteppeTerrain(biomeData, detailNoise, microNoise);
            
            case 'coastal_fjords':
                return this.generateCoastalTerrain(biomeData, detailNoise, microNoise);
                
            case 'temperate_rainforest':
                return this.generateTemperateRainforestTerrain(biomeData, detailNoise, microNoise);
                
            case 'deciduous_forest':
                return this.generateDeciduousForestTerrain(biomeData, detailNoise, microNoise);
                
            case 'temperate_mountains':
            case 'highland_mountains':
            case 'warm_mountains':
                return this.generateMountainTerrain(biomeData, detailNoise, microNoise);
                
            case 'temperate_grassland':
                return this.generateTemperateGrasslandTerrain(biomeData, detailNoise, microNoise);
                
            case 'tropical_islands':
            case 'temperate_islands':
            case 'arctic_islands':
                return this.generateIslandTerrain(biomeData, detailNoise, microNoise);
                
            case 'tropical_coast':
                return this.generateTropicalCoastTerrain(biomeData, detailNoise, microNoise);
                
            case 'tropical_rainforest':
                return this.generateTropicalRainforestTerrain(biomeData, detailNoise, microNoise);
                
            case 'subtropical_forest':
                return this.generateSubtropicalForestTerrain(biomeData, detailNoise, microNoise);
                
            case 'savanna':
                return this.generateSavannaTerrain(biomeData, detailNoise, microNoise);
                
            case 'desert':
                return this.generateDesertTerrain(biomeData, detailNoise, microNoise);
            
            case 'temperate_plains':
            default:
                return this.generateTemperateTerrain(biomeData, detailNoise, microNoise);
        }
    }
    
    // Enhanced terrain generators with new biome support
    generatePolarTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.8) {
            return 'glacial_peak';
        } else if (detailNoise > 0.3) {
            return 'ice_shelf';
        } else if (microNoise > 0.2) {
            return 'ice_field';
        }
        return 'polar_ice';
    }
    
    generateArcticDesertTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.6) {
            return 'frozen_scree';
        } else if (detailNoise > 0.4) {
            return 'permafrost';
        } else if (microNoise > 0.3) {
            return 'arctic_gravel';
        }
        return 'frozen_ground';
    }
    
    generateAlpineTundraTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.9) {
            return 'alpine_peak';
        } else if (detailNoise > 0.4) {
            return 'alpine_meadow';
        } else if (microNoise > 0.2) {
            return 'alpine_scrub';
        }
        return 'mountain_tundra';
    }
    
    generateTaigaTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.moisture > 0.7 && detailNoise < -0.2) {
            return 'taiga_bog';
        } else if (biomeData.elevation > 0.5) {
            return 'mountain_taiga';
        } else if (microNoise > 0.3) {
            return 'dense_taiga';
        } else if (detailNoise > 0.2) {
            return 'taiga_clearing';
        }
        return 'taiga_forest';
    }
    
    generateColdSteppeTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.6) {
            return 'steppe_hills';
        } else if (detailNoise > 0.4) {
            return 'cold_grassland';
        } else if (microNoise > 0.3) {
            return 'shrub_steppe';
        }
        return 'cold_steppe';
    }
    
    generateTemperateRainforestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2) {
            return 'rainforest_floor';
        } else if (detailNoise > 0.4) {
            return 'dense_rainforest';
        } else if (microNoise > 0.3) {
            return 'temperate_rainforest';
        } else if (biomeData.moisture > 0.8) {
            return 'moss_forest';
        }
        return 'humid_forest';
    }
    
    generateDeciduousForestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.6) {
            return 'hill_forest';
        } else if (biomeData.seasonality > 0.6) {
            return 'seasonal_forest';
        } else if (detailNoise > 0.3) {
            return 'dense_deciduous';
        } else if (microNoise > 0.2) {
            return 'mixed_deciduous';
        }
        return 'deciduous_forest';
    }
    
    generateTemperateGrasslandTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.moisture > 0.6) {
            return 'tall_grassland';
        } else if (detailNoise > 0.4) {
            return 'prairie';
        } else if (microNoise > 0.3) {
            return 'mixed_grassland';
        }
        return 'short_grassland';
    }
    
    generateIslandTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.1) {
            return 'lagoon';
        } else if (biomeData.elevation < 0.3) {
            return 'island_beach';
        } else if (biomeData.elevation > 0.7) {
            return 'island_peak';
        } else if (biomeData.moisture > 0.6) {
            return 'island_forest';
        }
        return 'island_interior';
    }
    
    generateTropicalCoastTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.1) {
            return 'coral_reef';
        } else if (biomeData.elevation < 0.2) {
            return 'tropical_beach';
        } else if (detailNoise > 0.3) {
            return 'mangrove_swamp';
        } else if (microNoise > 0.4) {
            return 'coastal_palm_forest';
        }
        return 'tropical_coast';
    }
    
    generateTropicalRainforestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.8) {
            return 'jungle_swamp';
        } else if (detailNoise > 0.5) {
            return 'dense_jungle';
        } else if (microNoise > 0.3) {
            return 'tropical_canopy';
        } else if (biomeData.elevation > 0.6) {
            return 'mountain_rainforest';
        }
        return 'tropical_rainforest';
    }
    
    generateSubtropicalForestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.moisture > 0.7) {
            return 'humid_subtropical';
        } else if (detailNoise > 0.4) {
            return 'subtropical_woodland';
        } else if (microNoise > 0.3) {
            return 'mixed_subtropical';
        }
        return 'subtropical_forest';
    }
    
    generateSavannaTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.5) {
            return 'savanna_hills';
        } else if (detailNoise > 0.4) {
            return 'tree_savanna';
        } else if (microNoise > 0.3) {
            return 'grassland_savanna';
        } else if (biomeData.moisture < 0.3) {
            return 'dry_savanna';
        }
        return 'savanna';
    }
    
    generateDesertTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.7) {
            return 'desert_mountains';
        } else if (detailNoise > 0.5) {
            return 'sand_dunes';
        } else if (detailNoise < -0.4) {
            return 'desert_oasis';
        } else if (microNoise > 0.4) {
            return 'rocky_desert';
        } else if (microNoise > 0.2) {
            return 'scrub_desert';
        }
        return 'sand_desert';
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
    
    generateCoastalTerrain(biomeData, detailNoise, microNoise) {
        // Coastal fjords: water bodies, beaches, coastal forests, cliffs
        if (biomeData.elevation < 0.1) {
            return 'deep_fjord_water';
        } else if (biomeData.elevation < 0.25) {
            return detailNoise < 0 ? 'shallow_water' : 'rocky_shore';
        } else if (biomeData.elevation < 0.4 && biomeData.moisture > 0.5) {
            return microNoise > 0.2 ? 'coastal_forest' : 'beach';
        } else if (biomeData.elevation > 0.7) {
            return 'sea_cliff';
        }
        return detailNoise > 0.1 ? 'coastal_grass' : 'beach';
    }
    
    generateMountainTerrain(biomeData, detailNoise, microNoise) {
        // Highland mountains: peaks, alpine meadows, rocky slopes
        if (biomeData.elevation > 0.9) {
            return biomeData.temperature < 0.3 ? 'snow_peak' : 'rocky_peak';
        } else if (biomeData.elevation > 0.7) {
            return detailNoise > 0.3 ? 'alpine_forest' : 'rocky_slope';
        } else if (biomeData.elevation > 0.5) {
            return microNoise > 0.2 ? 'mountain_forest' : 'alpine_meadow';
        } else if (biomeData.moisture > 0.6) {
            return 'mountain_stream';
        }
        return 'hills';
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
        // Enhanced seeded multi-octave noise for consistent infinite generation
        return this.multiOctaveNoise(x + this.seed, y + this.seed, 3, 0.5, 2.0);
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
        switch(tileType) {
            // Arctic biome tiles
            case 'arctic_ice':
                this.drawArcticIceTile(ctx, x, y, size);
                break;
            case 'tundra_grass':
                this.drawTundraGrassTile(ctx, x, y, size, detailNoise);
                break;
            case 'sparse_forest':
                this.drawSparseForestTile(ctx, x, y, size, detailNoise);
                break;
                
            // Boreal biome tiles
            case 'boreal_lake':
                this.drawBorealLakeTile(ctx, x, y, size);
                break;
            case 'wetland':
                this.drawWetlandTile(ctx, x, y, size, moisture);
                break;
            case 'dense_conifer_forest':
                this.drawDenseConiferTile(ctx, x, y, size, detailNoise);
                break;
            case 'conifer_forest':
                this.drawConiferForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'boreal_clearing':
                this.drawBorealClearingTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_terrain':
                this.drawRockyTerrainTile(ctx, x, y, size, detailNoise);
                break;
                
            // Coastal biome tiles
            case 'deep_fjord_water':
                this.drawDeepFjordTile(ctx, x, y, size);
                break;
            case 'rocky_shore':
                this.drawRockyShoreTile(ctx, x, y, size, detailNoise);
                break;
            case 'coastal_forest':
                this.drawCoastalForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'sea_cliff':
                this.drawSeaCliffTile(ctx, x, y, size, detailNoise);
                break;
            case 'coastal_grass':
                this.drawCoastalGrassTile(ctx, x, y, size, moisture);
                break;
                
            // Mountain biome tiles
            case 'snow_peak':
                this.drawSnowPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_peak':
                this.drawRockyPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_forest':
                this.drawAlpineForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_slope':
                this.drawRockySlopeTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_meadow':
                this.drawAlpineMeadowTile(ctx, x, y, size, detailNoise);
                break;
            case 'mountain_forest':
                this.drawMountainForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'mountain_stream':
                this.drawMountainStreamTile(ctx, x, y, size);
                break;
                
            // Temperate biome tiles
            case 'river':
                this.drawRiverTile(ctx, x, y, size);
                break;
            case 'deciduous_forest':
                this.drawDeciduousForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'mixed_forest':
                this.drawMixedForestTile(ctx, x, y, size, detailNoise);
                break;
            case 'dry_grassland':
                this.drawDryGrasslandTile(ctx, x, y, size, detailNoise);
                break;
            case 'flowering_meadow':
                this.drawFloweringMeadowTile(ctx, x, y, size, detailNoise);
                break;
                
            // Fallback tiles
            case 'grass':
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture || 0.5);
                break;
            case 'snow':
                this.drawEnhancedSnowTile(ctx, x, y, size, detailNoise);
                break;
            case 'hills':
                this.drawEnhancedHillsTile(ctx, x, y, size, detailNoise);
                break;
        }
    }
    
    // Arctic biome tile renderers (mobile optimized)
    drawArcticIceTile(ctx, x, y, size) {
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
        gradient.addColorStop(0, '#e8f4fd');
        gradient.addColorStop(1, '#b8daf2');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Ice crystals (simplified for mobile)
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 2; i++) {
            const crystalX = x + Math.random() * size;
            const crystalY = y + Math.random() * size;
            ctx.fillRect(crystalX, crystalY, 1, 1);
        }
    }
    
    drawTundraGrassTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#8fbc8f';
        ctx.fillRect(x, y, size, size);
        
        // Sparse grass tufts
        ctx.fillStyle = '#556b2f';
        for (let i = 0; i < 2; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        
        // Moss patches
        if (detailNoise > 0.2) {
            ctx.fillStyle = '#9acd32';
            ctx.fillRect(x + size * 0.6, y + size * 0.4, 2, 2);
        }
    }
    
    drawSparseForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#8fbc8f';
        ctx.fillRect(x, y, size, size);
        
        // Single tree
        const treeX = x + size/2;
        const treeY = y + size/2;
        
        // Trunk
        ctx.fillStyle = '#654321';
        ctx.fillRect(treeX - 1, treeY, 1, 4);
        
        // Conifer canopy
        ctx.fillStyle = '#228b22';
        ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
    }
    
    // Boreal biome tile renderers
    drawBorealLakeTile(ctx, x, y, size) {
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
        gradient.addColorStop(0, '#4682b4');
        gradient.addColorStop(1, '#2f4f4f');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
    }
    
    drawWetlandTile(ctx, x, y, size, moisture) {
        ctx.fillStyle = moisture > 0.7 ? '#2e8b57' : '#6b8e23';
        ctx.fillRect(x, y, size, size);
        
        // Wetland vegetation
        ctx.fillStyle = '#228b22';
        for (let i = 0; i < 3; i++) {
            const reedX = x + Math.random() * size;
            const reedY = y + Math.random() * size;
            ctx.fillRect(reedX, reedY, 1, 3);
        }
    }
    
    drawDenseConiferTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#013220';
        ctx.fillRect(x, y, size, size);
        
        // Dense trees (simplified)
        for (let i = 0; i < 4; i++) {
            const treeX = x + (i % 2) * size/2 + 2;
            const treeY = y + Math.floor(i / 2) * size/2 + 2;
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX, treeY, 1, 3);
            
            ctx.fillStyle = '#228b22';
            ctx.fillRect(treeX - 1, treeY - 2, 3, 3);
        }
    }
    
    drawConiferForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2d5016';
        ctx.fillRect(x, y, size, size);
        
        // Moderate trees
        for (let i = 0; i < 2; i++) {
            const treeX = x + i * size/2 + size/4;
            const treeY = y + size/2;
            
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX, treeY, 1, 4);
            
            ctx.fillStyle = '#228b22';
            ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
        }
    }
    
    drawBorealClearingTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#9acd32';
        ctx.fillRect(x, y, size, size);
        
        // Grass texture
        ctx.fillStyle = '#6b8e23';
        for (let i = 0; i < 6; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 1);
        }
    }
    
    drawRockyTerrainTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#708090';
        ctx.fillRect(x, y, size, size);
        
        // Rocky outcrops
        ctx.fillStyle = '#2f4f4f';
        for (let i = 0; i < 3; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            ctx.fillRect(rockX, rockY, 2, 2);
        }
    }
    
    // Coastal biome tile renderers
    drawDeepFjordTile(ctx, x, y, size) {
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#191970');
        gradient.addColorStop(1, '#0000cd');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
    }
    
    drawRockyShoreTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#696969';
        ctx.fillRect(x, y, size, size);
        
        // Rocky shore elements
        ctx.fillStyle = '#2f4f4f';
        for (let i = 0; i < 3; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            ctx.fillRect(rockX, rockY, 2, 2);
        }
    }
    
    drawCoastalForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(x, y, size, size);
        
        // Coastal trees
        const treeX = x + size/2;
        const treeY = y + size/2;
        
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(treeX, treeY, 1, 4);
        
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
    }
    
    drawSeaCliffTile(ctx, x, y, size, detailNoise) {
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#d3d3d3');
        gradient.addColorStop(1, '#696969');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Cliff lines
        ctx.strokeStyle = '#2f4f4f';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + size/2);
        ctx.lineTo(x + size, y + size/2 + 2);
        ctx.stroke();
    }
    
    drawCoastalGrassTile(ctx, x, y, size, moisture) {
        const grassColor = moisture > 0.6 ? '#32cd32' : '#9acd32';
        ctx.fillStyle = grassColor;
        ctx.fillRect(x, y, size, size);
        
        // Coastal grass
        ctx.fillStyle = '#6b8e23';
        for (let i = 0; i < 8; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 1);
        }
    }
    
    // Mountain biome tile renderers
    drawSnowPeakTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#fffafa';
        ctx.fillRect(x, y, size, size);
        
        // Snow drifts
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) {
            const driftX = x + Math.random() * size;
            const driftY = y + Math.random() * size;
            ctx.fillRect(driftX, driftY, 2, 1);
        }
    }
    
    drawRockyPeakTile(ctx, x, y, size, detailNoise) {
        const gradient = ctx.createLinearGradient(x, y, x, y + size);
        gradient.addColorStop(0, '#dcdcdc');
        gradient.addColorStop(1, '#696969');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Rocky formations
        ctx.fillStyle = '#2f4f4f';
        ctx.fillRect(x + size/4, y, size/2, size/3);
    }
    
    drawAlpineForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2f4f2f';
        ctx.fillRect(x, y, size, size);
        
        // Alpine tree
        const treeX = x + size/2;
        const treeY = y + size/2;
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(treeX, treeY, 1, 3);
        
        ctx.fillStyle = '#006400';
        ctx.fillRect(treeX - 1, treeY - 2, 3, 3);
    }
    
    drawRockySlopeTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#a9a9a9';
        ctx.fillRect(x, y, size, size);
        
        // Sloped rocks
        ctx.fillStyle = '#696969';
        for (let i = 0; i < 4; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            ctx.fillRect(rockX, rockY, 2, 1);
        }
    }
    
    drawAlpineMeadowTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#adff2f';
        ctx.fillRect(x, y, size, size);
        
        // Alpine flowers
        const colors = ['#ff1493', '#ffd700', '#ff69b4'];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = colors[i % colors.length];
            const flowerX = x + Math.random() * size;
            const flowerY = y + Math.random() * size;
            ctx.fillRect(flowerX, flowerY, 1, 1);
        }
    }
    
    drawMountainForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Mountain tree
        const treeX = x + size/2;
        const treeY = y + size/2;
        
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(treeX, treeY, 1, 4);
        
        ctx.fillStyle = '#006400';
        ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
    }
    
    drawMountainStreamTile(ctx, x, y, size) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Stream
        ctx.strokeStyle = '#87ceeb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + size/4);
        ctx.lineTo(x + size, y + 3*size/4);
        ctx.stroke();
    }
    
    // Temperate biome tile renderers
    drawRiverTile(ctx, x, y, size) {
        ctx.fillStyle = '#32cd32';
        ctx.fillRect(x, y, size, size);
        
        // River
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + size/3);
        ctx.lineTo(x + size, y + 2*size/3);
        ctx.stroke();
    }
    
    drawDeciduousForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#228b22';
        ctx.fillRect(x, y, size, size);
        
        // Deciduous trees
        for (let i = 0; i < 2; i++) {
            const treeX = x + i * size/2 + size/4;
            const treeY = y + size/2;
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(treeX, treeY, 1, 4);
            
            ctx.fillStyle = '#32cd32';
            ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
        }
    }
    
    drawMixedForestTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(x, y, size, size);
        
        // Mixed trees
        const treeX = x + size/2;
        const treeY = y + size/2;
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(treeX, treeY, 1, 4);
        
        if (Math.random() > 0.5) {
            ctx.fillStyle = '#228b22';
            ctx.fillRect(treeX - 1, treeY - 3, 3, 4);
        } else {
            ctx.fillStyle = '#32cd32';
            ctx.fillRect(treeX - 2, treeY - 3, 4, 4);
        }
    }
    
    drawDryGrasslandTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#daa520';
        ctx.fillRect(x, y, size, size);
        
        // Dry grass
        ctx.fillStyle = '#b8860b';
        for (let i = 0; i < 10; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 1);
        }
    }
    
    drawFloweringMeadowTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x, y, size, size);
        
        // Wildflowers
        const flowers = ['#ff1493', '#ffd700', '#ff69b4'];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = flowers[Math.floor(Math.random() * flowers.length)];
            const flowerX = x + Math.random() * size;
            const flowerY = y + Math.random() * size;
            ctx.fillRect(flowerX, flowerY, 1, 1);
        }
    }
    
    drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture) {
        const baseGreen = moisture > 0 ? '#4caf50' : '#7cb342';
        ctx.fillStyle = baseGreen;
        ctx.fillRect(x, y, size, size);
        
        // Grass texture
        ctx.fillStyle = '#388e3c';
        for (let i = 0; i < 4; i++) {
            const patchX = x + Math.random() * size;
            const patchY = y + Math.random() * size;
            ctx.fillRect(patchX, patchY, 1, 1);
        }
    }
    
    drawEnhancedSnowTile(ctx, x, y, size, detailNoise) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, size, size);
        
        // Snow sparkles
        ctx.fillStyle = '#f0f0f0';
        for (let i = 0; i < 6; i++) {
            const sparkleX = x + Math.random() * size;
            const sparkleY = y + Math.random() * size;
            ctx.fillRect(sparkleX, sparkleY, 1, 1);
        }
    }
    
    drawEnhancedHillsTile(ctx, x, y, size, detailNoise) {
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, '#8d6e63');
        gradient.addColorStop(1, '#6d4c41');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Hill texture
        ctx.fillStyle = '#795548';
        for (let i = 0; i < 3; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            ctx.fillRect(rockX, rockY, 2, 1);
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
        
        this.updateMobileResourceDisplay();
        this.updateMobilePopulationDisplay();
        this.updateMobileStatsDisplay();
        
        this.cancelMobilePlacement();
    }
    
    restoreFogOfWar() {
        // Simplified fog restoration for mobile
        for (const areaKey of this.exploredAreas) {
            const [tileX, tileY] = areaKey.split(',').map(Number);
            this.revealArea(tileX, tileY, 30);
        }
    }
    
    update(deltaTime) {
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
        
        this.updateScouts(deltaTime);
        this.updateRevealAnimations();
        
        this.updateMobileResourceDisplay();
        this.updateMobilePopulationDisplay();
    }
    
    updateScouts(deltaTime) {
        this.scouts.forEach(scout => {
            if (scout.target && scout.exploring) {
                const dx = scout.target.x - scout.x;
                const dy = scout.target.y - scout.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    const moveX = (dx / distance) * scout.speed * (deltaTime / 1000);
                    const moveY = (dy / distance) * scout.speed * (deltaTime / 1000);
                    
                    scout.x += moveX;
                    scout.y += moveY;
                    
                    this.revealArea(scout.x, scout.y, scout.range);
                } else {
                    scout.exploring = false;
                    scout.target = null;
                    this.revealArea(scout.x, scout.y, scout.range * 1.5);
                    this.showMobileNotification('Area explored!', 'success');
                }
            }
        });
    }
    
    updateRevealAnimations() {
        const now = Date.now();
        
        this.revealAnimations = this.revealAnimations.filter(anim => {
            const elapsed = now - anim.startTime;
            const progress = Math.min(elapsed / anim.duration, 1);
            
            anim.radius = anim.targetRadius * this.easeOutQuad(progress);
            
            const chunkKey = this.getChunkKey(anim.chunkX, anim.chunkY);
            const fogData = this.fogOfWar.get(chunkKey);
            const chunk = this.loadedChunks.get(chunkKey);
            
            if (fogData && chunk && isFinite(anim.radius) && anim.radius > 0) {
                const ctx = fogData.ctx;
                const localX = anim.x - chunk.worldX;
                const localY = anim.y - chunk.worldY;
                
                if (isFinite(localX) && isFinite(localY) && isFinite(anim.radius)) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    
                    const gradient = ctx.createRadialGradient(localX, localY, 0, localX, localY, anim.radius);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(localX, localY, anim.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
            
            return progress < 1;
        });
    }
    
    easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t);
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.renderTerrain();
        this.renderBuildings();
        this.renderScouts();
        this.renderFogOfWar();
        
        this.ctx.restore();
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
            this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
            this.ctx.fillRect(building.x + 2, building.y + 2, building.size, building.size);
            
            this.ctx.fillStyle = '#8b4513';
            this.ctx.fillRect(building.x, building.y, building.size, building.size);
            
            this.ctx.fillStyle = '#f0f0f0';
            this.ctx.font = `${building.size * 0.6}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                building.icon,
                building.x + building.size / 2,
                building.y + building.size * 0.7
            );
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