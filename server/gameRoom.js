// Classe per gestire le stanze di gioco
class GameRoom {
  constructor(id, name, host, isPrivate, password, isRanked, maxPlayers, gameMode = null, isHosted = true) {
    this.id = id;
    this.name = name;
    this.host = host;
    this.isPrivate = isPrivate;
    this.password = password;
    this.isRanked = isRanked;
    this.gameMode = gameMode; // '1v1', '2v2', '3v3' o null per stanze normali
    this.maxPlayers = maxPlayers || gameConfig.maxPlayers;
    this.players = {};
    this.teams = { red: [], blue: [] };
    this.spectators = [];
    this.score = { red: 0, blue: 0 };
    this.gameStarted = false;
    this.engine = Engine.create({ 
      positionIterations: 6,
      velocityIterations: 4
    });
    this.world = this.engine.world;
    this.setupPhysics();
    this.powerUps = [];
    this.lastUpdateTime = Date.now();
    this.gameInterval = null;
    this.replayData = [];
    this.isHosted = isHosted; // Indica se la stanza è hostata da un giocatore
    this.p2pConnections = {}; // Connessioni P2P tra i giocatori
    this.playerStats = {}; // Statistiche dei giocatori (ping, velocità connessione)
    this.isPaused = false; // Indica se la partita è in pausa
    this.hostTransferInProgress = false; // Indica se è in corso un trasferimento di host
    this.readyCheckInProgress = false; // Indica se è in corso un ready check
    this.readyPlayers = new Set(); // Giocatori pronti dopo un cambio di host
    this.readyCheckTimeout = null; // Timeout per il ready check
    this.lagDetectionInterval = null; // Intervallo per il rilevamento del lag
    this.lagReports = {}; // Report di lag dai giocatori
  }

  setupPhysics() {
    // Crea i muri del campo
    const walls = [
      // Muro superiore
      Bodies.rectangle(
        gameConfig.fieldWidth / 2,
        -gameConfig.wallThickness / 2,
        gameConfig.fieldWidth,
        gameConfig.wallThickness,
        { isStatic: true }
      ),
      // Muro inferiore
      Bodies.rectangle(
        gameConfig.fieldWidth / 2,
        gameConfig.fieldHeight + gameConfig.wallThickness / 2,
        gameConfig.fieldWidth,
        gameConfig.wallThickness,
        { isStatic: true }
      ),
      // Muro sinistro (con porta)
      Bodies.rectangle(
        -gameConfig.wallThickness / 2,
        gameConfig.fieldHeight / 2 - gameConfig.goalWidth / 2 - gameConfig.wallThickness / 2,
        gameConfig.wallThickness,
        gameConfig.fieldHeight - gameConfig.goalWidth,
        { isStatic: true }
      ),
      Bodies.rectangle(
        -gameConfig.wallThickness / 2,
        gameConfig.fieldHeight / 2 + gameConfig.goalWidth / 2 + gameConfig.wallThickness / 2,
        gameConfig.wallThickness,
        gameConfig.fieldHeight - gameConfig.goalWidth,
        { isStatic: true }
      ),
      // Muro destro (con porta)
      Bodies.rectangle(
        gameConfig.fieldWidth + gameConfig.wallThickness / 2,
        gameConfig.fieldHeight / 2 - gameConfig.goalWidth / 2 - gameConfig.wallThickness / 2,
        gameConfig.wallThickness,
        gameConfig.fieldHeight - gameConfig.goalWidth,
        { isStatic: true }
      ),
      Bodies.rectangle(
        gameConfig.fieldWidth + gameConfig.wallThickness / 2,
        gameConfig.fieldHeight / 2 + gameConfig.goalWidth / 2 + gameConfig.wallThickness / 2,
        gameConfig.wallThickness,
        gameConfig.fieldHeight - gameConfig.goalWidth,
        { isStatic: true }
      ),
    ];

    // Crea la palla
    this.ball = Bodies.circle(
      gameConfig.fieldWidth / 2,
      gameConfig.fieldHeight / 2,
      gameConfig.ballRadius,
      {
        restitution: 0.8,
        friction: 0.05,
        frictionAir: 0.01,
        label: 'ball'
      }
    );

    // Aggiungi tutti gli oggetti al mondo
    World.add(this.world, [...walls, this.ball]);

    // Configura il rilevamento delle collisioni
    Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Controlla se la palla è entrata in una porta
        if (bodyA.label === 'ball' || bodyB.label === 'ball') {
          const ball = bodyA.label === 'ball' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'ball' ? bodyB : bodyA;

          // Porta sinistra (team blu segna)
          if (ball.position.x < 0) {
            this.score.blue++;
            this.resetBall();
            this.emitGoal('blue');
          }
          // Porta destra (team rosso segna)
          else if (ball.position.x > gameConfig.fieldWidth) {
            this.score.red++;
            this.resetBall();
            this.emitGoal('red');
          }

          // Controlla se un giocatore ha raccolto un power-up
          if (otherBody.label && otherBody.label.startsWith('player_')) {
            const playerId = otherBody.label.split('_')[1];
            const powerUpIndex = this.powerUps.findIndex(p => 
              Math.abs(p.x - ball.position.x) < 20 && 
              Math.abs(p.y - ball.position.y) < 20
            );

            if (powerUpIndex !== -1) {
              const powerUp = this.powerUps[powerUpIndex];
              this.powerUps.splice(powerUpIndex, 1);
              this.applyPowerUp(playerId, powerUp.type);
            }
          }
        }
      }
    });
  }

  resetBall() {
    Body.setPosition(this.ball, {
      x: gameConfig.fieldWidth / 2,
      y: gameConfig.fieldHeight / 2
    });
    Body.setVelocity(this.ball, { x: 0, y: 0 });
  }

  emitGoal(team) {
    if (this.isHosted) {
      // Se la stanza è P2P, l'host invia l'evento agli altri giocatori
      if (this.host === socket.id) {
        this.broadcastP2PMessage({
          type: 'goal',
          data: {
            team,
            score: this.score
          }
        });
      }
    } else {
      // Se la stanza è hostata dal server, il server invia l'evento
      io.to(this.id).emit('goal', {
        team,
        score: this.score
      });
    }
  }

  addPlayer(playerId, playerName) {
    if (Object.keys(this.players).length >= this.maxPlayers) {
      return false;
    }

    this.players[playerId] = {
      id: playerId,
      name: playerName,
      team: 'spectator',
      x: 0,
      y: 0,
      body: null,
      input: {
        up: false,
        down: false,
        left: false,
        right: false,
        kick: false
      },
      specialAbilities: {
        superKick: false,
        frozen: false
      }
    };

    // Inizializza le statistiche del giocatore
    this.playerStats[playerId] = {
      ping: 0,
      pingHistory: [],
      connectionSpeed: 0,
      lagReported: 0,
      lastPingTime: Date.now()
    };

    this.spectators.push(playerId);
    return true;
  }

  removePlayer(playerId) {
    if (!this.players[playerId]) {
      return;
    }

    const player = this.players[playerId];
    const team = player.team;

    // Rimuovi il giocatore dalla lista del team
    if (team === 'red') {
      this.teams.red = this.teams.red.filter(id => id !== playerId);
    } else if (team === 'blue') {
      this.teams.blue = this.teams.blue.filter(id => id !== playerId);
    } else {
      this.spectators = this.spectators.filter(id => id !== playerId);
    }

    // Rimuovi il corpo del giocatore dal mondo fisico
    if (player.body) {
      World.remove(this.world, player.body);
    }

    // Rimuovi il giocatore dalla lista dei giocatori
    delete this.players[playerId];
    delete this.playerStats[playerId];
    this.readyPlayers.delete(playerId);

    // Se il giocatore era l'host, assegna un nuovo host
    if (playerId === this.host) {
      this.assignNewHost();
    }

    // Se non ci sono più giocatori, ferma il gioco
    if (Object.keys(this.players).length === 0) {
      this.stopGame();
    }
  }

  assignNewHost() {
    const playerIds = Object.keys(this.players);
    if (playerIds.length > 0) {
      // Seleziona il miglior host in base alle statistiche
      const newHost = this.selectBestHost();
      this.host = newHost || playerIds[0];
      
      // Notifica tutti i giocatori del cambio di host
      io.to(this.id).emit('hostChanged', { newHost: this.host });
    }
  }

  selectBestHost() {
    const playerIds = Object.keys(this.playerStats);
    if (playerIds.length === 0) return null;

    // Calcola un punteggio per ogni giocatore in base a ping e velocità di connessione
    const scores = {};
    playerIds.forEach(playerId => {
      const stats = this.playerStats[playerId];
      // Punteggio più basso è migliore (ping basso, velocità alta)
      scores[playerId] = (stats.ping || 100) - (stats.connectionSpeed || 0) * 0.1 + (stats.lagReported || 0) * 10;
    });

    // Ordina i giocatori per punteggio (dal migliore al peggiore)
    const sortedPlayers = playerIds.sort((a, b) => scores[a] - scores[b]);
    return sortedPlayers[0]; // Restituisci il miglior host
  }

  changeTeam(playerId, team) {
    if (!this.players[playerId]) {
      return;
    }

    const player = this.players[playerId];
    const currentTeam = player.team;

    // Rimuovi il giocatore dalla lista del team corrente
    if (currentTeam === 'red') {
      this.teams.red = this.teams.red.filter(id => id !== playerId);
    } else if (currentTeam === 'blue') {
      this.teams.blue = this.teams.blue.filter(id => id !== playerId);
    } else {
      this.spectators = this.spectators.filter(id => id !== playerId);
    }

    // Aggiungi il giocatore alla lista del nuovo team
    if (team === 'red') {
      this.teams.red.push(playerId);
    } else if (team === 'blue') {
      this.teams.blue.push(playerId);
    } else {
      this.spectators.push(playerId);
    }

    // Aggiorna il team del giocatore
    player.team = team;

    // Notifica tutti i giocatori del cambio di team
    io.to(this.id).emit('teamChanged', {
      playerId,
      team
    });
  }

  startGame() {
    if (this.gameStarted) {
      return;
    }

    // Verifica che ci siano abbastanza giocatori
    if (this.teams.red.length === 0 || this.teams.blue.length === 0) {
      return;
    }

    this.gameStarted = true;
    this.isPaused = false;
    this.score = { red: 0, blue: 0 };
    this.resetBall();
    this.setupPlayers();
    this.spawnPowerUp();

    // Avvia il rilevamento del lag
    this.startLagDetection();

    // Avvia il loop di gioco
    this.lastUpdateTime = Date.now();
    
    if (this.isHosted) {
      // Se la stanza è P2P, solo l'host esegue la fisica
      if (this.host === socket.id) {
        this.gameInterval = setInterval(() => this.update(), 1000 / gameConfig.tickRate);
      }
    } else {
      // Se la stanza è hostata dal server, il server esegue la fisica
      this.gameInterval = setInterval(() => this.update(), 1000 / gameConfig.tickRate);
    }

    // Notifica tutti i giocatori dell'inizio del gioco
    io.to(this.id).emit('gameStarted');
  }

  setupPlayers() {
    // Posiziona i giocatori del team rosso
    this.teams.red.forEach((playerId, index) => {
      const player = this.players[playerId];
      const x = gameConfig.fieldWidth / 4;
      const y = gameConfig.fieldHeight / 2 + (index - this.teams.red.length / 2) * 50;

      player.x = x;
      player.y = y;

      // Crea il corpo del giocatore
      player.body = Bodies.circle(x, y, gameConfig.playerRadius, {
        friction: 0.1,
        frictionAir: 0.05,
        restitution: 0.5,
        label: `player_${playerId}`
      });

      World.add(this.world, player.body);
    });

    // Posiziona i giocatori del team blu
    this.teams.blue.forEach((playerId, index) => {
      const player = this.players[playerId];
      const x = gameConfig.fieldWidth * 3 / 4;
      const y = gameConfig.fieldHeight / 2 + (index - this.teams.blue.length / 2) * 50;

      player.x = x;
      player.y = y;

      // Crea il corpo del giocatore
      player.body = Bodies.circle(x, y, gameConfig.playerRadius, {
        friction: 0.1,
        frictionAir: 0.05,
        restitution: 0.5,
        label: `player_${playerId}`
      });

      World.add(this.world, player.body);
    });
  }

  spawnPowerUp() {
    // Genera un power-up casuale ogni 10-20 secondi
    const spawnTime = 10000 + Math.random() * 10000;

    setTimeout(() => {
      if (!this.gameStarted || this.isPaused) {
        return;
      }

      const powerUpTypes = ['speed', 'size', 'kick', 'freeze'];
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      const x = 100 + Math.random() * (gameConfig.fieldWidth - 200);
      const y = 100 + Math.random() * (gameConfig.fieldHeight - 200);
      const id = crypto.randomBytes(8).toString('hex');

      const powerUp = { id, type, x, y };
      this.powerUps.push(powerUp);

      if (this.isHosted) {
        // Se la stanza è P2P, l'host invia l'evento agli altri giocatori
        if (this.host === socket.id) {
          this.broadcastP2PMessage({
            type: 'powerUpSpawned',
            data: powerUp
          });
        }
      } else {
        // Se la stanza è hostata dal server, il server invia l'evento
        io.to(this.id).emit('powerUpSpawned', powerUp);
      }

      // Rimuovi il power-up dopo 10 secondi se non viene raccolto
      setTimeout(() => {
        const index = this.powerUps.findIndex(p => p.id === id);
        if (index !== -1) {
          this.powerUps.splice(index, 1);
        }
      }, 10000);

      // Genera il prossimo power-up
      this.spawnPowerUp();
    }, spawnTime);
  }

  applyPowerUp(playerId, type) {
    const player = this.players[playerId];
    if (!player) {
      return;
    }

    if (this.isHosted) {
      // Se la stanza è P2P, l'host invia l'evento agli altri giocatori
      if (this.host === socket.id) {
        this.broadcastP2PMessage({
          type: 'powerUpCollected',
          data: {
            playerId,
            type
          }
        });
      }
    } else {
      // Se la stanza è hostata dal server, il server invia l'evento
      io.to(this.id).emit('powerUpCollected', {
        playerId,
        type
      });
    }

    switch (type) {
      case 'speed':
        // Aumenta la velocità del giocatore
        player.specialAbilities.speed = true;
        setTimeout(() => {
          if (player && player.specialAbilities) {
            player.specialAbilities.speed = false;
          }
        }, gameConfig.powerUpDuration);
        break;
      case 'size':
        // Aumenta la dimensione del giocatore
        if (player.body) {
          Body.scale(player.body, 1.5, 1.5);
          setTimeout(() => {
            if (player && player.body) {
              Body.scale(player.body, 1/1.5, 1/1.5);
            }
          }, gameConfig.powerUpDuration);
        }
        break;
      case 'kick':
        // Abilita il super calcio
        player.specialAbilities.superKick = true;
        setTimeout(() => {
          if (player && player.specialAbilities) {
            player.specialAbilities.superKick = false;
          }
        }, gameConfig.powerUpDuration);
        break;
      case 'freeze':
        // Congela i giocatori avversari
        const team = player.team;
        const oppositeTeam = team === 'red' ? 'blue' : 'red';
        
        this.teams[oppositeTeam].forEach(opponentId => {
          const opponent = this.players[opponentId];
          if (opponent) {
            opponent.specialAbilities.frozen = true;
            setTimeout(() => {
              if (opponent && opponent.specialAbilities) {
                opponent.specialAbilities.frozen = false;
              }
            }, gameConfig.powerUpDuration / 2);
          }
        });
        break;
    }
  }

  update() {
    if (this.isPaused) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // Aggiorna la fisica
    Engine.update(this.engine, deltaTime);

    // Aggiorna la posizione dei giocatori in base all'input
    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId];
      
      if (player.team === 'spectator' || !player.body) {
        return;
      }

      // Salta se il giocatore è congelato
      if (player.specialAbilities.frozen) {
        return;
      }

      const input = player.input;
      const force = 0.005 * deltaTime;
      const speedMultiplier = player.specialAbilities.speed ? 1.5 : 1;

      // Applica le forze in base all'input
      if (input.up) {
        Body.applyForce(player.body, player.body.position, { x: 0, y: -force * speedMultiplier });
      }
      if (input.down) {
        Body.applyForce(player.body, player.body.position, { x: 0, y: force * speedMultiplier });
      }
      if (input.left) {
        Body.applyForce(player.body, player.body.position, { x: -force * speedMultiplier, y: 0 });
      }
      if (input.right) {
        Body.applyForce(player.body, player.body.position, { x: force * speedMultiplier, y: 0 });
      }

      // Calcio
      if (input.kick) {
        const ballPos = this.ball.position;
        const playerPos = player.body.position;
        const dx = ballPos.x - playerPos.x;
        const dy = ballPos.y - playerPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Applica il calcio solo se la palla è abbastanza vicina
        if (distance < gameConfig.playerRadius + gameConfig.ballRadius + 10) {
          const kickForce = player.specialAbilities.superKick ? 0.03 : 0.01;
          const angle = Math.atan2(dy, dx);
          const fx = Math.cos(angle) * kickForce * deltaTime;
          const fy = Math.sin(angle) * kickForce * deltaTime;
          
          Body.applyForce(this.ball, this.ball.position, { x: fx, y: fy });
        }
      }

      // Aggiorna la posizione del giocatore
      player.x = player.body.position.x;
      player.y = player.body.position.y;
    });

    // Invia lo stato del gioco a tutti i giocatori
    this.sendGameState();

    // Registra i dati per il replay
    this.recordReplayFrame();
  }

  sendGameState() {
    const gameState = {
      ball: {
        x: this.ball.position.x,
        y: this.ball.position.y
      },
      players: {},
      powerUps: this.powerUps,
      score: this.score
    };

    // Aggiungi i dati dei giocatori
    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId];
      gameState.players[playerId] = {
        id: player.id,
        name: player.name,
        team: player.team,
        x: player.x,
        y: player.y,
        specialAbilities: player.specialAbilities
      };
    });

    if (this.isHosted) {
      // Se la stanza è P2P, l'host invia lo stato agli altri giocatori
      if (this.host === socket.id) {
        this.broadcastP2PMessage({
          type: 'gameState',
          data: gameState
        });
      }
    } else {
      // Se la stanza è hostata dal server, il server invia lo stato
      io.to(this.id).emit('gameState', gameState);
    }
  }

  recordReplayFrame() {
    const frame = {
      timestamp: Date.now(),
      ball: {
        x: this.ball.position.x,
        y: this.ball.position.y
      },
      players: {},
      powerUps: [...this.powerUps],
      score: { ...this.score }
    };

    // Aggiungi i dati dei giocatori
    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId];
      frame.players[playerId] = {
        id: player.id,
        name: player.name,
        team: player.team,
        x: player.x,
        y: player.y,
        specialAbilities: { ...player.specialAbilities }
      };
    });

    this.replayData.push(frame);

    // Limita la dimensione dei dati di replay
    if (this.replayData.length > 3600) { // 1 minuto a 60 fps
      this.replayData.shift();
    }
  }

  stopGame() {
    if (!this.gameStarted) {
      return;
    }

    this.gameStarted = false;
    this.isPaused = false;
    clearInterval(this.gameInterval);
    this.gameInterval = null;
    this.powerUps = [];

    // Ferma il rilevamento del lag
    this.stopLagDetection();

    // Rimuovi i corpi dei giocatori dal mondo
    Object.keys(this.players).forEach(playerId => {
      const player = this.players[playerId];
      if (player.body) {
        World.remove(this.world, player.body);
        player.body = null;
      }
    });

    // Notifica tutti i giocatori della fine del gioco
    io.to(this.id).emit('gameStopped');

    // Se la stanza è ranked, aggiorna gli MMR
    if (this.isRanked && this.gameMode) {
      this.updateMMR();
    }
  }

  updateMMR() {
    const redScore = this.score.red;
    const blueScore = this.score.blue;
    
    if (redScore === blueScore) {
      return; // Pareggio, nessun aggiornamento MMR
    }
    
    const winningTeam = redScore > blueScore ? 'red' : 'blue';
    const losingTeam = redScore > blueScore ? 'blue' : 'red';
    
    const mmrChanges = {};
    
    // Calcola il cambio MMR per ogni giocatore
    this.teams[winningTeam].forEach(playerId => {
      const player = this.players[playerId];
      if (player && users[player.name]) {
        const mmrGain = 25;
        users[player.name].mmr.global += mmrGain;
        users[player.name].mmr[this.gameMode] += mmrGain;
        
        mmrChanges[player.name] = { ...users[player.name].mmr };
      }
    });
    
    this.teams[losingTeam].forEach(playerId => {
      const player = this.players[playerId];
      if (player && users[player.name]) {
        const mmrLoss = 20;
        users[player.name].mmr.global = Math.max(0, users[player.name].mmr.global - mmrLoss);
        users[player.name].mmr[this.gameMode] = Math.max(0, users[player.name].mmr[this.gameMode] - mmrLoss);
        
        mmrChanges[player.name] = { ...users[player.name].mmr };
      }
    });
    
    // Aggiorna le classifiche
    updateRankings();
    
    // Notifica i giocatori del cambio MMR
    io.to(this.id).emit('mmrUpdated', mmrChanges);
    
    // Salva i dati
    saveData();
  }

  getPublicData() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      isPrivate: this.isPrivate,
      isRanked: this.isRanked,
      gameMode: this.gameMode,
      maxPlayers: this.maxPlayers,
      playerCount: Object.keys(this.players).length,
      gameStarted: this.gameStarted,
      isHosted: this.isHosted,
      isPaused: this.isPaused
    };
  }

  getDetailedData() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      isPrivate: this.isPrivate,
      isRanked: this.isRanked,
      gameMode: this.gameMode,
      maxPlayers: this.maxPlayers,
      players: Object.values(this.players).map(player => ({
        id: player.id,
        name: player.name,
        team: player.team
      })),
      gameStarted: this.gameStarted,
      score: this.score,
      isHosted: this.isHosted,
      isPaused: this.isPaused,
      readyCheckInProgress: this.readyCheckInProgress
    };
  }

  // Gestione delle connessioni P2P
  addP2PConnection(fromId, toId, signalData) {
    if (!this.p2pConnections[fromId]) {
      this.p2pConnections[fromId] = {};
    }
    
    this.p2pConnections[fromId][toId] = signalData;
    
    // Invia il segnale al destinatario
    const socket = io.sockets.sockets.get(toId);
    if (socket) {
      socket.emit('p2pSignal', {
        fromId,
        signalData
      });
    }
  }
  
  getP2PConnections(playerId) {
    const connections = {};
    
    // Raccogli tutte le connessioni verso questo giocatore
    Object.keys(this.p2pConnections).forEach(fromId => {
      if (this.p2pConnections[fromId][playerId]) {
        connections[fromId] = this.p2pConnections[fromId][playerId];
      }
    });
    
    return connections;
  }

  // Invia un messaggio P2P a tutti i giocatori
  broadcastP2PMessage(message) {
    // Questo metodo viene chiamato dal client, non dal server
    // Vedi la funzione broadcastP2PMessage in main.js
  }

  // Aggiorna le statistiche di un giocatore
  updatePlayerStats(playerId, stats) {
    if (!this.playerStats[playerId]) return;

    if (stats.ping !== undefined) {
      this.playerStats[playerId].ping = stats.ping;
      this.playerStats[playerId].pingHistory.push(stats.ping);
      
      // Mantieni solo gli ultimi 10 valori di ping
      if (this.playerStats[playerId].pingHistory.length > 10) {
        this.playerStats[playerId].pingHistory.shift();
      }
    }

    if (stats.connectionSpeed !== undefined) {
      this.playerStats[playerId].connectionSpeed = stats.connectionSpeed;
    }

    // Aggiorna il timestamp dell'ultimo ping
    this.playerStats[playerId].lastPingTime = Date.now();
  }

  // Avvia il rilevamento del lag
  startLagDetection() {
    // Ferma eventuali rilevamenti precedenti
    this.stopLagDetection();

    // Avvia un nuovo intervallo di rilevamento
    this.lagDetectionInterval = setInterval(() => {
      this.checkForLag();
    }, 5000); // Controlla ogni 5 secondi
  }

  // Ferma il rilevamento del lag
  stopLagDetection() {
    if (this.lagDetectionInterval) {
      clearInterval(this.lagDetectionInterval);
      this.lagDetectionInterval = null;
    }
  }

  // Controlla se ci sono problemi di lag
  checkForLag() {
    if (!this.gameStarted || this.isPaused) return;

    // Controlla se l'host ha un ping elevato
    if (this.playerStats[this.host]) {
      const hostStats = this.playerStats[this.host];
      
      // Calcola il ping medio degli ultimi valori
      const avgPing = hostStats.pingHistory.reduce((sum, ping) => sum + ping, 0) / 
                     (hostStats.pingHistory.length || 1);
      
      // Se il ping medio è superiore a 200ms, considera di cambiare host
      if (avgPing > 200 || hostStats.lagReported > 2) {
        this.pauseGameForHostTransfer();
      }
    }

    // Controlla se ci sono giocatori che non hanno inviato ping recentemente
    const currentTime = Date.now();
    Object.keys(this.playerStats).forEach(playerId => {
      const stats = this.playerStats[playerId];
      
      // Se non abbiamo ricevuto ping negli ultimi 10 secondi, potrebbe esserci un problema
      if (currentTime - stats.lastPingTime > 10000) {
        // Incrementa il contatore di lag
        stats.lagReported++;
        
        // Se il giocatore è l'host e ha problemi persistenti, cambia host
        if (playerId === this.host && stats.lagReported > 2) {
          this.pauseGameForHostTransfer();
        }
      }
    });
  }

  // Mette in pausa il gioco per il trasferimento dell'host
  pauseGameForHostTransfer() {
    if (this.isPaused || this.hostTransferInProgress) return;

    this.isPaused = true;
    this.hostTransferInProgress = true;

    // Ferma il loop di gioco
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }

    // Notifica tutti i giocatori della pausa
    io.to(this.id).emit('gamePaused', {
      reason: 'host_transfer',
      message: 'Rilevati problemi di connessione. Trasferimento host in corso...'
    });

    // Seleziona un nuovo host
    const newHost = this.selectBestHost();
    if (newHost && newHost !== this.host) {
      this.host = newHost;
      
      // Notifica tutti i giocatori del cambio di host
      io.to(this.id).emit('hostChanged', { 
        newHost: this.host,
        duringGame: true
      });

      // Avvia il ready check
      this.startReadyCheck();
    } else {
      // Se non è stato possibile trovare un nuovo host, riprendi il gioco
      this.resumeGame();
    }
  }

  // Avvia il ready check
  startReadyCheck() {
    this.readyCheckInProgress = true;
    this.readyPlayers = new Set();

    // Notifica tutti i giocatori del ready check
    io.to(this.id).emit('readyCheckStarted');

    // Imposta un timeout di 30 secondi
    this.readyCheckTimeout = setTimeout(() => {
      this.finishReadyCheck();
    }, 30000);
  }

  // Segna un giocatore come pronto
  markPlayerReady(playerId) {
    this.readyPlayers.add(playerId);

    // Notifica tutti i giocatori dello stato del ready check
    io.to(this.id).emit('playerReady', {
      playerId,
      readyCount: this.readyPlayers.size,
      totalPlayers: Object.keys(this.players).length
    });

    // Se tutti i giocatori sono pronti, termina il ready check
    if (this.readyPlayers.size === Object.keys(this.players).length) {
      clearTimeout(this.readyCheckTimeout);
      this.finishReadyCheck();
    }
  }

  // Termina il ready check
  finishReadyCheck() {
    this.readyCheckInProgress = false;
    
    // Notifica tutti i giocatori della fine del ready check
    io.to(this.id).emit('readyCheckFinished', {
      readyPlayers: Array.from(this.readyPlayers)
    });

    // Riprendi il gioco
    this.resumeGame();
  }

  // Riprende il gioco dopo una pausa
  resumeGame() {
    this.isPaused = false;
    this.hostTransferInProgress = false;

    // Notifica tutti i giocatori della ripresa
    io.to(this.id).emit('gameResumed');

    // Riavvia il loop di gioco
    this.lastUpdateTime = Date.now();
    
    if (this.isHosted) {
      // Se la stanza è P2P, solo l'host esegue la fisica
      if (this.host === socket.id) {
        this.gameInterval = setInterval(() => this.update(), 1000 / gameConfig.tickRate);
      }
    } else {
      // Se la stanza è hostata dal server, il server esegue la fisica
      this.gameInterval = setInterval(() => this.update(), 1000 / gameConfig.tickRate);
    }
  }

  // Registra un report di lag
  reportLag(reporterId, targetId) {
    if (!this.playerStats[targetId]) return;

    // Incrementa il contatore di lag per il giocatore target
    this.playerStats[targetId].lagReported++;

    // Se il giocatore target è l'host e ha ricevuto più di 2 report, considera di cambiare host
    if (targetId === this.host && this.playerStats[targetId].lagReported > 2) {
      this.pauseGameForHostTransfer();
    }
  }
}
