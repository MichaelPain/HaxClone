// Gestione del gioco
const Game = {
    // Elementi del gioco
    canvas: null,
    ctx: null,
    state: null,
    animationFrame: null,
    keys: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false,
        ability: false
    },
    powerUps: [],
    lastPingTime: 0,
    pingInterval: null,
    
    // Inizializza il gioco
    init: () => {
        // Inizializza il canvas
        Game.canvas = document.getElementById('game-canvas');
        Game.ctx = Game.canvas.getContext('2d');
        
        // Imposta le dimensioni del canvas
        Game.canvas.width = CONFIG.CANVAS_WIDTH;
        Game.canvas.height = CONFIG.CANVAS_HEIGHT;
        
        // Configura gli event listener per i controlli
        Game.setupControls();
    },
    
    // Configura i controlli
    setupControls: () => {
        // Tastiera
        window.addEventListener('keydown', (e) => {
            if (UI.state.currentScreen !== 'game') return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    Game.keys.up = true;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    Game.keys.down = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    Game.keys.left = true;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    Game.keys.right = true;
                    break;
                case ' ':
                    Game.keys.kick = true;
                    break;
                case 'Shift':
                    Game.keys.ability = true;
                    break;
            }
            
            // Invia l'input al server
            socket.emit('playerInput', {
                roomId: UI.state.selectedRoomId,
                input: {
                    up: Game.keys.up,
                    down: Game.keys.down,
                    left: Game.keys.left,
                    right: Game.keys.right,
                    kick: Game.keys.kick,
                    ability: Game.keys.ability
                }
            });
        });
        
        window.addEventListener('keyup', (e) => {
            if (UI.state.currentScreen !== 'game') return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    Game.keys.up = false;
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    Game.keys.down = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    Game.keys.left = false;
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    Game.keys.right = false;
                    break;
                case ' ':
                    Game.keys.kick = false;
                    break;
                case 'Shift':
                    Game.keys.ability = false;
                    break;
            }
            
            // Invia l'input al server
            socket.emit('playerInput', {
                roomId: UI.state.selectedRoomId,
                input: {
                    up: Game.keys.up,
                    down: Game.keys.down,
                    left: Game.keys.left,
                    right: Game.keys.right,
                    kick: Game.keys.kick,
                    ability: Game.keys.ability
                }
            });
        });
    },
    
    // Avvia il rendering
    startRendering: () => {
        // Ferma eventuali rendering precedenti
        Game.stopRendering();
        
        // Avvia il ping al server
        Game.startPinging();
        
        // Avvia il loop di rendering
        Game.render();
    },
    
    // Ferma il rendering
    stopRendering: () => {
        if (Game.animationFrame) {
            cancelAnimationFrame(Game.animationFrame);
            Game.animationFrame = null;
        }
        
        // Ferma il ping al server
        Game.stopPinging();
    },
    
    // Avvia il ping al server
    startPinging: () => {
        // Ferma eventuali ping precedenti
        Game.stopPinging();
        
        // Invia un ping ogni secondo
        Game.pingInterval = setInterval(() => {
            Game.lastPingTime = Date.now();
            socket.emit('ping', {
                roomId: UI.state.selectedRoomId,
                timestamp: Game.lastPingTime
            }, (response) => {
                const ping = response.ping;
                // Aggiorna l'interfaccia con il ping
                // console.log('Ping:', ping, 'ms');
            });
        }, 1000);
    },
    
    // Ferma il ping al server
    stopPinging: () => {
        if (Game.pingInterval) {
            clearInterval(Game.pingInterval);
            Game.pingInterval = null;
        }
    },
    
    // Aggiorna lo stato del gioco
    updateState: (newState) => {
        Game.state = newState;
    },
    
    // Aggiunge un power-up
    addPowerUp: (powerUp) => {
        Game.powerUps.push(powerUp);
    },
    
    // Rimuove un power-up
    removePowerUp: (powerUpId) => {
        Game.powerUps = Game.powerUps.filter(p => p.id !== powerUpId);
    },
    
    // Ottiene il nome di un giocatore
    getPlayerName: (playerId) => {
        if (!Game.state || !Game.state.players[playerId]) {
            return 'Giocatore sconosciuto';
        }
        
        return Game.state.players[playerId].name;
    },
    
    // Renderizza il gioco
    render: () => {
        // Pulisci il canvas
        Game.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        Game.ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);
        
        // Renderizza solo se abbiamo uno stato valido
        if (Game.state) {
            // Renderizza i muri
            Game.renderWalls();
            
            // Renderizza le porte
            Game.renderGoals();
            
            // Renderizza i power-up
            Game.renderPowerUps();
            
            // Renderizza i giocatori
            Game.renderPlayers();
            
            // Renderizza la palla
            Game.renderBall();
        }
        
        // Continua il loop di rendering
        Game.animationFrame = requestAnimationFrame(Game.render);
    },
    
    // Renderizza i muri
    renderWalls: () => {
        Game.ctx.fillStyle = CONFIG.COLORS.WALL;
        
        // Muro superiore
        Game.ctx.fillRect(0, 0, Game.canvas.width, CONFIG.WALL_THICKNESS);
        
        // Muro inferiore
        Game.ctx.fillRect(0, Game.canvas.height - CONFIG.WALL_THICKNESS, Game.canvas.width, CONFIG.WALL_THICKNESS);
        
        // Muro sinistro (con porta)
        Game.ctx.fillRect(0, 0, CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.fillRect(0, (Game.canvas.height + CONFIG.GOAL_WIDTH) / 2, CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
        
        // Muro destro (con porta)
        Game.ctx.fillRect(Game.canvas.width - CONFIG.WALL_THICKNESS, 0, CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.fillRect(Game.canvas.width - CONFIG.WALL_THICKNESS, (Game.canvas.height + CONFIG.GOAL_WIDTH) / 2, CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
    },
    
    // Renderizza le porte
    renderGoals: () => {
        // Porta sinistra (rossa)
        Game.ctx.strokeStyle = CONFIG.COLORS.RED_TEAM;
        Game.ctx.lineWidth = 2;
        Game.ctx.beginPath();
        Game.ctx.moveTo(CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.lineTo(CONFIG.WALL_THICKNESS, (Game.canvas.height + CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.stroke();
        
        // Porta destra (blu)
        Game.ctx.strokeStyle = CONFIG.COLORS.BLUE_TEAM;
        Game.ctx.beginPath();
        Game.ctx.moveTo(Game.canvas.width - CONFIG.WALL_THICKNESS, (Game.canvas.height - CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.lineTo(Game.canvas.width - CONFIG.WALL_THICKNESS, (Game.canvas.height + CONFIG.GOAL_WIDTH) / 2);
        Game.ctx.stroke();
    },
    
    // Renderizza i power-up
    renderPowerUps: () => {
        if (!Game.state || !Game.state.powerUps) return;
        
        Game.state.powerUps.forEach(powerUp => {
            let color;
            
            switch (powerUp.type) {
                case 'speed':
                    color = CONFIG.COLORS.POWER_UP.SPEED;
                    break;
                case 'size':
                    color = CONFIG.COLORS.POWER_UP.SIZE;
                    break;
                case 'kick':
                    color = CONFIG.COLORS.POWER_UP.KICK;
                    break;
                case 'freeze':
                    color = CONFIG.COLORS.POWER_UP.FREEZE;
                    break;
                default:
                    color = '#ffffff';
            }
            
            Game.ctx.fillStyle = color;
            Game.ctx.beginPath();
            Game.ctx.arc(powerUp.x, powerUp.y, 10, 0, Math.PI * 2);
            Game.ctx.fill();
            
            // Disegna un simbolo in base al tipo
            Game.ctx.fillStyle = '#ffffff';
            Game.ctx.font = '12px Arial';
            Game.ctx.textAlign = 'center';
            Game.ctx.textBaseline = 'middle';
            
            let symbol;
            switch (powerUp.type) {
                case 'speed':
                    symbol = '⚡';
                    break;
                case 'size':
                    symbol = '⬆️';
                    break;
                case 'kick':
                    symbol = '👟';
                    break;
                case 'freeze':
                    symbol = '❄️';
                    break;
                default:
                    symbol = '?';
            }
            
            Game.ctx.fillText(symbol, powerUp.x, powerUp.y);
        });
    },
    
    // Renderizza i giocatori
    renderPlayers: () => {
        if (!Game.state || !Game.state.players) return;
        
        Object.keys(Game.state.players).forEach(playerId => {
            const player = Game.state.players[playerId];
            
            // Colore in base alla squadra
            let color;
            if (player.team === 'red') {
                color = CONFIG.COLORS.RED_TEAM;
            } else if (player.team === 'blue') {
                color = CONFIG.COLORS.BLUE_TEAM;
            } else {
                color = '#95a5a6'; // Grigio per gli spettatori
            }
            
            // Disegna il giocatore
            Game.ctx.fillStyle = color;
            Game.ctx.beginPath();
            Game.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
            Game.ctx.fill();
            
            // Disegna il nome
            Game.ctx.fillStyle = '#ffffff';
            Game.ctx.font = '10px Arial';
            Game.ctx.textAlign = 'center';
            Game.ctx.textBaseline = 'middle';
            Game.ctx.fillText(player.name, player.x, player.y - CONFIG.PLAYER_RADIUS - 10);
            
            // Disegna effetti speciali
            if (player.specialAbilities) {
                if (player.specialAbilities.superKick) {
                    // Aura per super calcio
                    Game.ctx.strokeStyle = CONFIG.COLORS.POWER_UP.KICK;
                    Game.ctx.lineWidth = 2;
                    Game.ctx.beginPath();
                    Game.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS + 5, 0, Math.PI * 2);
                    Game.ctx.stroke();
                }
                
                if (player.specialAbilities.frozen) {
                    // Effetto congelamento
                    Game.ctx.strokeStyle = CONFIG.COLORS.POWER_UP.FREEZE;
                    Game.ctx.lineWidth = 2;
                    Game.ctx.beginPath();
                    Game.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
                    Game.ctx.stroke();
                    
                    // Simbolo di congelamento
                    Game.ctx.fillStyle = CONFIG.COLORS.POWER_UP.FREEZE;
                    Game.ctx.font = '15px Arial';
                    Game.ctx.fillText('❄️', player.x, player.y);
                }
            }
            
            // Evidenzia il giocatore corrente
            if (playerId === socket.id) {
                Game.ctx.strokeStyle = '#ffffff';
                Game.ctx.lineWidth = 2;
                Game.ctx.beginPath();
                Game.ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS + 2, 0, Math.PI * 2);
                Game.ctx.stroke();
            }
        });
    },
    
    // Renderizza la palla
    renderBall: () => {
        if (!Game.state || !Game.state.ball) return;
        
        const ball = Game.state.ball;
        
        Game.ctx.fillStyle = CONFIG.COLORS.BALL;
        Game.ctx.beginPath();
        Game.ctx.arc(ball.x, ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
        Game.ctx.fill();
        
        // Disegna pattern della palla
        Game.ctx.strokeStyle = '#000000';
        Game.ctx.lineWidth = 1;
        
        // Linea orizzontale
        Game.ctx.beginPath();
        Game.ctx.moveTo(ball.x - CONFIG.BALL_RADIUS, ball.y);
        Game.ctx.lineTo(ball.x + CONFIG.BALL_RADIUS, ball.y);
        Game.ctx.stroke();
        
        // Linea verticale
        Game.ctx.beginPath();
        Game.ctx.moveTo(ball.x, ball.y - CONFIG.BALL_RADIUS);
        Game.ctx.lineTo(ball.x, ball.y + CONFIG.BALL_RADIUS);
        Game.ctx.stroke();
    }
};
