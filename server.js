const http = require('http');
const fs = require('fs');
const request = require('request');

const options = {
	url: 'https://opentdb.com/api.php?amount=5',
	method: 'GET',
	headers: {
		'Accept': 'application/json',
		'Accept-Charset': 'utf-8'
	}
};

let rooms = {};
// example room-> xxx: [{playerName:score,playerName1: score1, etc..}, [questions], currentQuestionindex, players answered]
let names = [];
let timer;

function removePlayer(playerInfo) {
    delete rooms[playerInfo[1]][0][playerInfo[0]];
}

function searchRooms(code) {
    if (code in rooms) {
        console.log(code+" exists as a room");
        return code;
    }
    console.log(code+" was false");
    return false;
}

function answered(playerInfo) { // playerInfo => [code, playerName, score, valid]
    // add one count to correct room so u know how many people answered and can move on
    console.log("Answered",playerInfo);
    console.log(rooms);
    rooms[playerInfo[0]][3] += 1; // increment # of players answered
    if (playerInfo[1] in rooms[playerInfo[0]][0]) { // if player still in game
        rooms[playerInfo[0]][0][playerInfo[1]] = playerInfo[2]; // update score
    }
    if (playerInfo[3] == 'true') {
        io.in(playerInfo[0]).emit("sendMessage",playerInfo[1]+" has answered correctly!");
    } else if (playerInfo[3] == 'false') {
        io.in(playerInfo[0]).emit("sendMessage",playerInfo[1]+" has answered incorrectly!");
    } else {
        io.in(playerInfo[0]).emit("sendMessage",playerInfo[1]+" didn't answer!");
    }
    // check if that room has been answered fully
    if (rooms[playerInfo[0]][3] >= Object.keys(rooms[playerInfo[0]][0]).length) {
        console.log("go forward");
        rooms[playerInfo[0]][3] = 0; // reset player answer count
        rooms[playerInfo[0]][2] += 1; // next question
        // check if last question
        if (rooms[playerInfo[0]][2] >= 5) {
            // display winner to all clients in room
            // sort players before emitted
            let playerList = [];
            for (let player in rooms[playerInfo[0]][0]) {
                playerList.push([player,rooms[playerInfo[0]][0][player]]);
            }
            playerList.sort(function(a, b){return b[1] - a[1]});
            console.log(playerList);
            io.in(playerInfo[0]).emit("endScreen",[playerList[0][0],playerList]); // display winners to them
            io.in(playerInfo[0]).emit("sendMessage","System: Next round will begin shortly...");
            let timeLeft = 21;
            timer = setInterval(function(){
                timeLeft--;
                if (timeLeft == 0) {
                    if (playerInfo[0] in rooms) { // in case all players left and room is gone
                        // new round, new questions
                        rooms[playerInfo[0]][3] = 0;
                        rooms[playerInfo[0]][2] = 0;

                        request(options, function(err, res, body) {
                            //let newQuestions = JSON.parse(body);
                            //console.log(newQuestions["results"]);
                            let results = JSON.parse(body);
                            if (results["response_code"] == 0) {
                                rooms[playerInfo[0]][1] = results["results"];
                                console.log(rooms[playerInfo[0]][1]);
                                io.in(playerInfo[0]).emit("nextQ",rooms[playerInfo[0]][1][rooms[playerInfo[0]][2]],rooms[playerInfo[0]][2]+1); // start new game
                                console.log(rooms);
                                clearInterval(timer);
                            }
                        });
                    }
                }
            },1000);
        } else { // send next question to clients in room
            console.log(rooms);
            io.in(playerInfo[0]).emit("sendMessage","System: Next question. Waiting for players to answer...");
            io.in(playerInfo[0]).emit("nextQ",rooms[playerInfo[0]][1][rooms[playerInfo[0]][2]],rooms[playerInfo[0]][2]+1); // next question
        }
    }
}

//Helper function for sending 404 message
function send404(response) {
	response.writeHead(404, { 'Content-Type': 'text/plain' });
	response.write('Error 404: Resource not found.');
	response.end();
}

function respondMainPage(res) { // load html
    fs.readFile('trivia.html', function(err, contents) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(contents);
        res.end();
    });
}

const server = http.createServer(function (req, res) {
	if (req.method == 'GET') {
		//Add routes here to handle GET requests
        if (req.url == '/'){
            //Handle response here for the resource "/"
            respondMainPage(res);
        } else if(req.url == "/client.js"){
			res.writeHead(200, { 'content-type': 'application/javascript' });
			//pipe method is passing the data read from
			//the file into the response object
			fs.createReadStream("./client.js").pipe(res);
		} else {
            send404(res);
        }
	} else{ //if not a GET request, send 404 for now by default
		send404(res);
	}
});

server.listen(3000);
console.log('server running on port 3000');

const io = require("socket.io")(server);

io.on('connection', socket =>{
    socket.playerInfo = []; // example: [playerName, roomCode]
    console.log("A connection was made.");

    //add events for that socket

	socket.on('disconnect', () => { // if disconnect
        console.log(socket.playerInfo);
        if (socket.playerInfo.length != 0) { // if during a game
            console.log(socket.playerInfo[0]+" left.");
            removePlayer(socket.playerInfo); // remove from game
            io.in(socket.playerInfo[1]).emit("sendMessage",socket.playerInfo[0]+' has left the game.');
            if (Object.keys(rooms[socket.playerInfo[1]][0]).length == 0) { // if last player, remove room
                delete rooms[socket.playerInfo[1]];
            } else if (Object.keys(rooms[socket.playerInfo[1]][0]).length >= 1 && rooms[socket.playerInfo[1]][2] < 5) { // resume game if during question
                answered([socket.playerInfo[1],socket.playerInfo[0],0,'0']); // [code, playerName, score, valid]
            }
        } else {
            console.log("someone left")
        }
    });
    
    socket.on('searchRooms', code => {
        socket.emit("isValidRoom",searchRooms(code));
    });

    socket.on('createRoom', code => {
        // each room: [{players:scores},[questions], question #, players answered]
        if (code in rooms) {
            socket.emit("isValidRoom",false);
        } else {
            request(options, function(err, res, body) {
                let results = JSON.parse(body);
                if (results["response_code"] == 0) {
                    rooms[code] = [{}, results["results"], 0, 0];
                    console.log(rooms[code][1]);
                    if (searchRooms(code)) {
                        socket.emit("isValidRoom",code);
                    } else {
                        socket.emit("isValidRoom",false);
                    }
                }
            });
        }
        
    });

    socket.on("sendingPlayer", playerInfo => { // playerInfo => [playername, room]
        // add player and set score
        rooms[playerInfo[1]][0][playerInfo[0]] = 0;
        socket.playerInfo = playerInfo;
        socket.join(playerInfo[1]); // joining specific room to be emitted questions when they happen
        // check if last question
        if (rooms[playerInfo[1]][2] >= 5) {
            // round starting soon
            let playerList = [];
            for (let player in rooms[playerInfo[1]][0]) {
                playerList.push([player,rooms[playerInfo[1]][0][player]]);
            }
            playerList.sort(function(a, b){return b[1] - a[1]});
            socket.emit("endScreen",[playerList[0][0],playerList]); // display winners to them
        } else {
            socket.emit("nextQ",rooms[playerInfo[1]][1][rooms[playerInfo[1]][2]],rooms[playerInfo[1]][2]+1); // send question and question number
        }
        io.in(playerInfo[1]).emit("sendMessage",playerInfo[0]+' has joined the game!');
    });

    socket.on("getRooms", () => { // for showing available rooms to user
        socket.emit("onlineRooms",Object.keys(rooms));
    });

    socket.on("answered", playerInfo => { // playerInfo => [code, playerName, score, valid]
        answered(playerInfo);
    });

    socket.on("newMessage", playerMessage => { // playerMessage -> [playerName, playerRoom, textMessage]
        // add player name to the message text it self
        // sending to all clients in player's room, including sender
        console.log(playerMessage);
        io.in(playerMessage[1]).emit("sendMessage",playerMessage[0]+': '+playerMessage[2]);
    });

    socket.on("checkNames", name => { // for showing available rooms to user
        if (names.find(function(n) {return n == name}) == undefined) {
            console.log("valid name",names);
            names.push(name);
            socket.emit("nameValid",true);
        } else {
            console.log("invalid name",names);
            socket.emit("nameValid",false);
        }
    });
	
	
});