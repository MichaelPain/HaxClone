// Funzioni di utilità
const Utils = {
    // Mostra una notifica
    showNotification: (message) => {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notification-message');
        
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        // Nascondi la notifica dopo 3 secondi
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
    
    // Verifica se un punto è dentro un rettangolo
    pointInRect: (px, py, rx, ry, rw, rh) => {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    // Verifica se un punto è dentro un cerchio
    pointInCircle: (px, py, cx, cy, r) => {
        return Utils.distance(px, py, cx, cy) <= r;
    },
    
    // Disegna un'ombra
    drawShadow: (ctx, x, y, radius) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();
        ctx.restore();
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
            // Prima prova a fare una richiesta di test al server
            fetch('/api/test')
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Impossibile raggiungere il server');
                })
                .then(data => {
                    if (data.success) {
                        callback(true);
                    } else {
                        callback(false, new Error('Il server ha risposto, ma con un errore'));
                    }
                })
                .catch(error => {
                    console.error('Errore di connessione HTTP al server:', error);
                    
                    // Se la richiesta HTTP fallisce, prova con un socket
                    trySocketConnection();
                });
            
            // Funzione per provare la connessione socket
            function trySocketConnection() {
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
            }
        } catch (error) {
            console.error('Errore durante il controllo della connessione:', error);
            callback(false, error);
        }
    },
    
    // Tenta di risolvere problemi di connessione
    troubleshootConnection: () => {
        Utils.showNotification('Tentativo di risoluzione dei problemi di connessione...');
        
        // Prima verifica se il server è raggiungibile all'URL base
        fetch('/')
            .then(response => {
                if (response.ok) {
                    Utils.showNotification('Connessione al server OK. Verifica l\'API...');
                    return fetch('/api/test');
                }
                throw new Error('Server non raggiungibile');
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('API non raggiungibile');
            })
            .then(data => {
                if (data.success) {
                    Utils.showNotification('Connessione ristabilita!');
                    
                    // Ricarica la pagina dopo un breve ritardo
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    throw new Error('Risposta API non valida');
                }
            })
            .catch(error => {
                console.error('Errore durante il troubleshooting:', error);
                
                // Prova URL alternativi
                const alternativeUrls = [
                    window.location.origin,
                    'http://localhost:3000',
                    'http://127.0.0.1:3000'
                ];
                
                Utils.showNotification('Tentativo con URL alternativi...');
                tryNextUrl(0);
                
                function tryNextUrl(index) {
                    if (index >= alternativeUrls.length) {
                        Utils.showNotification('Impossibile connettersi al server. Ricarica la pagina e riprova.');
                        return;
                    }
                    
                    const url = alternativeUrls[index];
                    console.log(`Tentativo con URL: ${url}`);
                    
                    fetch(`${url}/api/test`)
                        .then(response => {
                            if (response.ok) {
                                return response.json();
                            }
                            throw new Error(`${url} non raggiungibile`);
                        })
                        .then(data => {
                            if (data.success) {
                                CONFIG.SERVER_URL = url;
                                Utils.showNotification(`Connessione stabilita con ${url}!`);
                                
                                // Riconnetti il socket principale
                                if (socket) {
                                    socket.disconnect();
                                    socket = io(CONFIG.SERVER_URL);
                                }
                                
                                // Ricarica la pagina dopo un breve ritardo
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                            } else {
                                throw new Error(`Risposta API non valida da ${url}`);
                            }
                        })
                        .catch(error => {
                            console.error(`Errore con ${url}:`, error);
                            tryNextUrl(index + 1);
                        });
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
    },
    
    // Test della funzionalità email
    testEmail: () => {
        fetch('/api/test/email')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Utils.showNotification('Test email inviato con successo!');
                    
                    if (data.previewUrl) {
                        console.log('Anteprima email:', data.previewUrl);
                        // Apri l'URL di anteprima in una nuova finestra
                        window.open(data.previewUrl, '_blank');
                    }
                } else {
                    Utils.showNotification('Errore nell\'invio dell\'email di test: ' + (data.message || 'Errore sconosciuto'));
                }
            })
            .catch(error => {
                console.error('Errore durante il test email:', error);
                Utils.showNotification('Errore nella comunicazione con il server durante il test email');
            });
    }
};