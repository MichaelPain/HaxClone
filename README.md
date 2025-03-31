Documentazione HaxBall Clone
Panoramica
Questo progetto è un clone completo di HaxBall con funzionalità avanzate, implementato utilizzando JavaScript, HTML5 Canvas, Node.js e Socket.io. Il gioco offre un'esperienza multiplayer in tempo reale con fisica realistica, sistema di stanze, matchmaking basato su MMR, power-up dinamici e molte altre caratteristiche.
Aggiornamenti Implementati
Questa versione include le seguenti correzioni e miglioramenti:

Sistema di registrazione completo:

Aggiunta verifica email per l'attivazione dell'account
Email di conferma inviata durante la registrazione
Interfaccia di login/registrazione migliorata


Gestione profilo utente:

Possibilità di cambiare nickname se disponibile
Gestione separata degli MMR per diverse modalità di gioco
Visualizzazione statistiche dettagliate


Classifiche separate per modalità:

Classifiche distinte per 1v1, 2v2 e 3v3+
MMR calcolato separatamente per ogni modalità
Visualizzazione migliorata delle classifiche


Connessione al server migliorata:

Risoluzione automatica dei problemi di connessione
Supporto per connessioni da reti locali e remote
Gestione avanzata degli errori di connessione


Hosting stanze migliorato:

Stanze "Normal" correttamente hostate dai giocatori
Trasferimento automatico dell'host ottimizzato
Migliore gestione delle disconnessioni


Fisica di gioco potenziata:

Integrazione completa con il motore fisico Matter.js
Collisioni, rimbalzi e movimenti più realistici
Migliore gestione della palla e dei giocatori


Interfaccia utente rinnovata:

Design più moderno e intuitivo
Migliore organizzazione delle schermate e dei menu
Feedback visivi e animazioni migliorate


Rilevamento e gestione del lag:

Algoritmi avanzati per rilevare problemi di lag
Trasferimento automatico dell'host in caso di lag persistente
Sistema di votazione per segnalare giocatori con problemi di connessione


Editor di mappe integrato:

Possibilità di creare e modificare mappe personalizzate
Interfaccia drag-and-drop intuitiva
Salvataggio e caricamento delle mappe


Replay delle partite:

Registrazione automatica delle partite
Possibilità di rivedere le partite precedenti
Controlli di riproduzione avanzati (pausa, avanti/indietro, velocità)



Struttura del Progetto
Copyhaxball-clone/
├── public/               # File client-side
│   ├── css/              # Fogli di stile
│   │   └── style.css     # Stile principale
│   ├── js/               # Script JavaScript client
│   │   ├── config.js     # Configurazione del gioco
│   │   ├── game.js       # Logica di gioco principale
│   │   ├── main.js       # Punto di ingresso dell'applicazione
│   │   ├── mapEditor.js  # Editor di mappe personalizzate
│   │   ├── readyCheck.js # Componente per il ready check dopo il cambio di host
│   │   ├── replay.js     # Sistema di replay
│   │   ├── ui.js         # Gestione dell'interfaccia utente
│   │   └── utils.js      # Funzioni di utilità
│   └── index.html        # Pagina HTML principale
├── server/               # File server-side
│   ├── gameRoom.js       # Classe per gestire le stanze di gioco
│   ├── hostSelection.js  # Sistema di selezione dell'host per partite P2P
│   ├── hostTransfer.js   # Sistema di trasferimento dell'host per partite P2P
│   ├── lagDetection.js   # Sistema di rilevamento del lag per partite P2P
│   └── server.js         # Server Node.js con logica di gioco
├── shared/               # File condivisi tra client e server
├── data/                 # Dati persistenti
│   ├── rankings.json     # Dati delle classifiche
│   └── users.json        # Dati degli utenti
├── package-lock.json     # Lock file delle dipendenze
├── package.json          # Configurazione npm e dipendenze
├── README-UPDATED.md     # Questa documentazione aggiornata
└── README.md             # Documentazione originale del progetto


Requisiti

Node.js (v14+)
NPM (v6+)
Browser moderno con supporto per HTML5 Canvas e WebSockets
Connessione internet stabile

Installazione

Clona il repository o estrai l'archivio
Naviga nella directory del progetto: cd haxball-clone
Installa le dipendenze: npm install
Avvia il server: npm start
Apri il browser e vai a http://localhost:3000

Configurazione Avanzata
Configurazione Server
Il server è configurato per ascoltare su tutte le interfacce di rete (0.0.0.0) sulla porta 3000. Questo permette l'accesso sia da localhost che da altri dispositivi sulla stessa rete.
Per modificare la porta o l'host, puoi impostare le variabili d'ambiente:
CopyPORT=8080 HOST=127.0.0.1 node server/server.js
Configurazione Email
Per l'ambiente di produzione, è necessario configurare un servizio email reale modificando le impostazioni del transporter in server.js:
javascriptCopyconst transporter = nodemailer.createTransport({
  host: 'smtp.tuoservizio.com',
  port: 587,
  auth: {
    user: 'tua-email@esempio.com',
    pass: 'tua-password'
  }
});
Risoluzione Problemi
Problemi di Connessione
Se riscontri problemi di connessione:

Verifica che il server sia in esecuzione:
Copycurl http://localhost:3000

Verifica le impostazioni del firewall:
Assicurati che la porta 3000 sia aperta per le connessioni TCP.
Connessione da altri dispositivi:

Usa l'indirizzo IP della macchina che ospita il server
Assicurati che il server sia in ascolto su 0.0.0.0 (tutte le interfacce)
Verifica che non ci siano restrizioni di rete che bloccano la connessione


Problemi con WebSockets:

Il gioco tenterà automaticamente di utilizzare WebSockets e, in caso di fallimento, passerà al polling
Se i WebSockets sono bloccati dalla rete, le prestazioni potrebbero essere inferiori



Problemi con l'Hosting delle Stanze
Se le stanze "Normal" non funzionano correttamente:

Verifica la connessione P2P:
Alcune reti potrebbero bloccare le connessioni peer-to-peer necessarie per l'hosting delle stanze.
Usa la modalità Ranked:
Le stanze Ranked sono sempre hostate dal server centrale e dovrebbero funzionare anche in reti restrittive.

Funzionalità Principali
Sistema di Autenticazione

Registrazione con verifica email
Login sicuro
Gestione profilo con possibilità di cambiare username e password

Sistema di Stanze

Creazione di stanze pubbliche e private con password
Trasferimento automatico dell'host quando l'host originale lascia la stanza
Stanze ranked con verifica della stabilità della connessione
Modalità ranked 1v1, 2v2 e 3v3+ con classifiche separate

Fisica e Gameplay

Fisica realistica implementata con Matter.js
Loop di gioco indipendente per ogni stanza
Sistema di collisioni avanzato
Power-up dinamici con effetti temporanei (velocità, dimensione, super calcio, congelamento)
Combo tastiera per abilità speciali

Sistema di Matchmaking

Matchmaking basato su MMR (Matchmaking Rating)
Calcolo dell'MMR post-partita separato per ogni modalità
Classifiche globali e per modalità

Interfaccia Utente

Login e registrazione utenti
Lobby principale con lista delle stanze disponibili
Interfaccia di creazione stanza personalizzabile
Canvas di gioco con rendering in tempo reale
Sistema di chat in-game

Funzionalità Avanzate

Editor di mappe personalizzate
Sistema di replay delle partite
Rilevamento e gestione del lag
Trasferimento automatico dell'host in caso di problemi
Sistema di voto per segnalare giocatori con lag

Controlli

Movimento: Frecce direzionali o WASD
Calcio: Barra spaziatrice
Abilità speciali: Tasto Shift

Tecnologie Utilizzate

Frontend: HTML5, CSS3, JavaScript, Canvas API
Backend: Node.js, Express
Comunicazione Real-time: Socket.io
Fisica: Matter.js
Interfaccia Utente: HTML, CSS, JavaScript
Templating: EJS (Embedded JavaScript)
Autenticazione: JSON Web Tokens (JWT)
Database: MongoDB
Altro: WebRTC per connessioni P2P, WebSockets per comunicazione real-time

Sviluppi Futuri

Implementazione di modelli 3D con Three.js
Sistema di chat vocale
Marketplace per skin e personalizzazioni
Modalità battle royale avanzata
Integrazione con servizi di streaming come Twitch e YouTube Gaming
App mobile per iOS e Android
Sistema di tornei e leghe competitive
Analisi avanzate delle prestazioni dei giocatori
Intelligenza artificiale per giocatori bot

Contribuire
Siamo aperti a contributi dalla community! Se vuoi contribuire a HaxBall Clone, segui questi passaggi:

Forka il repository
Crea un nuovo branch per la tua feature o bugfix
Commit delle tue modifiche
Push del branch
Apri una Pull Request

Assicurati che il tuo codice segua le nostre linee guida di stile e includa test adeguati.
Licenza
Questo progetto è rilasciato sotto licenza MIT. Vedi il file LICENSE per i dettagli completi.
Contatti
Per qualsiasi domanda, suggerimento o segnalazione di bug, non esitare a contattarci:

Email: postmaster@easypcpisa.it
Twitter: @FuryGamingASD
Discord: Fury Gaming

Grazie per il tuo interesse in HaxBall Clone! Divertiti a giocare e speriamo di vederti in campo.
