// Aggiorna il file server.js per integrare i nuovi moduli
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const Matter = require('matter-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Importa i nuovi moduli
// Nota: questi moduli sono referenziati ma non sono inclusi nella tua struttura di file originale
// Se hai creato questi file, dovresti verificare i percorsi corretti
// const GameRoom = require('./gameRoom');
// const hostSelection = require('./hostSelection');
// const lagDetection = require('./lagDetection');
// const hostTransfer = require('./hostTransfer');

// Per ora, definiamo GameRoom in questo file se non esiste
// Definisci la classe GameRoom
class GameRoom {
  constructor(id, name, host, isPrivate, password, isRanked, maxPlayers, gameMode = null, isHosted = true) {
    this.id = id;
    this.name = name;
    this.host = host;
    this.isPrivate = isPrivate;
    this.password = password;
    this.isRanked = isRanked;
    this.gameMode = gameMode; // '1v1', '2v2', '3v3' o null per stanze normali
    this.maxPlayers = maxPlayers || 10;
    this.players = {};
    this.teams = { red: [], blue: [] };
    this.spectators = [];
    this.score = { red: 0, blue: 0 };
    this.gameStarted = false;
    this.powerUps = [];
    this.isHosted = isHosted; // Indica se la stanza è hostata da un giocatore
    this.p2pConnections = {}; // Connessioni P2P tra i giocatori
    this.playerStats = {}; // Statistiche dei giocatori (ping, velocità connessione)
    this.isPaused = false; // Indica se la partita è in pausa
    this.lastActivity = Date.now(); // Timestamp dell'ultima attività nella stanza
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
        y: 0
      };

      this.spectators.push(playerId);
      this.lastActivity = Date.now(); // Aggiorna il timestamp dell'ultima attività
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

      // Rimuovi il giocatore dalla lista dei giocatori
      delete this.players[playerId];

      // Se il giocatore era l'host, assegna un nuovo host
      if (playerId === this.host) {
        this.assignNewHost();
      }
      
      this.lastActivity = Date.now(); // Aggiorna il timestamp dell'ultima attività
    }

    assignNewHost() {
      const playerIds = Object.keys(this.players);
      if (playerIds.length > 0) {
        this.host = playerIds[0];
      }
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
      this.lastActivity = Date.now(); // Aggiorna il timestamp dell'ultima attività
    }

    startGame() {
      if (this.gameStarted) {
        return;
      }

      this.gameStarted = true;
      this.lastActivity = Date.now(); // Aggiorna il timestamp dell'ultima attività
      // Notifica tutti i giocatori dell'inizio del gioco
      io.to(this.id).emit('gameStarted');
    }
    
    stopGame() {
      if (!this.gameStarted) {
        return;
      }
      
      this.gameStarted = false;
      this.lastActivity = Date.now(); // Aggiorna il timestamp dell'ultima attività
      // Notifica tutti i giocatori dell'interruzione del gioco
      io.to(this.id).emit('gameStopped');
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
        isHosted: this.isHosted
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
        isHosted: this.isHosted
      };
    }

    // Gestione delle connessioni P2P
    addP2PConnection(fromId, toId, signalData) {
      if (!this.p2pConnections[fromId]) {
        this.p2pConnections[fromId] = {};
      }
      
      this.p2pConnections[fromId][toId] = signalData;
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
}

// Crea un semplice gestore di trasferimento se non è stato importato
const transferManager = {
  initRoom: function(roomId, room) {
    // Stub function
    console.log(`Inizializzato gestore trasferimento per la stanza ${roomId}`);
  },
  removeRoom: function(roomId) {
    // Stub function
    console.log(`Rimosso gestore trasferimento per la stanza ${roomId}`);
  },
  handleLagReport: function(roomId, reporterId, targetId, details) {
    // Stub function
    console.log(`Report lag: ${reporterId} ha segnalato ${targetId} nella stanza ${roomId}`);
  },
  markPlayerReady: function(roomId, playerId) {
    // Stub function
    console.log(`Giocatore ${playerId} pronto nella stanza ${roomId}`);
  }
};

// Configurazione fisica con Matter.js
const { Engine, World, Bodies, Body, Events } = Matter;

// Configurazione server
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e6, // 1MB
  pingTimeout: 30000,
  pingInterval: 5000
});

// Middleware
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true
}));

// Aumenta il limite di dimensione per le richieste JSON
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Servi i file statici
app.use(express.static(path.join(__dirname, '../public')));

// Middleware per il logging delle richieste
if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Percorsi per i file di dati
const DATA_DIR = path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RANKINGS_FILE = path.join(DATA_DIR, 'rankings.json');

// Assicurati che la directory dei dati esista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database in memoria (caricato da file)
let users = {};
let pendingVerifications = {};
let rooms = {};
let mmrRankings = {
  global: {},
  '1v1': {},
  '2v2': {},
  '3v3': {}
};

// Carica i dati se esistono
function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const userData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      users = userData.users || {};
      pendingVerifications = userData.pendingVerifications || {};
    }
    
    if (fs.existsSync(RANKINGS_FILE)) {
      mmrRankings = JSON.parse(fs.readFileSync(RANKINGS_FILE, 'utf8'));
    }
    
    console.log('Dati caricati con successo');
  } catch (error) {
    console.error('Errore durante il caricamento dei dati:', error);
  }
}

// Salva i dati su file
function saveData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ 
      users, 
      pendingVerifications 
    }, null, 2));
    
    fs.writeFileSync(RANKINGS_FILE, JSON.stringify(mmrRankings, null, 2));
    
    console.log('Dati salvati con successo');
  } catch (error) {
    console.error('Errore durante il salvataggio dei dati:', error);
  }
}

// Carica i dati all'avvio
loadData();

// Salva i dati periodicamente (ogni 5 minuti)
setInterval(saveData, 5 * 60 * 1000);

// Configurazione email
let transporter;

// Funzione per creare il transporter di nodemailer
function setupEmailTransporter() {
  // Controlla se siamo in ambiente di test/sviluppo
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
    // Usa Ethereal per test
    nodemailer.createTestAccount()
      .then(testAccount => {
        transporter = nodemailer.createTransport({
          host: 'smtps.aruba.it',
          port: 465,
          secure: true,
          auth: {
            user: 'x',
            pass: 'x'
          }
        });
        
        console.log('Account email di test creato:');
        console.log('- Email:', testAccount.user);
        console.log('- Password:', testAccount.pass);
        
        // Verifica la configurazione
        verifyEmailConfig();
      })
      .catch(error => {
        console.error('Errore nella creazione dell\'account di test:', error);
        // Fallback a transporter fittizio
        setupDummyTransporter();
      });
  } else {
    // In produzione, usa la configurazione reale
    transporter = nodemailer.createTransport({
      host: 'smtps.aruba.it', // Cambia con il tuo servizio SMTP reale
      port: 465,
      secure: true,
      auth: {
        user: 'x', // Cambia con le tue credenziali reali
        pass: 'x'
      }
    });
    
    // Verifica la configurazione
    verifyEmailConfig();
  }
}
    
// Configura un transporter fittizio che logga i messaggi invece di inviarli
function setupDummyTransporter() {
  console.log('Usando un transporter email fittizio per debug');
  transporter = {
    sendMail: (mailOptions, callback) => {
      console.log('Email virtuale inviata:');
      console.log('- Da:', mailOptions.from);
      console.log('- A:', mailOptions.to);
      console.log('- Oggetto:', mailOptions.subject);
      console.log('- Contenuto HTML:', mailOptions.html);
      
      // Simula un invio riuscito
      setTimeout(() => {
        callback(null, { messageId: 'dummy-message-id-' + Date.now() });
      }, 500);
    },
    verify: (callback) => {
      callback(null, true);
    }
  };
}

// Verifica la configurazione email
function verifyEmailConfig() {
  transporter.verify((error, success) => {
    if (error) {
      console.error('Errore nella configurazione email:', error);
      // Se c'è un errore, usa il transporter fittizio
      setupDummyTransporter();
    } else {
      console.log('Server email pronto');
    }
  });
}

// Inizializza il transporter
setupEmailTransporter();

// Funzioni di utilità
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function updateRankings() {
  // Aggiorna le classifiche globali
  mmrRankings.global = {};
  Object.keys(users).forEach(username => {
    mmrRankings.global[username] = users[username].mmr.global;
  });
  
  // Aggiorna le classifiche per modalità
  ['1v1', '2v2', '3v3'].forEach(mode => {
    mmrRankings[mode] = {};
    Object.keys(users).forEach(username => {
      mmrRankings[mode][username] = users[username].mmr[mode];
    });
  });
  
  // Ordina le classifiche
  Object.keys(mmrRankings).forEach(mode => {
    mmrRankings[mode] = Object.entries(mmrRankings[mode])
      .sort((a, b) => b[1] - a[1])
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
  });
}

// Rotte di test
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Il server funziona correttamente',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test email
app.get('/api/test/email', (req, res) => {
  if (!transporter) {
    return res.status(500).json({
      success: false,
      message: 'Transporter email non inizializzato'
    });
  }
  
  // Crea un indirizzo email di test
  const testEmail = `test-${Date.now()}@example.com`;
  
  // Invia un'email di test
  const mailOptions = {
    from: '"HaxBall Clone Test" <postmaster@easypcpisa.it>',
    to: testEmail,
    subject: 'Test email da HaxBall Clone',
    html: '<h1>Questa è un\'email di test</h1><p>Se stai vedendo questa email, la configurazione del server email funziona correttamente.</p>'
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Errore nell\'invio dell\'email di test:', error);
      return res.status(500).json({
        success: false,
        message: 'Errore nell\'invio dell\'email di test',
        error: error.message
      });
    }
    
    console.log('Email di test inviata:', info.messageId);
    
    // Se stiamo usando Ethereal, forniamo un link per visualizzare l'email
    let previewUrl = null;
    if (info.messageId && info.messageId.includes('ethereal')) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }
    
    return res.json({
      success: true,
      message: 'Email di test inviata con successo',
      messageId: info.messageId,
      previewUrl
    });
  });
});

// Route per la registrazione
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Verifica che i dati siano validi
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'Dati mancanti' });
  }
  
  // Verifica che l'username non sia già in uso
  if (users[username]) {
    return res.status(400).json({ success: false, message: 'Username già in uso' });
  }
  
  // Verifica che l'email non sia già in uso
  const emailExists = Object.values(users).some(user => user.email === email);
  if (emailExists) {
    return res.status(400).json({ success: false, message: 'Email già in uso' });
  }
  
  // Genera un token di verifica
  const verificationToken = generateVerificationToken();
  
  // Salva l'utente in attesa di verifica
  pendingVerifications[verificationToken] = {
    username,
    email,
    password,
    createdAt: Date.now()
  };
  
  // Costruisci l'URL di verifica basato sull'host della richiesta
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.protocol || 'http';
  const verificationUrl = `${protocol}://${host}/verify?token=${verificationToken}`;
  
  // Invia l'email di verifica
  const mailOptions = {
    from: '"HaxBall Clone" <postmaster@easypcpisa.it>',
    to: email,
    subject: 'Verifica il tuo account HaxBall Clone',
    html: `
      <h1>Benvenuto su HaxBall Clone!</h1>
      <p>Grazie per esserti registrato. Per completare la registrazione, clicca sul link seguente:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>Il link scadrà tra 24 ore.</p>
    `
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Errore nell\'invio dell\'email:', error);
      return res.status(500).json({ success: false, message: 'Errore nell\'invio dell\'email di verifica' });
    }
    
    console.log('Email di verifica inviata:', info.messageId);
    
    // Salva i dati
    saveData();
    
    // In ambiente di test, includi l'URL di verifica nella risposta
    const responseData = {
      success: true,
      message: 'Registrazione completata. Controlla la tua email per verificare l\'account.'
    };
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
      responseData.verificationUrl = verificationUrl;
      
      // Se stiamo usando Ethereal, forniamo un link per visualizzare l'email
      if (info.messageId && info.messageId.includes('ethereal')) {
        responseData.previewUrl = nodemailer.getTestMessageUrl(info);
      }
    }
    
    return res.json(responseData);
  });
});

// Modifica anche la route per il cambio username
app.post('/api/change-username', (req, res) => {
  const { currentUsername, newUsername, password } = req.body;
  
  // Verifica che i dati siano validi
  if (!currentUsername || !newUsername || !password) {
    return res.status(400).json({ success: false, message: 'Dati mancanti' });
  }
  
  // Verifica che l'utente esista
  if (!users[currentUsername]) {
    return res.status(400).json({ success: false, message: 'Utente non trovato' });
  }
  
  // Verifica che la password sia corretta
  if (users[currentUsername].password !== password) {
    return res.status(400).json({ success: false, message: 'Password errata' });
  }
  
  // Verifica che il nuovo username non sia già in uso
  if (users[newUsername]) {
    return res.status(400).json({ success: false, message: 'Username già in uso' });
  }
  
  // Cambia l'username
  const userData = users[currentUsername];
  delete users[currentUsername];
  users[newUsername] = userData;
  
  // Aggiorna le classifiche
  updateRankings();
  
  // Salva i dati
  saveData();
  
  // Cambio riuscito
  return res.json({
    success: true,
    message: 'Username cambiato con successo',
    user: {
      username: newUsername,
      email: userData.email,
      mmr: userData.mmr
    }
  });
});

// Modifica anche la route per il cambio password
app.post('/api/change-password', (req, res) => {
  const { username, currentPassword, newPassword } = req.body;
  
  // Verifica che i dati siano validi
  if (!username || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Dati mancanti' });
  }
  
  // Verifica che l'utente esista
  if (!users[username]) {
    return res.status(400).json({ success: false, message: 'Utente non trovato' });
  }
  
  // Verifica che la password sia corretta
  if (users[username].password !== currentPassword) {
    return res.status(400).json({ success: false, message: 'Password attuale errata' });
  }
  
  // Cambia la password
  users[username].password = newPassword;
  
  // Salva i dati
  saveData();
  
  // Cambio riuscito
  return res.json({
    success: true,
    message: 'Password cambiata con successo'
  });
});

// Gestione degli errori globale - questa deve venire dopo tutte le route
app.use((err, req, res, next) => {
  console.error('Errore express:', err);
  res.status(500).json({
    success: false,
    message: 'Si è verificato un errore nel server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Rotte API
app.get('/verify', (req, res) => {
  const token = req.query.token;
  
  // Verifica che il token sia valido
  if (!token || !pendingVerifications[token]) {
    res.status(400).send('Token di verifica non valido o scaduto');
    return;
  }
  
  const verification = pendingVerifications[token];
  
  // Verifica che il token non sia scaduto (24 ore)
  if (Date.now() - verification.createdAt > 24 * 60 * 60 * 1000) {
    delete pendingVerifications[token];
    res.status(400).send('Token di verifica scaduto');
    return;
  }
  
  // Crea l'utente
  users[verification.username] = {
    email: verification.email,
    password: verification.password,
    verified: true,
    createdAt: Date.now(),
    mmr: {
      global: 1000,
      '1v1': 1000,
      '2v2': 1000,
      '3v3': 1000
    }
  };
  
  // Rimuovi la verifica pendente
  delete pendingVerifications[token];
  
  // Aggiorna le classifiche
  updateRankings();
  
  // Salva i dati
  saveData();
  
  // Reindirizza alla pagina principale
  res.send(`
    <html>
      <head>
        <title>Account verificato</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          .success {
            color: green;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="success">Account verificato con successo!</div>
        <p>Ora puoi accedere al gioco con le tue credenziali.</p>
        <a href="/?verified=true" class="button">Vai alla pagina principale</a>
      </body>
    </html>
  `);
});

// Gestione delle connessioni Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuovo client connesso: ${socket.id}`);
  
  // Ping per misurare la latenza
  socket.on('ping', (data, callback) => {
    callback({ timestamp: Date.now(), ping: Date.now() - (data.timestamp || Date.now()) });
  });
  
  // Login utente
  socket.on('login', (data, callback) => {
    const { username, password } = data;
    
    // Verifica che i dati siano validi
    if (!username || !password) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che l'utente esista
    if (!users[username]) {
      callback({ success: false, message: 'Utente non trovato' });
      return;
    }
    
    // Verifica che la password sia corretta
    if (users[username].password !== password) {
      callback({ success: false, message: 'Password errata' });
      return;
    }
    
    // Verifica che l'account sia verificato
    if (!users[username].verified) {
      callback({ success: false, message: 'Account non verificato. Controlla la tua email.' });
      return;
    }
    
    // Login riuscito
    callback({
      success: true,
      message: 'Login riuscito',
      user: {
        username: username,
        email: users[username].email,
        mmr: users[username].mmr
      }
    });
  });
  
  // Ottieni le stanze
  socket.on('getRooms', (callback) => {
    const roomsList = Object.values(rooms).map(room => room.getPublicData());
    callback(roomsList);
  });
  
  // Crea una stanza
  socket.on('createRoom', (data, callback) => {
    const { name, maxPlayers, isPrivate, password, isRanked, gameMode, username, isHosted } = data;
    
    // Verifica che i dati siano validi
    if (!name || !username) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Crea un ID per la stanza
    const roomId = generateId();
    
    // Crea la stanza
    const room = new GameRoom(
      roomId,
      name,
      socket.id,
      isPrivate || false,
      password || null,
      isRanked || false,
      maxPlayers || 10,
      gameMode || null,
      isHosted !== undefined ? isHosted : true // isHosted (default: true per P2P)
    );
    
    // Aggiungi il giocatore alla stanza
    room.addPlayer(socket.id, username);
    
    // Salva la stanza
    rooms[roomId] = room;
    
    // Unisci il socket alla stanza
    socket.join(roomId);
    
    // Inizializza il gestore di trasferimento dell'host per questa stanza
    transferManager.initRoom(roomId, room);
    
    // Creazione riuscita
    callback({
      success: true,
      message: 'Stanza creata con successo',
      roomId: roomId,
      room: room.getDetailedData()
    });
  });
  
  // Controlla la stanza
  socket.on('checkRoom', (data, callback) => {
    const { roomId } = data;
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      callback({ exists: false });
      return;
    }
    
    // Restituisci le informazioni sulla stanza
    callback({
      exists: true,
      isPrivate: rooms[roomId].isPrivate,
      gameStarted: rooms[roomId].gameStarted
    });
  });
  
  // Unisciti a una stanza
  socket.on('joinRoom', (data, callback) => {
    const { roomId, username, password } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !username) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      callback({ success: false, message: 'Stanza non trovata' });
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che la stanza non sia piena
    if (Object.keys(room.players).length >= room.maxPlayers) {
      callback({ success: false, message: 'Stanza piena' });
      return;
    }
    
    // Verifica che la stanza non sia privata o che la password sia corretta
    if (room.isPrivate && room.password !== password) {
      callback({ success: false, message: 'Password errata' });
      return;
    }
    
    // Aggiungi il giocatore alla stanza
    const added = room.addPlayer(socket.id, username);
    
    if (!added) {
      callback({ success: false, message: 'Impossibile unirsi alla stanza' });
      return;
    }
    
    // Unisci il socket alla stanza
    socket.join(roomId);
    
    // Notifica gli altri giocatori
    socket.to(roomId).emit('playerJoined', {
      id: socket.id,
      name: username
    });
    
    // Ottieni le connessioni P2P esistenti
    const p2pConnections = room.getP2PConnections(socket.id);
    
    // Unione riuscita
    callback({
      success: true,
      message: 'Unione alla stanza riuscita',
      room: room.getDetailedData(),
      isHost: room.host === socket.id,
      p2pConnections
    });
    
    // Invia un evento di connessione P2P a tutti i giocatori nella stanza
    Object.keys(room.players).forEach(playerId => {
      if (playerId !== socket.id) {
        io.to(playerId).emit('p2pConnect', {
          peerId: socket.id,
          roomId
        });
      }
    });
  });
  
  // Cambia team
  socket.on('changeTeam', (data) => {
    const { roomId, team } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !team) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      return;
    }
    
    // Verifica che il team sia valido
    if (team !== 'red' && team !== 'blue' && team !== 'spectator') {
      return;
    }
    
    // Cambia il team del giocatore
    room.changeTeam(socket.id, team);
    
    // Notifica tutti i giocatori
    io.to(roomId).emit('teamChanged', {
      playerId: socket.id,
      team: team
    });
  });
  
  // Sposta un giocatore in un altro team (solo per l'host)
  socket.on('movePlayer', (data) => {
    const { roomId, playerId, team } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !playerId || !team) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia l'host
    if (room.host !== socket.id) {
      return;
    }
    
    // Verifica che il giocatore da spostare sia nella stanza
    if (!room.players[playerId]) {
      return;
    }
    
    // Verifica che il team sia valido
    if (team !== 'red' && team !== 'blue' && team !== 'spectator') {
      return;
    }
    
    // Cambia il team del giocatore
    room.changeTeam(playerId, team);
    
    // Notifica tutti i giocatori
    io.to(roomId).emit('teamChanged', {
      playerId: playerId,
      team: team
    });
  });
  
  // Avvia la partita
  socket.on('startGame', (roomId) => {
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia l'host
    if (room.host !== socket.id) {
      return;
    }
    
    // Verifica che ci siano abbastanza giocatori
    if (room.teams.red.length === 0 || room.teams.blue.length === 0) {
      return;
    }
    
    // Avvia la partita
    room.startGame();
  });
  
  // Interrompi la partita (solo per l'host)
  socket.on('stopGame', (roomId) => {
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia l'host
    if (room.host !== socket.id) {
      return;
    }
    
    // Verifica che la partita sia in corso
    if (!room.gameStarted) {
      return;
    }
    
    // Interrompi la partita
    room.stopGame();
  });
  
  // Aggiorna l'input del giocatore
  socket.on('playerInput', (data) => {
    const { roomId, input } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !input) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      return;
    }
    
    // Aggiorna l'input del giocatore
    room.players[socket.id].input = input;
    
    // Se la stanza è P2P e il giocatore non è l'host, invia l'input all'host
    if (room.isHosted && room.host !== socket.id) {
      // Invia l'input all'host tramite P2P
      socket.to(room.host).emit('playerInput', {
        playerId: socket.id,
        input
      });
    }
  });
  
  // Invia un messaggio in chat
  socket.on('chatMessage', (data) => {
    const { roomId, message } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !message) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      return;
    }
    
    // Invia il messaggio a tutti i giocatori nella stanza
    io.to(roomId).emit('chatMessage', {
      sender: room.players[socket.id].name,
      message
    });
  });
  
  // Segnalazione P2P
  socket.on('p2pSignal', (data) => {
    const { roomId, toId, signalData } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !toId || !signalData) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      return;
    }
    
    // Verifica che il destinatario sia nella stanza
    if (!room.players[toId]) {
      return;
    }
    
    // Aggiungi la connessione P2P
    room.addP2PConnection(socket.id, toId, signalData);
    
    // Invia il segnale al destinatario
    io.to(toId).emit('p2pSignal', {
      fromId: socket.id,
      signalData
    });
  });
  
  // Ottieni il profilo utente
  socket.on('getProfile', (username, callback) => {
    // Verifica che l'utente esista
    if (!users[username]) {
      callback({ success: false, message: 'Utente non trovato' });
      return;
    }
    
    // Restituisci il profilo
    callback({
      success: true,
      profile: {
        username: username,
        email: users[username].email,
        mmr: users[username].mmr
      }
    });
  });
  
  // Ottieni classifiche
  socket.on('getRankings', (type, callback) => {
    // Verifica che il tipo sia valido
    if (!mmrRankings[type]) {
      callback([]);
      return;
    }
    
    // Trasforma gli oggetti in array
    const rankings = Object.entries(mmrRankings[type])
      .map(([name, mmr]) => ({ name, mmr }))
      .sort((a, b) => b.mmr - a.mmr)
      .slice(0, 100); // Limita a 100 giocatori
    
    callback(rankings);
  });
  
  // Trova una partita ranked
  socket.on('findMatch', (data, callback) => {
    const { username, mode } = data;
    
    // Verifica che i dati siano validi
    if (!username || !mode) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che l'utente esista
    if (!users[username]) {
      callback({ success: false, message: 'Utente non trovato' });
      return;
    }
    
    // TODO: Implementare il matchmaking
    callback({ success: false, message: 'Matchmaking non implementato' });
  });
  
  // Disconnessione
  socket.on('disconnect', () => {
    console.log(`Client disconnesso: ${socket.id}`);
    
    // Rimuovi il giocatore da tutte le stanze in cui si trova
    Object.keys(rooms).forEach(roomId => {
      const room = rooms[roomId];
      
      if (room.players[socket.id]) {
        // Notifica gli altri giocatori
        socket.to(roomId).emit('playerLeft', {
          id: socket.id,
          name: room.players[socket.id].name
        });
        
        // Rimuovi il giocatore dalla stanza
        room.removePlayer(socket.id);
        
        // Se la stanza è vuota, non rimuoverla immediatamente ma imposta un timeout
        if (Object.keys(room.players).length === 0) {
          // Per le stanze normali (non ranked), imposta un timeout di 5 minuti
          if (!room.isRanked) {
            console.log(`Stanza ${roomId} vuota, sarà rimossa tra 5 minuti se nessuno si unisce`);
            // Non rimuovere immediatamente, verrà gestito dal cleanup periodico
          } else {
            // Per le stanze ranked, rimuovi immediatamente
            transferManager.removeRoom(roomId);
            delete rooms[roomId];
          }
        }
      }
    });
  });
  
  // Esci dalla stanza
  socket.on('leaveRoom', (roomId) => {
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      return;
    }
    
    // Notifica gli altri giocatori
    socket.to(roomId).emit('playerLeft', {
      id: socket.id,
      name: room.players[socket.id].name
    });
    
    // Rimuovi il giocatore dalla stanza
    room.removePlayer(socket.id);
    
    // Esci dalla stanza socket.io
    socket.leave(roomId);
    
    // Se la stanza è vuota, non rimuoverla immediatamente ma imposta un timeout
    if (Object.keys(room.players).length === 0) {
      // Per le stanze normali (non ranked), imposta un timeout di 5 minuti
      if (!room.isRanked) {
        console.log(`Stanza ${roomId} vuota, sarà rimossa tra 5 minuti se nessuno si unisce`);
        // Non rimuovere immediatamente, verrà gestito dal cleanup periodico
      } else {
        // Per le stanze ranked, rimuovi immediatamente
        transferManager.removeRoom(roomId);
        delete rooms[roomId];
      }
    }
  });
});

// Pulizia periodica delle stanze vuote (ogni minuto)
setInterval(() => {
  const now = Date.now();
  Object.keys(rooms).forEach(roomId => {
    const room = rooms[roomId];
    
    // Se la stanza è vuota e l'ultima attività è stata più di 5 minuti fa, rimuovila
    if (Object.keys(room.players).length === 0 && now - room.lastActivity > 5 * 60 * 1000) {
      console.log(`Rimozione stanza vuota ${roomId} dopo 5 minuti di inattività`);
      transferManager.removeRoom(roomId);
      delete rooms[roomId];
    }
  });
}, 60 * 1000); // Controlla ogni minuto

// Avvia il server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server in ascolto su ${HOST}:${PORT}`);
});
