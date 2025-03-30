/**
 * Componente per la gestione del ready check dopo un cambio di host
 * 
 * Questo modulo implementa l'interfaccia utente e la logica per il ready check
 * che viene avviato dopo un trasferimento di host durante una partita.
 */

// Classe ReadyCheck
class ReadyCheck {
    constructor() {
        this.isActive = false;
        this.timeout = 30; // Timeout in secondi
        this.countdownInterval = null;
        this.readyPlayers = new Set();
        this.totalPlayers = 0;
        this.onComplete = null;
        this.elements = {
            container: null,
            message: null,
            playersList: null,
            countdown: null,
            readyButton: null
        };
    }

    /**
     * Inizializza il componente
     */
    init() {
        // Crea gli elementi dell'interfaccia
        this.createElements();
        
        // Aggiungi gli event listener
        this.addEventListeners();
    }

    /**
     * Crea gli elementi dell'interfaccia
     */
    createElements() {
        // Container principale
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'ready-check-container hidden';
        
        // Messaggio
        this.elements.message = document.createElement('div');
        this.elements.message.className = 'ready-check-message';
        this.elements.message.textContent = 'Cambio di host completato. Conferma di essere pronto per continuare la partita.';
        
        // Lista giocatori
        this.elements.playersList = document.createElement('div');
        this.elements.playersList.className = 'ready-check-players';
        
        // Countdown
        this.elements.countdown = document.createElement('div');
        this.elements.countdown.className = 'ready-check-countdown';
        this.elements.countdown.textContent = `La partita riprenderà automaticamente tra ${this.timeout} secondi`;
        
        // Pulsante ready
        this.elements.readyButton = document.createElement('button');
        this.elements.readyButton.className = 'btn primary-btn ready-check-button';
        this.elements.readyButton.textContent = 'Sono pronto';
        
        // Assembla gli elementi
        this.elements.container.appendChild(this.elements.message);
        this.elements.container.appendChild(this.elements.playersList);
        this.elements.container.appendChild(this.elements.countdown);
        this.elements.container.appendChild(this.elements.readyButton);
        
        // Aggiungi al DOM
        document.body.appendChild(this.elements.container);
    }

    /**
     * Aggiungi gli event listener
     */
    addEventListeners() {
        // Click sul pulsante ready
        this.elements.readyButton.addEventListener('click', () => {
            this.markReady();
        });
        
        // Gestisci gli eventi socket
        if (socket) {
            // Avvio del ready check
            socket.on('readyCheckStarted', (data) => {
                this.start(data.timeout || 30);
            });
            
            // Giocatore pronto
            socket.on('playerReady', (data) => {
                this.updatePlayerStatus(data.playerId, true);
                this.updateReadyCount(data.readyCount, data.totalPlayers);
            });
            
            // Fine del ready check
            socket.on('readyCheckFinished', (data) => {
                this.complete(data.readyPlayers);
            });
        }
    }

    /**
     * Avvia il ready check
     * @param {Number} timeout - Timeout in secondi
     */
    start(timeout = 30) {
        this.isActive = true;
        this.timeout = timeout;
        this.readyPlayers = new Set();
        
        // Mostra il container
        this.elements.container.classList.remove('hidden');
        
        // Aggiorna il countdown
        this.updateCountdown(this.timeout);
        
        // Avvia il countdown
        this.startCountdown();
        
        // Aggiorna la lista dei giocatori
        this.updatePlayersList();
        
        // Abilita il pulsante ready
        this.elements.readyButton.disabled = false;
        
        // Notifica l'utente
        Utils.showNotification('Ready check avviato. Conferma di essere pronto per continuare la partita.');
    }

    /**
     * Avvia il countdown
     */
    startCountdown() {
        // Cancella eventuali intervalli precedenti
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        let remainingTime = this.timeout;
        
        // Aggiorna il countdown ogni secondo
        this.countdownInterval = setInterval(() => {
            remainingTime--;
            
            if (remainingTime <= 0) {
                // Ferma il countdown
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            } else {
                // Aggiorna il countdown
                this.updateCountdown(remainingTime);
            }
        }, 1000);
    }

    /**
     * Aggiorna il countdown
     * @param {Number} seconds - Secondi rimanenti
     */
    updateCountdown(seconds) {
        this.elements.countdown.textContent = `La partita riprenderà automaticamente tra ${seconds} secondi`;
        
        // Cambia colore quando il tempo sta per scadere
        if (seconds <= 5) {
            this.elements.countdown.classList.add('urgent');
        } else {
            this.elements.countdown.classList.remove('urgent');
        }
    }

    /**
     * Aggiorna la lista dei giocatori
     */
    updatePlayersList() {
        // Svuota la lista
        this.elements.playersList.innerHTML = '';
        
        // Aggiungi tutti i giocatori
        if (Game.state && Game.state.players) {
            this.totalPlayers = Object.keys(Game.state.players).length;
            
            Object.values(Game.state.players).forEach(player => {
                const playerItem = document.createElement('div');
                playerItem.className = 'player-item';
                playerItem.dataset.playerId = player.id;
                
                const playerName = document.createElement('span');
                playerName.className = 'player-name';
                playerName.textContent = player.name;
                
                const playerStatus = document.createElement('span');
                playerStatus.className = 'player-status not-ready';
                playerStatus.textContent = 'Non pronto';
                
                playerItem.appendChild(playerName);
                playerItem.appendChild(playerStatus);
                
                this.elements.playersList.appendChild(playerItem);
            });
        }
    }

    /**
     * Aggiorna lo stato di un giocatore
     * @param {String} playerId - ID del giocatore
     * @param {Boolean} isReady - Se il giocatore è pronto
     */
    updatePlayerStatus(playerId, isReady) {
        // Aggiungi il giocatore alla lista dei pronti
        if (isReady) {
            this.readyPlayers.add(playerId);
        }
        
        // Aggiorna l'elemento nella lista
        const playerItem = this.elements.playersList.querySelector(`[data-player-id="${playerId}"]`);
        if (playerItem) {
            const playerStatus = playerItem.querySelector('.player-status');
            if (playerStatus) {
                playerStatus.className = isReady ? 'player-status ready' : 'player-status not-ready';
                playerStatus.textContent = isReady ? 'Pronto' : 'Non pronto';
            }
        }
    }

    /**
     * Aggiorna il conteggio dei giocatori pronti
     * @param {Number} readyCount - Numero di giocatori pronti
     * @param {Number} totalPlayers - Numero totale di giocatori
     */
    updateReadyCount(readyCount, totalPlayers) {
        this.totalPlayers = totalPlayers;
        this.elements.message.textContent = `Cambio di host completato. Giocatori pronti: ${readyCount}/${totalPlayers}`;
    }

    /**
     * Marca il giocatore corrente come pronto
     */
    markReady() {
        if (!this.isActive || !socket) return;
        
        // Invia l'evento al server
        socket.emit('playerReady', {
            roomId: UI.state.selectedRoomId
        });
        
        // Disabilita il pulsante
        this.elements.readyButton.disabled = true;
        this.elements.readyButton.textContent = 'Pronto!';
        
        // Aggiorna lo stato del giocatore corrente
        this.updatePlayerStatus(socket.id, true);
    }

    /**
     * Completa il ready check
     * @param {Array} readyPlayers - Lista dei giocatori pronti
     */
    complete(readyPlayers) {
        // Ferma il countdown
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        
        // Aggiorna il messaggio
        this.elements.message.textContent = 'Ready check completato. La partita riprenderà a breve.';
        this.elements.countdown.textContent = 'Ripresa in corso...';
        
        // Nascondi il pulsante
        this.elements.readyButton.classList.add('hidden');
        
        // Aggiorna lo stato di tutti i giocatori
        readyPlayers.forEach(playerId => {
            this.updatePlayerStatus(playerId, true);
        });
        
        // Nascondi il container dopo un breve ritardo
        setTimeout(() => {
            this.hide();
        }, 3000);
        
        // Esegui il callback di completamento
        if (this.onComplete) {
            this.onComplete(readyPlayers);
        }
        
        this.isActive = false;
    }

    /**
     * Nasconde il ready check
     */
    hide() {
        this.elements.container.classList.add('hidden');
    }

    /**
     * Imposta il callback di completamento
     * @param {Function} callback - Funzione da chiamare al completamento
     */
    setOnComplete(callback) {
        this.onComplete = callback;
    }
}

// Esporta la classe
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadyCheck;
} else {
    // In ambiente browser, aggiungi al namespace globale
    window.ReadyCheck = ReadyCheck;
}
