
var GameLogic = function () {

    this.setupSocket = function (socket)
    {
        socket.on("updatePosition", function(data) {
            if (data && socket.player && socket.room) 
            {
				socket.player.position = data.position;
                socket.room.emitAll("moveWithInput", {
                    playerName: socket.player.playerName,
                    x: parseFloat (data.x),
                    y: parseFloat (data.y),
                    side: parseInt (data.side),
                    position: data.position
                });
            }
        });

        socket.on("updateSkill", function(data) {
            if (data && socket.player && socket.room)
            {
                socket.room.emitAll("useSkill", {
                    playerName: socket.player.playerName,
                    skill: 0
                });
            }
        });

    }

}

module.exports = GameLogic;