// Configurazione del gioco
const CONFIG = {
    SERVER_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:3000` 
        : window.location.origin,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 500,
    BALL_RADIUS: 10,
    PLAYER_RADIUS: 15,
    GOAL_WIDTH: 100,
    WALL_THICKNESS: 10,
    MAX_PLAYERS: 10,
    TICK_RATE: 60,
    POWER_UP_DURATION: 10000, // 10 secondi
    COLORS: {
        BACKGROUND: '#27ae60',
        BALL: '#ffffff',
        RED_TEAM: '#e74c3c',
        BLUE_TEAM: '#3498db',
        WALL: '#2c3e50',
        POWER_UP: {
            SPEED: '#f1c40f',
            SIZE: '#9b59b6',
            KICK: '#e67e22',
            FREEZE: '#1abc9c'
        }
    }
};
