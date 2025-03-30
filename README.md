# Documentazione HaxBall Clone

## Panoramica
Questo progetto è un clone completo di HaxBall con funzionalità avanzate, implementato utilizzando JavaScript, HTML5 Canvas, Node.js e Socket.io. Il gioco offre un'esperienza multiplayer in tempo reale con fisica realistica, sistema di stanze, matchmaking basato su MMR, power-up dinamici e molte altre caratteristiche.

## Struttura del Progetto
```
haxball-clone/
├── public/               # File client-side
│   ├── css/              # Fogli di stile
│   │   └── style.css     # Stile principale
│   ├── js/               # Script JavaScript client
│   │   ├── config.js     # Configurazione del gioco
│   │   ├── game.js       # Logica di gioco principale
│   │   ├── main.js       # Punto di ingresso dell'applicazione
│   │   ├── mapEditor.js  # Editor di mappe personalizzate
│   │   ├── replay.js     # Sistema di replay
│   │   ├── ui.js         # Gestione dell'interfaccia utente
│   │   └── utils.js      # Funzioni di utilità
│   └── index.html        # Pagina HTML principale
├── server/               # File server-side
│   └── server.js         # Server Node.js con logica di gioco
├── shared/               # File condivisi tra client e server
├── package.json          # Configurazione npm e dipendenze
└── README.md             # Documentazione del progetto
```

## Requisiti
- Node.js (v14+)
- NPM (v6+)
- Browser moderno con supporto per HTML5 Canvas e WebSockets

## Installazione
1. Clona il repository o estrai l'archivio
2. Naviga nella directory del progetto: `cd haxball-clone`
3. Installa le dipendenze: `npm install`
4. Avvia il server: `npm start`
5. Apri il browser e vai a `http://localhost:3000`

## Funzionalità Principali

### Sistema di Stanze
- Creazione di stanze pubbliche e private con password
- Trasferimento automatico dell'host quando l'host originale lascia la stanza
- Stanze ranked con verifica della stabilità della connessione
- Modalità ranked 1v1, 2v2 e 3v3+

### Fisica e Gameplay
- Fisica realistica implementata con Matter.js
- Loop di gioco indipendente per ogni stanza
- Sistema di collisioni avanzato
- Power-up dinamici con effetti temporanei (velocità, dimensione, super calcio, congelamento)
- Combo tastiera per abilità speciali

### Sistema di Matchmaking
- Matchmaking basato su MMR (Matchmaking Rating)
- Calcolo dell'MMR post-partita
- Classifica globale dei giocatori

### Interfaccia Utente
- Login e registrazione utenti
- Lobby principale con lista delle stanze disponibili
- Interfaccia di creazione stanza personalizzabile
- Canvas di gioco con rendering in tempo reale
- Sistema di chat in-game

### Funzionalità Avanzate
- Editor di mappe personalizzate
- Sistema di replay delle partite
- Sistema di tornei
- Cross-play tra dispositivi

## Controlli
- Movimento: Frecce direzionali o WASD
- Calcio: Barra spaziatrice
- Abilità speciali: Tasto Shift

## Tecnologie Utilizzate
- **Frontend**: HTML5, CSS3, JavaScript, Canvas API
- **Backend**: Node.js, Express
- **Comunicazione Real-time**: Socket.io
- **Fisica**: Matter.js

## Sviluppi Futuri
- Implementazione di modelli 3D con Three.js
- Sistema di chat vocale
- Marketplace per skin e personalizzazioni
- Modalità battle royale avanzata

## Risoluzione Problemi
- Se il server non si avvia, verifica che la porta 3000 non sia già in uso
- In caso di problemi di connessione, controlla la tua connessione internet e i firewall
- Se il gioco risulta lento, prova a ridurre il numero di giocatori nella stanza o a chiudere altre applicazioni che consumano risorse

## Licenza
Questo progetto è rilasciato sotto licenza ISC.
