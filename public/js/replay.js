// Sistema di replay
const Replay = {
    // Stato del replay
    replayData: null,
    currentFrame: 0,
    isPlaying: false,
    playbackSpeed: CONFIG.REPLAY_SPEED,
    animationFrameId: null,
    lastUpdateTime: 0,
    
    // Canvas e contesto
    canvas: null,
    ctx: null,
    
    // Inizializza il replay
    init: (replayData) => {
        Replay.replayData = replayData;
        Replay.currentFrame = 0;
        Replay.isPlaying = true;
        Replay.lastUpdateTime = performance.now();
        
        // Aggiorna lo slider
        UI.elements.replay.slider.min = 0;
        UI.elements.replay.slider.max = replayData.frames.length - 1;
        UI.elements.replay.slider.value = 0;
        
        // Avvia il replay
        Replay.startReplayLoop();
    },
    
    // Configura il canvas
    setupCanvas: () => {
        Replay.canvas = UI.elements.replay.canvas;
        Replay.ctx = Replay.canvas.getContext('2d');
        
        // Imposta le dimensioni del canvas
        Replay.canvas.width = CONFIG.FIELD_WIDTH;
        Replay.canvas.height = CONFIG.FIELD_HEIGHT;
    },
    
    // Avvia il loop di replay
    startReplayLoop: () => {
        if (Replay.animationFrameId) return;
        
        Replay.lastUpdateTime = performance.now();
        Replay.animationFrameId = requestAnimationFrame(Replay.replayLoop);
    },
    
    // Ferma il loop di replay
    stopReplayLoop: () => {
        if (Replay.animationFrameId) {
            cancelAnimationFrame(Replay.animationFrameId);
            Replay.animationFrameId = null;
        }
    },
    
    // Loop di replay
    replayLoop: (timestamp) => {
        const deltaTime = timestamp - Replay.lastUpdateTime;
        Replay.lastUpdateTime = timestamp;
        
        // Se il replay è in pausa, non avanzare
        if (Replay.isPlaying) {
            // Avanza il frame in base alla velocità di riproduzione
            Replay.currentFrame += Replay.playbackSpeed * deltaTime / 50; // 50ms è il tempo di aggiornamento del server
            
            // Limita il frame corrente
            if (Replay.currentFrame >= Replay.replayData.frames.length) {
                Replay.currentFrame = 0;
            }
            
            // Aggiorna lo slider
            UI.elements.replay.slider.value = Math.floor(Replay.currentFrame);
        }
        
        // Renderizza il frame corrente
        Replay.renderFrame(Math.floor(Replay.currentFrame));
        
        // Continua il loop
        Replay.animationFrameId = requestAnimationFrame(Replay.replayLoop);
    },
    
    // Renderizza un frame specifico
    renderFrame: (frameIndex) => {
        if (!Replay.replayData || !Replay.replayData.frames || frameIndex >= Replay.replayData.frames.length) return;
        
        const frame = Replay.replayData.frames[frameIndex];
        const ctx = Replay.ctx;
        
        // Pulisci il canvas
        ctx.clearRect(0, 0, Replay.canvas.width, Replay.canvas.height);
        
        // Disegna il campo
        Replay.drawField();
        
        // Disegna i giocatori
        if (frame.players) {
            Object.keys(frame.players).forEach(playerId => {
                const player = frame.players[playerId];
                const team = player.team || 'spectator';
                const color = team === 'red' ? CONFIG.COLORS.RED_TEAM : (team === 'blue' ? CONFIG.COLORS.BLUE_TEAM : '#95a5a6');
                
                // Disegna l'ombra
                Utils.drawShadow(ctx, player.x, player.y, CONFIG.PLAYER_RADIUS);
                
                // Disegna il giocatore
                ctx.beginPath();
                ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                
                // Disegna il bordo
                ctx.beginPath();
                ctx.arc(player.x, player.y, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Disegna il nome del giocatore
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(player.name, player.x, player.y - CONFIG.PLAYER_RADIUS - 10);
            });
        }
        
        // Disegna la palla
        if (frame.ball) {
            // Disegna l'ombra
            Utils.drawShadow(ctx, frame.ball.x, frame.ball.y, CONFIG.BALL_RADIUS);
            
            // Disegna la palla
            ctx.beginPath();
            ctx.arc(frame.ball.x, frame.ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.BALL;
            ctx.fill();
            
            // Disegna il bordo
            ctx.beginPath();
            ctx.arc(frame.ball.x, frame.ball.y, CONFIG.BALL_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Disegna i dettagli della palla
            ctx.beginPath();
            ctx.moveTo(frame.ball.x, frame.ball.y - CONFIG.BALL_RADIUS * 0.5);
            for (let i = 1; i <= 6; i++) {
                const angle = i * Math.PI / 3;
                ctx.lineTo(
                    frame.ball.x + Math.sin(angle) * CONFIG.BALL_RADIUS * 0.5,
                    frame.ball.y - Math.cos(angle) * CONFIG.BALL_RADIUS * 0.5
                );
            }
            ctx.closePath();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Disegna il punteggio
        if (frame.score) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`${frame.score.red} - ${frame.score.blue}`, Replay.canvas.width / 2, 10);
        }
    },
    
    // Disegna il campo
    drawField: () => {
        const ctx = Replay.ctx;
        
        // Sfondo del campo
        ctx.fillStyle = CONFIG.COLORS.FIELD;
        ctx.fillRect(0, 0, Replay.canvas.width, Replay.canvas.height);
        
        // Linea centrale
        ctx.beginPath();
        ctx.moveTo(Replay.canvas.width / 2, 0);
        ctx.lineTo(Replay.canvas.width / 2, Replay.canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Cerchio centrale
        ctx.beginPath();
        ctx.arc(Replay.canvas.width / 2, Replay.canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Porta sinistra (rossa)
        ctx.fillStyle = CONFIG.COLORS.GOAL_RED;
        ctx.fillRect(
            -CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2,
            CONFIG.WALL_THICKNESS,
            CONFIG.GOAL_WIDTH
        );
        
        // Porta destra (blu)
        ctx.fillStyle = CONFIG.COLORS.GOAL_BLUE;
        ctx.fillRect(
            Replay.canvas.width,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2,
            CONFIG.WALL_THICKNESS,
            CONFIG.GOAL_WIDTH
        );
        
        // Muri
        ctx.fillStyle = CONFIG.COLORS.WALL;
        
        // Muro superiore
        ctx.fillRect(0, -CONFIG.WALL_THICKNESS, Replay.canvas.width, CONFIG.WALL_THICKNESS);
        
        // Muro inferiore
        ctx.fillRect(0, Replay.canvas.height, Replay.canvas.width, CONFIG.WALL_THICKNESS);
        
        // Muro sinistro (sopra la porta)
        ctx.fillRect(
            -CONFIG.WALL_THICKNESS,
            0,
            CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2
        );
        
        // Muro sinistro (sotto la porta)
        ctx.fillRect(
            -CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 + CONFIG.GOAL_WIDTH / 2,
            CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2
        );
        
        // Muro destro (sopra la porta)
        ctx.fillRect(
            Replay.canvas.width,
            0,
            CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2
        );
        
        // Muro destro (sotto la porta)
        ctx.fillRect(
            Replay.canvas.width,
            Replay.canvas.height / 2 + CONFIG.GOAL_WIDTH / 2,
            CONFIG.WALL_THICKNESS,
            Replay.canvas.height / 2 - CONFIG.GOAL_WIDTH / 2
        );
    },
    
    // Attiva/disattiva la riproduzione
    togglePlayback: () => {
        Replay.isPlaying = !Replay.isPlaying;
    },
    
    // Cerca un frame specifico
    seek: (frameIndex) => {
        Replay.currentFrame = frameIndex;
        Replay.renderFrame(frameIndex);
    },
    
    // Imposta la velocità di riproduzione
    setPlaybackSpeed: (speed) => {
        Replay.playbackSpeed = speed;
    },
    
    // Carica un replay
    loadReplay: (replayId) => {
        socket.emit('getReplay', replayId, (replayData) => {
            if (replayData) {
                Replay.init(replayData);
                UI.showScreen('replay');
            } else {
                Utils.showNotification('Replay non trovato');
            }
        });
    }
};
