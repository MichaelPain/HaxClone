// Editor di mappe
const MapEditor = {
    // Stato dell'editor
    mapData: {
        walls: [],
        goals: [],
        spawns: {
            red: [],
            blue: []
        }
    },
    selectedTool: 'wall',
    isDragging: false,
    startX: 0,
    startY: 0,
    currentObject: null,
    
    // Canvas e contesto
    canvas: null,
    ctx: null,
    
    // Inizializza l'editor
    init: () => {
        MapEditor.setupEventListeners();
    },
    
    // Configura il canvas
    setupCanvas: () => {
        MapEditor.canvas = UI.elements.mapEditor.canvas;
        MapEditor.ctx = MapEditor.canvas.getContext('2d');
        
        // Imposta le dimensioni del canvas
        MapEditor.canvas.width = CONFIG.FIELD_WIDTH;
        MapEditor.canvas.height = CONFIG.FIELD_HEIGHT;
        
        // Renderizza la mappa
        MapEditor.render();
    },
    
    // Configura i listener degli eventi
    setupEventListeners: () => {
        // Mouse down
        UI.elements.mapEditor.canvas.addEventListener('mousedown', (e) => {
            const rect = MapEditor.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            MapEditor.handleMouseDown(x, y);
        });
        
        // Mouse move
        UI.elements.mapEditor.canvas.addEventListener('mousemove', (e) => {
            const rect = MapEditor.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            MapEditor.handleMouseMove(x, y);
        });
        
        // Mouse up
        UI.elements.mapEditor.canvas.addEventListener('mouseup', () => {
            MapEditor.handleMouseUp();
        });
        
        // Mouse leave
        UI.elements.mapEditor.canvas.addEventListener('mouseleave', () => {
            MapEditor.handleMouseUp();
        });
    },
    
    // Gestisce il mouse down
    handleMouseDown: (x, y) => {
        MapEditor.isDragging = true;
        MapEditor.startX = x;
        MapEditor.startY = y;
        
        // Se lo strumento è cancella, controlla se c'è un oggetto da eliminare
        if (MapEditor.selectedTool === 'erase') {
            MapEditor.eraseObjectAt(x, y);
        } else if (MapEditor.selectedTool === 'spawn') {
            // Se lo strumento è spawn, aggiungi uno spawn
            const team = prompt('Squadra (red/blue):');
            if (team === 'red' || team === 'blue') {
                MapEditor.mapData.spawns[team].push({ x, y });
                MapEditor.render();
            }
        } else {
            // Altrimenti, crea un nuovo oggetto
            MapEditor.currentObject = {
                type: MapEditor.selectedTool,
                x: x,
                y: y,
                width: 0,
                height: 0
            };
        }
    },
    
    // Gestisce il mouse move
    handleMouseMove: (x, y) => {
        if (!MapEditor.isDragging || !MapEditor.currentObject) return;
        
        // Aggiorna le dimensioni dell'oggetto corrente
        MapEditor.currentObject.width = x - MapEditor.startX;
        MapEditor.currentObject.height = y - MapEditor.startY;
        
        // Renderizza la mappa
        MapEditor.render();
    },
    
    // Gestisce il mouse up
    handleMouseUp: () => {
        if (!MapEditor.isDragging) return;
        
        MapEditor.isDragging = false;
        
        // Se c'è un oggetto corrente, aggiungilo alla mappa
        if (MapEditor.currentObject) {
            // Normalizza le dimensioni (gestisci valori negativi)
            if (MapEditor.currentObject.width < 0) {
                MapEditor.currentObject.x += MapEditor.currentObject.width;
                MapEditor.currentObject.width = Math.abs(MapEditor.currentObject.width);
            }
            
            if (MapEditor.currentObject.height < 0) {
                MapEditor.currentObject.y += MapEditor.currentObject.height;
                MapEditor.currentObject.height = Math.abs(MapEditor.currentObject.height);
            }
            
            // Aggiungi l'oggetto alla mappa
            if (MapEditor.currentObject.width > 5 && MapEditor.currentObject.height > 5) {
                if (MapEditor.currentObject.type === 'wall') {
                    MapEditor.mapData.walls.push({
                        x: MapEditor.currentObject.x,
                        y: MapEditor.currentObject.y,
                        width: MapEditor.currentObject.width,
                        height: MapEditor.currentObject.height
                    });
                } else if (MapEditor.currentObject.type === 'goal') {
                    const team = prompt('Squadra (red/blue):');
                    if (team === 'red' || team === 'blue') {
                        MapEditor.mapData.goals.push({
                            x: MapEditor.currentObject.x,
                            y: MapEditor.currentObject.y,
                            width: MapEditor.currentObject.width,
                            height: MapEditor.currentObject.height,
                            team: team
                        });
                    }
                }
            }
            
            MapEditor.currentObject = null;
            MapEditor.render();
        }
    },
    
    // Cancella un oggetto alla posizione specificata
    eraseObjectAt: (x, y) => {
        // Controlla i muri
        for (let i = 0; i < MapEditor.mapData.walls.length; i++) {
            const wall = MapEditor.mapData.walls[i];
            if (Utils.pointInRect(x, y, wall.x, wall.y, wall.width, wall.height)) {
                MapEditor.mapData.walls.splice(i, 1);
                MapEditor.render();
                return;
            }
        }
        
        // Controlla le porte
        for (let i = 0; i < MapEditor.mapData.goals.length; i++) {
            const goal = MapEditor.mapData.goals[i];
            if (Utils.pointInRect(x, y, goal.x, goal.y, goal.width, goal.height)) {
                MapEditor.mapData.goals.splice(i, 1);
                MapEditor.render();
                return;
            }
        }
        
        // Controlla gli spawn rossi
        for (let i = 0; i < MapEditor.mapData.spawns.red.length; i++) {
            const spawn = MapEditor.mapData.spawns.red[i];
            if (Utils.pointInCircle(x, y, spawn.x, spawn.y, 10)) {
                MapEditor.mapData.spawns.red.splice(i, 1);
                MapEditor.render();
                return;
            }
        }
        
        // Controlla gli spawn blu
        for (let i = 0; i < MapEditor.mapData.spawns.blue.length; i++) {
            const spawn = MapEditor.mapData.spawns.blue[i];
            if (Utils.pointInCircle(x, y, spawn.x, spawn.y, 10)) {
                MapEditor.mapData.spawns.blue.splice(i, 1);
                MapEditor.render();
                return;
            }
        }
    },
    
    // Renderizza la mappa
    render: () => {
        const ctx = MapEditor.ctx;
        
        // Pulisci il canvas
        ctx.clearRect(0, 0, MapEditor.canvas.width, MapEditor.canvas.height);
        
        // Disegna il campo
        ctx.fillStyle = CONFIG.COLORS.FIELD;
        ctx.fillRect(0, 0, MapEditor.canvas.width, MapEditor.canvas.height);
        
        // Disegna la griglia
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
        // Linee verticali
        for (let x = 0; x <= MapEditor.canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, MapEditor.canvas.height);
            ctx.stroke();
        }
        
        // Linee orizzontali
        for (let y = 0; y <= MapEditor.canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(MapEditor.canvas.width, y);
            ctx.stroke();
        }
        
        // Disegna i muri
        ctx.fillStyle = CONFIG.COLORS.WALL;
        MapEditor.mapData.walls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });
        
        // Disegna le porte
        MapEditor.mapData.goals.forEach(goal => {
            ctx.fillStyle = goal.team === 'red' ? CONFIG.COLORS.GOAL_RED : CONFIG.COLORS.GOAL_BLUE;
            ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
        });
        
        // Disegna gli spawn
        MapEditor.mapData.spawns.red.forEach(spawn => {
            ctx.beginPath();
            ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.RED_TEAM;
            ctx.fill();
        });
        
        MapEditor.mapData.spawns.blue.forEach(spawn => {
            ctx.beginPath();
            ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.BLUE_TEAM;
            ctx.fill();
        });
        
        // Disegna l'oggetto corrente
        if (MapEditor.currentObject) {
            if (MapEditor.currentObject.type === 'wall') {
                ctx.fillStyle = CONFIG.COLORS.WALL;
                ctx.fillRect(
                    MapEditor.currentObject.x,
                    MapEditor.currentObject.y,
                    MapEditor.currentObject.width,
                    MapEditor.currentObject.height
                );
            } else if (MapEditor.currentObject.type === 'goal') {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // Giallo trasparente per le porte non assegnate
                ctx.fillRect(
                    MapEditor.currentObject.x,
                    MapEditor.currentObject.y,
                    MapEditor.currentObject.width,
                    MapEditor.currentObject.height
                );
            }
        }
    },
    
    // Ottieni i dati della mappa
    getMapData: () => {
        return JSON.parse(JSON.stringify(MapEditor.mapData));
    },
    
    // Carica i dati della mappa
    loadMapData: (mapData) => {
        MapEditor.mapData = JSON.parse(JSON.stringify(mapData));
        MapEditor.render();
    },
    
    // Resetta la mappa
    resetMap: () => {
        MapEditor.mapData = {
            walls: [],
            goals: [],
            spawns: {
                red: [],
                blue: []
            }
        };
        MapEditor.render();
    }
};
