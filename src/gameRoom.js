
const DELTA_TIMER = 1;

function GameRoom() {
    // Room data.
    this.roomName = '';
    this.roomTimer = 300;

	this.roomState = 'WAITING_PLAYER'; // WAITING_PLAYER | PLAYING_GAME | END_GAME
    // All players 
    this.players = [];
    this.maximumPlayers = 4;

    // UPDATE PER SECONDS.
    this.updateTimer = function() {
		if (this.roomState == 'PLAYING_GAME')
		{
			this.roomTimer -= DELTA_TIMER;
			if (this.roomTimer <= 0)
			{
				this.roomState = 'END_GAME';
				this.endGame();
			} 
			else
			{
				// TIMER TO ROOM
				this.emitAll ('countDownTimer', { roomTimer: this.roomTimer });
			}
		}
    }

    // Get current turn.
    this.currentTurn = function() {
        return this.turnLists.length % this.maximumPlayers; 
    }

    // GET CURRENT PLAYER
    this.currentPlayer = function() {
        var index = this.currentTurn();
        if (index > -1)
        {
            return this.players[index];
        }
        return null;
    }
	
	// END GAME
	this.endGame = function() {
		// RESULT
		this.emitAll ('endGame');
        this.players = [];
        this.turnLists = [];
        this.roomState = 'WAITING_PLAYER';
    }

    // Join room and set turn index for player
    this.join = function (player) {
        if (this.players.indexOf (player) == -1) {
            this.players.push (player);
        }
    };
	
	// TURN INDEX
	this.setTurnIndex = function() {
		for (let i = 0; i < this.players.length; i++) {
			const ply = this.players[i];
			ply.game = {
				turnIndex: i
			};
			ply.emit('turnIndexSet', {
				turnIndex: i
			});
		}
	}

    // Clear room
    this.clearRoom = function() {
        this.emitAll ('clearRoom', {
            msg: "Room is empty or player disconnected."
        });
        this.players = [];
        this.roomState = 'WAITING_PLAYER';
		this.roomTimer = 600;
    };
    
    // Leave room 
    this.leave = function(player) {
        var index = this.players.indexOf (player);
        if (index > -1) {
            this.players.splice (index, 1);
            // console.log ('User LEAVE ROOM...' + player.player);
        }
    };
    
    // Send all mesg for players in room.
    this.emitAll = function (name, obj) {
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            player.emit(name, obj);
        }
    };

    // Send all mesg for players in room except one.
    this.emitAllExcept = function (socket, name, value) {
        var index = this.players.indexOf (socket);
        // console.log ('emitAllExcept ' + index);
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            // IS SOCKET
            if (i !== index)
            {
                if (value)
                    player.emit(name, value);
                else
                    player.emit(name);
            }
        }
    };

    // Get rom info.
    this.getInfo = function() {
        var playerInfoes = [];
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            playerInfoes.push (player.player);
        }
        return {
            roomName: this.roomName,
            players: playerInfoes
        };
    }
	
	// Each client contain in room.
    this.each = function (callback) {
		for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
			if (callback)
			{
				callback(player);
			}
        }
    };

    // If client contain in room.
    this.contain = function (player) {
        return this.players.indexOf (player) > -1;
    };
    
    // Get amount of players in room.
    this.length  = function () {
        return this.players.length;
    };
};
// INIT
module.exports = GameRoom;