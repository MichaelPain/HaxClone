// Gestione dell'interfaccia utente
const UI = {
    // Elementi DOM
    elements: {
        screens: {
            login: document.getElementById('login-screen'),
            lobby: document.getElementById('lobby-screen'),
            profile: document.getElementById('profile-screen'),
            createRoom: document.getElementById('create-room-screen'),
            joinPrivateRoom: document.getElementById('join-private-room-screen'),
            room: document.getElementById('room-screen'),
            game: document.getElementById('game-screen'),
            replay: document.getElementById('replay-screen'),
            mapEditor: document.getElementById('map-editor-screen')
        },
        login: {
            tabs: document.querySelectorAll('.login-tabs .tab-btn'),
            loginTab: document.getElementById('login-tab'),
            registerTab: document.getElementById('register-tab'),
            loginUsername: document.getElementById('login-username'),
            loginPassword: document.getElementById('login-password'),
            registerUsername: document.getElementById('register-username'),
            registerEmail: document.getElementById('register-email'),
            registerPassword: document.getElementById('register-password'),
            registerConfirmPassword: document.getElementById('register-confirm-password'),
            loginBtn: document.getElementById('login-btn'),
            registerBtn: document.getElementById('register-btn'),
            verificationMessage: document.getElementById('verification-message')
        },
        lobby: {
            userDisplay: document.getElementById('user-display'),
            mmrDisplay: document.getElementById('mmr-display'),
            profileBtn: document.getElementById('profile-btn'),
            tabBtns: document.querySelectorAll('.tabs .tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            refreshRoomsBtn: document.getElementById('refresh-rooms-btn'),
            createRoomBtn: document.getElementById('create-room-btn'),
            roomsList: document.getElementById('rooms-list'),
            ranked1v1Btn: document.getElementById('ranked-1v1-btn'),
            ranked2v2Btn: document.getElementById('ranked-2v2-btn'),
            ranked3v3Btn: document.getElementById('ranked-3v3-btn'),
            matchmakingStatus: document.getElementById('matchmaking-status'),
            cancelMatchmakingBtn: document.getElementById('cancel-matchmaking-btn'),
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
            passwordGroup: document.getElementById('password-group'),
            rankedRoom: document.getElementById('ranked-room'),
            cancelCreateRoomBtn: document.getElementById('cancel-create-room-btn'),
            confirmCreateRoomBtn: document.getElementById('confirm-create-room-btn')
        },
        joinPrivateRoom: {
            password: document.getElementById('join-room-password'),
            cancelJoinPrivateBtn: document.getElementById('cancel-join-private-btn'),
            confirmJoinPrivateBtn: document.getElementById('confirm-join-private-btn')
        },
        room: {
            title: document.getElementById('room-title'),
            startGameBtn: document.getElementById('start-game-btn'),
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
            redScore: document.getElementById('red-score'),
            blueScore: document.getElementById('blue-score'),
            gameTimer: document.getElementById('game-timer'),
            exitGameBtn: document.getElementById('exit-game-btn'),
            canvas: document.getElementById('game-canvas')
        },
        replay: {
            playPauseBtn: document.getElementById('play-pause-replay-btn'),
            slider: document.getElementById('replay-slider'),
            exitBtn: document.getElementById('exit-replay-btn'),
            canvas: document.getElementById('replay-canvas')
        },
        mapEditor: {
            saveBtn: document.getElementById('save-map-btn'),
            loadBtn: document.getElementById('load-map-btn'),
            exitBtn: document.getElementById('exit-editor-btn'),
            toolBtns: document.querySelectorAll('.tool-btn'),
            canvas: document.getElementById('editor-canvas')
        },
        notification: document.getElementById('notification')
    },
    
    // Stato dell'interfaccia
    state: {
        currentScreen: null,
        activeTab: 'rooms',
        activeRankingsTab: 'global',
        selectedRoomId: null,
        isMatchmaking: false,
        matchmakingMode: null,
        selectedTool: null,
        isHost: false,
        currentUser: null
    },
    
    // Inizializza l'interfaccia
    init: () => {
        UI.setupEventListeners();
        UI.showScreen('login');
        
        // Controlla se l'utente è stato verificato
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('verified') === 'true') {
            Utils.showNotification('Account verificato con successo! Ora puoi accedere.');
        }
    },
    
    // Configura gli event listener
    setupEventListeners: () => {
        // Login e registrazione
        UI.elements.login.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                UI.elements.login.tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (tabName === 'login') {
                    UI.elements.login.loginTab.classList.remove('hidden');
                    UI.elements.login.registerTab.classList.add('hidden');
                } else {
                    UI.elements.login.loginTab.classList.add('hidden');
                    UI.elements.login.registerTab.classList.remove('hidden');
                }
            });
        });
        
        UI.elements.login.loginBtn.addEventListener('click', UI.handleLogin);
        UI.elements.login.registerBtn.addEventListener('click', UI.handleRegister);
        
        // Lobby
        UI.elements.lobby.tabBtns.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-tab');
                UI.elements.lobby.tabBtns.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                UI.elements.lobby.tabContents.forEach(content => {
                    if (content.id === `${tabName}-tab`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                UI.state.activeTab = tabName;
                
                // Carica i dati specifici della tab
                if (tabName === 'rooms') {
                    UI.refreshRooms();
                } else if (tabName === 'rankings') {
                    UI.loadRankings(UI.state.activeRankingsTab);
                }
            });
        });
        
        // Rankings tabs
        UI.elements.lobby.rankingsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.getAttribute('data-rankings-tab');
                UI.elements.lobby.rankingsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                UI.elements.lobby.rankingsContents.forEach(content => {
                    if (content.id === `${tabName}-rankings`) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });
                
                UI.state.activeRankingsTab = tabName;
                UI.loadRankings(tabName);
            });
        });
        
        UI.elements.lobby.refreshRoomsBtn.addEventListener('click', UI.refreshRooms);
        UI.elements.lobby.createRoomBtn.addEventListener('click', () => UI.showScreen('createRoom'));
        UI.elements.lobby.profileBtn.addEventListener('click', UI.showProfile);
        
        // Matchmaking
        UI.elements.lobby.ranked1v1Btn.addEventListener('click', () => UI.startMatchmaking('1v1'));
        UI.elements.lobby.ranked2v2Btn.addEventListener('click', () => UI.startMatchmaking('2v2'));
        UI.elements.lobby.ranked3v3Btn.addEventListener('click', () => UI.startMatchmaking('3v3'));
        UI.elements.lobby.cancelMatchmakingBtn.addEventListener('click', UI.cancelMatchmaking);
        
        // Profilo
        UI.elements.profile.cancelBtn.addEventListener('click', () => UI.showScreen('lobby'));
        UI.elements.profile.saveBtn.addEventListener('click', UI.saveProfile);
        
        // Creazione stanza
        UI.elements.createRoom.privateRoom.addEventListener('change', () => {
            if (UI.elements.createRoom.privateRoom.checked) {
                UI.elements.createRoom.passwordGroup.classList.remove('hidden');
            } else {
                UI.elements.createRoom.passwordGroup.classList.add('hidden');
            }
        });
        
        UI.elements.createRoom.cancelCreateRoomBtn.addEventListener('click', () => UI.showScreen('lobby'));
        UI.elements.createRoom.confirmCreateRoomBtn.addEventListener('click', UI.createRoom);
        
        // Unisciti a stanza privata
        UI.elements.joinPrivateRoom.cancelJoinPrivateBtn.addEventListener('click', () => UI.showScreen('lobby'));
        UI.elements.joinPrivateRoom.confirmJoinPrivateBtn.addEventListener('click', UI.joinPrivateRoom);
        
        // Stanza
        UI.elements.room.leaveRoomBtn.addEventListener('click', UI.leaveRoom);
        UI.elements.room.startGameBtn.addEventListener('click', UI.startGame);
        UI.elements.room.joinRedBtn.addEventListener('click', () => UI.changeTeam('red'));
        UI.elements.room.joinBlueBtn.addEventListener('click', () => UI.changeTeam('blue'));
        UI.elements.room.joinSpectatorsBtn.addEventListener('click', () => UI.changeTeam('spectator'));
        UI.elements.room.sendChatBtn.addEventListener('click', UI.sendChatMessage);
        UI.elements.room.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                UI.sendChatMessage();
            }
        });
        
        // Gioco
        UI.elements.game.exitGameBtn.addEventListener('click', UI.exitGame);
        
        // Replay
        UI.elements.replay.playPauseBtn.addEventListener('click', () => {
            if (typeof Replay !== 'undefined' && Replay.togglePlayback) {
                Replay.togglePlayback();
            }
        });
        UI.elements.replay.slider.addEventListener('input', () => {
            if (typeof Replay !== 'undefined' && Replay.seek) {
                Replay.seek(parseInt(UI.elements.replay.slider.value));
            }
        });
        UI.elements.replay.exitBtn.addEventListener('click', () => UI.showScreen('lobby'));
        
        // Editor di mappe
        UI.elements.mapEditor.toolBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.getAttribute('data-tool');
                UI.elements.mapEditor.toolBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                UI.state.selectedTool = tool;
                if (typeof MapEditor !== 'undefined' && MapEditor.selectTool) {
                    MapEditor.selectTool(tool);
                }
            });
        });
        
        UI.elements.mapEditor.saveBtn.addEventListener('click', () => {
            if (typeof MapEditor !== 'undefined' && MapEditor.saveMap) {
                MapEditor.saveMap();
            }
        });
        UI.elements.mapEditor.loadBtn.addEventListener('click', () => {
            if (typeof MapEditor !== 'undefined' && MapEditor.loadMap) {
                MapEditor.loadMap();
            }
        });
        UI.elements.mapEditor.exitBtn.addEventListener('click', () => UI.showScreen('lobby'));
    },
    
    // Mostra una schermata
    showScreen: (screenName) => {
        Object.keys(UI.elements.screens).forEach(key => {
            UI.elements.screens[key].classList.add('hidden');
        });
        
        UI.elements.screens[screenName].classList.remove('hidden');
        UI.state.currentScreen = screenName;
        
        // Azioni specifiche per ogni schermata
        if (screenName === 'lobby') {
            UI.refreshRooms();
            
            // Assicurati che la tab attiva sia visualizzata correttamente
            UI.elements.lobby.tabBtns.forEach(tab => {
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
        socket.emit('getRooms', (rooms) => {
            UI.elements.lobby.roomsList.innerHTML = '';
            
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
        const name = UI.elements.createRoom.roomName.value.trim();
        const maxPlayers = parseInt(UI.elements.createRoom.maxPlayers.value);
        const isPrivate = UI.elements.createRoom.privateRoom.checked;
        const password = isPrivate ? UI.elements.createRoom.roomPassword.value : null;
        const isRanked = UI.elements.createRoom.rankedRoom.checked;
        const username = UI.state.currentUser.username;
        
        if (!name) {
            Utils.showNotification('Inserisci un nome per la stanza');
            return;
        }
        
        if (isPrivate && !password) {
            Utils.showNotification('Inserisci una password per la stanza privata');
            return;
        }
        
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
            if (response.success) {
                UI.state.selectedRoomId = response.roomId;
                UI.state.isHost = true;
                
                // Aggiorna l'interfaccia della stanza
                UI.updateRoomUI(response.room);
                UI.showScreen('room');
            } else {
                Utils.showNotification(response.message || 'Errore durante la creazione della stanza');
            }
        });
    },
    
    // Aggiorna l'interfaccia della stanza
    updateRoomUI: (room) => {
        UI.elements.room.title.textContent = room.name;
        
        // Mostra/nascondi il pulsante di avvio in base all'host
        if (UI.state.isHost) {
            UI.elements.room.startGameBtn.classList.remove('hidden');
        } else {
            UI.elements.room.startGameBtn.classList.add('hidden');
        }
        
        // Aggiorna le liste dei giocatori
        UI.updateTeamList(room);
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
            
            if (player.team === 'red') {
                UI.elements.room.redTeamList.appendChild(playerItem);
            } else if (player.team === 'blue') {
                UI.elements.room.blueTeamList.appendChild(playerItem);
            } else {
                UI.elements.room.spectatorsList.appendChild(playerItem);
            }
        });
    },
    
    // Cambia team
    changeTeam: (team) => {
        socket.emit('changeTeam', {
            roomId: UI.state.selectedRoomId,
            team
        });
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
        UI.showScreen('lobby');
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
