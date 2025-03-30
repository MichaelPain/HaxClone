/**
 * Sistema di trasferimento dell'host per partite P2P
 * 
 * Questo modulo implementa meccanismi per trasferire l'host durante una partita
 * in caso di problemi di lag persistenti.
 */

// Importa i moduli necessari
const hostSelection = require('./hostSelection');
const lagDetection = require('./lagDetection');

// Costanti di configurazione
const HOST_TRANSFER_CONFIG = {
    // Timeout per il ready check (ms)
    READY_CHECK_TIMEOUT: 30000,
    
    // Intervallo di aggiornamento dello stato durante il trasferimento (ms)
    STATUS_UPDATE_INTERVAL: 1000,
    
    // Numero massimo di tentativi di trasferimento
    MAX_TRANSFER_ATTEMPTS: 3,
    
    // Tempo minimo tra trasferimenti consecutivi (ms)
    MIN_TRANSFER_INTERVAL: 60000,
    
    // Stati del trasferimento
    STATES: {
        IDLE: 'idle',
        PAUSED: 'paused',
        SELECTING_HOST: 'selecting_host',
        TRANSFERRING: 'transferring',
        READY_CHECK: 'ready_check',
        RESUMING: 'resuming'
    }
};

/**
 * Classe per gestire il trasferimento dell'host
 */
class HostTransferManager {
    constructor(io) {
        this.io = io;                      // Istanza Socket.IO
        this.rooms = {};                   // Riferimento alle stanze di gioco
        this.transferState = {};           // Stato del trasferimento per ogni stanza
        this.lastTransferTime = {};        // Timestamp dell'ultimo trasferimento per ogni stanza
        this.transferAttempts = {};        // Tentativi di trasferimento per ogni stanza
        this.readyPlayers = {};            // Giocatori pronti per ogni stanza
        this.readyCheckTimeouts = {};      // Timeout per il ready check
        this.statusUpdateIntervals = {};   // Intervalli di aggiornamento dello stato
    }
    
    /**
     * Inizializza il gestore per una stanza
     * @param {String} roomId - ID della stanza
     * @param {Object} room - Riferimento alla stanza
     */
    initRoom(roomId, room) {
        this.rooms[roomId] = room;
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.IDLE;
        this.lastTransferTime[roomId] = 0;
        this.transferAttempts[roomId] = 0;
        this.readyPlayers[roomId] = new Set();
    }
    
    /**
     * Rimuove una stanza dal gestore
     * @param {String} roomId - ID della stanza
     */
    removeRoom(roomId) {
        // Cancella eventuali timeout e intervalli
        if (this.readyCheckTimeouts[roomId]) {
            clearTimeout(this.readyCheckTimeouts[roomId]);
            delete this.readyCheckTimeouts[roomId];
        }
        
        if (this.statusUpdateIntervals[roomId]) {
            clearInterval(this.statusUpdateIntervals[roomId]);
            delete this.statusUpdateIntervals[roomId];
        }
        
        // Rimuovi i dati della stanza
        delete this.rooms[roomId];
        delete this.transferState[roomId];
        delete this.lastTransferTime[roomId];
        delete this.transferAttempts[roomId];
        delete this.readyPlayers[roomId];
    }
    
    /**
     * Avvia il trasferimento dell'host per una stanza
     * @param {String} roomId - ID della stanza
     * @param {String} reason - Motivo del trasferimento
     * @returns {Boolean} - True se il trasferimento è stato avviato
     */
    startTransfer(roomId, reason) {
        const room = this.rooms[roomId];
        if (!room) return false;
        
        // Verifica se è possibile avviare un trasferimento
        if (this.transferState[roomId] !== HOST_TRANSFER_CONFIG.STATES.IDLE) {
            console.log(`Trasferimento già in corso per la stanza ${roomId}`);
            return false;
        }
        
        // Verifica se è trascorso abbastanza tempo dall'ultimo trasferimento
        const currentTime = Date.now();
        if (currentTime - this.lastTransferTime[roomId] < HOST_TRANSFER_CONFIG.MIN_TRANSFER_INTERVAL) {
            console.log(`Trasferimento troppo recente per la stanza ${roomId}`);
            return false;
        }
        
        // Verifica se sono stati superati i tentativi massimi
        if (this.transferAttempts[roomId] >= HOST_TRANSFER_CONFIG.MAX_TRANSFER_ATTEMPTS) {
            console.log(`Troppi tentativi di trasferimento per la stanza ${roomId}`);
            return false;
        }
        
        console.log(`Avvio trasferimento host per la stanza ${roomId}. Motivo: ${reason}`);
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.PAUSED;
        this.transferAttempts[roomId]++;
        
        // Metti in pausa il gioco
        this.pauseGame(roomId, reason);
        
        // Avvia l'intervallo di aggiornamento dello stato
        this.startStatusUpdates(roomId);
        
        // Procedi con la selezione del nuovo host
        setTimeout(() => {
            this.selectNewHost(roomId);
        }, 2000);
        
        return true;
    }
    
    /**
     * Mette in pausa il gioco
     * @param {String} roomId - ID della stanza
     * @param {String} reason - Motivo della pausa
     */
    pauseGame(roomId, reason) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Imposta lo stato di pausa nella stanza
        room.isPaused = true;
        
        // Ferma il loop di gioco
        if (room.gameInterval) {
            clearInterval(room.gameInterval);
            room.gameInterval = null;
        }
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('gamePaused', {
            reason: reason || 'host_transfer',
            message: this.getPauseMessage(reason)
        });
    }
    
    /**
     * Ottiene il messaggio di pausa in base al motivo
     * @param {String} reason - Motivo della pausa
     * @returns {String} - Messaggio di pausa
     */
    getPauseMessage(reason) {
        switch (reason) {
            case 'high_ping':
                return 'Rilevato ping elevato. Trasferimento host in corso...';
            case 'packet_loss':
                return 'Rilevata perdita di pacchetti. Trasferimento host in corso...';
            case 'frame_drop':
                return 'Rilevata perdita di frame. Trasferimento host in corso...';
            case 'player_reports':
                return 'Rilevati problemi di lag segnalati dai giocatori. Trasferimento host in corso...';
            default:
                return 'Rilevati problemi di connessione. Trasferimento host in corso...';
        }
    }
    
    /**
     * Avvia gli aggiornamenti di stato durante il trasferimento
     * @param {String} roomId - ID della stanza
     */
    startStatusUpdates(roomId) {
        // Cancella eventuali intervalli precedenti
        if (this.statusUpdateIntervals[roomId]) {
            clearInterval(this.statusUpdateIntervals[roomId]);
        }
        
        // Avvia un nuovo intervallo
        this.statusUpdateIntervals[roomId] = setInterval(() => {
            this.sendStatusUpdate(roomId);
        }, HOST_TRANSFER_CONFIG.STATUS_UPDATE_INTERVAL);
    }
    
    /**
     * Invia un aggiornamento di stato ai giocatori
     * @param {String} roomId - ID della stanza
     */
    sendStatusUpdate(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Prepara i dati di stato
        const statusData = {
            state: this.transferState[roomId],
            readyPlayers: Array.from(this.readyPlayers[roomId]),
            totalPlayers: Object.keys(room.players).length,
            currentHost: room.host,
            transferAttempts: this.transferAttempts[roomId]
        };
        
        // Invia l'aggiornamento
        this.io.to(roomId).emit('hostTransferStatus', statusData);
    }
    
    /**
     * Seleziona un nuovo host per la stanza
     * @param {String} roomId - ID della stanza
     */
    selectNewHost(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.SELECTING_HOST;
        
        // Seleziona il miglior host
        const newHost = hostSelection.selectBestHost(room.playerStats);
        
        // Se non è stato possibile trovare un nuovo host, annulla il trasferimento
        if (!newHost || newHost === room.host) {
            console.log(`Impossibile trovare un nuovo host per la stanza ${roomId}`);
            this.cancelTransfer(roomId, 'no_suitable_host');
            return;
        }
        
        console.log(`Nuovo host selezionato per la stanza ${roomId}: ${newHost}`);
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.TRANSFERRING;
        
        // Esegui il trasferimento
        this.transferHost(roomId, newHost);
    }
    
    /**
     * Trasferisce l'host a un nuovo giocatore
     * @param {String} roomId - ID della stanza
     * @param {String} newHostId - ID del nuovo host
     */
    transferHost(roomId, newHostId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Aggiorna l'host nella stanza
        const oldHost = room.host;
        room.host = newHostId;
        
        console.log(`Trasferimento host da ${oldHost} a ${newHostId} nella stanza ${roomId}`);
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('hostChanged', {
            oldHost,
            newHost: newHostId,
            duringGame: true
        });
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.READY_CHECK;
        
        // Avvia il ready check
        this.startReadyCheck(roomId);
    }
    
    /**
     * Avvia il ready check dopo un trasferimento
     * @param {String} roomId - ID della stanza
     */
    startReadyCheck(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Resetta i giocatori pronti
        this.readyPlayers[roomId] = new Set();
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('readyCheckStarted', {
            timeout: HOST_TRANSFER_CONFIG.READY_CHECK_TIMEOUT / 1000
        });
        
        // Imposta un timeout per il ready check
        this.readyCheckTimeouts[roomId] = setTimeout(() => {
            this.finishReadyCheck(roomId);
        }, HOST_TRANSFER_CONFIG.READY_CHECK_TIMEOUT);
    }
    
    /**
     * Segna un giocatore come pronto
     * @param {String} roomId - ID della stanza
     * @param {String} playerId - ID del giocatore
     */
    markPlayerReady(roomId, playerId) {
        if (!this.readyPlayers[roomId]) {
            this.readyPlayers[roomId] = new Set();
        }
        
        // Aggiungi il giocatore alla lista dei pronti
        this.readyPlayers[roomId].add(playerId);
        
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('playerReady', {
            playerId,
            readyCount: this.readyPlayers[roomId].size,
            totalPlayers: Object.keys(room.players).length
        });
        
        // Se tutti i giocatori sono pronti, termina il ready check
        if (this.readyPlayers[roomId].size === Object.keys(room.players).length) {
            if (this.readyCheckTimeouts[roomId]) {
                clearTimeout(this.readyCheckTimeouts[roomId]);
                delete this.readyCheckTimeouts[roomId];
            }
            
            this.finishReadyCheck(roomId);
        }
    }
    
    /**
     * Termina il ready check
     * @param {String} roomId - ID della stanza
     */
    finishReadyCheck(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Cancella il timeout
        if (this.readyCheckTimeouts[roomId]) {
            clearTimeout(this.readyCheckTimeouts[roomId]);
            delete this.readyCheckTimeouts[roomId];
        }
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('readyCheckFinished', {
            readyPlayers: Array.from(this.readyPlayers[roomId])
        });
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.RESUMING;
        
        // Riprendi il gioco
        setTimeout(() => {
            this.resumeGame(roomId);
        }, 3000);
    }
    
    /**
     * Riprende il gioco dopo un trasferimento
     * @param {String} roomId - ID della stanza
     */
    resumeGame(roomId) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.IDLE;
        this.lastTransferTime[roomId] = Date.now();
        
        // Cancella l'intervallo di aggiornamento dello stato
        if (this.statusUpdateIntervals[roomId]) {
            clearInterval(this.statusUpdateIntervals[roomId]);
            delete this.statusUpdateIntervals[roomId];
        }
        
        // Rimuovi lo stato di pausa nella stanza
        room.isPaused = false;
        room.hostTransferInProgress = false;
        
        // Riavvia il loop di gioco
        room.lastUpdateTime = Date.now();
        
        if (room.isHosted) {
            // Se la stanza è P2P, solo l'host esegue la fisica
            const hostSocket = this.io.sockets.sockets.get(room.host);
            if (hostSocket) {
                hostSocket.emit('startGameLoop');
            }
        } else {
            // Se la stanza è hostata dal server, il server esegue la fisica
            room.gameInterval = setInterval(() => room.update(), 1000 / room.gameConfig.tickRate);
        }
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('gameResumed');
        
        console.log(`Gioco ripreso nella stanza ${roomId} dopo il trasferimento dell'host`);
    }
    
    /**
     * Annulla un trasferimento in corso
     * @param {String} roomId - ID della stanza
     * @param {String} reason - Motivo dell'annullamento
     */
    cancelTransfer(roomId, reason) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        console.log(`Trasferimento annullato per la stanza ${roomId}. Motivo: ${reason}`);
        
        // Cancella eventuali timeout e intervalli
        if (this.readyCheckTimeouts[roomId]) {
            clearTimeout(this.readyCheckTimeouts[roomId]);
            delete this.readyCheckTimeouts[roomId];
        }
        
        if (this.statusUpdateIntervals[roomId]) {
            clearInterval(this.statusUpdateIntervals[roomId]);
            delete this.statusUpdateIntervals[roomId];
        }
        
        // Notifica tutti i giocatori
        this.io.to(roomId).emit('hostTransferCancelled', {
            reason,
            message: this.getCancelMessage(reason)
        });
        
        // Aggiorna lo stato
        this.transferState[roomId] = HOST_TRANSFER_CONFIG.STATES.RESUMING;
        
        // Riprendi il gioco
        setTimeout(() => {
            this.resumeGame(roomId);
        }, 3000);
    }
    
    /**
     * Ottiene il messaggio di annullamento in base al motivo
     * @param {String} reason - Motivo dell'annullamento
     * @returns {String} - Messaggio di annullamento
     */
    getCancelMessage(reason) {
        switch (reason) {
            case 'no_suitable_host':
                return 'Impossibile trovare un host adeguato. Ripresa del gioco con l\'host attuale.';
            case 'transfer_failed':
                return 'Trasferimento dell\'host fallito. Ripresa del gioco con l\'host attuale.';
            case 'timeout':
                return 'Timeout durante il trasferimento. Ripresa del gioco con l\'host attuale.';
            default:
                return 'Trasferimento annullato. Ripresa del gioco con l\'host attuale.';
        }
    }
    
    /**
     * Gestisce un report di lag
     * @param {String} roomId - ID della stanza
     * @param {String} reporterId - ID del giocatore che ha segnalato il lag
     * @param {String} targetId - ID del giocatore segnalato per lag
     * @param {Object} details - Dettagli del lag
     */
    handleLagReport(roomId, reporterId, targetId, details) {
        const room = this.rooms[roomId];
        if (!room) return;
        
        // Aggiorna le statistiche del giocatore
        if (room.playerStats[targetId]) {
            room.playerStats[targetId].lagReported = (room.playerStats[targetId].lagReported || 0) + 1;
        }
        
        // Se il giocatore segnalato è l'host e ci sono abbastanza segnalazioni, avvia un trasferimento
        if (targetId === room.host && this.shouldTransferBasedOnReports(roomId, targetId)) {
            this.startTransfer(roomId, 'player_reports');
        }
    }
    
    /**
     * Verifica se è necessario un trasferimento in base ai report
     * @param {String} roomId - ID della stanza
     * @param {String} playerId - ID del giocatore
     * @returns {Boolean} - True se è necessario un trasferimento
     */
    shouldTransferBasedOnReports(roomId, playerId) {
        const room = this.rooms[roomId];
        if (!room || !room.playerStats[playerId]) return false;
        
        // Conta quanti giocatori hanno segnalato lag
        let reportCount = 0;
        Object.keys(room.players).forEach(id => {
            if (id !== playerId && room.playerStats[id] && room.playerStats[id].reportedLag) {
                reportCount++;
            }
        });
        
        // Calcola la percentuale di giocatori che hanno segnalato lag
        const totalPlayers = Object.keys(room.players).length - 1; // Escludi il giocatore stesso
        const reportPercentage = reportCount / totalPlayers;
        
        return reportCount >= lagDetection.LAG_DETECTION_CONFIG.VOTING.MIN_VOTERS &&
               reportPercentage >= lagDetection.LAG_DETECTION_CONFIG.VOTING.THRESHOLD_PERCENTAGE;
    }
}

/**
 * Crea un gestore di trasferimento dell'host
 * @param {Object} io - Istanza Socket.IO
 * @returns {HostTransferManager} - Istanza del gestore
 */
function createHostTransferManager(io) {
    return new HostTransferManager(io);
}

// Esporta le funzioni e le costanti
module.exports = {
    createHostTransferManager,
    HOST_TRANSFER_CONFIG
};
