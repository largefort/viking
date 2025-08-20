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
            
            // Load chunks around the saved camera position FIRST
            this.loadNearbyChunks();
            
            // Wait longer for chunks to properly load before restoring fog
            setTimeout(() => {
                this.restoreFogOfWar();
                this.showMobileNotification('Game loaded!', 'success');
            }, 300);
            
            this.updateMobileResourceDisplay();
            this.updateMobilePopulationDisplay();
            this.updateMobileStatsDisplay();
            
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
        // Check terrain (avoid water)
        const tileType = this.getTileAt(x, y);
        if (tileType.includes('water') || tileType.includes('deep_') || tileType.includes('ocean')) {
            return false;
        }
        
        // Check for overlapping buildings
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

    // Add missing terrain generation methods
    generatePolarTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.9) {
            return 'glacial_peak';
        } else if (biomeData.elevation < 0.1) {
            return 'ice_shelf';
        } else if (detailNoise < -0.3) {
            return 'polar_ice';
        } else {
            return 'ice_field';
        }
    }

    generateArcticTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2) {
            return detailNoise < -0.3 ? 'arctic_ice' : 'snow';
        } else if (biomeData.elevation < 0.4 && detailNoise > 0.2) {
            return 'tundra_grass';
        } else if (microNoise > 0.4 && biomeData.moisture > 0.3) {
            return 'sparse_forest';
        }
        return 'snow';
    }

    generateArcticDesertTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.7) {
            return 'frozen_scree';
        } else if (detailNoise < -0.4) {
            return 'permafrost';
        } else if (microNoise > 0.3) {
            return 'arctic_gravel';
        } else {
            return 'frozen_ground';
        }
    }

    generateAlpineTundraTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.8) {
            return 'alpine_peak';
        } else if (detailNoise > 0.3) {
            return 'alpine_scrub';
        } else {
            return 'mountain_tundra';
        }
    }

    generateBorealTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.6) {
            return detailNoise < -0.2 ? 'boreal_lake' : 'wetland';
        } else if (biomeData.moisture > 0.4) {
            return detailNoise > 0.2 ? 'dense_conifer_forest' : 'conifer_forest';
        } else if (biomeData.elevation > 0.6) {
            return 'rocky_terrain';
        }
        return microNoise > 0 ? 'conifer_forest' : 'boreal_clearing';
    }

    generateTaigaTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.7) {
            return 'taiga_bog';
        } else if (biomeData.elevation > 0.6) {
            return 'mountain_taiga';
        } else if (biomeData.moisture > 0.5) {
            return detailNoise > 0.3 ? 'dense_taiga' : 'taiga_forest';
        } else {
            return 'taiga_clearing';
        }
    }

    generateColdSteppeTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.5) {
            return 'steppe_hills';
        } else if (microNoise > 0.3) {
            return 'shrub_steppe';
        } else if (biomeData.moisture > 0.3) {
            return 'cold_grassland';
        } else {
            return 'cold_steppe';
        }
    }

    generateCoastalTerrain(biomeData, detailNoise, microNoise) {
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

    generateTemperateRainforestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.8) {
            return 'temperate_wetland';
        } else if (biomeData.moisture > 0.7) {
            return detailNoise > 0.3 ? 'dense_temperate_forest' : 'temperate_rainforest';
        } else if (microNoise > 0.4) {
            return 'moss_forest';
        } else {
            return 'fern_understory';
        }
    }

    generateDeciduousForestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.6) {
            return 'forest_stream';
        } else if (biomeData.moisture > 0.5) {
            return detailNoise > 0.2 ? 'dense_deciduous' : 'deciduous_forest';
        } else if (microNoise > 0.3) {
            return 'oak_forest';
        } else {
            return 'mixed_woodland';
        }
    }

    generateMountainTerrain(biomeData, detailNoise, microNoise) {
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

    generateTemperateGrasslandTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.6) {
            return 'grassland_pond';
        } else if (biomeData.moisture > 0.4) {
            return detailNoise > 0.3 ? 'tall_grass_prairie' : 'temperate_grassland';
        } else if (microNoise > 0.4) {
            return 'wildflower_meadow';
        } else {
            return 'short_grass_prairie';
        }
    }

    generateIslandTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.1) {
            return biomeData.temperature > 0.6 ? 'tropical_lagoon' : 'island_waters';
        } else if (biomeData.elevation < 0.3) {
            return detailNoise > 0 ? 'island_beach' : 'coral_reef';
        } else if (biomeData.moisture > 0.6) {
            return biomeData.temperature > 0.6 ? 'palm_forest' : 'island_forest';
        } else {
            return 'island_plateau';
        }
    }

    generateTropicalCoastTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.1) {
            return 'tropical_waters';
        } else if (biomeData.elevation < 0.2) {
            return detailNoise > 0 ? 'white_sand_beach' : 'mangrove_swamp';
        } else if (biomeData.moisture > 0.7) {
            return 'coastal_rainforest';
        } else {
            return 'tropical_coastal_plain';
        }
    }

    generateTropicalRainforestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.8) {
            return 'jungle_swamp';
        } else if (biomeData.moisture > 0.8) {
            return detailNoise > 0.4 ? 'dense_jungle' : 'tropical_rainforest';
        } else if (microNoise > 0.5) {
            return 'jungle_canopy';
        } else {
            return 'jungle_floor';
        }
    }

    generateSubtropicalForestTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.2 && biomeData.moisture > 0.7) {
            return 'subtropical_wetland';
        } else if (biomeData.moisture > 0.6) {
            return detailNoise > 0.3 ? 'dense_subtropical' : 'subtropical_forest';
        } else if (microNoise > 0.4) {
            return 'bamboo_grove';
        } else {
            return 'subtropical_woodland';
        }
    }

    generateSavannaTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation < 0.15 && biomeData.moisture > 0.5) {
            return 'savanna_waterhole';
        } else if (detailNoise > 0.4 && biomeData.moisture > 0.3) {
            return 'acacia_savanna';
        } else if (microNoise > 0.5) {
            return 'baobab_savanna';
        } else {
            return 'grassland_savanna';
        }
    }

    generateDesertTerrain(biomeData, detailNoise, microNoise) {
        if (biomeData.elevation > 0.7) {
            return 'desert_mountains';
        } else if (biomeData.elevation < 0.2 && biomeData.moisture > 0.2) {
            return 'oasis';
        } else if (detailNoise > 0.4) {
            return 'rocky_desert';
        } else if (microNoise > 0.3) {
            return 'sand_dunes';
        } else {
            return 'desert_plain';
        }
    }

    generateTemperateTerrain(biomeData, detailNoise, microNoise) {
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

    // Enhanced terrain generators with improved textures
    drawEnhancedTerrainTile(ctx, tileType, x, y, size, noise, detailNoise, moisture) {
        switch(tileType) {
            // Ocean and water biomes
            case 'deep_fjord_water':
            case 'tropical_waters':
            case 'island_waters':
            case 'tropical_lagoon':
                this.drawOceanTile(ctx, x, y, size, tileType, noise, detailNoise);
                break;
            case 'shallow_water':
            case 'coral_reef':
                this.drawShallowWaterTile(ctx, x, y, size, noise, detailNoise);
                
            // Desert biomes
            case 'desert_plain':
            case 'sand_dunes':
            case 'rocky_desert':
            case 'desert_mountains':
            case 'oasis':
                this.drawDesertTile(ctx, x, y, size, tileType, noise, detailNoise, moisture);
                break;
                
            // Forest biomes
            case 'tropical_rainforest':
            case 'dense_jungle':
            case 'jungle_canopy':
            case 'jungle_floor':
            case 'jungle_swamp':
                this.drawTropicalForestTile(ctx, x, y, size, tileType, noise, detailNoise, moisture);
                break;
            case 'deciduous_forest':
            case 'dense_deciduous':
            case 'oak_forest':
            case 'mixed_woodland':
            case 'forest_stream':
                this.drawDeciduousForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'conifer_forest':
            case 'dense_conifer_forest':
            case 'boreal_clearing':
            case 'taiga_forest':
            case 'dense_taiga':
                this.drawConiferForestTile(ctx, x, y, size, detailNoise, noise);
                break;
                
            // Snow biomes
            case 'snow':
            case 'polar_ice':
            case 'ice_field':
            case 'glacial_peak':
            case 'ice_shelf':
            case 'snow_peak':
                this.drawSnowTile(ctx, x, y, size, tileType, noise, detailNoise);
                break;
                
            // Grassland and savanna biomes
            case 'savanna':
            case 'grassland_savanna':
            case 'acacia_savanna':
            case 'baobab_savanna':
            case 'savanna_waterhole':
                this.drawSavannaTile(ctx, x, y, size, tileType, noise, detailNoise, moisture);
                break;
                
            // Arctic biome tiles
            case 'arctic_ice':
                this.drawArcticIceTile(ctx, x, y, size, noise, detailNoise);
                break;
            case 'tundra_grass':
                this.drawTundraGrassTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'sparse_forest':
                this.drawSparseForestTile(ctx, x, y, size, detailNoise, noise);
                break;
                
            // Boreal biome tiles
            case 'boreal_lake':
                this.drawBorealLakeTile(ctx, x, y, size, noise);
                break;
            case 'wetland':
                this.drawWetlandTile(ctx, x, y, size, moisture, detailNoise);
                break;
            case 'rocky_terrain':
                this.drawRockyTerrainTile(ctx, x, y, size, detailNoise, noise);
                break;
                
            // Coastal biome tiles
            case 'rocky_shore':
                this.drawRockyShoreTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'coastal_forest':
                this.drawCoastalForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'sea_cliff':
                this.drawSeaCliffTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'coastal_grass':
                this.drawCoastalGrassTile(ctx, x, y, size, moisture, detailNoise);
                break;
            case 'beach':
            case 'island_beach':
            case 'white_sand_beach':
                this.drawBeachTile(ctx, x, y, size, tileType, noise, detailNoise, moisture);
                break;
                
            // Mountain biome tiles
            case 'rocky_peak':
                this.drawRockyPeakTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'alpine_forest':
                this.drawAlpineForestTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'rocky_slope':
                this.drawRockySlopeTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'alpine_meadow':
                this.drawAlpineMeadowTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'mountain_forest':
                this.drawMountainForestTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'mountain_stream':
                this.drawMountainStreamTile(ctx, x, y, size, noise);
                break;
                
            // Temperate biome tiles
            case 'river':
                this.drawRiverTile(ctx, x, y, size, noise);
                break;
            case 'mixed_forest':
                this.drawMixedForestTile(ctx, x, y, size, detailNoise, noise);
                break;
            case 'dry_grassland':
                this.drawDryGrasslandTile(ctx, x, y, size, detailNoise, moisture);
                break;
            case 'flowering_meadow':
                this.drawFloweringMeadowTile(ctx, x, y, size, detailNoise, moisture);
                break;
                
            // Enhanced new biome tiles
            case 'frozen_ground':
            case 'frozen_scree':
            case 'permafrost':
            case 'arctic_gravel':
                this.drawArcticDesertTerrain(ctx, x, y, size, tileType, noise, detailNoise);
                break;
                
            case 'alpine_peak':
            case 'mountain_tundra':
            case 'alpine_scrub':
                this.drawAlpineTundraTerrain(ctx, x, y, size, tileType, noise, detailNoise);
                break;
                
            case 'taiga_bog':
            case 'mountain_taiga':
            case 'taiga_clearing':
                this.drawTaigaTerrain(ctx, x, y, size, tileType, noise, detailNoise, moisture);
                break;
                
            case 'cold_steppe':
            case 'steppe_hills':
            case 'cold_grassland':
            case 'shrub_steppe':
                this.drawColdSteppeTerrain(ctx, x, y, size, tileType, noise, detailNoise);
                break;
                
            // Fallback tiles with enhanced textures
            case 'grass':
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture || 0.5, noise);
                break;
            case 'hills':
                this.drawEnhancedHillsTile(ctx, x, y, size, detailNoise, noise);
                break;
            default:
                // Default grass tile for any unhandled terrain types
                this.drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture || 0.5, noise);
                break;
        }
    }

    // Add new terrain tile renderers
    drawOceanTile(ctx, x, y, size, tileType, noise, detailNoise) {
        let deepColor, midColor, lightColor;
        
        switch(tileType) {
            case 'tropical_waters':
            case 'tropical_lagoon':
                deepColor = '#0066cc';
                midColor = '#0080ff';
                lightColor = '#33aaff';
                break;
            case 'deep_fjord_water':
                deepColor = '#001133';
                midColor = '#003366';
                lightColor = '#0066cc';
                break;
            default:
                deepColor = '#0d47a1';
                midColor = '#1565c0';
                lightColor = '#1976d2';
        }
        
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, lightColor);
        gradient.addColorStop(0.5, midColor);
        gradient.addColorStop(1, deepColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Water effects
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = lightColor;
        const waveTime = Date.now() * 0.001;
        for (let i = 0; i < 3; i++) {
            const waveX = x + Math.sin(waveTime + noise + i) * size/4 + size/2;
            const waveY = y + Math.cos(waveTime + noise + i) * size/4 + size/2;
            ctx.fillRect(waveX, waveY, 2, 1);
        }
        ctx.globalAlpha = 1;
    }

    drawShallowWaterTile(ctx, x, y, size, noise, detailNoise) {
        // Shallow water base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Water depth variation
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(detailNoise), 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Sand bottom visible through water
        if (Math.abs(detailNoise) > 0.2) {
            ctx.fillStyle = '#ffd54f';
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x + size/4, y + size/4, size/2, size/2);
        }
        ctx.globalAlpha = 1;
    }

    drawDesertTile(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        let baseColor, accentColor;
        
        switch(tileType) {
            case 'sand_dunes':
                baseColor = '#f4e4bc';
                accentColor = '#e6d7a3';
                break;
            case 'rocky_desert':
                baseColor = '#d4b896';
                accentColor = '#8d6e63';
                break;
            case 'desert_mountains':
                baseColor = '#a67c52';
                accentColor = '#6d4c41';
                break;
            case 'oasis':
                baseColor = '#c8e6c9';
                accentColor = '#4caf50';
                break;
            default:
                baseColor = '#deb887';
                accentColor = '#cd853f';
        }
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, size, size);
        
        if (tileType === 'sand_dunes') {
            // Sand dune patterns
            ctx.fillStyle = accentColor;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 4; i++) {
                const duneY = y + i * size/4 + Math.sin(noise + i) * size/8;
                ctx.fillRect(x, duneY, size, size/6);
            }
            ctx.globalAlpha = 1;
        } else if (tileType === 'rocky_desert') {
            // Desert rocks
            ctx.fillStyle = '#8d6e63';
            for (let i = 0; i < 6; i++) {
                const rockX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
                const rockY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
                const rockSize = 2 + Math.abs(detailNoise + i * 0.2) * 2;
                ctx.fillRect(rockX, rockY, rockSize, rockSize);
            }
        } else if (tileType === 'oasis') {
            // Palm trees
            ctx.fillStyle = '#8bc34a';
            for (let i = 0; i < 3; i++) {
                const palmX = x + size/4 + i * size/4;
                const palmY = y + size/2 + Math.sin(i) * size/6;
                ctx.fillRect(palmX - 1, palmY, 2, size/4);
                
                // Palm fronds
                ctx.fillStyle = '#4caf50';
                ctx.fillRect(palmX - 3, palmY - size/4, 6, 3);
            }
            
            // Water
            ctx.fillStyle = '#2196f3';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size * 0.7, size/4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawTropicalForestTile(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        let floorColor, canopyColor, accentColor;
        
        switch(tileType) {
            case 'dense_jungle':
                floorColor = '#1b5e20';
                canopyColor = '#2e7d32';
                accentColor = '#4caf50';
                break;
            case 'jungle_canopy':
                floorColor = '#2e7d32';
                canopyColor = '#4caf50';
                accentColor = '#66bb6a';
                break;
            case 'jungle_swamp':
                floorColor = '#3e2723';
                canopyColor = '#4caf50';
                accentColor = '#2196f3';
                break;
            default:
                floorColor = '#388e3c';
                canopyColor = '#4caf50';
                accentColor = '#66bb6a';
        }
        
        // Forest floor
        ctx.fillStyle = floorColor;
        ctx.fillRect(x, y, size, size);
        
        // Dense vegetation
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = i % 2 === 0 ? canopyColor : accentColor;
            const vegX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            const vegSize = 2 + Math.abs(detailNoise + i * 0.1) * 3;
            ctx.fillRect(vegX, vegY, vegSize, vegSize);
        }
        
        // Tropical flowers
        if (tileType !== 'jungle_swamp' && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff5722', '#e91e63', '#9c27b0', '#ff9800'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Swamp water
        if (tileType === 'jungle_swamp') {
            ctx.fillStyle = '#2196f3';
            ctx.globalAlpha = 0.5;
            for (let i = 0; i < 3; i++) {
                const waterX = x + size * (0.2 + i * 0.3);
                const waterY = y + size * (0.4 + Math.sin(i) * 0.2);
                ctx.beginPath();
                ctx.arc(waterX, waterY, 3 + i, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
    }

    drawBeachTile(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        let sandColor, accentColor;
        
        switch(tileType) {
            case 'white_sand_beach':
                sandColor = '#ffffff';
                accentColor = '#f5f5f5';
                break;
            case 'island_beach':
                sandColor = '#fff9c4';
                accentColor = '#f0e68c';
                break;
            default:
                sandColor = '#f5e6a3';
                accentColor = '#deb887';
        }
        
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, sandColor);
        gradient.addColorStop(1, accentColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Sand texture
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 20; i++) {
            const dotX = x + Math.random() * size;
            const dotY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Shells and debris
        if (Math.random() < 0.3) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + size * 0.7, y + size * 0.3, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSavannaTile(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        let grassColor, treeColor;
        
        switch(tileType) {
            case 'acacia_savanna':
                grassColor = '#8bc34a';
                treeColor = '#795548';
                break;
            case 'baobab_savanna':
                grassColor = '#7cb342';
                treeColor = '#8d6e63';
                break;
            case 'savanna_waterhole':
                grassColor = '#4caf50';
                treeColor = '#2196f3';
                break;
            default:
                grassColor = '#9ccc65';
                treeColor = '#6d4c41';
        }
        
        // Savanna grass base
        ctx.fillStyle = grassColor;
        ctx.fillRect(x, y, size, size);
        
        // Grass texture
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#689f38';
        for (let i = 0; i < 15; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Trees based on savanna type
        if (tileType === 'acacia_savanna') {
            // Acacia tree
            ctx.fillStyle = treeColor;
            ctx.fillRect(x + size * 0.3, y + size * 0.4, 2, size/3);
            
            ctx.fillStyle = '#4caf50';
            ctx.beginPath();
            ctx.arc(x + size * 0.31, y + size * 0.25, 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (tileType === 'baobab_savanna') {
            // Baobab tree
            ctx.fillStyle = treeColor;
            ctx.fillRect(x + size * 0.4, y + size * 0.3, 4, size/2);
            
            ctx.fillStyle = '#66bb6a';
            ctx.fillRect(x + size * 0.38, y + size * 0.15, 8, 6);
        } else if (tileType === 'savanna_waterhole') {
            // Water hole
            ctx.fillStyle = '#2196f3';
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, size/3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    drawSnowTile(ctx, x, y, size, tileType, noise, detailNoise) {
        let snowColor, accentColor;
        
        switch(tileType) {
            case 'polar_ice':
            case 'glacial_peak':
                snowColor = '#e8f4fd';
                accentColor = '#ffffff';
                break;
            case 'ice_field':
            case 'ice_shelf':
                snowColor = '#f0f8ff';
                accentColor = '#e0f6ff';
                break;
            default:
                snowColor = '#ffffff';
                accentColor = '#f8f8ff';
        }
        
        const gradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(0.8, snowColor);
        gradient.addColorStop(1, '#e8e8e8');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Snow texture
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 15; i++) {
            const crystalX = x + (Math.sin(x * 0.05 + i) + 1) * size/2;
            const crystalY = y + (Math.cos(y * 0.05 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(crystalX, crystalY, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Ice formations for glacial types
        if (tileType === 'glacial_peak' || tileType === 'ice_shelf') {
            ctx.strokeStyle = '#b0e0e6';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * size/3, y);
                ctx.lineTo(x + i * size/3 + size/6, y + size);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }

    // Add missing terrain type renderers
    drawTaigaTerrain(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        switch(tileType) {
            case 'taiga_bog':
                ctx.fillStyle = '#2e8b57';
                ctx.fillRect(x, y, size, size);
                
                // Bog water
                ctx.fillStyle = '#4682b4';
                ctx.globalAlpha = 0.6;
                ctx.fillRect(x + size/4, y + size/4, size/2, size/2);
                ctx.globalAlpha = 1;
                
                // Bog vegetation
                ctx.fillStyle = '#228b22';
                for (let i = 0; i < 8; i++) {
                    const vegX = x + Math.random() * size;
                    const vegY = y + Math.random() * size;
                    ctx.fillRect(vegX, vegY, 1, 3);
                }
                break;
                
            case 'mountain_taiga':
                ctx.fillStyle = '#1a5a1a';
                ctx.fillRect(x, y, size, size);
                
                // Mountain conifers
                for (let i = 0; i < 4; i++) {
                    const treeX = x + (i % 2) * size/2 + Math.random() * size/4;
                    const treeY = y + Math.floor(i / 2) * size/2 + Math.random() * size/4;
                    
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(treeX - 1, treeY, 2, 6);
                    
                    ctx.fillStyle = '#006400';
                    ctx.fillRect(treeX - 3, treeY - 8, 6, 8);
                }
                break;
                
            default:
                // Default taiga
                ctx.fillStyle = '#2d5016';
                ctx.fillRect(x, y, size, size);
                
                // Taiga trees
                for (let i = 0; i < 6; i++) {
                    const treeX = x + (i % 3) * size/3 + Math.random() * size/4;
                    const treeY = y + Math.floor(i / 3) * size/2 + Math.random() * size/3;
                    
                    ctx.fillStyle = '#654321';
                    ctx.fillRect(treeX - 1, treeY, 2, 8);
                    
                    ctx.fillStyle = '#228b22';
                    ctx.fillRect(treeX - 4, treeY - 10, 8, 10);
                }
        }
    }

    drawColdSteppeTerrain(ctx, x, y, size, tileType, noise, detailNoise) {
        switch(tileType) {
            case 'steppe_hills':
                const hillGradient = ctx.createLinearGradient(x, y, x + size, y + size);
                hillGradient.addColorStop(0, '#8d6e63');
                hillGradient.addColorStop(1, '#795548');
                ctx.fillStyle = hillGradient;
                ctx.fillRect(x, y, size, size);
                break;
                
            case 'shrub_steppe':
                ctx.fillStyle = '#9acd32';
                ctx.fillRect(x, y, size, size);
                
                // Shrubs
                ctx.fillStyle = '#6b8e23';
                for (let i = 0; i < 5; i++) {
                    const shrubX = x + Math.random() * size;
                    const shrubY = y + Math.random() * size;
                    ctx.fillRect(shrubX, shrubY, 3, 3);
                }
                break;
                
            case 'cold_grassland':
                ctx.fillStyle = '#7cb342';
                ctx.fillRect(x, y, size, size);
                
                // Cold grass
                ctx.fillStyle = '#558b2f';
                for (let i = 0; i < 15; i++) {
                    const grassX = x + Math.random() * size;
                    const grassY = y + Math.random() * size;
                    ctx.fillRect(grassX, grassY, 1, 2);
                }
                break;
                
            default:
                ctx.fillStyle = '#b8860b';
                ctx.fillRect(x, y, size, size);
                
                // Dry steppe grass
                ctx.fillStyle = '#daa520';
                for (let i = 0; i < 20; i++) {
                    const grassX = x + Math.random() * size;
                    const grassY = y + Math.random() * size;
                    ctx.fillRect(grassX, grassY, 1, 1);
                }
        }
    }

    drawAlpineTundraTerrain(ctx, x, y, size, tileType, noise, detailNoise) {
        switch(tileType) {
            case 'alpine_peak':
                const peakGradient = ctx.createLinearGradient(x, y, x, y + size);
                peakGradient.addColorStop(0, '#ffffff');
                peakGradient.addColorStop(0.6, '#f0f0f0');
                peakGradient.addColorStop(1, '#d3d3d3');
                ctx.fillStyle = peakGradient;
                ctx.fillRect(x, y, size, size);
                
                // Peak formation
                ctx.fillStyle = '#a9a9a9';
                ctx.fillRect(x + size/3, y, size/3, size/2);
                break;
                
            case 'mountain_tundra':
                ctx.fillStyle = '#8fbc8f';
                ctx.fillRect(x, y, size, size);
                
                // Tundra vegetation
                ctx.fillStyle = '#556b2f';
                for (let i = 0; i < 8; i++) {
                    const vegX = x + Math.random() * size;
                    const vegY = y + Math.random() * size;
                    ctx.fillRect(vegX, vegY, 1, 1);
                }
                break;
                
            default:
                ctx.fillStyle = '#9acd32';
                ctx.fillRect(x, y, size, size);
                
                // Alpine scrub
                ctx.fillStyle = '#6b8e23';
                for (let i = 0; i < 6; i++) {
                    const scrubX = x + Math.random() * size;
                    const scrubY = y + Math.random() * size;
                    ctx.fillRect(scrubX, scrubY, 2, 2);
                }
        }
    }

    // Enhanced Arctic biome tile renderers with improved textures
    drawArcticIceTile(ctx, x, y, size, noise, detailNoise) {
        // Multi-layer ice texture
        const iceGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size/2);
        iceGradient.addColorStop(0, '#f0f8ff');
        iceGradient.addColorStop(0.4, '#e8f4fd');
        iceGradient.addColorStop(0.8, '#d1e7f8');
        iceGradient.addColorStop(1, '#b8daf2');
        ctx.fillStyle = iceGradient;
        ctx.fillRect(x, y, size, size);
        
        // Ice texture variations based on noise
        const textureAlpha = Math.abs(noise) * 0.3 + 0.1;
        ctx.globalAlpha = textureAlpha;
        ctx.fillStyle = '#ffffff';
        
        // Create ice crystal patterns
        for (let i = 0; i < 6; i++) {
            const crystalX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const crystalY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const crystalSize = Math.abs(detailNoise) * 2 + 0.5;
            
            ctx.beginPath();
            ctx.arc(crystalX, crystalY, crystalSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ice fracture lines
        if (Math.abs(detailNoise) > 0.4) {
            ctx.strokeStyle = '#87ceeb';
            ctx.lineWidth = 0.5;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(x, y + size * (0.3 + detailNoise * 0.2));
            ctx.lineTo(x + size, y + size * (0.7 + detailNoise * 0.2));
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawTundraGrassTile(ctx, x, y, size, detailNoise, moisture) {
        // Tundra base with soil showing through
        const soilColor = moisture > 0.3 ? '#8b7355' : '#a0855b';
        ctx.fillStyle = soilColor;
        ctx.fillRect(x, y, size, size);
        
        // Grass patches with varying density
        const grassDensity = Math.abs(detailNoise) * 8 + 4;
        const grassColors = ['#8fbc8f', '#9acd32', '#556b2f'];
        
        for (let i = 0; i < grassDensity; i++) {
            const grassX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const grassY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const grassColor = grassColors[i % grassColors.length];
            
            ctx.fillStyle = grassColor;
            ctx.globalAlpha = 0.7 + Math.abs(detailNoise) * 0.3;
            ctx.fillRect(grassX, grassY, 1, 2 + Math.abs(detailNoise) * 2);
        }
        
        // Moss patches in wetter areas
        if (moisture > 0.4) {
            ctx.fillStyle = '#90ee90';
            ctx.globalAlpha = 0.5;
            const mossX = x + size * (0.3 + detailNoise * 0.3);
            const mossY = y + size * (0.4 + detailNoise * 0.3);
            ctx.fillRect(mossX, mossY, 3 + Math.abs(detailNoise) * 2, 3 + Math.abs(detailNoise) * 2);
        }
        
        ctx.globalAlpha = 1;
    }
    
    drawSparseForestTile(ctx, x, y, size, detailNoise, noise) {
        // Forest floor with organic texture
        const forestFloorGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        forestFloorGradient.addColorStop(0, '#9acd32');
        forestFloorGradient.addColorStop(0.6, '#8fbc8f');
        forestFloorGradient.addColorStop(1, '#6b8e23');
        ctx.fillStyle = forestFloorGradient;
        ctx.fillRect(x, y, size, size);
        
        // Sparse vegetation texture
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#556b2f';
        for (let i = 0; i < 5; i++) {
            const vegX = x + (Math.sin(x * 0.08 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.08 + i) + 1) * size/2;
            ctx.fillRect(vegX, vegY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Conifer trees with enhanced detail
        const treeCount = Math.abs(detailNoise) > 0.3 ? 2 : 1;
        for (let i = 0; i < treeCount; i++) {
            const treeX = x + size/2 + i * size/3 - size/6;
            const treeY = y + size/2 + Math.sin(noise + i) * size/6;
            
            // Enhanced trunk
            ctx.fillStyle = '#654321';
            ctx.fillRect(treeX - 1, treeY, 2, 6 + Math.abs(noise) * 3);
            
            // Layered conifer canopy
            ctx.fillStyle = '#228b22';
            for (let layer = 0; layer < 3; layer++) {
                const layerSize = 4 - layer;
                ctx.fillRect(
                    treeX - layerSize, 
                    treeY - 5 - layer * 2, 
                    layerSize * 2, 
                    layerSize
                );
            }
            
            // Tree shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(treeX + 1, treeY + 1, 3, 3);
        }
    }
    
    // Enhanced Boreal biome tile renderers
    drawBorealLakeTile(ctx, x, y, size, noise) {
        // Deep water with depth variations
        const waterGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        waterGradient.addColorStop(0, '#4682b4');
        waterGradient.addColorStop(0.5, '#36648b');
        waterGradient.addColorStop(0.8, '#2f4f4f');
        waterGradient.addColorStop(1, '#1a3a3a');
        ctx.fillStyle = waterGradient;
        ctx.fillRect(x, y, size, size);
        
        // Water surface effects
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#87ceeb';
        const waveTime = Date.now() * 0.001;
        for (let i = 0; i < 3; i++) {
            const waveX = x + Math.sin(waveTime + i + noise) * size/4 + size/2;
            const waveY = y + Math.cos(waveTime + i + noise) * size/4 + size/2;
            ctx.fillRect(waveX, waveY, 2, 1);
        }
        
        // Depth indicators
        ctx.fillStyle = '#1e3a5f';
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x + size * 0.2, y + size * 0.3, size * 0.6, size * 0.4);
        
        ctx.globalAlpha = 1;
    }
    
    drawWetlandTile(ctx, x, y, size, moisture, detailNoise) {
        // Wetland base with water patches
        const wetlandBase = moisture > 0.7 ? '#2e8b57' : '#6b8e23';
        ctx.fillStyle = wetlandBase;
        ctx.fillRect(x, y, size, size);
        
        // Water patches
        ctx.fillStyle = '#4682b4';
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            const patchX = x + (Math.sin(x * 0.1 + i) + 1) * size/3;
            const patchY = y + (Math.cos(y * 0.1 + i) + 1) * size/3;
            const patchSize = 2 + Math.abs(detailNoise) * 3;
            ctx.beginPath();
            ctx.arc(patchX, patchY, patchSize, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Wetland vegetation with varying heights
        const reedColors = ['#228b22', '#32cd32', '#006400'];
        for (let i = 0; i < 12; i++) {
            const reedX = x + (Math.sin(x * 0.2 + i) + 1) * size/2;
            const reedY = y + (Math.cos(y * 0.2 + i) + 1) * size/2;
            const reedHeight = 3 + Math.abs(detailNoise + i * 0.1) * 4;
            
            ctx.fillStyle = reedColors[i % reedColors.length];
            ctx.fillRect(reedX, reedY - reedHeight, 1, reedHeight);
        }
        
        // Lily pads in water areas
        if (moisture > 0.6) {
            ctx.fillStyle = '#228b22';
            ctx.globalAlpha = 0.8;
            for (let i = 0; i < 2; i++) {
                const padX = x + size * (0.2 + i * 0.6);
                const padY = y + size * (0.3 + i * 0.4);
                ctx.beginPath();
                ctx.arc(padX, padY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
    
    drawDenseConiferTile(ctx, x, y, size, detailNoise, noise) {
        // Dense forest floor with organic patterns
        const forestFloorGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        forestFloorGradient.addColorStop(0, '#1a3a1a');
        forestFloorGradient.addColorStop(0.6, '#013220');
        forestFloorGradient.addColorStop(1, '#0d1f0d');
        ctx.fillStyle = forestFloorGradient;
        ctx.fillRect(x, y, size, size);
        
        // Dense vegetation
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#3e2723';
        for (let i = 0; i < 8; i++) {
            const undergrowthX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const undergrowthY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            ctx.fillRect(undergrowthX, undergrowthY, 2, 2);
        }
        ctx.globalAlpha = 1;
        
        // Very dense conifer arrangement
        const trees = [
            { x: 0.25, y: 0.3 }, { x: 0.75, y: 0.2 }, { x: 0.4, y: 0.6 },
            { x: 0.8, y: 0.7 }, { x: 0.1, y: 0.8 }, { x: 0.6, y: 0.9 }
        ];
        
        trees.forEach((tree, i) => {
            if (i < 3 + Math.abs(detailNoise) * 2) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeVariation = Math.sin(noise + i) * 0.3;
                
                // Trunk with bark texture
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, 4 + Math.abs(treeVariation) * 2);
                
                // Multi-layer conifer canopy
                const layers = ['#1a5f1a', '#228b22', '#32cd32'];
                layers.forEach((color, layerIndex) => {
                    ctx.fillStyle = color;
                    const layerSize = 3 + layerIndex;
                    ctx.fillRect(
                        treeX - layerSize + treeVariation,
                        treeY - 3 - layerIndex * 2,
                        layerSize * 2,
                        layerSize
                    );
                });
            }
        });
        
        // Forest lighting effects
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#90ee90';
        for (let i = 0; i < 3; i++) {
            const lightX = x + Math.sin(detailNoise + i) * size/3 + size/2;
            const lightY = y + Math.cos(detailNoise + i) * size/3 + size/2;
            ctx.beginPath();
            ctx.arc(lightX, lightY, 3 + i, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    drawConiferForestTile(ctx, x, y, size, detailNoise, noise) {
        // Forest floor with needle carpet
        const floorGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        floorGradient.addColorStop(0, '#3d5016');
        floorGradient.addColorStop(0.5, '#2d5016');
        floorGradient.addColorStop(1, '#1d4016');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(x, y, size, size);
        
        // Fallen needles texture
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#8b4513';
        for (let i = 0; i < 15; i++) {
            const needleX = x + (Math.sin(x * 0.3 + i) + 1) * size/2;
            const needleY = y + (Math.cos(y * 0.3 + i) + 1) * size/2;
            ctx.fillRect(needleX, needleY, 2, 1);
        }
        ctx.globalAlpha = 1;
        
        // Moderate density conifer trees
        const positions = [
            { x: 0.25, y: 0.3 }, { x: 0.75, y: 0.4 },
            { x: 0.4, y: 0.7 }, { x: 0.8, y: 0.8 }
        ];
        
        positions.forEach((pos, i) => {
            if (i < 3 + Math.abs(detailNoise) * 2) {
                const treeX = x + pos.x * size;
                const treeY = y + pos.y * size;
                const treeHeight = 5 + Math.abs(noise + i) * 3;
                
                // Enhanced trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeHeight);
                
                // Conifer canopy with depth
                ctx.fillStyle = '#1a5f1a';
                ctx.fillRect(treeX - 3, treeY - treeHeight + 2, 6, treeHeight - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeHeight, 2, 2);
            }
        });
        
        // Forest ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawRockyTerrainTile(ctx, x, y, size, detailNoise, noise) {
        // Rocky base with geological layering
        const rockGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        rockGradient.addColorStop(0, '#898989');
        rockGradient.addColorStop(0.3, '#708090');
        rockGradient.addColorStop(0.7, '#696969');
        rockGradient.addColorStop(1, '#2f4f4f');
        ctx.fillStyle = rockGradient;
        ctx.fillRect(x, y, size, size);
        
        // Rock formation layers
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#a9a9a9';
        for (let i = 0; i < 3; i++) {
            const layerY = y + i * size/3 + Math.sin(noise + i) * size/6;
            ctx.fillRect(x, layerY, size, size/6);
        }
        ctx.globalAlpha = 1;
        
        // Individual rock outcrops with shadows
        const rocks = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        rocks.forEach((rock, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const rockX = x + rock.x * size;
                const rockY = y + rock.y * size;
                const rockSize = 2 + Math.abs(noise + i) * 2;
                
                // Rock shadow
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.fillRect(rockX + 1, rockY + 1, rockSize, rockSize);
                
                // Rock body
                ctx.fillStyle = '#2f4f4f';
                ctx.fillRect(rockX, rockY, rockSize, rockSize);
                
                // Rock highlight
                ctx.fillStyle = '#778899';
                ctx.fillRect(rockX, rockY, rockSize * 0.6, rockSize * 0.6);
            }
        });
        
        // Lichen growth on rocks
        if (Math.abs(detailNoise) > 0.2) {
            ctx.fillStyle = '#9acd32';
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 5; i++) {
                const lichenX = x + (Math.sin(x * 0.2 + i) + 1) * size/2;
                const lichenY = y + (Math.cos(y * 0.2 + i) + 1) * size/2;
                ctx.beginPath();
                ctx.arc(lichenX, lichenY, 1 + Math.abs(detailNoise), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
        
        // Mineral veins
        if (Math.abs(noise) > 0.6) {
            ctx.strokeStyle = '#daa520';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.moveTo(x, y + size * 0.3);
            ctx.quadraticCurveTo(x + size/2, y + size * 0.6, x + size, y + size * 0.4);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    drawRockyShoreTile(ctx, x, y, size, detailNoise, noise) {
        // Rocky shore base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Water texture
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(detailNoise), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Rocky formations
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 6; i++) {
            const rockX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rockY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const rockSize = 2 + Math.abs(detailNoise + i * 0.2) * 2;
            ctx.fillRect(rockX, rockY, rockSize, rockSize);
        }
    }

    drawCoastalForestTile(ctx, x, y, size, detailNoise, moisture) {
        // Coastal forest base
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(x, y, size, size);
        
        // Coastal vegetation
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            const vegX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            const vegSize = 2 + Math.abs(detailNoise + i * 0.1) * 3;
            ctx.fillRect(vegX, vegY, vegSize, vegSize);
        }
        
        // Coastal flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Coastal trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Coastal ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawSeaCliffTile(ctx, x, y, size, detailNoise, noise) {
        // Sea cliff base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Cliff texture
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(detailNoise), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Rocky formations
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 6; i++) {
            const rockX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rockY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const rockSize = 2 + Math.abs(detailNoise + i * 0.2) * 2;
            ctx.fillRect(rockX, rockY, rockSize, rockSize);
        }
    }

    drawCoastalGrassTile(ctx, x, y, size, moisture, detailNoise) {
        // Coastal grass base
        ctx.fillStyle = '#9acd32';
        ctx.fillRect(x, y, size, size);
        
        // Grass texture
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#6b8e23';
        for (let i = 0; i < 15; i++) {
            const grassX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const grassY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Coastal flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Coastal trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Coastal ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawBeachTile(ctx, x, y, size, tileType, noise, detailNoise, moisture) {
        let sandColor, accentColor;
        
        switch(tileType) {
            case 'white_sand_beach':
                sandColor = '#ffffff';
                accentColor = '#f5f5f5';
                break;
            case 'island_beach':
                sandColor = '#fff9c4';
                accentColor = '#f0e68c';
                break;
            default:
                sandColor = '#f5e6a3';
                accentColor = '#deb887';
        }
        
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, sandColor);
        gradient.addColorStop(1, accentColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, size, size);
        
        // Sand texture
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 20; i++) {
            const dotX = x + Math.random() * size;
            const dotY = y + Math.random() * size;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Shells and debris
        if (Math.random() < 0.3) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + size * 0.7, y + size * 0.3, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawAlpineForestTile(ctx, x, y, size, detailNoise, moisture) {
        // Alpine forest base
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(x, y, size, size);
        
        // Alpine vegetation
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            const vegX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            const vegSize = 2 + Math.abs(detailNoise + i * 0.1) * 3;
            ctx.fillRect(vegX, vegY, vegSize, vegSize);
        }
        
        // Alpine flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Alpine trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Alpine ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawRockyPeakTile(ctx, x, y, size, detailNoise, noise) {
        // Rocky peak base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Peak texture
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(detailNoise), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Rocky formations
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 6; i++) {
            const rockX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rockY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const rockSize = 2 + Math.abs(detailNoise + i * 0.2) * 2;
            ctx.fillRect(rockX, rockY, rockSize, rockSize);
        }
    }

    drawAlpineMeadowTile(ctx, x, y, size, detailNoise, moisture) {
        // Alpine meadow base
        ctx.fillStyle = '#9acd32';
        ctx.fillRect(x, y, size, size);
        
        // Meadow texture
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#6b8e23';
        for (let i = 0; i < 15; i++) {
            const grassX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const grassY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Alpine flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Alpine trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Alpine ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawMountainForestTile(ctx, x, y, size, detailNoise, noise) {
        // Mountain forest base
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(x, y, size, size);
        
        // Forest texture
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            const vegX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            const vegSize = 2 + Math.abs(detailNoise + i * 0.1) * 3;
            ctx.fillRect(vegX, vegY, vegSize, vegSize);
        }
        
        // Mountain flowers
        if (Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Mountain trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Mountain ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawMountainStreamTile(ctx, x, y, size, noise) {
        // Mountain stream base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Stream texture
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(noise), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Rocky formations
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 6; i++) {
            const rockX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rockY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const rockSize = 2 + Math.abs(noise + i) * 2;
            ctx.fillRect(rockX, rockY, rockSize, rockSize);
        }
    }

    drawRiverTile(ctx, x, y, size, noise) {
        // River base
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(x, y, size, size);
        
        // Water texture
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#29b6f6';
        for (let i = 0; i < 6; i++) {
            const rippleX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const rippleY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(rippleX, rippleY, 2 + Math.abs(noise), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // River banks
        ctx.fillStyle = '#8d6e63';
        for (let i = 0; i < 6; i++) {
            const bankX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const bankY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const bankSize = 2 + Math.abs(noise + i) * 2;
            ctx.fillRect(bankX, bankY, bankSize, bankSize);
        }
    }

    drawMixedForestTile(ctx, x, y, size, detailNoise, noise) {
        // Mixed forest base
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(x, y, size, size);
        
        // Mixed vegetation
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 12; i++) {
            const vegX = x + (Math.sin(x * 0.15 + i) + 1) * size/2;
            const vegY = y + (Math.cos(y * 0.15 + i) + 1) * size/2;
            const vegSize = 2 + Math.abs(detailNoise + i * 0.1) * 3;
            ctx.fillRect(vegX, vegY, vegSize, vegSize);
        }
        
        // Mixed flowers
        if (Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Mixed trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Mixed ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawDryGrasslandTile(ctx, x, y, size, detailNoise, moisture) {
        // Dry grassland base
        ctx.fillStyle = '#9ccc65';
        ctx.fillRect(x, y, size, size);
        
        // Grass texture
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#689f38';
        for (let i = 0; i < 15; i++) {
            const grassX = x + Math.random() * size;
            const grassY = y + Math.random() * size;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Dry flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Dry trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Dry ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawFloweringMeadowTile(ctx, x, y, size, detailNoise, moisture) {
        // Flowering meadow base
        ctx.fillStyle = '#9acd32';
        ctx.fillRect(x, y, size, size);
        
        // Meadow texture
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#6b8e23';
        for (let i = 0; i < 15; i++) {
            const grassX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const grassY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            ctx.fillRect(grassX, grassY, 1, 2);
        }
        ctx.globalAlpha = 1;
        
        // Flowers
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ffb6c1', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Trees
        const trees = [
            { x: 0.2, y: 0.3, size: 0.15 },
            { x: 0.6, y: 0.2, size: 0.2 },
            { x: 0.8, y: 0.7, size: 0.12 },
            { x: 0.3, y: 0.8, size: 0.18 },
            { x: 0.7, y: 0.5, size: 0.1 }
        ];
        
        trees.forEach((tree, i) => {
            if (Math.abs(detailNoise + i * 0.2) > 0.1) {
                const treeX = x + tree.x * size;
                const treeY = y + tree.y * size;
                const treeSize = tree.size * size + Math.abs(noise + i) * 3;
                
                // Tree trunk
                ctx.fillStyle = '#654321';
                ctx.fillRect(treeX - 1, treeY, 2, treeSize);
                
                // Tree canopy
                ctx.fillStyle = '#228b22';
                ctx.fillRect(treeX - 3, treeY - treeSize + 2, 6, treeSize - 1);
                
                // Tree top
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(treeX - 1, treeY - treeSize, 2, 2);
            }
        });
        
        // Ambiance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#90ee90';
        ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.2);
        ctx.globalAlpha = 1;
    }

    drawEnhancedGrassTile(ctx, x, y, size, detailNoise, moisture, noise) {
        // Enhanced grass with seasonal variations
        const baseColors = {
            spring: ['#7cb342', '#8bc34a', '#9ccc65'],
            summer: ['#4caf50', '#66bb6a', '#81c784'],
            autumn: ['#ff8f00', '#ffa726', '#ffb74d'],
            winter: ['#795548', '#8d6e63', '#a1887f']
        };
        
        // Simulate seasons based on noise
        const season = Math.abs(noise) > 0.5 ? 'summer' : Math.abs(noise) > 0 ? 'spring' : 'autumn';
        const grassColors = baseColors[season] || baseColors.summer;
        
        // Moisture-adjusted base
        const moistureAdjustment = moisture * 0.3;
        const baseGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        baseGradient.addColorStop(0, grassColors[0]);
        baseGradient.addColorStop(0.6, grassColors[1]);
        baseGradient.addColorStop(1, grassColors[2]);
        ctx.fillStyle = baseGradient;
        ctx.fillRect(x, y, size, size);
        
        // Grass blade texture with wind effect
        const windEffect = Math.sin(Date.now() * 0.001 + x * 0.01) * 0.1;
        for (let i = 0; i < 25; i++) {
            const grassX = x + (Math.sin(x * 0.1 + i) + 1) * size/2;
            const grassY = y + (Math.cos(y * 0.1 + i) + 1) * size/2;
            const bladeHeight = 1 + Math.abs(detailNoise + i * 0.1) * 2;
            const bladeTilt = windEffect * (i % 3);
            
            ctx.fillStyle = grassColors[i % grassColors.length];
            ctx.globalAlpha = 0.8 + moistureAdjustment;
            ctx.fillRect(grassX + bladeTilt, grassY - bladeHeight, 1, bladeHeight);
        }
        ctx.globalAlpha = 1;
        
        // Soil patches in dry areas
        if (moisture < 0.3) {
            ctx.fillStyle = '#8d6e63';
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 5; i++) {
                const soilX = x + Math.random() * size;
                const soilY = y + Math.random() * size;
                ctx.fillRect(soilX, soilY, 2, 2);
            }
            ctx.globalAlpha = 1;
        }
        
        // Wildflowers in fertile areas
        if (moisture > 0.6 && Math.abs(detailNoise) > 0.3) {
            const flowerColors = ['#ff69b4', '#dda0dd', '#ff6347', '#ffd700'];
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = flowerColors[i];
                const flowerX = x + size * (0.2 + i * 0.2);
                const flowerY = y + size * (0.3 + Math.sin(detailNoise + i) * 0.3);
                ctx.beginPath();
                ctx.arc(flowerX, flowerY, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    drawEnhancedSnowTile(ctx, x, y, size, detailNoise, noise) {
        // Multi-layer snow with depth variations
        const snowGradient = ctx.createRadialGradient(x + size/2, y + size/2, 0, x + size/2, y + size/2, size);
        snowGradient.addColorStop(0, '#ffffff');
        snowGradient.addColorStop(0.4, '#fafafa');
        snowGradient.addColorStop(0.8, '#f0f0f0');
        snowGradient.addColorStop(1, '#e8e8e8');
        ctx.fillStyle = snowGradient;
        ctx.fillRect(x, y, size, size);
        
        // Snow texture with crystalline structure
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 20; i++) {
            ctx.fillStyle = '#ffffff';
            const crystalX = x + (Math.sin(x * 0.05 + i) + 1) * size/2;
            const crystalY = y + (Math.cos(y * 0.05 + i) + 1) * size/2;
            ctx.beginPath();
            ctx.arc(crystalX, crystalY, 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Ice formations for glacial types
        if (Math.abs(noise) > 0.6) {
            ctx.strokeStyle = '#b0e0e6';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * size/3, y);
                ctx.lineTo(x + i * size/3 + size/6, y + size);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }
    
    drawEnhancedHillsTile(ctx, x, y, size, detailNoise, noise) {
        // Rolling hills with geological layering
        const hillGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        hillGradient.addColorStop(0, '#a1887f');
        hillGradient.addColorStop(0.3, '#8d6e63');
        hillGradient.addColorStop(0.6, '#795548');
        hillGradient.addColorStop(1, '#6d4c41');
        ctx.fillStyle = hillGradient;
        ctx.fillRect(x, y, size, size);
        
        // Topographical contours
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 4; i++) {
            const contourRadius = (i + 1) * size/8 + Math.abs(detailNoise) * size/8;
            ctx.beginPath();
            ctx.arc(x + size/2, y + size/2, contourRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        
        // Rock outcrops on slopes
        if (Math.abs(detailNoise) > 0.4) {
            const outcrops = [
                { x: 0.3, y: 0.2 }, { x: 0.7, y: 0.4 }, { x: 0.5, y: 0.8 }
            ];
            
            outcrops.forEach((outcrop, i) => {
                ctx.fillStyle = '#5d4037';
                const outX = x + outcrop.x * size;
                const outY = y + outcrop.y * size;
                const outSize = 2 + Math.abs(noise + i) * 2;
                
                ctx.fillRect(outX, outY, outSize, outSize);
                
                // Outcrop shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(outX + 1, outY + 1, outSize, outSize);
            });
        }
        
        // Hill vegetation
        if (Math.abs(noise) > 0.2) {
            const vegColors = ['#4caf50', '#66bb6a', '#388e3c'];
            vegColors.forEach((color, i) => {
                if (Math.abs(detailNoise + i * 0.3) > 0.1) {
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.7;
                    const vegX = x + size * (0.2 + i * 0.3);
                    const vegY = y + size * (0.4 + Math.sin(noise + i) * 0.2);
                    ctx.beginPath();
                    ctx.arc(vegX, vegY, 2 + i, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1;
        }
        
        // Erosion patterns
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + size * 0.1, y + size * (0.3 + i * 0.2));
            ctx.quadraticCurveTo(
                x + size * 0.5, 
                y + size * (0.4 + i * 0.2 + detailNoise * 0.1),
                x + size * 0.9, 
                y + size * (0.35 + i * 0.2)
            );
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    renderChunkTextures(chunk) {
        const ctx = chunk.textureCtx;
        const detailCtx = chunk.detailCtx;
        
        // Render base terrain
        chunk.tiles.forEach(tile => {
            this.drawEnhancedTerrainTile(ctx, tile.type, tile.localX, tile.localY, this.tileSize, tile.noise || 0, tile.detailNoise || 0, tile.moisture || 0.5);
        });
        
        // Add detail overlay
        chunk.tiles.forEach(tile => {
            this.drawTerrainDetails(detailCtx, tile.type, tile.localX, tile.localY, this.tileSize, tile.detailNoise || 0);
        });
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
        
        // Mark area as explored immediately for saving
        const startX = Math.floor((x - radius) / this.tileSize) * this.tileSize;
        const endX = Math.ceil((x + radius) / this.tileSize) * this.tileSize;
        const startY = Math.floor((y - radius) / this.tileSize) * this.tileSize;
        const endY = Math.ceil((y + radius) / this.tileSize) * this.tileSize;
        
        for (let tileX = startX; tileX <= endX; tileX += this.tileSize) {
            for (let tileY = startY; tileY <= endY; tileY += this.tileSize) {
                const distance = Math.sqrt((tileX - x) ** 2 + (tileY - y) ** 2);
                if (distance <= radius) {
                    const key = `${tileX},${tileY}`;
                    this.exploredAreas.add(key);
                }
            }
        }
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
        // Enhanced fog restoration with better coverage and validation
        for (const areaKey of this.exploredAreas) {
            const [tileX, tileY] = areaKey.split(',').map(Number);
            
            // Skip invalid coordinates
            if (isNaN(tileX) || isNaN(tileY)) continue;
            
            // Get chunk information
            const chunkCoords = this.getChunkCoords(tileX, tileY);
            const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.y);
            const chunk = this.loadedChunks.get(chunkKey);
            const fogData = this.fogOfWar.get(chunkKey);
            
            if (chunk && fogData) {
                const ctx = fogData.ctx;
                const localX = tileX - chunk.worldX;
                const localY = tileY - chunk.worldY;
                
                // Ensure coordinates are within chunk bounds
                if (isFinite(localX) && isFinite(localY) && isFinite(this.tileSize)) {
                    
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-out';
                    
                    // Create a larger clear area to ensure proper visibility
                    const clearRadius = this.tileSize * 2;
                    
                    // Use gradient for smooth fog clearing
                    const gradient = ctx.createRadialGradient(localX, localY, 0, localX, localY, clearRadius);
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
                    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(localX, localY, clearRadius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
        
        // Also restore fog around scout positions for immediate visibility
        this.scouts.forEach(scout => {
            this.revealAreaImmediate(scout.x, scout.y, scout.range * 1.5);
        });
    }
    
    // New method for immediate fog revealing without animation
    revealAreaImmediate(x, y, radius) {
        const chunkCoords = this.getChunkCoords(x, y);
        const chunkKey = this.getChunkKey(chunkCoords.x, chunkCoords.y);
        const fogData = this.fogOfWar.get(chunkKey);
        const chunk = this.loadedChunks.get(chunkKey);
        
        if (!fogData || !chunk) return;
        
        const ctx = fogData.ctx;
        const localX = x - chunk.worldX;
        const localY = y - chunk.worldY;
        
        // Ensure coordinates are valid
        if (isFinite(localX) && isFinite(localY) && isFinite(radius) && radius > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            
            const gradient = ctx.createRadialGradient(localX, localY, 0, localX, localY, radius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(localX, localY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Mark area tiles as explored
        const startX = Math.floor((x - radius) / this.tileSize) * this.tileSize;
        const endX = Math.ceil((x + radius) / this.tileSize) * this.tileSize;
        const startY = Math.floor((y - radius) / this.tileSize) * this.tileSize;
        const endY = Math.ceil((y + radius) / this.tileSize) * this.tileSize;
        
        for (let tileX = startX; tileX <= endX; tileX += this.tileSize) {
            for (let tileY = startY; tileY <= endY; tileY += this.tileSize) {
                const distance = Math.sqrt((tileX - x) ** 2 + (tileY - y) ** 2);
                if (distance <= radius) {
                    const key = `${tileX},${tileY}`;
                    this.exploredAreas.add(key);
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
                    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.6)');
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