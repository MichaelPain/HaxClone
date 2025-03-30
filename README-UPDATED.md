# Documentazione HaxBall Clone - Versione Aggiornata

## Panoramica
Questo progetto è un clone completo di HaxBall con funzionalità avanzate, implementato utilizzando JavaScript, HTML5 Canvas, Node.js e Socket.io. Il gioco offre un'esperienza multiplayer in tempo reale con fisica realistica, sistema di stanze, matchmaking basato su MMR, power-up dinamici e molte altre caratteristiche.

## Aggiornamenti Implementati
Questa versione include le seguenti correzioni e miglioramenti:

1. **Sistema di registrazione completo**:
   - Aggiunta verifica email per l'attivazione dell'account
   - Email di conferma inviata durante la registrazione
   - Interfaccia di login/registrazione migliorata

2. **Gestione profilo utente**:
   - Possibilità di cambiare nickname se disponibile
   - Gestione separata degli MMR per diverse modalità di gioco
   - Visualizzazione statistiche dettagliate

3. **Classifiche separate per modalità**:
   - Classifiche distinte per 1v1, 2v2 e 3v3+
   - MMR calcolato separatamente per ogni modalità
   - Visualizzazione migliorata delle classifiche

4. **Connessione al server migliorata**:
   - Risoluzione automatica dei problemi di connessione
   - Supporto per connessioni da reti locali e remote
   - Gestione avanzata degli errori di connessione

5. **Hosting stanze migliorato**:
   - Stanze "Normal" correttamente hostate dai giocatori
   - Trasferimento automatico dell'host ottimizzato
   - Migliore gestione delle disconnessioni

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
- Connessione internet stabile

## Installazione
1. Clona il repository o estrai l'archivio
2. Naviga nella directory del progetto: `cd haxball-clone`
3. Installa le dipendenze: `npm install`
4. Avvia il server: `npm start`
5. Apri il browser e vai a `http://localhost:3000`

## Configurazione Avanzata
### Configurazione Server
Il server è configurato per ascoltare su tutte le interfacce di rete (0.0.0.0) sulla porta 3000. Questo permette l'accesso sia da localhost che da altri dispositivi sulla stessa rete.

Per modificare la porta o l'host, puoi impostare le variabili d'ambiente:
```
PORT=8080 HOST=127.0.0.1 node server/server.js
```

### Configurazione Email
Per l'ambiente di produzione, è necessario configurare un servizio email reale modificando le impostazioni del transporter in `server.js`:

```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.tuoservizio.com',
  port: 587,
  auth: {
    user: 'tua-email@esempio.com',
    pass: 'tua-password'
  }
});
```

## Risoluzione Problemi
### Problemi di Connessione
Se riscontri problemi di connessione:

1. **Verifica che il server sia in esecuzione**:
   ```
   curl http://localhost:3000
   ```

2. **Verifica le impostazioni del firewall**:
   Assicurati che la porta 3000 sia aperta per le connessioni TCP.

3. **Connessione da altri dispositivi**:
   - Usa l'indirizzo IP della macchina che ospita il server
   - Assicurati che il server sia in ascolto su 0.0.0.0 (tutte le interfacce)
   - Verifica che non ci siano restrizioni di rete che bloccano la connessione

4. **Problemi con WebSockets**:
   - Il gioco tenterà automaticamente di utilizzare WebSockets e, in caso di fallimento, passerà al polling
   - Se i WebSockets sono bloccati dalla rete, le prestazioni potrebbero essere inferiori

### Problemi con l'Hosting delle Stanze
Se le stanze "Normal" non funzionano correttamente:

1. **Verifica la connessione P2P**:
   Alcune reti potrebbero bloccare le connessioni peer-to-peer necessarie per l'hosting delle stanze.

2. **Usa la modalità Ranked**:
   Le stanze Ranked sono sempre hostate dal server centrale e dovrebbero funzionare anche in reti restrittive.

## Funzionalità Principali

### Sistema di Autenticazione
- Registrazione con verifica email
- Login sicuro
- Gestione profilo con possibilità di cambiare username e password

### Sistema di Stanze
- Creazione di stanze pubbliche e private con password
- Trasferimento automatico dell'host quando l'host originale lascia la stanza
- Stanze ranked con verifica della stabilità della connessione
- Modalità ranked 1v1, 2v2 e 3v3+ con classifiche separate

### Fisica e Gameplay
- Fisica realistica implementata con Matter.js
- Loop di gioco indipendente per ogni stanza
- Sistema di collisioni avanzato
- Power-up dinamici con effetti temporanei (velocità, dimensione, super calcio, congelamento)
- Combo tastiera per abilità speciali

### Sistema di Matchmaking
- Matchmaking basato su MMR (Matchmaking Rating)
- Calcolo dell'MMR post-partita separato per ogni modalità
- Classifiche globali e per modalità

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
- **Email**: Nodemailer

## Sviluppi Futuri
- Implementazione di modelli 3D con Three.js
- Sistema di chat vocale
- Marketplace per skin e personalizzazioni
- Modalità battle royale avanzata

## Licenza
Questo progetto è rilasciato sotto licenza ISC.
