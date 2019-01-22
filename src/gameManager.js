const GameRoom = require('./gameRoom'); // ROOM LOGIC
const GameLogic = require('./gameLogic'); // GAME LOGIC

const MAXIMUM_ROOMS = 10; // Maximum rooms
const MAXIMUM_PLAYERS = 4; // Maximum players
const MAXIMUM_TIME_PLAY = 180; // Maximum time play
const TIME_TO_ANSWER = 30;

users = []; // Array User names
rooms = {}; // Rooms
roomStatus = new Array(MAXIMUM_ROOMS); // ROOM STATUS

var GameManager = function (http) {
	activeTimer();
    var io = require('socket.io')(http); // Require socket.io
    var logic = new GameLogic(); // GAME LOGIC

	function refreshWord(word)
	{
		if (typeof(word) == 'undefined')
			return '';
		return word.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
	}
	
	function updateRoomStatus()
	{
		for (let i = 0; i < MAXIMUM_ROOMS; i++) {
			const roomName = 'Room-' + (i + 1);
			const playerCount = typeof (rooms [roomName]) !== 'undefined' 
									? rooms [roomName].length()
									: 0;
			roomStatus[i] = {
				roomName: roomName,
				players: playerCount,
				maxPlayers: MAXIMUM_PLAYERS
			};
		}
	}

    // On client connect.
    io.on('connection', function(socket) {
        // LOGIC
        logic.setupSocket(socket);
        // console.log('A user connected ' + (socket.client.id));
        // Welcome message
        socket.emit('welcome', { 
            msg: 'Welcome to connect game word fight online.'
        });
        // INIT PLAYER
        // Set player name.
        socket.on('setPlayerData', function(data) {
            if (data) 
			{
                var isDuplicateName = false;
				var playerName = refreshWord(data.playerName);
                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    if (u.playerName == playerName) {
                        isDuplicateName = true;    
                        break;
                    }
                }
                if(isDuplicateName) {
                    socket.emit('msgError', { 
                        msg: playerName  + ' username is taken! Try another username.'
                    });
                } else {
                    if (playerName.length < 5 || playerName.length > 18) {
                        socket.emit('msgError', { 
                            msg: playerName  + ' username must longer than 5 character'
                        });
                    } else {
                        socket.player = {
                            playerName: playerName,
                            playerCharacter: parseInt (data.playerCharacter),
							position: '(-2,4,0)'
                        };
                        users.push(socket.player);
                        socket.emit('playerDataSet', { 
                            playerName: socket.player.playerName,
                            playerCharacter: socket.player.playerCharacter,
                        });
                    }
                }
            }
        });
        // Receive beep mesg
        socket.on('beep', function(data) {
			socket.emit('boop');
        })
        // INIT ROOM
        // Get all room status
        socket.on('getRoomsStatus', function() {
			// UPDATE ROOM STATUS
            updateRoomStatus();
			// SEND TO CLIENT
            socket.emit('updateRoomStatus', {
                rooms: roomStatus
            });
        });
        // Join or create room by name. 
        socket.on('joinOrCreateRoom', function(roomJoining) {
            if(roomJoining && socket.player) {
                var roomName = roomJoining.roomName;
                if (typeof(rooms [roomName]) === 'undefined') {
                    rooms [roomName] = new GameRoom();
					rooms [roomName].roomState = 'WAITING_PLAYER';
                }
                rooms [roomName].roomName = roomName;
                rooms [roomName].maximumPlayers = MAXIMUM_PLAYERS;
                if (rooms [roomName].contain (socket) == false) {
                    // console.log (" Room: " + rooms [roomName].length() + " / " + rooms [roomName].roomState);
                    if (rooms [roomName].length() < MAXIMUM_PLAYERS 
						&& rooms [roomName].roomState != 'PLAYING_GAME') {
                        // JOIN
                        rooms [roomName].join (socket);
						socket.emit('joinRoomCompleted', {
							roomName: roomName,
                            msg: "Join room completed."
                        });
						// ALL MEMBERS IN ROOM
                        rooms [roomName].emitAll('newJoinRoom', {
                            roomInfo: rooms [roomName].getInfo()
                        });
                        socket.room = rooms [roomName]; 
                        // console.log ("A player join room. " + roomName + " Room: " + rooms [roomName].length());
						// UPDATE
						updateRoomStatus();
						// SEND TO ALL CLIENT
						io.sockets.emit('updateRoomSize', {
							roomName: rooms [roomName].roomName,
							players: rooms [roomName].length(),
							maxPlayers: MAXIMUM_PLAYERS
						});
                        // START GAME
                        if (rooms [roomName].length() == MAXIMUM_PLAYERS) {
                            // UPDATE INDEX
                            rooms [roomName].setTurnIndex();
							// STATE
							rooms [roomName].roomState = 'PLAYING_GAME';
                            rooms [roomName].roomTimer = MAXIMUM_TIME_PLAY;
                            // EMIT START GAME
                            rooms [roomName].emitAll('startGame', {
                                roomState: rooms [roomName].roomState,
								roomInfo: rooms [roomName].getInfo()
                            });
                        }
						else
						{
							// STATE
							rooms [roomName].roomState = 'WAITING_PLAYER';
						}
                    } else {
                        socket.emit('joinRoomFailed', {
                            msg: "Room is full. Please try again late."
                        });
                    }
                } else {
                    socket.emit('joinRoomFailed', {
                        msg: "You are already join room."
                    });
                }
            }
        });
        // Receive client chat in current room.
        socket.on('sendRoomChat', function(msg) {
            if(msg && socket.room && socket.player) {
				var goodMsg = refreshWord(msg.message);
                socket.room.emitAll('msgChatRoom', {
                    user: socket.player.playerName,
                    message: goodMsg
                });
            }
        });
        // Receive world chat.
        socket.on('sendWorldChat', function(msg) {
            if(msg && socket.player) {
				var goodMsg = refreshWord(msg.message);
                // socket.broadcast.emit => will send the message to all the other clients except the newly created connection
                io.sockets.emit('msgWorldChat', {
                    user: socket.player.playerName,
                    message: goodMsg
                });
            }
        });
        // Receive leave room mesg.
        socket.on('leaveRoom', function() {
            // console.log ('User leave room...' + socket.id);
            // LEAVE ROOM
            leaveRoom(socket);
        });
        // DISCONNECT
        // Disconnect and clear room.
        socket.on('disconnect', function() {
            // console.log ('User disconnect...' + socket.id);
            if (socket.player) {
                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    if (u.playerName == socket.player.playerName) {
                        users.splice(i, 1);  
                        break;
                    }
                }
            }
            // LEAVE ROOM
            leaveRoom(socket);
        });
    });
    
    // LEAVE ROOM
	function leaveRoom(socket)
	{
		if (socket.room) 
		{
			if (socket.room.roomState != 'WAITING_PLAYER')
			{
                socket.room.leave(socket); // ROOM REMOVE SOCKET
                socket.emit ('leaveRoom');
				socket.room.endGame();
			}
			else
			{
                socket.room.leave(socket); // ROOM REMOVE SOCKET
                socket.emit ('leaveRoom');
				if (socket.room.length() > 0)
				{
                    socket.room.emitAll('newLeaveRoom', { roomInfo: socket.room.getInfo() }); // OTHER GET NEW INFO
                    // RENEW INDEX
					socket.room.setTurnIndex();
				}
				else
				{
					socket.room.clearRoom();
					socket.room.roomState = 'END_GAME';
					socket.room = null;
					// var roomName = socket.room.roomName;
					// delete rooms [roomName];
				}
			}
		}
    }
    // INTERVAL TIMER 
    function activeTimer()
    {
        this.roomTimer = setInterval(function() {
            for (let i = 0; i < MAXIMUM_ROOMS; i++) {
                const roomName = 'Room-' + (i + 1);
                if (typeof (rooms [roomName]) !== 'undefined')
                {
                    rooms [roomName].updateTimer();
                }
            }
			// UPDATE ROOM STATUS
            updateRoomStatus();
        }, 1000);
    }
};
// INIT
module.exports = GameManager;