// Interfaccia utente
const UI = {
    // Elementi dell'interfaccia
    elements: {
        login: {
            loginUsername: document.getElementById('login-username'),
            loginPassword: document.getElementById('login-password'),
            loginBtn: document.getElementById('login-btn'),
            registerUsername: document.getElementById('register-username'),
            registerEmail: document.getElementById('register-email'),
            registerPassword: document.getElementById('register-password'),
            registerConfirmPassword: document.getElementById('register-confirm-password'),
            registerBtn: document.getElementById('register-btn'),
            loginTab: document.getElementById('login-tab'),
            registerTab: document.getElementById('register-tab'),
            verificationMessage: document.getElementById('verification-message')
        },
        lobby: {
            userDisplay: document.getElementById('user-display'),
            mmrDisplay: document.getElementById('mmr-display'),
            profileBtn: document.getElementById('profile-btn'),
            roomsList: document.getElementById('rooms-list'),
            refreshRoomsBtn: document.getElementById('refresh-rooms-btn'),
            createRoomBtn: document.getElementById('create-room-btn'),
            ranked1v1Btn: document.getElementById('ranked-1v1-btn'),
            ranked2v2Btn: document.getElementById('ranked-2v2-btn'),
            ranked3v3Btn: document.getElementById('ranked-3v3-btn'),
            matchmakingStatus: document.getElementById('matchmaking-status'),
            cancelMatchmakingBtn: document.getElementById('cancel-matchmaking-btn'),
            tabs: document.querySelectorAll('.tabs .tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            rankingsTabs: document.querySelectorAll('.rankings-tabs .tab-btn'),
            rankingsContents: document.querySelectorAll('.rankings-content'),
            globalRankingsList: document.getElementById('global-rankings-list'),
            oneVOneRankingsList: document.getElementById('1v1-rankings-list'),
            twoVTwoRankingsList: document.getElementById('2v2-rankings-list'),
            threeVThreeRankingsList: document.getElementById('3v3-rankings-list')
        },
        profile: {
            username: document.getElementById('profile-username'),
            email: document.getElementById('profile-email'),
            mmrGlobal: document.getElementById('profile-mmr-global'),
            mmr1v1: document.getElementById('profile-mmr-1v1'),
            mmr2v2: document.getElementById('profile-mmr-2v2'),
            mmr3v3: document.getElementById('profile-mmr-3v3'),
            currentPassword: document.getElementById('profile-current-password'),
            newPassword: document.getElementById('profile-new-password'),
            confirmPassword: document.getElementById('profile-confirm-password'),
            cancelBtn: document.getElementById('cancel-profile-btn'),
            saveBtn: document.getElementById('save-profile-btn')
        },
        createRoom: {
            roomName: document.getElementById('room-name'),
            maxPlayers: document.getElementById('max-players'),
            privateRoom: document.getElementById('private-room'),
            roomPassword: document.getElementById('room-password'),
            rankedRoom: document.getElementById('ranked-room'),
            cancelBtn: document.getElementById('cancel-create-room-btn'),
            confirmBtn: document.getElementById('confirm-create-room-btn')
        },
        joinPrivateRoom: {
            password: document.getElementById('join-room-password'),
            cancelBtn: document.getElementById('cancel-join-private-btn'),
            confirmBtn: document.getElementById('confirm-join-private-btn')
        },
        room: {
            title: document.getElementById('room-title'),
            startGameBtn: document.getElementById('start-game-btn'),
            stopGameBtn: document.getElementById('stop-game-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            leaveRoomBtn: document.getElementById('leave-room-btn'),
            redTeamList: document.getElementById('red-team-list'),
            blueTeamList: document.getElementById('blue-team-list'),
            spectatorsList: document.getElementById('spectators-list'),
            joinRedBtn: document.getElementById('join-red-btn'),
            joinBlueBtn: document.getElementById('join-blue-btn'),
            joinSpectatorsBtn: document.getElementById('join-spectators-btn'),
            chatMessages: document.getElementById('chat-messages'),
            chatInput: document.getElementById('chat-input'),
            sendChatBtn: document.getElementById('send-chat-btn')
        },
        game: {
            exitBtn: document.getElementById('exit-game-btn'),
            redScore: document.getElementById('red-score'),
            blueScore: document.getElementById('blue-score'),
            timer: document.getElementById('game-timer')
        }
    },
    
    // Stato dell'interfaccia
    state: {
        currentScreen: 'login',
        currentUser: null,
        selectedRoomId: null,
        isHost: false,
        activeTab: 'rooms',
        activeRankingsTab: 'global',
        isMatchmaking: false,
        matchmakingMode: null,
        gameInProgress: false
    },
    
    // Inizializza l'interfaccia
    init: () => {
        // Mostra la schermata di login
        UI.showScreen('login');
        
        // Inizializza gli event listener
        UI.initEventListeners();
        
        // Aggiorna la lista delle stanze
        UI.refreshRooms();
    },
    
    // Inizializza gli event listener
    initEventListeners: () => {
        // Login
        UI.elements.login.loginBtn.addEventListener('click', UI.handleLogin);
        
        // Registrazione
        UI.elements.login.registerBtn.addEventListener('click', UI.handleRegister);
        
        // Tab di login
        document.querySelectorAll('.login-tabs .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.login-tabs .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.getAttribute('data-tab');
                if (tabName === 'login') {
                    UI.elements.login.loginTab.classList.remove('hidden');
                    UI.elements.login.registerTab.classList.add('hidden');
                    UI.elements.login.verificationMessage.classList.add('hidden');
                } else {
                    UI.elements.login.loginTab.classList.add('hidden');
                    UI.elements.login.registerTab.classList.remove('hidden');
                    UI.elements.login.verificationMessage.classList.add('hidden');
                }
            });
        });
        
        // Profilo
        UI.elements.lobby.profileBtn.addEventListener('click', UI.showProfile);
        UI.elements.profile.cancelBtn.addEventListener('click', () => UI.showScreen('lobby'));
        UI.elements.profile.saveBtn.addEventListener('click', UI.saveProfile);
        
        // Tab della lobby
        UI.elements.lobby.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                UI.elements.lobby.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                UI.state.activeTab = tab.getAttribute('data-tab');
                
                UI.elements.lobby.tabContents.forEach(content => {
                    if (content.id === `${UI.state.activeTab}-tab`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                if (UI.state.activeTab === 'rankings') {
                    UI.loadRankings(UI.state.activeRankingsTab);
                }
            });
        });
        
        // Tab delle classifiche
        UI.elements.lobby.rankingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                UI.elements.lobby.rankingsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                UI.state.activeRankingsTab = tab.getAttribute('data-rankings-tab');
                
                UI.elements.lobby.rankingsContents.forEach(content => {
                    if (content.id === `${UI.state.activeRankingsTab}-rankings`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                UI.loadRankings(UI.state.activeRankingsTab);
            });
        });
        
        // Stanze
        UI.elements.lobby.refreshRoomsBtn.addEventListener('click', UI.refreshRooms);
        UI.elements.lobby.createRoomBtn.addEventListener('click', () => UI.showScreen('createRoom'));
        
        // Matchmaking
        UI.elements.lobby.ranked1v1Btn.addEventListener('click', () => UI.startMatchmaking('1v1'));
        UI.elements.lobby.ranked2v2Btn.addEventListener('click', () => UI.startMatchmaking('2v2'));
        UI.elements.lobby.ranked3v3Btn.addEventListener('click', () => UI.startMatchmaking('3v3'));
        UI.elements.lobby.cancelMatchmakingBtn.addEventListener('click', UI.cancelMatchmaking);
        
        // Creazione stanza
        UI.elements.createRoom.privateRoom.addEventListener('change', () => {
            const passwordGroup = document.getElementById('password-group');
            if (UI.elements.createRoom.privateRoom.checked) {
                passwordGroup.classList.remove('hidden');
            } else {
                passwordGroup.classList.add('hidden');
            }
        });
        
        UI.elements.createRoom.cancelBtn.addEventListener('click', () => {
            UI.showScreen('lobby');
            // Aggiorna la lista delle stanze quando si torna alla lobby
            UI.refreshRooms();
        });
        UI.elements.createRoom.confirmBtn.addEventListener('click', UI.createRoom);
        
        // Unisciti a stanza privata
        UI.elements.joinPrivateRoom.cancelBtn.addEventListener('click', () => {
            UI.showScreen('lobby');
            // Aggiorna la lista delle stanze quando si torna alla lobby
            UI.refreshRooms();
        });
        UI.elements.joinPrivateRoom.confirmBtn.addEventListener('click', UI.joinPrivateRoom);
        
        // Stanza
        UI.elements.room.leaveRoomBtn.addEventListener('click', UI.leaveRoom);
        UI.elements.room.startGameBtn.addEventListener('click', UI.startGame);
        UI.elements.room.stopGameBtn.addEventListener('click', UI.stopGame);
        UI.elements.room.settingsBtn.addEventListener('click', UI.toggleRoomSettings);
        
        // Team
        UI.elements.room.joinRedBtn.addEventListener('click', () => UI.changeTeam('red'));
        UI.elements.room.joinBlueBtn.addEventListener('click', () => UI.changeTeam('blue'));
        UI.elements.room.joinSpectatorsBtn.addEventListener('click', () => UI.changeTeam('spectator'));
        
        // Chat
        UI.elements.room.sendChatBtn.addEventListener('click', UI.sendChatMessage);
        UI.elements.room.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                UI.sendChatMessage();
            }
        });
        
        // Gioco
        UI.elements.game.exitBtn.addEventListener('click', UI.exitGame);
        
        // Gestione eventi di navigazione
        window.addEventListener('beforeunload', () => {
            // Ferma l'aggiornamento automatico delle stanze
            UI.stopRoomRefresh();
            
            // Se l'utente è in una stanza, esci dalla stanza
            if (UI.state.selectedRoomId) {
                socket.emit('leaveRoom', UI.state.selectedRoomId);
            }
        });
    },
    
    // Mostra una schermata
    showScreen: (screenName) => {
        // Nascondi tutte le schermate
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        
        // Mostra la schermata richiesta
        const screen = document.getElementById(`${screenName}-screen`);
        if (screen) {
            screen.classList.remove('hidden');
            UI.state.currentScreen = screenName;
        }
        
        // Azioni specifiche per ogni schermata
        if (screenName === 'lobby') {
            // Assicurati che la tab attiva sia visualizzata correttamente
            UI.elements.lobby.tabs.forEach(tab => {
                if (tab.getAttribute('data-tab') === UI.state.activeTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
            
            UI.elements.lobby.tabContents.forEach(content => {
                if (content.id === `${UI.state.activeTab}-tab`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            if (UI.state.activeTab === 'rankings') {
                UI.loadRankings(UI.state.activeRankingsTab);
                
                // Assicurati che la tab di ranking attiva sia visualizzata correttamente
                UI.elements.lobby.rankingsTabs.forEach(tab => {
                    if (tab.getAttribute('data-rankings-tab') === UI.state.activeRankingsTab) {
                        tab.classList.add('active');
                    } else {
                        tab.classList.remove('active');
                    }
                });
                
                UI.elements.lobby.rankingsContents.forEach(content => {
                    if (content.id === `${UI.state.activeRankingsTab}-rankings`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
            }
        } else if (screenName === 'login') {
            // Assicurati che la tab di login attiva sia visualizzata correttamente
            const activeTab = document.querySelector('.login-tabs .tab-btn.active');
            if (activeTab) {
                const tabName = activeTab.getAttribute('data-tab');
                if (tabName === 'login') {
                    UI.elements.login.loginTab.classList.remove('hidden');
                    UI.elements.login.registerTab.classList.add('hidden');
                } else {
                    UI.elements.login.loginTab.classList.add('hidden');
                    UI.elements.login.registerTab.classList.remove('hidden');
                }
            } else {
                // Se nessuna tab è attiva, attiva la tab di login per default
                const loginTab = document.querySelector('.login-tabs .tab-btn[data-tab="login"]');
                if (loginTab) {
                    loginTab.classList.add('active');
                    UI.elements.login.loginTab.classList.remove('hidden');
                    UI.elements.login.registerTab.classList.add('hidden');
                }
            }
        } else if (screenName === 'game') {
            if (typeof Game !== 'undefined' && Game.startRendering) {
                Game.startRendering();
            }
        } else if (screenName === 'replay') {
            if (typeof Replay !== 'undefined' && Replay.init) {
                Replay.init();
            }
        } else if (screenName === 'mapEditor') {
            if (typeof MapEditor !== 'undefined' && MapEditor.init) {
                MapEditor.init();
            }
        }
    },
    
    // Gestisce il login
    handleLogin: () => {
        const username = UI.elements.login.loginUsername.value.trim();
        const password = UI.elements.login.loginPassword.value;
        
        if (!username || !password) {
            Utils.showNotification('Inserisci username e password');
            return;
        }
        
        socket.emit('login', { username, password }, (response) => {
            if (response.success) {
                UI.state.currentUser = {
                    username: response.user.username,
                    email: response.user.email,
                    mmr: response.user.mmr
                };
                
                UI.elements.lobby.userDisplay.textContent = response.user.username;
                UI.elements.lobby.mmrDisplay.textContent = `MMR: ${response.user.mmr.global}`;
                
                Utils.saveToStorage('username', response.user.username);
                Utils.saveToStorage('password', password);
                
                UI.showScreen('lobby');
                Utils.showNotification(`Benvenuto, ${response.user.username}!`);
            } else {
                Utils.showNotification(response.message || 'Errore durante il login');
            }
        });
    },
    
    // Mostra il profilo utente
    showProfile: () => {
        if (!UI.state.currentUser || !UI.state.currentUser.username) {
            Utils.showNotification('Utente non autenticato');
            return;
        }
        
        socket.emit('getProfile', UI.state.currentUser.username, (response) => {
            if (response.success) {
                const profile = response.profile;
                
                UI.elements.profile.username.value = profile.username;
                UI.elements.profile.email.value = profile.email;
                
                UI.elements.profile.mmrGlobal.textContent = profile.mmr.global;
                UI.elements.profile.mmr1v1.textContent = profile.mmr['1v1'];
                UI.elements.profile.mmr2v2.textContent = profile.mmr['2v2'];
                UI.elements.profile.mmr3v3.textContent = profile.mmr['3v3'];
                
                UI.elements.profile.currentPassword.value = '';
                UI.elements.profile.newPassword.value = '';
                UI.elements.profile.confirmPassword.value = '';
                
                UI.showScreen('profile');
            } else {
                Utils.showNotification(response.message || 'Impossibile caricare il profilo');
            }
        });
    },    
    
    // Salva le modifiche al profilo
    saveProfile: () => {
        const newUsername = UI.elements.profile.username.value.trim();
        const currentPassword = UI.elements.profile.currentPassword.value;
        const newPassword = UI.elements.profile.newPassword.value;
        const confirmPassword = UI.elements.profile.confirmPassword.value;
        
        if (!currentPassword) {
            Utils.showNotification('Inserisci la password attuale per confermare le modifiche');
            return;
        }
        
        // Controlla se l'username è cambiato
        if (newUsername !== UI.state.currentUser.username) {
            fetch('/api/change-username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentUsername: UI.state.currentUser.username,
                    newUsername,
                    password: currentPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    UI.state.currentUser = {
                        ...UI.state.currentUser,
                        username: data.user.username
                    };
                    
                    UI.elements.lobby.userDisplay.textContent = data.user.username;
                    
                    Utils.saveToStorage('username', data.user.username);
                    
                    Utils.showNotification('Username cambiato con successo');
                    
                    if (newPassword) {
                        UI.changePassword(newUsername, currentPassword, newPassword, confirmPassword);
                    } else {
                        UI.showScreen('lobby');
                    }
                } else {
                    Utils.showNotification(data.message || 'Errore durante il cambio username');
                }
            })
            .catch(error => {
                console.error('Errore durante il cambio username:', error);
                Utils.showNotification('Errore durante il cambio username. Riprova più tardi.');
            });
        } else if (newPassword) {
            // Cambia solo la password
            UI.changePassword(UI.state.currentUser.username, currentPassword, newPassword, confirmPassword);
        } else {
            // Nessuna modifica
            UI.showScreen('lobby');
        }
    },
    
    // Cambia la password
    changePassword: (username, currentPassword, newPassword, confirmPassword) => {
        if (newPassword !== confirmPassword) {
            Utils.showNotification('Le nuove password non corrispondono');
            return;
        }
        
        fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                currentPassword,
                newPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                Utils.saveToStorage('password', newPassword);
                
                Utils.showNotification('Password cambiata con successo');
                UI.showScreen('lobby');
            } else {
                Utils.showNotification(data.message || 'Errore durante il cambio password');
            }
        })
        .catch(error => {
            console.error('Errore durante il cambio password:', error);
            Utils.showNotification('Errore durante il cambio password. Riprova più tardi.');
        });
    },
    
    // Aggiorna la lista delle stanze
    refreshRooms: () => {
        // Mostra un indicatore di caricamento
        UI.elements.lobby.roomsList.innerHTML = '<tr><td colspan="4">Caricamento stanze...</td></tr>';
        
        // Disabilita temporaneamente il pulsante di aggiornamento
        if (UI.elements.lobby.refreshRoomsBtn) {
            UI.elements.lobby.refreshRoomsBtn.disabled = true;
            UI.elements.lobby.refreshRoomsBtn.classList.add('disabled');
            UI.elements.lobby.refreshRoomsBtn.textContent = 'Aggiornamento...';
        }
        
        socket.emit('getRooms', (rooms) => {
            UI.elements.lobby.roomsList.innerHTML = '';
            
            // Riabilita il pulsante di aggiornamento
            if (UI.elements.lobby.refreshRoomsBtn) {
                UI.elements.lobby.refreshRoomsBtn.disabled = false;
                UI.elements.lobby.refreshRoomsBtn.classList.remove('disabled');
                UI.elements.lobby.refreshRoomsBtn.textContent = 'Aggiorna';
            }
            
            if (rooms.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="4">Nessuna stanza disponibile</td>';
                UI.elements.lobby.roomsList.appendChild(emptyRow);
                return;
            }
            
            rooms.forEach(room => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = room.name;
                if (room.isRanked) {
                    nameCell.innerHTML += ' <span class="ranked-badge">Ranked</span>';
                }
                if (room.gameMode) {
                    nameCell.innerHTML += ` <span class="mode-badge">${room.gameMode}</span>`;
                }
                if (room.isHosted) {
                    nameCell.innerHTML += ' <span class="hosted-badge">P2P</span>';
                }
                
                const playersCell = document.createElement('td');
                playersCell.textContent = `${room.playerCount}/${room.maxPlayers}`;
                
                const statusCell = document.createElement('td');
                statusCell.textContent = room.gameStarted ? 'In corso' : 'In attesa';
                
                const actionCell = document.createElement('td');
                const joinBtn = document.createElement('button');
                joinBtn.className = 'btn primary-btn';
                joinBtn.textContent = 'Unisciti';
                joinBtn.addEventListener('click', () => UI.checkAndJoinRoom(room.id));
                
                if (room.gameStarted) {
                    joinBtn.disabled = true;
                    joinBtn.classList.add('disabled');
                }
                
                actionCell.appendChild(joinBtn);
                
                row.appendChild(nameCell);
                row.appendChild(playersCell);
                row.appendChild(statusCell);
                row.appendChild(actionCell);
                
                UI.elements.lobby.roomsList.appendChild(row);
            });
        });
        
        // Imposta un aggiornamento automatico ogni 30 secondi
        if (!UI.roomRefreshInterval) {
            UI.roomRefreshInterval = setInterval(() => {
                // Solo se siamo nella schermata della lobby e nella tab delle stanze
                if (UI.state.currentScreen === 'lobby' && UI.state.activeTab === 'rooms') {
                    UI.refreshRooms();
                }
            }, 30000); // 30 secondi
        }
    },
    
    // Ferma l'aggiornamento automatico delle stanze
    stopRoomRefresh: () => {
        if (UI.roomRefreshInterval) {
            clearInterval(UI.roomRefreshInterval);
            UI.roomRefreshInterval = null;
        }
    },
    
    // Controlla se una stanza è privata e unisciti
    checkAndJoinRoom: (roomId) => {
        socket.emit('checkRoom', { roomId }, (response) => {
            if (!response.exists) {
                Utils.showNotification('La stanza non esiste più');
                UI.refreshRooms();
                return;
            }
            
            if (response.isPrivate) {
                UI.state.selectedRoomId = roomId;
                UI.showScreen('joinPrivateRoom');
            } else {
                UI.joinRoom(roomId);
            }
        });
    },
    
    // Unisciti a una stanza
    joinRoom: (roomId, password = null) => {
        const username = UI.state.currentUser.username;
        
        socket.emit('joinRoom', { roomId, password, username }, (response) => {
            if (response.success) {
                UI.state.selectedRoomId = roomId;
                UI.state.isHost = response.isHost;
                
                // Aggiorna l'interfaccia della stanza
                UI.updateRoomUI(response.room);
                
                UI.showScreen('room');
            } else {
                Utils.showNotification(response.message);
            }
        });
    },
    
    // Unisciti a una stanza privata
    joinPrivateRoom: () => {
        const password = UI.elements.joinPrivateRoom.password.value;
        
        if (!password) {
            Utils.showNotification('Inserisci la password');
            return;
        }
        
        UI.joinRoom(UI.state.selectedRoomId, password);
    },
    
    // Crea una nuova stanza
    createRoom: () => {
        try {
            const name = UI.elements.createRoom.roomName.value.trim();
            const maxPlayers = parseInt(UI.elements.createRoom.maxPlayers.value);
            const isPrivate = UI.elements.createRoom.privateRoom.checked;
            const password = isPrivate ? UI.elements.createRoom.roomPassword.value : null;
            const isRanked = UI.elements.createRoom.rankedRoom.checked;
            
            // Verifica che l'utente sia loggato
            if (!UI.state.currentUser || !UI.state.currentUser.username) {
                Utils.showNotification('Utente non autenticato. Effettua il login.');
                UI.showScreen('login');
                return;
            }
            
            const username = UI.state.currentUser.username;
            
            if (!name) {
                Utils.showNotification('Inserisci un nome per la stanza');
                return;
            }
            
            if (isPrivate && !password) {
                Utils.showNotification('Inserisci una password per la stanza privata');
                return;
            }
            
            // Mostra un indicatore di caricamento
            Utils.showNotification('Creazione stanza in corso...');
            
            // Determina se la stanza è hostata dal giocatore (P2P) o dal server
            const isHosted = !isRanked; // Le stanze normal sono P2P, le ranked sono hostate dal server
            
            socket.emit('createRoom', {
                name,
                isPrivate,
                password,
                isRanked,
                maxPlayers,
                username,
                isHosted
            }, (response) => {
                try {
                    console.log('Risposta creazione stanza:', response);
                    
                    if (response && response.success) {
                        UI.state.selectedRoomId = response.roomId;
                        UI.state.isHost = true;
                        
                        // Genera un link univoco per la stanza
                        if (!isRanked && response.roomId) {
                            const roomLink = `${window.location.origin}?join=${response.roomId}`;
                            
                            // Aggiorna l'interfaccia della stanza prima di mostrare il link
                            if (response.room) {
                                UI.updateRoomUI(response.room);
                            }
                            
                            // Mostra il link dopo aver aggiornato l'interfaccia
                            setTimeout(() => {
                                UI.showRoomLink(roomLink);
                            }, 100);
                        }
                        
                        // Cambia schermata prima di aggiornare l'interfaccia
                        UI.showScreen('room');
                        
                        // Aggiorna l'interfaccia della stanza dopo il cambio di schermata
                        if (response.room) {
                            setTimeout(() => {
                                UI.updateRoomUI(response.room);
                            }, 200);
                        }
                        
                        Utils.showNotification('Stanza creata con successo!');
                    } else {
                        Utils.showNotification(response?.message || 'Errore durante la creazione della stanza');
                        // Torna alla lobby in caso di errore
                        UI.showScreen('lobby');
                    }
                } catch (err) {
                    console.error('Errore nella gestione della risposta di creazione stanza:', err);
                    Utils.showNotification('Si è verificato un errore durante la creazione della stanza');
                    UI.showScreen('lobby');
                }
            });
        } catch (err) {
            console.error('Errore nella creazione della stanza:', err);
            Utils.showNotification('Si è verificato un errore durante la creazione della stanza');
            UI.showScreen('lobby');
        }
    },
    
    // Mostra il link della stanza
    showRoomLink: (link) => {
        // Aggiungi un elemento per mostrare il link nella stanza
        const linkContainer = document.createElement('div');
        linkContainer.className = 'room-link-container';
        linkContainer.innerHTML = `
            <p>Link per invitare altri giocatori:</p>
            <div class="room-link">
                <input type="text" value="${link}" readonly>
                <button class="btn secondary-btn copy-link-btn">Copia</button>
            </div>
        `;
        
        // Aggiungi il container al DOM
        const roomHeader = document.querySelector('.room-header');
        if (roomHeader) {
            roomHeader.appendChild(linkContainer);
            
            // Aggiungi l'event listener per il pulsante di copia
            const copyBtn = linkContainer.querySelector('.copy-link-btn');
            const linkInput = linkContainer.querySelector('input');
            
            copyBtn.addEventListener('click', () => {
                linkInput.select();
                document.execCommand('copy');
                Utils.showNotification('Link copiato negli appunti!');
            });
        }
    },
    
    // Aggiorna l'interfaccia della stanza
    updateRoomUI: (room) => {
        UI.elements.room.title.textContent = room.name;
        
        // Mostra/nascondi i pulsanti in base all'host e allo stato del gioco
        if (UI.state.isHost) {
            UI.elements.room.startGameBtn.classList.remove('hidden');
            if (room.gameStarted) {
                UI.elements.room.stopGameBtn.classList.remove('hidden');
                UI.elements.room.startGameBtn.classList.add('hidden');
            } else {
                UI.elements.room.stopGameBtn.classList.add('hidden');
                UI.elements.room.startGameBtn.classList.remove('hidden');
            }
        } else {
            UI.elements.room.startGameBtn.classList.add('hidden');
            UI.elements.room.stopGameBtn.classList.add('hidden');
        }
        
        // Aggiorna lo stato del gioco
        UI.state.gameInProgress = room.gameStarted;
        
        // Aggiorna le liste dei giocatori
        UI.updateTeamList(room);
        
        // Aggiorna i pulsanti di cambio team in base allo stato del gioco
        UI.updateTeamButtons(room.gameStarted);
    },
    
    // Aggiorna le liste dei team
    updateTeamList: (room) => {
        // Pulisci le liste
        UI.elements.room.redTeamList.innerHTML = '';
        UI.elements.room.blueTeamList.innerHTML = '';
        UI.elements.room.spectatorsList.innerHTML = '';
        
        // Aggiungi i giocatori alle liste
        room.players.forEach(player => {
            const playerItem = document.createElement('li');
            playerItem.textContent = player.name;
            
            if (player.id === socket.id) {
                playerItem.classList.add('current-player');
            }
            
            if (player.id === room.host) {
                playerItem.innerHTML += ' (Host)';
            }
            
            // Aggiungi pulsanti per spostare i giocatori (solo per l'host)
            if (UI.state.isHost && player.id !== socket.id) {
                const moveButtons = document.createElement('div');
                moveButtons.className = 'move-player-buttons';
                
                if (player.team !== 'red') {
                    const moveToRedBtn = document.createElement('button');
                    moveToRedBtn.className = 'btn mini-btn red-btn';
                    moveToRedBtn.textContent = 'R';
                    moveToRedBtn.title = 'Sposta nella squadra rossa';
                    moveToRedBtn.addEventListener('click', () => UI.movePlayer(player.id, 'red'));
                    moveButtons.appendChild(moveToRedBtn);
                }
                
                if (player.team !== 'blue') {
                    const moveToBlueBtn = document.createElement('button');
                    moveToBlueBtn.className = 'btn mini-btn blue-btn';
                    moveToBlueBtn.textContent = 'B';
                    moveToBlueBtn.title = 'Sposta nella squadra blu';
                    moveToBlueBtn.addEventListener('click', () => UI.movePlayer(player.id, 'blue'));
                    moveButtons.appendChild(moveToBlueBtn);
                }
                
                if (player.team !== 'spectator') {
                    const moveToSpecBtn = document.createElement('button');
                    moveToSpecBtn.className = 'btn mini-btn secondary-btn';
                    moveToSpecBtn.textContent = 'S';
                    moveToSpecBtn.title = 'Sposta negli spettatori';
                    moveToSpecBtn.addEventListener('click', () => UI.movePlayer(player.id, 'spectator'));
                    moveButtons.appendChild(moveToSpecBtn);
                }
                
                playerItem.appendChild(moveButtons);
            }
            
            if (player.team === 'red') {
                UI.elements.room.redTeamList.appendChild(playerItem);
            } else if (player.team === 'blue') {
                UI.elements.room.blueTeamList.appendChild(playerItem);
            } else {
                UI.elements.room.spectatorsList.appendChild(playerItem);
            }
        });
    },
    
    // Aggiorna i pulsanti di cambio team in base allo stato del gioco
    updateTeamButtons: (gameStarted) => {
        // Se il gioco è in corso, disabilita i pulsanti per i non-host
        if (gameStarted && !UI.state.isHost) {
            UI.elements.room.joinRedBtn.disabled = true;
            UI.elements.room.joinBlueBtn.disabled = true;
            UI.elements.room.joinSpectatorsBtn.disabled = true;
            
            UI.elements.room.joinRedBtn.classList.add('disabled');
            UI.elements.room.joinBlueBtn.classList.add('disabled');
            UI.elements.room.joinSpectatorsBtn.classList.add('disabled');
        } else {
            UI.elements.room.joinRedBtn.disabled = false;
            UI.elements.room.joinBlueBtn.disabled = false;
            UI.elements.room.joinSpectatorsBtn.disabled = false;
            
            UI.elements.room.joinRedBtn.classList.remove('disabled');
            UI.elements.room.joinBlueBtn.classList.remove('disabled');
            UI.elements.room.joinSpectatorsBtn.classList.remove('disabled');
        }
    },
    
    // Cambia team
    changeTeam: (team) => {
        // Se il gioco è in corso e non sei l'host, non puoi cambiare team
        if (UI.state.gameInProgress && !UI.state.isHost) {
            Utils.showNotification('Non puoi cambiare team mentre la partita è in corso');
            return;
        }
        
        socket.emit('changeTeam', {
            roomId: UI.state.selectedRoomId,
            team
        });
    },
    
    // Sposta un giocatore in un altro team (solo per l'host)
    movePlayer: (playerId, team) => {
        if (!UI.state.isHost) {
            return;
        }
        
        socket.emit('movePlayer', {
            roomId: UI.state.selectedRoomId,
            playerId,
            team
        });
    },
    
    // Mostra/nascondi le impostazioni della stanza
    toggleRoomSettings: () => {
        // Implementazione delle impostazioni della stanza
        // Questo potrebbe essere un pannello laterale o un modal
        Utils.showNotification('Funzionalità impostazioni in sviluppo');
    },
    
    // Invia un messaggio in chat
    sendChatMessage: () => {
        const message = UI.elements.room.chatInput.value.trim();
        
        if (message) {
            socket.emit('chatMessage', {
                roomId: UI.state.selectedRoomId,
                message
            });
            
            UI.elements.room.chatInput.value = '';
        }
    },
    
    // Aggiungi un messaggio alla chat
    addChatMessage: (sender, message) => {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        const senderElement = document.createElement('span');
        senderElement.className = 'chat-sender';
        senderElement.textContent = sender + ': ';
        
        const contentElement = document.createElement('span');
        contentElement.className = 'chat-content';
        contentElement.textContent = message;
        
        messageElement.appendChild(senderElement);
        messageElement.appendChild(contentElement);
        
        UI.elements.room.chatMessages.appendChild(messageElement);
        UI.elements.room.chatMessages.scrollTop = UI.elements.room.chatMessages.scrollHeight;
    },
    
    // Avvia il gioco
    startGame: () => {
        socket.emit('startGame', UI.state.selectedRoomId);
    },
    
    // Interrompi il gioco (solo per l'host)
    stopGame: () => {
        if (!UI.state.isHost) {
            return;
        }
        
        socket.emit('stopGame', UI.state.selectedRoomId);
    },
    
    // Esci dal gioco
    exitGame: () => {
        if (typeof Game !== 'undefined' && Game.stopRendering) {
            Game.stopRendering();
        }
        UI.showScreen('room');
    },
    
    // Esci dalla stanza
    leaveRoom: () => {
        socket.emit('leaveRoom', UI.state.selectedRoomId);
        UI.state.selectedRoomId = null;
        UI.state.isHost = false;
        UI.state.gameInProgress = false;
        UI.showScreen('lobby');
        
        // Aggiorna la lista delle stanze quando si torna alla lobby
        UI.refreshRooms();
    },
    
    // Avvia il matchmaking
    startMatchmaking: (mode) => {
        UI.state.isMatchmaking = true;
        UI.state.matchmakingMode = mode;
        UI.elements.lobby.matchmakingStatus.classList.remove('hidden');
        
        socket.emit('findMatch', {
            username: UI.state.currentUser.username,
            mode
        }, (response) => {
            if (response.success) {
                UI.state.selectedRoomId = response.roomId;
                UI.state.isHost = response.isHost;
                
                // Aggiorna l'interfaccia della stanza
                UI.updateRoomUI(response.room);
                UI.showScreen('room');
                UI.state.isMatchmaking = false;
                UI.elements.lobby.matchmakingStatus.classList.add('hidden');
            } else {
                Utils.showNotification(response.message);
                UI.state.isMatchmaking = false;
                UI.elements.lobby.matchmakingStatus.classList.add('hidden');
            }
        });
    },
    
    // Annulla il matchmaking
    cancelMatchmaking: () => {
        UI.state.isMatchmaking = false;
        UI.state.matchmakingMode = null;
        UI.elements.lobby.matchmakingStatus.classList.add('hidden');
    },
    
    // Carica le classifiche
    loadRankings: (type) => {
        socket.emit('getRankings', type, (rankings) => {
            let rankingsList;
            
            switch (type) {
                case 'global':
                    rankingsList = UI.elements.lobby.globalRankingsList;
                    break;
                case '1v1':
                    rankingsList = UI.elements.lobby.oneVOneRankingsList;
                    break;
                case '2v2':
                    rankingsList = UI.elements.lobby.twoVTwoRankingsList;
                    break;
                case '3v3':
                    rankingsList = UI.elements.lobby.threeVThreeRankingsList;
                    break;
                default:
                    return;
            }
            
            rankingsList.innerHTML = '';
            
            if (rankings.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="3">Nessun giocatore in classifica</td>';
                rankingsList.appendChild(emptyRow);
                return;
            }
            
            rankings.forEach((player, index) => {
                const row = document.createElement('tr');
                
                const posCell = document.createElement('td');
                posCell.textContent = index + 1;
                
                const nameCell = document.createElement('td');
                nameCell.textContent = player.name;
                
                if (player.name === UI.state.currentUser?.username) {
                    row.classList.add('current-player-row');
                }
                
                const mmrCell = document.createElement('td');
                mmrCell.textContent = player.mmr;
                
                row.appendChild(posCell);
                row.appendChild(nameCell);
                row.appendChild(mmrCell);
                
                rankingsList.appendChild(row);
            });
        });
    },
    
    // Gestisce la registrazione
    handleRegister: () => {
        const username = UI.elements.login.registerUsername.value.trim();
        const email = UI.elements.login.registerEmail.value.trim();
        const password = UI.elements.login.registerPassword.value;
        const confirmPassword = UI.elements.login.registerConfirmPassword.value;
        
        if (!username || !email || !password || !confirmPassword) {
            Utils.showNotification('Tutti i campi sono obbligatori');
            return;
        }
        
        if (password !== confirmPassword) {
            Utils.showNotification('Le password non corrispondono');
            return;
        }
        
        // Validazione email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Utils.showNotification('Inserisci un indirizzo email valido');
            return;
        }
        
        // Mostra un loader o disabilita il pulsante di registrazione
        const registerBtn = UI.elements.login.registerBtn;
        const originalText = registerBtn.textContent;
        registerBtn.disabled = true;
        registerBtn.textContent = 'Registrazione in corso...';
        
        // Invia richiesta di registrazione
        fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        })
        .then(response => {
            // Verifica il tipo di contenuto prima di parsificare JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            throw new Error('Risposta del server non valida');
        })
        .then(data => {
            // Ripristina lo stato del pulsante
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
            
            if (data.success) {
                UI.elements.login.registerTab.classList.add('hidden');
                UI.elements.login.verificationMessage.classList.remove('hidden');
                
                // In ambiente di test, mostra l'URL di verifica
                if (data.verificationUrl) {
                    console.log('URL di verifica:', data.verificationUrl);
                    
                    // Se c'è un URL di anteprima email, lo mostra nei log
                    if (data.previewUrl) {
                        console.log('Anteprima email:', data.previewUrl);
                    }
                }
                
                Utils.showNotification('Registrazione completata! Controlla la tua email per verificare l\'account.');
            } else {
                Utils.showNotification(data.message || 'Errore durante la registrazione');
            }
        })
        .catch(error => {
            // Ripristina lo stato del pulsante
            registerBtn.disabled = false;
            registerBtn.textContent = originalText;
            
            console.error('Errore durante la registrazione:', error);
            Utils.showNotification('Errore durante la registrazione. Riprova più tardi.');
        });
    }
}; // Chiusura dell'oggetto UI

// Inizializza l'interfaccia quando il documento è caricato
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
