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
const GameRoom = require('./gameRoom');
const hostSelection = require('./hostSelection');
const lagDetection = require('./lagDetection');
const hostTransfer = require('./hostTransfer');

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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: 'jermain.stoltenberg@ethereal.email',
    pass: 'Uj5mNvDuYAYgBgxaVr'
  }
});

// Verifica la configurazione email
transporter.verify((error, success) => {
  if (error) {
    console.error('Errore nella configurazione email:', error);
  } else {
    console.log('Server email pronto');
  }
});

// Configurazione del gioco
const gameConfig = {
  fieldWidth: 800,
  fieldHeight: 400,
  wallThickness: 10,
  goalWidth: 100,
  playerRadius: 15,
  ballRadius: 10,
  tickRate: 60,
  maxPlayers: 10,
  powerUpDuration: 10000
};

// Inizializza il gestore di trasferimento dell'host
const transferManager = hostTransfer.createHostTransferManager(io);

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

// Gestione delle connessioni Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuovo client connesso: ${socket.id}`);
  
  // Ping per misurare la latenza
  socket.on('ping', (data, callback) => {
    callback({ timestamp: Date.now() });
  });
  
  // Registrazione utente
  socket.on('register', (data, callback) => {
    const { username, email, password } = data;
    
    // Verifica che i dati siano validi
    if (!username || !email || !password) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che l'username non sia già in uso
    if (users[username]) {
      callback({ success: false, message: 'Username già in uso' });
      return;
    }
    
    // Verifica che l'email non sia già in uso
    const emailExists = Object.values(users).some(user => user.email === email);
    if (emailExists) {
      callback({ success: false, message: 'Email già in uso' });
      return;
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
    
    // Invia l'email di verifica
    const verificationUrl = `http://${socket.handshake.headers.host}/verify?token=${verificationToken}`;
    
    const mailOptions = {
      from: '"HaxBall Clone" <noreply@haxballclone.com>',
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
        callback({ success: false, message: 'Errore nell\'invio dell\'email di verifica' });
      } else {
        console.log('Email di verifica inviata:', info.messageId);
        callback({ success: true, message: 'Registrazione completata. Controlla la tua email per verificare l\'account.' });
        
        // Salva i dati
        saveData();
      }
    });
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
  
  // Cambio username
  socket.on('changeUsername', (data, callback) => {
    const { currentUsername, newUsername, password } = data;
    
    // Verifica che i dati siano validi
    if (!currentUsername || !newUsername || !password) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che l'utente esista
    if (!users[currentUsername]) {
      callback({ success: false, message: 'Utente non trovato' });
      return;
    }
    
    // Verifica che la password sia corretta
    if (users[currentUsername].password !== password) {
      callback({ success: false, message: 'Password errata' });
      return;
    }
    
    // Verifica che il nuovo username non sia già in uso
    if (users[newUsername]) {
      callback({ success: false, message: 'Username già in uso' });
      return;
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
    callback({
      success: true,
      message: 'Username cambiato con successo',
      user: {
        username: newUsername,
        email: userData.email,
        mmr: userData.mmr
      }
    });
  });
  
  // Cambio password
  socket.on('changePassword', (data, callback) => {
    const { username, currentPassword, newPassword } = data;
    
    // Verifica che i dati siano validi
    if (!username || !currentPassword || !newPassword) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che l'utente esista
    if (!users[username]) {
      callback({ success: false, message: 'Utente non trovato' });
      return;
    }
    
    // Verifica che la password sia corretta
    if (users[username].password !== currentPassword) {
      callback({ success: false, message: 'Password attuale errata' });
      return;
    }
    
    // Cambia la password
    users[username].password = newPassword;
    
    // Salva i dati
    saveData();
    
    // Cambio riuscito
    callback({
      success: true,
      message: 'Password cambiata con successo'
    });
  });
  
  // Ottieni le stanze
  socket.on('getRooms', (callback) => {
    const roomsList = Object.values(rooms).map(room => room.getPublicData());
    callback(roomsList);
  });
  
  // Crea una stanza
  socket.on('createRoom', (data, callback) => {
    const { name, maxPlayers, isPrivate, password, isRanked, gameMode, username } = data;
    
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
      maxPlayers || gameConfig.maxPlayers,
      gameMode || null,
      true // isHosted (tutte le stanze sono ora P2P)
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
      room: room.getDetailedData()
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
  socket.on('changeTeam', (data, callback) => {
    const { roomId, team } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !team) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      callback({ success: false, message: 'Stanza non trovata' });
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia nella stanza
    if (!room.players[socket.id]) {
      callback({ success: false, message: 'Non sei in questa stanza' });
      return;
    }
    
    // Verifica che il team sia valido
    if (team !== 'red' && team !== 'blue' && team !== 'spectator') {
      callback({ success: false, message: 'Team non valido' });
      return;
    }
    
    // Cambia il team del giocatore
    room.changeTeam(socket.id, team);
    
    // Cambio riuscito
    callback({
      success: true,
      message: 'Team cambiato con successo',
      team
    });
  });
  
  // Avvia la partita
  socket.on('startGame', (data, callback) => {
    const { roomId } = data;
    
    // Verifica che i dati siano validi
    if (!roomId) {
      callback({ success: false, message: 'Dati mancanti' });
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      callback({ success: false, message: 'Stanza non trovata' });
      return;
    }
    
    const room = rooms[roomId];
    
    // Verifica che il giocatore sia l'host
    if (room.host !== socket.id) {
      callback({ success: false, message: 'Non sei l\'host di questa stanza' });
      return;
    }
    
    // Verifica che ci siano abbastanza giocatori
    if (room.teams.red.length === 0 || room.teams.blue.length === 0) {
      callback({ success: false, message: 'Non ci sono abbastanza giocatori' });
      return;
    }
    
    // Avvia la partita
    room.startGame();
    
    // Avvio riuscito
    callback({
      success: true,
      message: 'Partita avviata con successo'
    });
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
  
  // Aggiornamento delle statistiche di connessione
  socket.on('connectionStats', (data) => {
    const { roomId, stats } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !stats) {
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
    
    // Aggiorna le statistiche del giocatore
    room.updatePlayerStats(socket.id, stats);
  });
  
  // Segnalazione di lag
  socket.on('reportLag', (data) => {
    const { roomId, targetId, details } = data;
    
    // Verifica che i dati siano validi
    if (!roomId || !targetId) {
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
    
    // Verifica che il target sia nella stanza
    if (!room.players[targetId]) {
      return;
    }
    
    // Gestisci il report di lag
    transferManager.handleLagReport(roomId, socket.id, targetId, details);
  });
  
  // Ready check
  socket.on('playerReady', (data) => {
    const { roomId } = data;
    
    // Verifica che i dati siano validi
    if (!roomId) {
      return;
    }
    
    // Verifica che la stanza esista
    if (!rooms[roomId]) {
      return;
    }
    
    // Segna il giocatore come pronto
    transferManager.markPlayerReady(roomId, socket.id);
  });
  
  // Avvio del loop di gioco (per l'host P2P)
  socket.on('startGameLoop', () => {
    // Trova la stanza in cui il socket è host
    const roomId = Object.keys(rooms).find(id => rooms[id].host === socket.id);
    
    if (roomId) {
      const room = rooms[roomId];
      
      // Avvia il loop di gioco
      room.lastUpdateTime = Date.now();
      room.gameInterval = setInterval(() => {
        if (!room.isPaused) {
          room.update();
        }
      }, 1000 / gameConfig.tickRate);
    }
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
        
        // Se la stanza è vuota, rimuovila
        if (Object.keys(room.players).length === 0) {
          transferManager.removeRoom(roomId);
          delete rooms[roomId];
        }
      }
    });
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
        <a href="/" class="button">Vai alla pagina principale</a>
      </body>
    </html>
  `);
});

// Avvia il server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server in ascolto su ${HOST}:${PORT}`);
});
