/**
 * Sistema di rilevamento del lag per partite P2P
 * 
 * Questo modulo implementa algoritmi per rilevare problemi di lag durante le partite
 * e decidere quando è necessario un trasferimento dell'host.
 */

// Costanti di configurazione
const LAG_DETECTION_CONFIG = {
    // Intervallo di controllo del lag (ms)
    CHECK_INTERVAL: 5000,
    
    // Soglie per il rilevamento del lag
    THRESHOLDS: {
        HIGH_PING: 200,           // Ping considerato alto (ms)
        PING_SPIKE: 100,          // Incremento di ping considerato un picco (ms)
        PACKET_LOSS_CRITICAL: 0.1, // Perdita di pacchetti critica (10%)
        FRAME_DROP_CRITICAL: 0.2,  // Perdita di frame critica (20%)
        LAG_REPORTS_CRITICAL: 3,   // Numero di report di lag considerato critico
        RESPONSE_TIMEOUT: 2000     // Timeout di risposta considerato problematico (ms)
    },
    
    // Configurazione del sistema di voto per il lag
    VOTING: {
        THRESHOLD_PERCENTAGE: 0.5, // Percentuale di giocatori che devono segnalare lag
        MIN_VOTERS: 2              // Numero minimo di votanti per considerare valido un voto
    },
    
    // Periodo di grazia dopo un cambio di host (ms)
    HOST_GRACE_PERIOD: 30000
};

/**
 * Classe per il rilevamento del lag
 */
class LagDetector {
    constructor() {
        this.lagReports = {};         // Report di lag per giocatore
        this.playerStats = {};         // Statistiche dei giocatori
        this.lastHostChange = 0;       // Timestamp dell'ultimo cambio di host
        this.detectionInterval = null; // Intervallo di rilevamento
        this.onLagDetected = null;     // Callback quando viene rilevato lag
    }
    
    /**
     * Inizializza il rilevatore di lag
     * @param {Object} playerStats - Statistiche iniziali dei giocatori
     * @param {Function} callback - Funzione chiamata quando viene rilevato lag
     */
    init(playerStats, callback) {
        this.playerStats = playerStats || {};
        this.onLagDetected = callback;
        this.lastHostChange = Date.now();
        this.lagReports = {};
        
        // Inizializza i report di lag
        Object.keys(this.playerStats).forEach(playerId => {
            this.lagReports[playerId] = {
                reportedBy: {},
                lastReportTime: 0,
                totalReports: 0
            };
        });
    }
    
    /**
     * Avvia il rilevamento del lag
     */
    start() {
        // Ferma eventuali rilevamenti precedenti
        this.stop();
        
        // Avvia un nuovo intervallo di rilevamento
        this.detectionInterval = setInterval(() => {
            this.checkForLag();
        }, LAG_DETECTION_CONFIG.CHECK_INTERVAL);
    }
    
    /**
     * Ferma il rilevamento del lag
     */
    stop() {
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
    }
    
    /**
     * Aggiorna le statistiche di un giocatore
     * @param {String} playerId - ID del giocatore
     * @param {Object} stats - Nuove statistiche
     */
    updatePlayerStats(playerId, stats) {
        if (!this.playerStats[playerId]) {
            this.playerStats[playerId] = {};
            this.lagReports[playerId] = {
                reportedBy: {},
                lastReportTime: 0,
                totalReports: 0
            };
        }
        
        // Aggiorna le statistiche
        Object.assign(this.playerStats[playerId], stats);
        
        // Aggiorna il timestamp dell'ultimo aggiornamento
        this.playerStats[playerId].lastUpdateTime = Date.now();
    }
    
    /**
     * Registra un report di lag
     * @param {String} reporterId - ID del giocatore che ha segnalato il lag
     * @param {String} targetId - ID del giocatore segnalato per lag
     * @param {Object} details - Dettagli del lag
     */
    reportLag(reporterId, targetId, details = {}) {
        if (!this.lagReports[targetId]) {
            this.lagReports[targetId] = {
                reportedBy: {},
                lastReportTime: 0,
                totalReports: 0
            };
        }
        
        // Aggiorna il report
        this.lagReports[targetId].reportedBy[reporterId] = {
            timestamp: Date.now(),
            details
        };
        
        this.lagReports[targetId].lastReportTime = Date.now();
        this.lagReports[targetId].totalReports++;
        
        // Controlla immediatamente se è necessario un cambio di host
        this.checkLagReports(targetId);
    }
    
    /**
     * Controlla se ci sono problemi di lag
     */
    checkForLag() {
        // Salta il controllo se siamo nel periodo di grazia dopo un cambio di host
        if (Date.now() - this.lastHostChange < LAG_DETECTION_CONFIG.HOST_GRACE_PERIOD) {
            return;
        }
        
        // Controlla le statistiche di ogni giocatore
        Object.keys(this.playerStats).forEach(playerId => {
            const stats = this.playerStats[playerId];
            
            // Salta i giocatori senza statistiche recenti
            if (!stats.lastUpdateTime || Date.now() - stats.lastUpdateTime > 10000) {
                return;
            }
            
            // Controlla il ping
            if (this.isHighPing(stats)) {
                this.notifyLagDetected(playerId, 'high_ping');
            }
            
            // Controlla la perdita di pacchetti
            if (this.isPacketLossCritical(stats)) {
                this.notifyLagDetected(playerId, 'packet_loss');
            }
            
            // Controlla la perdita di frame
            if (this.isFrameDropCritical(stats)) {
                this.notifyLagDetected(playerId, 'frame_drop');
            }
            
            // Controlla i report di lag
            this.checkLagReports(playerId);
        });
    }
    
    /**
     * Controlla se un giocatore ha un ping alto
     * @param {Object} stats - Statistiche del giocatore
     * @returns {Boolean} - True se il ping è alto
     */
    isHighPing(stats) {
        if (!stats.pingHistory || stats.pingHistory.length < 2) {
            return stats.ping > LAG_DETECTION_CONFIG.THRESHOLDS.HIGH_PING;
        }
        
        // Calcola il ping medio
        const avgPing = stats.pingHistory.reduce((sum, ping) => sum + ping, 0) / stats.pingHistory.length;
        
        // Controlla se il ping è alto
        if (avgPing > LAG_DETECTION_CONFIG.THRESHOLDS.HIGH_PING) {
            return true;
        }
        
        // Controlla se c'è stato un picco di ping
        const lastPing = stats.pingHistory[stats.pingHistory.length - 1];
        const previousPing = stats.pingHistory[stats.pingHistory.length - 2];
        
        return lastPing - previousPing > LAG_DETECTION_CONFIG.THRESHOLDS.PING_SPIKE;
    }
    
    /**
     * Controlla se la perdita di pacchetti è critica
     * @param {Object} stats - Statistiche del giocatore
     * @returns {Boolean} - True se la perdita di pacchetti è critica
     */
    isPacketLossCritical(stats) {
        return stats.packetLoss > LAG_DETECTION_CONFIG.THRESHOLDS.PACKET_LOSS_CRITICAL;
    }
    
    /**
     * Controlla se la perdita di frame è critica
     * @param {Object} stats - Statistiche del giocatore
     * @returns {Boolean} - True se la perdita di frame è critica
     */
    isFrameDropCritical(stats) {
        return stats.frameDrop > LAG_DETECTION_CONFIG.THRESHOLDS.FRAME_DROP_CRITICAL;
    }
    
    /**
     * Controlla i report di lag per un giocatore
     * @param {String} playerId - ID del giocatore
     */
    checkLagReports(playerId) {
        const reports = this.lagReports[playerId];
        if (!reports) return;
        
        // Conta i report recenti (ultimi 10 secondi)
        const recentReporters = Object.keys(reports.reportedBy).filter(reporterId => {
            const report = reports.reportedBy[reporterId];
            return Date.now() - report.timestamp < 10000;
        });
        
        // Calcola la percentuale di giocatori che hanno segnalato lag
        const totalPlayers = Object.keys(this.playerStats).length;
        const reportPercentage = recentReporters.length / (totalPlayers - 1); // Escludi il giocatore stesso
        
        // Verifica se è necessario un cambio di host
        if (recentReporters.length >= LAG_DETECTION_CONFIG.VOTING.MIN_VOTERS &&
            reportPercentage >= LAG_DETECTION_CONFIG.VOTING.THRESHOLD_PERCENTAGE) {
            this.notifyLagDetected(playerId, 'player_reports');
        }
    }
    
    /**
     * Notifica che è stato rilevato lag
     * @param {String} playerId - ID del giocatore con lag
     * @param {String} reason - Motivo del rilevamento
     */
    notifyLagDetected(playerId, reason) {
        if (this.onLagDetected) {
            this.onLagDetected(playerId, reason);
        }
    }
    
    /**
     * Registra un cambio di host
     */
    hostChanged() {
        this.lastHostChange = Date.now();
        
        // Resetta i report di lag
        Object.keys(this.lagReports).forEach(playerId => {
            this.lagReports[playerId].reportedBy = {};
        });
    }
    
    /**
     * Analizza le prestazioni di rete di un giocatore
     * @param {Object} networkData - Dati di rete
     * @returns {Object} - Analisi delle prestazioni
     */
    analyzeNetworkPerformance(networkData) {
        const { ping, pingHistory, packetLoss, frameDrop, responseTime } = networkData;
        
        // Calcola il ping medio
        const avgPing = pingHistory && pingHistory.length > 0
            ? pingHistory.reduce((sum, p) => sum + p, 0) / pingHistory.length
            : ping;
        
        // Calcola la deviazione standard del ping
        const pingDeviation = pingHistory && pingHistory.length > 0
            ? Math.sqrt(pingHistory.reduce((sum, p) => sum + Math.pow(p - avgPing, 2), 0) / pingHistory.length)
            : 0;
        
        // Calcola un punteggio di stabilità
        const stabilityScore = 100 - (
            (avgPing / LAG_DETECTION_CONFIG.THRESHOLDS.HIGH_PING) * 40 +
            (pingDeviation / 50) * 20 +
            (packetLoss / LAG_DETECTION_CONFIG.THRESHOLDS.PACKET_LOSS_CRITICAL) * 20 +
            (frameDrop / LAG_DETECTION_CONFIG.THRESHOLDS.FRAME_DROP_CRITICAL) * 10 +
            (responseTime / LAG_DETECTION_CONFIG.THRESHOLDS.RESPONSE_TIMEOUT) * 10
        );
        
        return {
            avgPing,
            pingDeviation,
            packetLoss,
            frameDrop,
            responseTime,
            stabilityScore: Math.max(0, Math.min(100, stabilityScore)),
            isStable: stabilityScore > 60
        };
    }
}

/**
 * Crea un rilevatore di lag
 * @returns {LagDetector} - Istanza del rilevatore di lag
 */
function createLagDetector() {
    return new LagDetector();
}

// Esporta le funzioni e le costanti
module.exports = {
    createLagDetector,
    LAG_DETECTION_CONFIG
};
