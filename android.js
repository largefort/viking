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
        
        // Check for saved game first
        const hasSavedGame = localStorage.getItem('vikingSettlementMobile');
        if (!hasSavedGame) {
            // Only initialize new game if no saved game exists
            this.spawnInitialScout();
            this.addBuilding('longhouse', 200, 150);
            this.addBuilding('farm', 150, 200);
            this.showMobileNotification('Welcome to Viking Settlement Tycoon!', 'success');
        } else {
            // Load the saved game immediately
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
            
            // Clear existing scouts to prevent duplication
            this.scouts = [];
            
            if (gameState.scouts && gameState.scouts.length > 0) {
                this.scouts = gameState.scouts;
            } else {
                // Only spawn scout if none exist in save data
                this.spawnInitialScout();
            }
            
            if (gameState.seed !== undefined) {
                this.seed = gameState.seed;
            }
            
            if (gameState.exploredAreas) {
                this.exploredAreas = new Set(gameState.exploredAreas);
            }
            
            // Load chunks around the saved camera position BEFORE restoring fog
            this.loadNearbyChunks();
            
            // Wait a moment for chunks to load, then restore fog of war
            setTimeout(() => {
                this.restoreFogOfWar();
            }, 100);
            
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
        // Enhanced texture rendering with improved details and natural structures
        switch(tileType) {
            // Arctic biome tiles with enhanced textures
            case 'arctic_ice':
                this.drawEnhancedArcticIceTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'tundra_grass':
                this.drawEnhancedTundraGrassTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'sparse_forest':
                this.drawEnhancedSparseForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
                
            // Boreal biome tiles with enhanced textures
            case 'boreal_lake':
                this.drawEnhancedBorealLakeTile(ctx, x, y, size, detailNoise);
                break;
            case 'wetland':
                this.drawEnhancedWetlandTile(ctx, x, y, size, moisture, detailNoise);
                break;
            case 'dense_conifer_forest':
                this.drawEnhancedDenseConiferTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'conifer_forest':
                this.drawEnhancedConiferForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'boreal_clearing':
                this.drawEnhancedBorealClearingTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'rocky_terrain':
                this.drawEnhancedRockyTerrainTile(ctx, x, y, size, detailNoise, moisture);
                break;
                
            // Coastal biome tiles with enhanced textures
            case 'deep_fjord_water':
                this.drawEnhancedDeepFjordTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_shore':
                this.drawEnhancedRockyShoreTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'coastal_forest':
                this.drawEnhancedCoastalForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'sea_cliff':
                this.drawEnhancedSeaCliffTile(ctx, x, y, size, detailNoise);
                break;
            case 'coastal_grass':
                this.drawEnhancedCoastalGrassTile(ctx, x, y, size, moisture, detailNoise);
                break;
                
            // Mountain biome tiles with enhanced textures
            case 'snow_peak':
                this.drawEnhancedSnowPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'rocky_peak':
                this.drawEnhancedRockyPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_forest':
                this.drawEnhancedAlpineForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'rocky_slope':
                this.drawEnhancedRockySlopeTile(ctx, x, y, size, detailNoise);
                break;
            case 'alpine_meadow':
                this.drawEnhancedAlpineMeadowTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'mountain_forest':
                this.drawEnhancedMountainForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'mountain_stream':
                this.drawEnhancedMountainStreamTile(ctx, x, y, size, detailNoise);
                break;
                
            // Temperate biome tiles with enhanced textures
            case 'river':
                this.drawEnhancedRiverTile(ctx, x, y, size, detailNoise);
                break;
            case 'deciduous_forest':
                this.drawEnhancedDeciduousForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'mixed_forest':
                this.drawEnhancedMixedForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'dry_grassland':
                this.drawEnhancedDryGrasslandTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'flowering_meadow':
                this.drawEnhancedFloweringMeadowTile(ctx, x, y, size, detailNoise, moisture);
                break;
                
            // New enhanced biome tiles
            case 'polar_ice':
                this.drawEnhancedPolarIceTile(ctx, x, y, size, detailNoise);
                break;
            case 'glacial_peak':
                this.drawEnhancedGlacialPeakTile(ctx, x, y, size, detailNoise);
                break;
            case 'tropical_rainforest':
                this.drawEnhancedTropicalRainforestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'desert':
            case 'sand_desert':
                this.drawEnhancedDesertTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'savanna':
                this.drawEnhancedSavannaTile(ctx, x, y, size, detailNoise, moisture);
                break;
                
            // Fallback tiles with enhanced rendering
            case 'grass':
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture || 0.5);
                break;
            case 'snow':
                this.drawEnhancedSnowTile(ctx, x, y, size, detailNoise);
                break;
            case 'hills':
                this.drawEnhancedHillsTile(ctx, x, y, size, detailNoise);
                break;
            default:
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture || 0.5);
                break;
        }
        
        // Add natural structures and details based on biome and noise
        this.addNaturalStructures(ctx, tileType, x, y, size, detailNoise, moisture);
    }
    
    // Enhanced Arctic biome tile renderers with beautiful textures
    drawEnhancedArcticIceTile(ctx, x, y, size, detailNoise, moisture) {
        // Multi-layered ice with realistic depth
        const gradient1 = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient1.addColorStop(0, '#f0f8ff');
        gradient1.addColorStop(0.3, '#e6f3ff');
        gradient1.addColorStop(0.7, '#dae8f5');
        gradient1.addColorStop(1, '#c1d9ed');
        ctx.fillStyle = gradient1;
        ctx.fillRect(x, y, size, size);
        
        // Ice texture patterns
        ctx.globalAlpha = 0.3;
        const icePattern = ctx.createLinearGradient(x, y, x + size, y + size);
        icePattern.addColorStop(0, '#ffffff');
        icePattern.addColorStop(0.5, 'transparent');
        icePattern.addColorStop(1, '#e0f0ff');
        ctx.fillStyle = icePattern;
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
        
        // Ice cracks and details
        if (detailNoise > 0.3) {
            ctx.strokeStyle = '#b8d4ea';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.quadraticCurveTo(x + size/2, y + size * 0.1, x + size, y + size * 0.4);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Ice crystals and sparkles
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 8; i++) {
            const crystalX = x + Math.random() * size;
            const crystalY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(crystalX, crystalY, 0.3 + Math.random() * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    drawEnhancedTundraGrassTile(ctx, x, y, size, detailNoise, moisture) {
        // Tundra base with permafrost influence
        const baseGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        baseGradient.addColorStop(0, '#8fbc8f');
        baseGradient.addColorStop(0.6, '#7a9d7a');
        baseGradient.addColorStop(1, '#6b8e6b');
        ctx.fillStyle = baseGradient;
        ctx.fillRect(x, y, size, size);
        
        // Permafrost patches
        if (detailNoise < -0.2) {
            ctx.fillStyle = '#c0c0c0';
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x + size * 0.2, y + size * 0.3, size * 0.6, size * 0.3);
            ctx.globalAlpha = 1;
        }
        
        // Sparse tundra vegetation
        ctx.fillStyle = '#556b2f';
        for (let i = 0; i < 6; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 2 + Math.random());
        }
        
        // Lichen patches (colorful tundra life)
        if (moisture > 0.3) {
            const lichenColors = ['#90ee90', '#ffd700', '#ff6347'];
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < 2; i++) {
                ctx.fillStyle = lichenColors[Math.floor(Math.random() * lichenColors.length)];
                const lichenX = x + Math.random() * size;
                const lichenY = y + Math.random() * size;
                ctx.beginPath();
                ctx.arc(lichenX, lichenY, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
    
    drawEnhancedSparseForestTile(ctx, x, y, size, detailNoise, moisture) {
        // Forest floor with organic variation
        const floorGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        floorGradient.addColorStop(0, '#9acd32');
        floorGradient.addColorStop(0.7, '#8fbc8f');
        floorGradient.addColorStop(1, '#7a9d7a');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(x, y, size, size);
        
        // Scattered trees with realistic variation
        const treeCount = 1 + Math.floor(detailNoise * 2 + 1);
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + (0.3 + Math.random() * 0.4) * size;
            const treeY = y + (0.3 + Math.random() * 0.4) * size;
            const treeHeight = 4 + Math.random() * 3;
            
            // Tree shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(treeX, treeY + 1, 2, treeHeight);
            
            // Tree trunk with texture
            const trunkColors = ['#8b4513', '#654321', '#4a3018'];
            ctx.fillStyle = trunkColors[Math.floor(Math.random() * trunkColors.length)];
            ctx.fillRect(treeX, treeY, 2, treeHeight);
            
            // Conifer canopy with layered look
            const canopyColors = ['#228b22', '#32cd32', '#006400'];
            for (let layer = 0; layer < 3; layer++) {
                const layerY = treeY - 2 - (layer * 2);
                const layerSize = 4 - layer * 0.5;
                ctx.fillStyle = canopyColors[layer];
                ctx.beginPath();
                ctx.arc(treeX, layerY, layerSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Undergrowth and forest debris
        ctx.fillStyle = '#654321';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const debrisX = x + Math.random() * size;
            const debrisY = y + Math.random() * size;
            ctx.fillRect(debrisX, debrisY, 1 + Math.random() * 2, 1);
        }
        ctx.globalAlpha = 1;
    }
    
    // Enhanced Boreal biome tile renderers
    drawEnhancedBorealLakeTile(ctx, x, y, size, detailNoise) {
        // Deep water with realistic depth gradient
        const waterGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        waterGradient.addColorStop(0, '#1e3a8a');
        waterGradient.addColorStop(0.4, '#3b82f6');
        waterGradient.addColorStop(0.7, '#2563eb');
        waterGradient.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = waterGradient;
        ctx.fillRect(x, y, size, size);
        
        // Water surface reflections
        ctx.globalAlpha = 0.3;
        const reflectionGradient = ctx.createLinearGradient(x, y, x + size, y + size/2);
        reflectionGradient.addColorStop(0, '#87ceeb');
        reflectionGradient.addColorStop(0.5, 'transparent');
        reflectionGradient.addColorStop(1, '#b0e0e6');
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(x, y, size, size/2);
        ctx.globalAlpha = 1;
        
        // Lake ripples animation
        const time = Date.now() * 0.001;
        ctx.strokeStyle = '#87ceeb';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 3; i++) {
            const rippleRadius = (5 + i * 3) + Math.sin(time + i) * 2;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, rippleRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    drawEnhancedWetlandTile(ctx, x, y, size, moisture, detailNoise) {
        // Wetland base with water influence
        const wetlandBase = moisture > 0.7 ? '#2d5016' : '#4a5d23';
        const wetlandAccent = moisture > 0.7 ? '#2e8b57' : '#6b8e23';
        
        const baseGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        baseGradient.addColorStop(0, wetlandAccent);
        baseGradient.addColorStop(0.6, wetlandBase);
        baseGradient.addColorStop(1, '#1a2f0a');
        ctx.fillStyle = baseGradient;
        ctx.fillRect(x, y, size, size);
        
        // Water patches with organic shapes
        ctx.fillStyle = '#4682b4';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 2; i++) {
            const waterX = x + Math.random() * size;
            const waterY = y + Math.random() * size;
            const waterSize = 2 + Math.random() * 4;
            ctx.beginPath();
            ctx.ellipse(waterX, waterY, waterSize, waterSize/2, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Wetland vegetation (cattails, reeds)
        const vegetationColors = ['#228b22', '#32cd32', '#6b8e23'];
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = vegetationColors[Math.floor(Math.random() * vegetationColors.length)];
            const reedX = x + Math.random() * size;
            const reedY = y + Math.random() * size;
            const reedHeight = 3 + Math.random() * 4;
            ctx.fillRect(reedX, reedY - reedHeight, 1, reedHeight);
            
            // Reed heads
            if (Math.random() > 0.6) {
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(reedX, reedY - reedHeight, 2, 1);
            }
        }
        
        // Wetland insects/life indicators
        if (detailNoise > 0.3) {
            ctx.fillStyle = '#ffd700';
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < 3; i++) {
                const insectX = x + Math.random() * size;
                const insectY = y + Math.random() * size;
                ctx.beginPath();
                ctx.arc(insectX, insectY, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
    
    drawEnhancedDenseConiferTile(ctx, x, y, size, detailNoise, moisture) {
        // Dense forest floor - very dark due to canopy cover
        const forestFloor = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        forestFloor.addColorStop(0, '#1a3d1a');
        forestFloor.addColorStop(0.5, '#0d2818');
        forestFloor.addColorStop(1, '#051f0f');
        ctx.fillStyle = forestFloor;
        ctx.fillRect(x, y, size, size);
        
        // Multiple layers of dense trees
        const trees = [
            {x: 0.2, y: 0.3, size: 0.8},
            {x: 0.7, y: 0.2, size: 0.9},
            {x: 0.1, y: 0.8, size: 0.7},
            {x: 0.6, y: 0.7, size: 0.8},
            {x: 0.4, y: 0.5, size: 1.0}
        ];
        
        trees.forEach(tree => {
            const treeX = x + tree.x * size;
            const treeY = y + tree.y * size;
            const treeSize = tree.size * 4;
            
            // Tree shadow for depth
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(treeX + 1, treeY + 1, 2, treeSize);
            
            // Trunk with bark texture
            const trunkGradient = ctx.createLinearGradient(treeX, treeY, treeX + 2, treeY);
            trunkGradient.addColorStop(0, '#654321');
            trunkGradient.addColorStop(0.5, '#4a3018');
            trunkGradient.addColorStop(1, '#36240f');
            ctx.fillStyle = trunkGradient;
            ctx.fillRect(treeX, treeY, 2, treeSize);
            
            // Dense conifer canopy with multiple shades
            const canopyColors = ['#0d4f0d', '#1a5e1a', '#228b22'];
            for (let layer = 0; layer < 3; layer++) {
                const layerY = treeY - 3 - (layer * 2);
                const layerSize = 5 - layer;
                ctx.fillStyle = canopyColors[layer];
                ctx.beginPath();
                ctx.arc(treeX, layerY, layerSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Forest floor details - moss, fallen needles
        ctx.fillStyle = '#2d5016';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 8; i++) {
            const mossX = x + Math.random() * size;
            const mossY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(mossX, mossY, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    // Add natural structures and environmental details
    addNaturalStructures(ctx, tileType, x, y, size, detailNoise, moisture) {
        const structureChance = Math.abs(detailNoise) * 0.8;
        
        // Rock formations and boulders
        if (structureChance > 0.7) {
            this.addRockFormations(ctx, x, y, size, tileType, detailNoise);
        }
        
        // Fallen logs and natural debris
        if (structureChance > 0.6 && this.isForestTile(tileType)) {
            this.addFallenLogs(ctx, x, y, size, detailNoise);
        }
        
        // Flower patches and seasonal vegetation
        if (structureChance > 0.5 && moisture > 0.4 && this.isVegetatedTile(tileType)) {
            this.addFlowerPatches(ctx, x, y, size, tileType, moisture);
        }
        
        // Water features (small springs, puddles)
        if (structureChance > 0.8 && moisture > 0.6) {
            this.addSmallWaterFeatures(ctx, x, y, size, detailNoise);
        }
        
        // Mushroom circles and fungi
        if (structureChance > 0.65 && this.isForestTile(tileType) && moisture > 0.5) {
            this.addMushroomCircles(ctx, x, y, size, detailNoise);
        }
        
        // Animal tracks and signs of life
        if (structureChance > 0.75) {
            this.addWildlifeSign(ctx, x, y, size, tileType);
        }
    }
    
    addRockFormations(ctx, x, y, size, tileType, detailNoise) {
        const rockCount = 1 + Math.floor(Math.abs(detailNoise) * 3);
        const rockColors = this.getRockColorsForBiome(tileType);
        
        for (let i = 0; i < rockCount; i++) {
            const rockX = x + Math.random() * size;
            const rockY = y + Math.random() * size;
            const rockSize = 2 + Math.random() * 4;
            
            // Rock shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(rockX + 1, rockY + 1, rockSize * 0.8, rockSize * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Main rock body
            const rockGradient = ctx.createRadialGradient(rockX, rockY, 0, rockX, rockY, rockSize);
            rockGradient.addColorStop(0, rockColors.light);
            rockGradient.addColorStop(0.7, rockColors.medium);
            rockGradient.addColorStop(1, rockColors.dark);
            ctx.fillStyle = rockGradient;
            ctx.beginPath();
            ctx.ellipse(rockX, rockY, rockSize, rockSize * 0.8, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
            
            // Rock highlights
            ctx.fillStyle = rockColors.light;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.ellipse(rockX - rockSize * 0.2, rockY - rockSize * 0.3, rockSize * 0.4, rockSize * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }
    
    addFallenLogs(ctx, x, y, size, detailNoise) {
        const logCount = Math.floor(Math.abs(detailNoise) * 2 + 1);
        
        for (let i = 0; i < logCount; i++) {
            const logX = x + Math.random() * (size - 8);
            const logY = y + Math.random() * (size - 3);
            const logLength = 4 + Math.random() * 6;
            const logAngle = Math.random() * Math.PI * 2;
            
            ctx.save();
            ctx.translate(logX + logLength/2, logY + 1.5);
            ctx.rotate(logAngle);
            
            // Log shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(-logLength/2 + 1, -1, logLength, 3);
            
            // Log body with bark texture
            const logGradient = ctx.createLinearGradient(-logLength/2, -1.5, -logLength/2, 1.5);
            logGradient.addColorStop(0, '#8b4513');
            logGradient.addColorStop(0.3, '#654321');
            logGradient.addColorStop(0.7, '#4a3018');
            logGradient.addColorStop(1, '#36240f');
            ctx.fillStyle = logGradient;
            ctx.fillRect(-logLength/2, -1.5, logLength, 3);
            
            // Log end rings
            ctx.fillStyle = '#d2b48c';
            ctx.beginPath();
            ctx.arc(-logLength/2, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(logLength/2, 0, 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // Growth rings
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(-logLength/2, 0, 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(logLength/2, 0, 0.8, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
            
            // Moss on log
            if (Math.random() > 0.6) {
                ctx.fillStyle = '#9acd32';
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(logX + logLength * 0.3, logY, 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }
    
    addFlowerPatches(ctx, x, y, size, tileType, moisture) {
        const flowerColors = this.getFlowerColorsForBiome(tileType);
        const patchCount = Math.floor(moisture * 3 + 1);
        
        for (let patch = 0; patch < patchCount; patch++) {
            const patchCenterX = x + Math.random() * size;
            const patchCenterY = y + Math.random() * size;
            const flowersInPatch = 3 + Math.floor(Math.random() * 5);
            
            for (let i = 0; i < flowersInPatch; i++) {
                const flowerX = patchCenterX + (Math.random() - 0.5) * 6;
                const flowerY = patchCenterY + (Math.random() - 0.5) * 6;
                const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                const flowerSize = 0.8 + Math.random() * 1.2;
                
                // Flower shadow
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.beginPath();
                ctx.arc(flowerX + 0.5, flowerY + 0.5, flowerSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Flower petals
                ctx.fillStyle = flowerColor.petal;
                for (let petal = 0; petal < 5; petal++) {
                    const petalAngle = (petal / 5) * Math.PI * 2;
                    const petalX = flowerX + Math.cos(petalAngle) * flowerSize * 0.6;
                    const petalY = flowerY + Math.sin(petalAngle) * flowerSize * 0.6;
                    ctx.beginPath();
                    ctx.arc(petalX, petalY, flowerSize * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                // Flower center
                ctx.fillStyle = flowerColor.center;
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, flowerSize * 0.3, 0, Math.PI * 2);
                ctx.fill();
                
                // Flower stem
                ctx.strokeStyle = '#228b22';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(flowerX, flowerY + flowerSize * 0.3);
                ctx.lineTo(flowerX, flowerY + flowerSize * 2);
                ctx.stroke();
            }
        }
    }
    
    addSmallWaterFeatures(ctx, x, y, size, detailNoise) {
        const featureX = x + size * 0.3 + Math.random() * size * 0.4;
        const featureY = y + size * 0.3 + Math.random() * size * 0.4;
        const featureSize = 2 + Math.abs(detailNoise) * 4;
        
        // Water body with depth
        const waterGradient = ctx.createRadialGradient(featureX, featureY, 0, featureX, featureY, featureSize);
        waterGradient.addColorStop(0, '#4169e1');
        waterGradient.addColorStop(0.6, '#2e7d32');
        waterGradient.addColorStop(1, '#1565c0');
        ctx.fillStyle = waterGradient;
        ctx.beginPath();
        ctx.arc(featureX, featureY, featureSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Water surface reflection
        ctx.fillStyle = '#87ceeb';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(featureX - featureSize * 0.2, featureY - featureSize * 0.2, featureSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Rocks around water
        const rockColors = {light: '#d3d3d3', medium: '#a9a9a9', dark: '#696969'};
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const rockX = featureX + Math.cos(angle) * (featureSize + 1);
            const rockY = featureY + Math.sin(angle) * (featureSize + 1);
            
            ctx.fillStyle = rockColors.medium;
            ctx.beginPath();
            ctx.arc(rockX, rockY, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    addMushroomCircles(ctx, x, y, size, detailNoise) {
        const circleRadius = 3 + Math.abs(detailNoise) * 4;
        const centerX = x + size/2;
        const centerY = y + size/2;
        const mushroomCount = 6 + Math.floor(Math.abs(detailNoise) * 4);
        
        for (let i = 0; i < mushroomCount; i++) {
            const angle = (i / mushroomCount) * Math.PI * 2;
            const mushroomX = centerX + Math.cos(angle) * circleRadius;
            const mushroomY = centerY + Math.sin(angle) * circleRadius;
            
            // Mushroom stem
            ctx.fillStyle = '#f5e6d3';
            ctx.fillRect(mushroomX - 0.5, mushroomY, 1, 2);
            
            // Mushroom cap
            const capColors = ['#8b4513', '#cd853f', '#daa520', '#ff6b6b'];
            ctx.fillStyle = capColors[Math.floor(Math.random() * capColors.length)];
            ctx.beginPath();
            ctx.arc(mushroomX, mushroomY, 1.5, 0, Math.PI);
            ctx.fill();
            
            // Cap spots
            if (Math.random() > 0.5) {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.arc(mushroomX - 0.5, mushroomY - 0.5, 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(mushroomX + 0.3, mushroomY - 0.3, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }
    
    addWildlifeSign(ctx, x, y, size, tileType) {
        const signType = Math.random();
        
        if (signType > 0.7) {
            // Animal tracks
            this.addAnimalTracks(ctx, x, y, size, tileType);
        } else if (signType > 0.4) {
            // Bird droppings or small indicators
            this.addSmallWildlifeSign(ctx, x, y, size);
        } else {
            // Disturbed vegetation
            this.addDisturbedVegetation(ctx, x, y, size);
        }
    }
    
    addAnimalTracks(ctx, x, y, size, tileType) {
        const trackCount = 3 + Math.floor(Math.random() * 5);
        const trackSize = this.isForestTile(tileType) ? 1.5 : 1;
        
        for (let i = 0; i < trackCount; i++) {
            const trackX = x + (i / trackCount) * size + Math.random() * 3 - 1.5;
            const trackY = y + Math.random() * size;
            
            // Paw print shape
            ctx.fillStyle = 'rgba(101, 67, 33, 0.6)';
            ctx.beginPath();
            ctx.ellipse(trackX, trackY, trackSize, trackSize * 0.8, Math.random() * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Claw marks for larger animals
            if (trackSize > 1.2) {
                ctx.strokeStyle = 'rgba(101, 67, 33, 0.5)';
                ctx.lineWidth = 0.5;
                for (let claw = 0; claw < 3; claw++) {
                    const clawAngle = (claw - 1) * 0.3;
                    const clawX = trackX + Math.cos(clawAngle) * trackSize;
                    const clawY = trackY - trackSize + Math.sin(clawAngle) * trackSize * 0.3;
                    ctx.beginPath();
                    ctx.moveTo(trackX, trackY - trackSize * 0.5);
                    ctx.lineTo(clawX, clawY);
                    ctx.stroke();
                }
            }
        }
    }
    
    addSmallWildlifeSign(ctx, x, y, size) {
        const signX = x + Math.random() * size;
        const signY = y + Math.random() * size;
        
        // Small white droppings or bone fragments
        ctx.fillStyle = '#f5f5f5';
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 2; i++) {
            const dotX = signX + Math.random() * 2 - 1;
            const dotY = signY + Math.random() * 2 - 1;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    addDisturbedVegetation(ctx, x, y, size) {
        const disturbanceX = x + Math.random() * size;
        const disturbanceY = y + Math.random() * size;
        
        // Flattened grass or broken twigs
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const angle = Math.random() * Math.PI * 2;
            const length = 2 + Math.random() * 3;
            ctx.beginPath();
            ctx.moveTo(disturbanceX, disturbanceY);
            ctx.lineTo(
                disturbanceX + Math.cos(angle) * length,
                disturbanceY + Math.sin(angle) * length
            );
            ctx.stroke();
        }
    }
    
    // Helper methods for biome-specific features
    getRockColorsForBiome(tileType) {
        const rockColorSets = {
            arctic: {light: '#e0e0e0', medium: '#b0b0b0', dark: '#808080'},
            boreal: {light: '#d3d3d3', medium: '#a9a9a9', dark: '#696969'},
            coastal: {light: '#f0f0f0', medium: '#c0c0c0', dark: '#708090'},
            mountain: {light: '#dcdcdc', medium: '#a9a9a9', dark: '#2f4f4f'},
            temperate: {light: '#d2b48c', medium: '#bc9a6a', dark: '#8b7355'},
            desert: {light: '#f4e4bc', medium: '#daa520', dark: '#b8860b'}
        };
        
        if (tileType.includes('arctic') || tileType.includes('snow')) return rockColorSets.arctic;
        if (tileType.includes('boreal') || tileType.includes('conifer')) return rockColorSets.boreal;
        if (tileType.includes('coastal') || tileType.includes('fjord')) return rockColorSets.coastal;
        if (tileType.includes('mountain') || tileType.includes('peak') || tileType.includes('alpine')) return rockColorSets.mountain;
        if (tileType.includes('desert') || tileType.includes('sand')) return rockColorSets.desert;
        
        return rockColorSets.temperate;
    }
    
    getFlowerColorsForBiome(tileType) {
        const flowerSets = {
            arctic: [
                {petal: '#ff69b4', center: '#ffd700'},
                {petal: '#dda0dd', center: '#ffffff'}
            ],
            alpine: [
                {petal: '#ff1493', center: '#ffd700'},
                {petal: '#9370db', center: '#ffffff'},
                {petal: '#00bfff', center: '#ffff00'}
            ],
            temperate: [
                {petal: '#ffb6c1', center: '#ffd700'},
                {petal: '#dda0dd', center: '#ffffff'},
                {petal: '#98fb98', center: '#ffff00'},
                {petal: '#87ceeb', center: '#ffa500'}
            ],
            tropical: [
                {petal: '#ff6347', center: '#ffd700'},
                {petal: '#ff1493', center: '#ffffff'},
                {petal: '#00fa9a', center: '#ff4500'},
                {petal: '#ff69b4', center: '#ffff00'}
            ]
        };
        
        if (tileType.includes('arctic') || tileType.includes('tundra')) return flowerSets.arctic;
        if (tileType.includes('alpine') || tileType.includes('mountain')) return flowerSets.alpine;
        if (tileType.includes('tropical')) return flowerSets.tropical;
        
        return flowerSets.temperate;
    }
    
    isForestTile(tileType) {
        return tileType.includes('forest') || 
               tileType.includes('conifer') || 
               tileType.includes('deciduous') || 
               tileType.includes('jungle') ||
               tileType.includes('woodland');
    }
    
    isVegetatedTile(tileType) {
        return this.isForestTile(tileType) || 
               tileType.includes('grass') || 
               tileType.includes('meadow') || 
               tileType.includes('prairie') || 
               tileType.includes('savanna') ||
               tileType.includes('clearing') ||
               tileType.includes('tundra');
    }
    
    // Additional enhanced tile renderers for new biomes
    drawEnhancedPolarIceTile(ctx, x, y, size, detailNoise) {
        // Pure polar ice with blue undertones
        const iceGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        iceGradient.addColorStop(0, '#f0f8ff');
        iceGradient.addColorStop(0.3, '#e6f3ff');
        iceGradient.addColorStop(0.7, '#dae8f5');
        iceGradient.addColorStop(1, '#c1d9ed');
        ctx.fillStyle = iceGradient;
        ctx.fillRect(x, y, size, size);
        
        // Ice pressure ridges
        if (detailNoise > 0.2) {
            ctx.strokeStyle = '#b8d4ea';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.quadraticCurveTo(x + size/2, y + size * 0.1, x + size, y + size * 0.4);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        
        // Blowing snow effect
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 8; i++) {
            const snowX = x + Math.random() * size;
            const snowY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(snowX, snowY, 0.3 + Math.random() * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    drawEnhancedGlacialPeakTile(ctx, x, y, size, detailNoise) {
        // Glacial mountain peak
        const peakGradient = ctx.createLinearGradient(x, y, x, y + size);
        peakGradient.addColorStop(0, '#ffffff');
        peakGradient.addColorStop(0.3, '#f0f8ff');
        peakGradient.addColorStop(0.7, '#e0e6ed');
        peakGradient.addColorStop(1, '#c8d0d8');
        ctx.fillStyle = peakGradient;
        ctx.fillRect(x, y, size, size);
        
        // Glacial crevasses
        ctx.strokeStyle = '#4169e1';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + Math.random() * size, y);
            ctx.lineTo(x + Math.random() * size, y + size);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Peak summit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + size/2, y);
        ctx.lineTo(x + size * 0.3, y + size * 0.4);
        ctx.lineTo(x + size * 0.7, y + size * 0.4);
        ctx.closePath();
        ctx.fill();
    }
    
    drawEnhancedTropicalRainforestTile(ctx, x, y, size, detailNoise, moisture) {
        // Dense tropical forest floor
        const floorGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        floorGradient.addColorStop(0, '#2d5016');
        floorGradient.addColorStop(0.5, '#1a3d1a');
        floorGradient.addColorStop(1, '#0f2a0f');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(x, y, size, size);
        
        // Multi-canopy tropical trees
        const treePositions = [
            {x: 0.2, y: 0.2}, {x: 0.7, y: 0.3}, {x: 0.1, y: 0.8}, 
            {x: 0.8, y: 0.7}, {x: 0.4, y: 0.5}, {x: 0.6, y: 0.1}
        ];
        
        treePositions.forEach((pos, i) => {
            const treeX = x + pos.x * size;
            const treeY = y + pos.y * size;
            const treeHeight = 6 + Math.random() * 4;
            
            // Tree trunk - taller and varied
            const trunkColors = ['#654321', '#8b4513', '#4a3018'];
            ctx.fillStyle = trunkColors[i % trunkColors.length];
            ctx.fillRect(treeX, treeY, 1, treeHeight);
            
            // Multiple canopy layers for tropical density
            const canopyColors = ['#006400', '#228b22', '#32cd32', '#90ee90'];
            for (let layer = 0; layer < 3; layer++) {
                const layerY = treeY - 2 - (layer * 2);
                const layerSize = 4 - layer * 0.5;
                ctx.fillStyle = canopyColors[layer];
                ctx.beginPath();
                ctx.arc(treeX, layerY, layerSize, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        // Tropical undergrowth
        ctx.fillStyle = '#228b22';
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 10; i++) {
            const fernX = x + Math.random() * size;
            const fernY = y + Math.random() * size;
            ctx.fillRect(fernX, fernY, 1, 2 + Math.random() * 2);
        }
        ctx.globalAlpha = 1;
        
        // Tropical flowers and exotic plants
        const tropicalColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b'];
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = tropicalColors[Math.floor(Math.random() * tropicalColors.length)];
            const exoticX = x + Math.random() * size;
            const exoticY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(exoticX, exoticY, 1 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    drawEnhancedDesertTile(ctx, x, y, size, detailNoise, moisture) {
        // Desert base with heat shimmer effect
        const desertGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        desertGradient.addColorStop(0, '#f4e4bc');
        desertGradient.addColorStop(0.3, '#daa520');
        desertGradient.addColorStop(0.7, '#cd853f');
        desertGradient.addColorStop(1, '#b8860b');
        ctx.fillStyle = desertGradient;
        ctx.fillRect(x, y, size, size);
        
        // Sand dune patterns
        ctx.strokeStyle = '#d2b48c';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + (i * size/4));
            ctx.quadraticCurveTo(x + size/2, y + (i * size/4) + 2, x + size, y + (i * size/4));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Desert cacti and sparse vegetation
        if (moisture > 0.1) {
            const cactusX = x + size * 0.3 + Math.random() * size * 0.4;
            const cactusY = y + size * 0.6;
            const cactusHeight = 3 + Math.random() * 3;
            
            // Cactus body
            ctx.fillStyle = '#228b22';
            ctx.fillRect(cactusX, cactusY - cactusHeight, 2, cactusHeight);
            
            // Cactus arms
            if (cactusHeight > 4) {
                ctx.fillRect(cactusX - 2, cactusY - cactusHeight * 0.6, 2, 2);
                ctx.fillRect(cactusX + 2, cactusY - cactusHeight * 0.4, 2, 2);
            }
            
            // Cactus spines
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 0.5;
            for (let spine = 0; spine < 6; spine++) {
                const spineY = cactusY - (spine * cactusHeight/6);
                ctx.beginPath();
                ctx.moveTo(cactusX, spineY);
                ctx.lineTo(cactusX - 1, spineY);
                ctx.stroke();
                ctx.moveTo(cactusX + 2, spineY);
                ctx.lineTo(cactusX + 3, spineY);
                ctx.stroke();
            }
        }
        
        // Desert heat shimmer
        ctx.globalAlpha = 0.2;
        const shimmerGradient = ctx.createLinearGradient(x, y, x, y + size);
        shimmerGradient.addColorStop(0, 'transparent');
        shimmerGradient.addColorStop(0.5, '#ffff00');
        shimmerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = shimmerGradient;
        ctx.fillRect(x, y, size, size);
        ctx.globalAlpha = 1;
        
        // Sand particles blowing
        ctx.fillStyle = '#d2b48c';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 6; i++) {
            const particleX = x + Math.random() * size;
            const particleY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(particleX, particleY, 0.2 + Math.random() * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
    
    drawEnhancedSavannaTile(ctx, x, y, size, detailNoise, moisture) {
        // Savanna grassland base
        const savannaGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        savannaGradient.addColorStop(0, '#daa520');
        savannaGradient.addColorStop(0.5, '#b8860b');
        savannaGradient.addColorStop(1, '#8b7355');
        ctx.fillStyle = savannaGradient;
        ctx.fillRect(x, y, size, size);
        
        // Tall savanna grass
        ctx.fillStyle = '#8b7355';
        for (let i = 0; i < 15; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            const grassHeight = 2 + Math.random() * 3;
            ctx.fillRect(grassX, grassY - grassHeight, 1, grassHeight);
        }
        
        // Scattered acacia trees
        if (detailNoise > 0.3) {
            const treeX = x + size * 0.6;
            const treeY = y + size * 0.7;
            
            // Acacia trunk
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX, treeY, 2, 4);
            
            // Distinctive acacia canopy (flat-topped)
            ctx.fillStyle = '#228b22';
            ctx.fillRect(treeX - 4, treeY - 2, 10, 2);
            ctx.fillRect(treeX - 3, treeY - 4, 8, 2);
            
            // Sparse leaves
            ctx.fillStyle = '#32cd32';
            ctx.globalAlpha = 0.7;
            for (let leaf = 0; leaf < 6; leaf++) {
                const leafX = treeX - 3 + Math.random() * 8;
                const leafY = treeY - 4 + Math.random() * 2;
                ctx.beginPath();
                ctx.arc(leafX, leafY, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        // Termite mounds
        if (Math.random() > 0.7) {
            const moundX = x + Math.random() * size;
            const moundY = y + size * 0.8;
            const moundHeight = 2 + Math.random() * 2;
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(moundX, moundY - moundHeight, 2, moundHeight);
            ctx.fillRect(moundX - 1, moundY - moundHeight * 0.5, 4, moundHeight * 0.5);
        }
        
        // Grazing trails
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.6);
        ctx.quadraticCurveTo(x + size/2, y + size * 0.5, x + size, y + size * 0.7);
        ctx.stroke();
        ctx.globalAlpha = 1;
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
        
        // Clear scouts array completely to prevent duplication
        this.scouts = [];
        
        this.exploredAreas.clear();
        this.revealAnimations = [];
        this.loadedChunks.clear();
        this.fogOfWar.clear();
        this.seed = Math.random() * 10000;
        
        // Load chunks first, then spawn scout
        this.loadNearbyChunks();
        
        // Spawn single scout after clearing
        this.spawnInitialScout();
        
        this.updateMobileResourceDisplay();
        this.updateMobilePopulationDisplay();
        this.updateMobileStatsDisplay();
        
        this.cancelMobilePlacement();
    }
    
    restoreFogOfWar() {
        // Enhanced fog restoration for mobile with proper chunk checking
        for (const areaKey of this.exploredAreas) {
            const [tileX, tileY] = areaKey.split(',').map(Number);
            
            // Only reveal areas for loaded chunks
            const chunkCoords = this.getChunkCoords(tileX, tileY);
            const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.y);
            const chunk = this.loadedChunks.get(chunkKey);
            const fogData = this.fogOfWar.get(chunkKey);
            
            if (chunk && fogData) {
                const ctx = fogData.ctx;
                const localX = tileX - chunk.worldX;
                const localY = tileY - chunk.worldY;
                
                // Clear fog in a small area around this tile
                if (localX >= 0 && localX < this.chunkSize && localY >= 0 && localY < this.chunkSize) {
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                    
                    const clearRadius = this.tileSize;
                    ctx.beginPath();
                    ctx.arc(localX, localY, clearRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
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