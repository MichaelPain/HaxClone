/**
 * Sistema di selezione dell'host per partite P2P
 * 
 * Questo modulo implementa algoritmi avanzati per selezionare il miglior host
 * in base a vari parametri di connessione e prestazioni.
 */

// Costanti di configurazione
const HOST_SELECTION_CONFIG = {
    // Pesi per i diversi fattori nella selezione dell'host
    WEIGHTS: {
        PING: 0.5,           // Peso del ping medio
        PING_STABILITY: 0.2, // Peso della stabilità del ping (deviazione standard)
        CONNECTION_SPEED: 0.2, // Peso della velocità di connessione
        LAG_REPORTS: 0.3,    // Peso dei report di lag ricevuti (negativo)
        CPU_PERFORMANCE: 0.1 // Peso delle prestazioni della CPU
    },
    
    // Soglie per considerare un host inadeguato
    THRESHOLDS: {
        MAX_PING: 200,       // Ping massimo accettabile (ms)
        MAX_PING_DEVIATION: 50, // Deviazione standard massima accettabile del ping (ms)
        MIN_CONNECTION_SPEED: 1, // Velocità minima di connessione (Mbps)
        MAX_LAG_REPORTS: 3,  // Numero massimo di report di lag
        MIN_CPU_PERFORMANCE: 0.5 // Prestazioni minime della CPU (valore normalizzato)
    }
};

/**
 * Calcola un punteggio per ogni giocatore in base alle sue statistiche di connessione
 * @param {Object} playerStats - Statistiche dei giocatori
 * @returns {Object} - Punteggi dei giocatori
 */
function calculateHostScores(playerStats) {
    const scores = {};
    
    Object.keys(playerStats).forEach(playerId => {
        const stats = playerStats[playerId];
        let score = 0;
        
        // Calcola il ping medio
        const avgPing = stats.pingHistory.length > 0 
            ? stats.pingHistory.reduce((sum, ping) => sum + ping, 0) / stats.pingHistory.length 
            : stats.ping || 100;
        
        // Calcola la deviazione standard del ping (stabilità)
        const pingDeviation = calculatePingDeviation(stats.pingHistory, avgPing);
        
        // Normalizza i valori (più basso è meglio)
        const normalizedPing = normalizeValue(avgPing, 0, 300, true);
        const normalizedPingDeviation = normalizeValue(pingDeviation, 0, 100, true);
        const normalizedConnectionSpeed = normalizeValue(stats.connectionSpeed || 1, 0, 10, false);
        const normalizedLagReports = normalizeValue(stats.lagReported || 0, 0, 10, true);
        const normalizedCpuPerformance = stats.cpuPerformance || 0.5;
        
        // Calcola il punteggio ponderato
        score += normalizedPing * HOST_SELECTION_CONFIG.WEIGHTS.PING;
        score += normalizedPingDeviation * HOST_SELECTION_CONFIG.WEIGHTS.PING_STABILITY;
        score += normalizedConnectionSpeed * HOST_SELECTION_CONFIG.WEIGHTS.CONNECTION_SPEED;
        score -= normalizedLagReports * HOST_SELECTION_CONFIG.WEIGHTS.LAG_REPORTS;
        score += normalizedCpuPerformance * HOST_SELECTION_CONFIG.WEIGHTS.CPU_PERFORMANCE;
        
        scores[playerId] = score;
    });
    
    return scores;
}

/**
 * Calcola la deviazione standard del ping
 * @param {Array} pingHistory - Storico dei ping
 * @param {Number} avgPing - Ping medio
 * @returns {Number} - Deviazione standard
 */
function calculatePingDeviation(pingHistory, avgPing) {
    if (pingHistory.length === 0) return 0;
    
    const squaredDifferences = pingHistory.map(ping => Math.pow(ping - avgPing, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / pingHistory.length;
    return Math.sqrt(variance);
}

/**
 * Normalizza un valore in un intervallo 0-1
 * @param {Number} value - Valore da normalizzare
 * @param {Number} min - Valore minimo
 * @param {Number} max - Valore massimo
 * @param {Boolean} invert - Se true, inverte il risultato (1 - risultato)
 * @returns {Number} - Valore normalizzato
 */
function normalizeValue(value, min, max, invert) {
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return invert ? 1 - normalized : normalized;
}

/**
 * Seleziona il miglior host tra i giocatori
 * @param {Object} playerStats - Statistiche dei giocatori
 * @returns {String} - ID del miglior host
 */
function selectBestHost(playerStats) {
    const scores = calculateHostScores(playerStats);
    
    // Filtra i giocatori che non soddisfano le soglie minime
    const eligiblePlayers = Object.keys(playerStats).filter(playerId => {
        const stats = playerStats[playerId];
        const avgPing = stats.pingHistory.length > 0 
            ? stats.pingHistory.reduce((sum, ping) => sum + ping, 0) / stats.pingHistory.length 
            : stats.ping || 100;
        const pingDeviation = calculatePingDeviation(stats.pingHistory, avgPing);
        
        return avgPing <= HOST_SELECTION_CONFIG.THRESHOLDS.MAX_PING &&
               pingDeviation <= HOST_SELECTION_CONFIG.THRESHOLDS.MAX_PING_DEVIATION &&
               (stats.connectionSpeed || 1) >= HOST_SELECTION_CONFIG.THRESHOLDS.MIN_CONNECTION_SPEED &&
               (stats.lagReported || 0) <= HOST_SELECTION_CONFIG.THRESHOLDS.MAX_LAG_REPORTS &&
               (stats.cpuPerformance || 0.5) >= HOST_SELECTION_CONFIG.THRESHOLDS.MIN_CPU_PERFORMANCE;
    });
    
    // Se non ci sono giocatori idonei, considera tutti
    const candidates = eligiblePlayers.length > 0 ? eligiblePlayers : Object.keys(playerStats);
    
    // Ordina i giocatori per punteggio (dal più alto al più basso)
    candidates.sort((a, b) => scores[b] - scores[a]);
    
    return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Analizza le prestazioni della connessione di un giocatore
 * @param {Object} connectionData - Dati di connessione
 * @returns {Object} - Statistiche di connessione
 */
function analyzeConnection(connectionData) {
    const { pingHistory, downloadSpeed, uploadSpeed, packetLoss } = connectionData;
    
    // Calcola il ping medio
    const avgPing = pingHistory.length > 0 
        ? pingHistory.reduce((sum, ping) => sum + ping, 0) / pingHistory.length 
        : 100;
    
    // Calcola la deviazione standard del ping
    const pingDeviation = calculatePingDeviation(pingHistory, avgPing);
    
    // Calcola un punteggio di connessione complessivo
    const connectionSpeed = (downloadSpeed + uploadSpeed) / 2;
    
    // Penalizza per la perdita di pacchetti
    const packetLossPenalty = packetLoss * 5;
    
    return {
        ping: avgPing,
        pingDeviation,
        connectionSpeed,
        packetLoss,
        score: normalizeValue(connectionSpeed, 0, 10, false) - 
               normalizeValue(avgPing, 0, 300, false) - 
               normalizeValue(pingDeviation, 0, 100, false) - 
               packetLossPenalty
    };
}

/**
 * Determina se è necessario un cambio di host in base alle statistiche
 * @param {Object} hostStats - Statistiche dell'host attuale
 * @param {Object} playerStats - Statistiche di tutti i giocatori
 * @returns {Boolean} - True se è necessario un cambio di host
 */
function shouldTransferHost(hostStats, playerStats) {
    if (!hostStats) return true;
    
    // Calcola il ping medio dell'host
    const avgPing = hostStats.pingHistory.length > 0 
        ? hostStats.pingHistory.reduce((sum, ping) => sum + ping, 0) / hostStats.pingHistory.length 
        : hostStats.ping || 100;
    
    // Calcola la deviazione standard del ping dell'host
    const pingDeviation = calculatePingDeviation(hostStats.pingHistory, avgPing);
    
    // Verifica se l'host supera le soglie critiche
    if (avgPing > HOST_SELECTION_CONFIG.THRESHOLDS.MAX_PING ||
        pingDeviation > HOST_SELECTION_CONFIG.THRESHOLDS.MAX_PING_DEVIATION ||
        (hostStats.connectionSpeed || 1) < HOST_SELECTION_CONFIG.THRESHOLDS.MIN_CONNECTION_SPEED ||
        (hostStats.lagReported || 0) > HOST_SELECTION_CONFIG.THRESHOLDS.MAX_LAG_REPORTS) {
        return true;
    }
    
    // Calcola i punteggi di tutti i giocatori
    const scores = calculateHostScores(playerStats);
    
    // Trova il giocatore con il punteggio più alto
    const bestPlayerId = Object.keys(scores).reduce((best, playerId) => 
        scores[playerId] > scores[best] ? playerId : best, 
        Object.keys(scores)[0]
    );
    
    // Se c'è un giocatore significativamente migliore dell'host attuale, suggerisci un cambio
    // (differenza di punteggio > 20%)
    const hostId = Object.keys(playerStats).find(id => playerStats[id] === hostStats);
    return scores[bestPlayerId] > scores[hostId] * 1.2;
}

/**
 * Misura le prestazioni della connessione di un giocatore
 * @param {Function} pingCallback - Funzione per misurare il ping
 * @param {Function} speedCallback - Funzione per misurare la velocità
 * @param {Function} completionCallback - Callback chiamata al completamento
 */
function measureConnectionPerformance(pingCallback, speedCallback, completionCallback) {
    const pingResults = [];
    const speedResults = { download: 0, upload: 0 };
    let packetLoss = 0;
    
    // Misura il ping più volte
    const measurePing = (remainingTests) => {
        if (remainingTests <= 0) {
            // Passa alla misurazione della velocità
            measureSpeed();
            return;
        }
        
        pingCallback((pingTime, success) => {
            if (success) {
                pingResults.push(pingTime);
            } else {
                packetLoss += 0.1; // Incrementa la perdita di pacchetti del 10%
            }
            
            // Continua con la prossima misurazione
            setTimeout(() => measurePing(remainingTests - 1), 200);
        });
    };
    
    // Misura la velocità di download e upload
    const measureSpeed = () => {
        speedCallback((downloadSpeed, uploadSpeed) => {
            speedResults.download = downloadSpeed;
            speedResults.upload = uploadSpeed;
            
            // Completa la misurazione
            completionCallback({
                pingHistory: pingResults,
                downloadSpeed: speedResults.download,
                uploadSpeed: speedResults.upload,
                packetLoss
            });
        });
    };
    
    // Inizia la misurazione
    measurePing(5);
}

// Esporta le funzioni
module.exports = {
    selectBestHost,
    analyzeConnection,
    shouldTransferHost,
    measureConnectionPerformance,
    HOST_SELECTION_CONFIG
};
