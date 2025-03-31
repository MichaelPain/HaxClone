// Punto di ingresso principale dell'applicazione
let socket;
let p2pConnections = {}; // Memorizza le connessioni P2P

// Gestione degli errori globali - aggiunto per migliorare il debug
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Errore non catturato:', message, 'in', source, 'linea', lineno, ':', error);
    Utils.showNotification('Si è verificato un errore: ' + message);
    return true; // Permettiamo al browser di gestire l'errore anche dopo il nostro handler
};

// Gestione delle promesse non gestite - aggiunto per migliorare il debug
window.addEventListener('unhandledrejection', function(event) {
    console.error('Promise non gestita:', event.reason);
    Utils.showNotification('Si è verificato un errore con una promise: ' + event.reason);
});

// Quando il documento è pronto
document.addEventListener('DOMContentLoaded', () => {
    // Verifica il supporto per WebSocket
    if (!Utils.checkWebSocketSupport()) {
        Utils.showNotification('Il tuo browser non supporta WebSockets, necessari per il gioco multiplayer.');
        return;
    }
    
    // Inizializza la connessione socket
    initSocket();
    
    // Inizializza l'interfaccia utente
    UI.init();
    
    // Inizializza il gioco
    Game.init();
    
    // Inizializza l'editor di mappe
    MapEditor.init();
    
    // Verifica la connessione al server
    Utils.checkServerConnection((isConnected, error) => {
        if (!isConnected) {
            Utils.showNotification('Problemi di connessione al server. Tentativo di risoluzione automatica...');
            setTimeout(() => {
                Utils.troubleshootConnection();
            }, 1000);
        }
    });
});

// Inizializza la connessione socket
function initSocket() {
    try {
        // Crea la connessione al server
        socket = io(CONFIG.SERVER_URL, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ['websocket', 'polling'], // Prova prima websocket, poi fallback su polling
            maxHttpBufferSize: 1e6, // 1MB
            pingTimeout: 30000,
            pingInterval: 5000
        });
        
        // Gestisci la connessione
        socket.on('connect', () => {
            console.log('Connesso al server');
            
            // Tenta di effettuare il login automatico se ci sono credenziali salvate
            const username = Utils.loadFromStorage('username');
            const password = Utils.loadFromStorage('password');
            
            if (username && password) {
                socket.emit('login', { username, password }, (response) => {
                    if (response.success) {
                        UI.state.currentUser = response.user;
                        UI.elements.lobby.userDisplay.textContent = response.user.username;
                        UI.elements.lobby.mmrDisplay.textContent = `MMR: ${response.user.mmr.global}`;
                        
                        UI.showScreen('lobby');
                        Utils.showNotification(`Bentornato, ${response.user.username}!`);
                    }
                });
            }
        });
        
        // Gestisci la disconnessione
        socket.on('disconnect', (reason) => {
            console.log('Disconnesso dal server:', reason);
            Utils.showNotification('Disconnesso dal server. Riconnessione in corso...');
            
            // Se siamo in una stanza di gioco, torna alla lobby
            if (UI.state.currentScreen === 'room' || UI.state.currentScreen === 'game') {
                UI.showScreen('lobby');
            }
        });
        
        // Gestisci gli errori
        socket.on('connect_error', (error) => {
            console.error('Errore di connessione:', error);
            Utils.showNotification('Errore di connessione al server. Tentativo di risoluzione automatica...');
            Utils.troubleshootConnection();
        });
        
        // Gestisci la riconnessione
        socket.on('reconnect', (attemptNumber) => {
            console.log(`Riconnesso al server dopo ${attemptNumber} tentativi`);
            Utils.showNotification('Riconnesso al server');
            
            // Se l'utente era loggato, rieffettua il login
            if (UI.state.currentUser) {
                // Recupera la password da localStorage
                const password = Utils.loadFromStorage('password');
                
                if (password) {
                    socket.emit('login', {
                        username: UI.state.currentUser.username,
                        password
                    }, (response) => {
                        if (response.success) {
                            // Aggiorna i dati utente
                            UI.state.currentUser = response.user;
                            UI.elements.lobby.userDisplay.textContent = response.user.username;
                            UI.elements.lobby.mmrDisplay.textContent = `MMR: ${response.user.mmr.global}`;
                            
                            // Se eravamo in una stanza, prova a rientrare
                            if (UI.state.selectedRoomId) {
                                socket.emit('joinRoom', {
                                    roomId: UI.state.selectedRoomId,
                                    username: UI.state.currentUser.username
                                }, (joinResponse) => {
                                    if (joinResponse.success) {
                                        UI.updateRoomUI(joinResponse.room);
                                        UI.showScreen('room');
                                    } else {
                                        UI.state.selectedRoomId = null;
                                        UI.state.isHost = false;
                                    }
                                });
                            }
                        } else {
                            // Torna alla schermata di login
                            UI.showScreen('login');
                            Utils.showNotification('Sessione scaduta, effettua nuovamente il login');
                        }
                    });
                } else {
                    // Torna alla schermata di login
                    UI.showScreen('login');
                    Utils.showNotification('Sessione scaduta, effettua nuovamente il login');
                }
            }
        });
        
        // Gestisci gli eventi di sistema
        socket.on('systemMessage', (message) => {
            Utils.showNotification(message);
        });
        
        // Gestisci gli eventi di gioco
        socket.on('playerJoined', (player) => {
            Utils.showNotification(`${player.name} è entrato nella stanza`);
            
            // Aggiorna la lista dei giocatori
            socket.emit('joinRoom', {
                roomId: UI.state.selectedRoomId,
                username: UI.state.currentUser.username
            }, (response) => {
                if (response.success) {
                    UI.updateRoomUI(response.room);
                }
            });
        });
        
        socket.on('playerLeft', (player) => {
            Utils.showNotification(`${player.name} è uscito dalla stanza`);
            
            // Aggiorna la lista dei giocatori
            socket.emit('joinRoom', {
                roomId: UI.state.selectedRoomId,
                username: UI.state.currentUser.username
            }, (response) => {
                if (response.success) {
                    UI.updateRoomUI(response.room);
                }
            });
            
            // Se era una connessione P2P, rimuovila
            if (p2pConnections[player.id]) {
                p2pConnections[player.id].close();
                delete p2pConnections[player.id];
            }
        });
        
        socket.on('teamChanged', (data) => {
            // Aggiorna la lista dei giocatori
            socket.emit('joinRoom', {
                roomId: UI.state.selectedRoomId,
                username: UI.state.currentUser.username
            }, (response) => {
                if (response.success) {
                    UI.updateRoomUI(response.room);
                }
            });
        });
        
        socket.on('hostChanged', (data) => {
            UI.state.isHost = data.newHost === socket.id;
            
            if (UI.state.isHost) {
                Utils.showNotification('Sei diventato l\'host della stanza');
                UI.elements.room.startGameBtn.classList.remove('hidden');
            } else {
                UI.elements.room.startGameBtn.classList.add('hidden');
            }
        });
        
        socket.on('gameStarted', () => {
            Utils.showNotification('La partita è iniziata!');
            UI.showScreen('game');
        });
        
        socket.on('gameStopped', () => {
            Utils.showNotification('La partita è terminata');
            Game.stopRendering();
            UI.showScreen('room');
        });
        
        socket.on('gameState', (gameState) => {
            Game.updateState(gameState);
        });
        
        socket.on('goal', (data) => {
            const team = data.team === 'red' ? 'Rossi' : 'Blu';
            Utils.showNotification(`Goal! Squadra ${team}: ${data.score[data.team]}`);
            
            UI.elements.game.redScore.textContent = data.score.red;
            UI.elements.game.blueScore.textContent = data.score.blue;
        });
        
        socket.on('powerUpSpawned', (powerUp) => {
            Game.addPowerUp(powerUp);
        });
        
        socket.on('powerUpCollected', (data) => {
            Game.removePowerUp(data.powerUpId);
            
            const playerName = Game.getPlayerName(data.playerId);
            const powerUpName = getPowerUpName(data.type);
            
            Utils.showNotification(`${playerName} ha raccolto un power-up: ${powerUpName}!`);
        });
        
        socket.on('mmrUpdated', (mmrUpdates) => {
            if (mmrUpdates[UI.state.currentUser.username]) {
                const userMMR = mmrUpdates[UI.state.currentUser.username];
                UI.state.currentUser.mmr = userMMR;
                UI.elements.lobby.mmrDisplay.textContent = `MMR: ${userMMR.global}`;
                
                Utils.showNotification(`Il tuo MMR è stato aggiornato!`);
            }
        });
        
        socket.on('chatMessage', (data) => {
            UI.addChatMessage(data.sender, data.message);
        });
        
        // Gestione P2P
        socket.on('p2pConnect', (data) => {
            // Inizializza una connessione P2P con il peer
            initP2PConnection(data.peerId);
        });
        
        socket.on('p2pSignal', (data) => {
            // Gestisci il segnale P2P ricevuto
            handleP2PSignal(data.fromId, data.signalData);
        });
        
        socket.on('p2pConnections', (connections) => {
            // Gestisci le connessioni P2P esistenti
            Object.keys(connections).forEach(peerId => {
                handleP2PSignal(peerId, connections[peerId]);
            });
        });
    } catch (error) {
        console.error('Errore durante l\'inizializzazione del socket:', error);
        Utils.showNotification('Errore durante la connessione al server. Ricarica la pagina e riprova.');
    }
}

// Inizializza una connessione P2P con un peer
function initP2PConnection(peerId) {
    // Verifica se la connessione esiste già
    if (p2pConnections[peerId]) {
        return;
    }
    
    try {
        // Crea una nuova connessione P2P
        const peer = new SimplePeer({
            initiator: true,
            trickle: false
        });
        
        // Memorizza la connessione
        p2pConnections[peerId] = peer;
        
        // Gestisci gli eventi della connessione
        peer.on('signal', (signalData) => {
            // Invia il segnale al peer tramite il server
            socket.emit('p2pSignal', {
                roomId: UI.state.selectedRoomId,
                toId: peerId,
                signalData
            });
        });
        
        peer.on('connect', () => {
            console.log(`Connessione P2P stabilita con ${peerId}`);
        });
        
        peer.on('data', (data) => {
            // Gestisci i dati ricevuti dal peer
            const message = JSON.parse(data.toString());
            handleP2PMessage(peerId, message);
        });
        
        peer.on('error', (err) => {
            console.error(`Errore nella connessione P2P con ${peerId}:`, err);
            
            // Chiudi e rimuovi la connessione
            if (p2pConnections[peerId]) {
                p2pConnections[peerId].destroy();
                delete p2pConnections[peerId];
            }
        });
        
        peer.on('close', () => {
            console.log(`Connessione P2P chiusa con ${peerId}`);
            delete p2pConnections[peerId];
        });
    } catch (error) {
        console.error('Errore durante l\'inizializzazione della connessione P2P:', error);
    }
}

// Gestisci un segnale P2P ricevuto
function handleP2PSignal(fromId, signalData) {
    try {
        // Se la connessione non esiste, creala
        if (!p2pConnections[fromId]) {
            const peer = new SimplePeer({
                initiator: false,
                trickle: false
            });
            
            // Memorizza la connessione
            p2pConnections[fromId] = peer;
            
            // Gestisci gli eventi della connessione
            peer.on('signal', (data) => {
                // Invia il segnale al peer tramite il server
                socket.emit('p2pSignal', {
                    roomId: UI.state.selectedRoomId,
                    toId: fromId,
                    signalData: data
                });
            });
            
            peer.on('connect', () => {
                console.log(`Connessione P2P stabilita con ${fromId}`);
            });
            
            peer.on('data', (data) => {
                // Gestisci i dati ricevuti dal peer
                const message = JSON.parse(data.toString());
                handleP2PMessage(fromId, message);
            });
            
            peer.on('error', (err) => {
                console.error(`Errore nella connessione P2P con ${fromId}:`, err);
                
                // Chiudi e rimuovi la connessione
                if (p2pConnections[fromId]) {
                    p2pConnections[fromId].destroy();
                    delete p2pConnections[fromId];
                }
            });
            
            peer.on('close', () => {
                console.log(`Connessione P2P chiusa con ${fromId}`);
                delete p2pConnections[fromId];
            });
        }
        
        // Segnala al peer
        p2pConnections[fromId].signal(signalData);
    } catch (error) {
        console.error('Errore durante la gestione del segnale P2P:', error);
    }
}

// Gestisci un messaggio P2P ricevuto
function handleP2PMessage(fromId, message) {
    switch (message.type) {
        case 'gameState':
            // Aggiorna lo stato del gioco
            Game.updateState(message.data);
            break;
        case 'playerInput':
            // Aggiorna l'input di un giocatore
            if (UI.state.isHost && Game.state && Game.state.players[fromId]) {
                Game.state.players[fromId].input = message.data;
            }
            break;
        case 'goal':
            // Gestisci un goal
            const team = message.data.team === 'red' ? 'Rossi' : 'Blu';
            Utils.showNotification(`Goal! Squadra ${team}: ${message.data.score[message.data.team]}`);
            
            UI.elements.game.redScore.textContent = message.data.score.red;
            UI.elements.game.blueScore.textContent = message.data.score.blue;
            break;
        case 'powerUpSpawned':
            // Aggiungi un power-up
            Game.addPowerUp(message.data);
            break;
        case 'powerUpCollected':
            // Rimuovi un power-up
            Game.removePowerUp(message.data.powerUpId);
            
            const playerName = Game.getPlayerName(message.data.playerId);
            const powerUpName = getPowerUpName(message.data.type);
            
            Utils.showNotification(`${playerName} ha raccolto un power-up: ${powerUpName}!`);
            break;
        case 'ping':
            // Rispondi al ping
            sendP2PMessage(fromId, {
                type: 'pong',
                data: message.data
            });
            break;
        case 'pong':
            // Calcola il ping
            const ping = Date.now() - message.data.timestamp;
            console.log(`Ping con ${fromId}: ${ping}ms`);
            break;
    }
}

// Invia un messaggio P2P a un peer
function sendP2PMessage(peerId, message) {
    if (p2pConnections[peerId] && p2pConnections[peerId].connected) {
        try {
            p2pConnections[peerId].send(JSON.stringify(message));
        } catch (error) {
            console.error(`Errore nell'invio del messaggio P2P a ${peerId}:`, error);
        }
    }
}

// Invia un messaggio P2P a tutti i peer
function broadcastP2PMessage(message) {
    Object.keys(p2pConnections).forEach(peerId => {
        sendP2PMessage(peerId, message);
    });
}

// Ottieni il nome del power-up
function getPowerUpName(type) {
    switch (type) {
        case 'speed':
            return 'Velocità';
        case 'size':
            return 'Dimensione';
        case 'kick':
            return 'Super Calcio';
        case 'freeze':
            return 'Congelamento';
        default:
            return type;
    }
}

// Mostra un messaggio di errore visibile
function showErrorContainer(message) {
    // Crea o aggiorna un container di errore
    let errorContainer = document.getElementById('error-container');
    
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'error-container';
        errorContainer.style.position = 'fixed';
        errorContainer.style.top = '0';
        errorContainer.style.left = '0';
        errorContainer.style.width = '100%';
        errorContainer.style.backgroundColor = '#ff5252';
        errorContainer.style.color = 'white';
        errorContainer.style.padding = '15px';
        errorContainer.style.textAlign = 'center';
        errorContainer.style.zIndex = '1000';
        errorContainer.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
        document.body.appendChild(errorContainer);
    }
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Aggiungi un pulsante per nascondere il messaggio
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Chiudi';
    closeButton.style.marginLeft = '10px';
    closeButton.style.padding = '5px 10px';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '3px';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', () => {
        errorContainer.style.display = 'none';
    });
    
    errorContainer.appendChild(closeButton);
}