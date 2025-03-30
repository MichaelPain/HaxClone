// Funzioni di utilità
const Utils = {
    // Mostra una notifica
    showNotification: (message) => {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    },
    
    // Salva dati nel localStorage
    saveToStorage: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error('Errore nel salvataggio dei dati:', e);
        }
    },
    
    // Carica dati dal localStorage
    loadFromStorage: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Errore nel caricamento dei dati:', e);
            return null;
        }
    },
    
    // Formatta il tempo (mm:ss)
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },
    
    // Calcola la distanza tra due punti
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    // Genera un colore casuale
    randomColor: () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },
    
    // Controlla se il browser supporta WebSockets
    checkWebSocketSupport: () => {
        if (window.WebSocket) {
            return true;
        } else {
            Utils.showNotification('Il tuo browser non supporta WebSockets, necessari per il gioco multiplayer.');
            return false;
        }
    },
    
    // Controlla la connessione al server
    checkServerConnection: (callback) => {
        try {
            const testSocket = io(CONFIG.SERVER_URL, {
                timeout: 5000,
                reconnection: false,
                forceNew: true
            });
            
            testSocket.on('connect', () => {
                testSocket.disconnect();
                callback(true);
            });
            
            testSocket.on('connect_error', (error) => {
                console.error('Errore di connessione al server:', error);
                testSocket.disconnect();
                callback(false, error);
            });
            
            testSocket.on('connect_timeout', () => {
                console.error('Timeout di connessione al server');
                testSocket.disconnect();
                callback(false, new Error('Timeout di connessione'));
            });
        } catch (error) {
            console.error('Errore durante il controllo della connessione:', error);
            callback(false, error);
        }
    },
    
    // Tenta di risolvere problemi di connessione
    troubleshootConnection: () => {
        // Verifica se il server è raggiungibile
        Utils.checkServerConnection((isConnected, error) => {
            if (isConnected) {
                Utils.showNotification('Connessione al server stabilita con successo!');
            } else {
                // Prova a connettersi usando IP alternativo
                const alternativeUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://0.0.0.0:3000'
                    : `http://${window.location.hostname}:3000`;
                
                try {
                    const testSocket = io(alternativeUrl, {
                        timeout: 5000,
                        reconnection: false,
                        forceNew: true
                    });
                    
                    testSocket.on('connect', () => {
                        testSocket.disconnect();
                        CONFIG.SERVER_URL = alternativeUrl;
                        Utils.showNotification('Connessione stabilita con indirizzo alternativo!');
                        
                        // Riconnetti il socket principale
                        if (socket) {
                            socket.disconnect();
                            socket = io(CONFIG.SERVER_URL);
                        }
                    });
                    
                    testSocket.on('connect_error', () => {
                        testSocket.disconnect();
                        Utils.showNotification('Impossibile connettersi al server. Verifica la tua connessione e che il server sia in esecuzione.');
                    });
                } catch (error) {
                    console.error('Errore durante il tentativo di connessione alternativa:', error);
                    Utils.showNotification('Impossibile connettersi al server. Verifica la tua connessione e che il server sia in esecuzione.');
                }
            }
        });
    },
    
    // Ping al server per misurare la latenza
    pingServer: (callback) => {
        const startTime = Date.now();
        
        if (!socket || !socket.connected) {
            callback(-1);
            return;
        }
        
        socket.emit('ping', { timestamp: startTime }, (response) => {
            if (response) {
                const endTime = Date.now();
                const ping = endTime - startTime;
                callback(ping);
            } else {
                callback(-1);
            }
        });
    },
    
    // Verifica se SimplePeer è disponibile
    checkSimplePeerSupport: () => {
        if (typeof SimplePeer !== 'undefined') {
            return true;
        } else {
            Utils.showNotification('Il tuo browser non supporta le connessioni P2P, necessarie per le stanze normali.');
            return false;
        }
    },
    
    // Verifica se WebRTC è supportato
    checkWebRTCSupport: () => {
        return !!(navigator.mediaDevices && 
                navigator.mediaDevices.getUserMedia && 
                window.RTCPeerConnection && 
                window.RTCIceCandidate && 
                window.RTCSessionDescription);
    },
    
    // Serializza un oggetto per evitare errori di circolarità
    safeStringify: (obj) => {
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        });
    },
    
    // Deserializza un oggetto in modo sicuro
    safeParse: (str) => {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.error('Errore nel parsing JSON:', e);
            return null;
        }
    }
};
