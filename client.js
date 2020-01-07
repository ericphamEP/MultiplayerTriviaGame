let playerName = "";
let score = 0;
let currentRoom = false;
let socket = null;
let currentQuestion;
let timer;
let timeLeft;

// entering name
document.getElementById("nameButton").addEventListener("click", function () {
    let name = document.getElementById("name");
    if (name.value.length > 10 || name.value.length <= 0) {
        alert("Please enter a name shorter than 10 characters and longer than 0.");
    } else { 
        socket.emit("checkNames",name.value);
    }
});

function enterRooms(nameValid) { // proceed to room menu
    if (nameValid) {
        let name = document.getElementById("name");
        playerName = name.value;
        document.getElementById("welcome").style.display = "none";
        document.getElementById("rooms").style.display = "block";
        document.getElementById("greetings").innerHTML = "Welcome, "+playerName;
        socket.emit("getRooms");
    } else {
        alert("Name is already taken. Please choose another.");
    }
}

function updateRooms(rooms) { // display online rooms
    let enterScreen = document.getElementById("enter");
    enterScreen.innerHTML = "";
    for(let i=0; i<rooms.length; i++) {
        let button = document.createElement("button");
        button.innerHTML = "Room #"+rooms[i];
        button.setAttribute("id",rooms[i]);
        //button.setAttribute("onclick","() => {setRoomInput(button.id)}");
        button.onclick = () => {document.getElementById("inputCode").value = rooms[i];};
        button.setAttribute("class","btn btn-outline-secondary");
        enterScreen.appendChild(button);
    }
}

// joining room
document.getElementById("join").addEventListener("click", function () {
    let code = document.getElementById("inputCode");
    if (code.value.length != 0) {
        socket.emit("searchRooms",code.value); // check if room is valid
    } else {
        alert("Please enter a valid room code.");
    }
});

// create room
document.getElementById("create").addEventListener("click", function () {
    // generate random game code
    let newCode = Math.floor(Math.random() * 100).toString();
    socket.emit("createRoom",newCode);
    document.getElementById("create").disabled = true;
    //socket.emit("searchRooms",newCode); // check if room is valid
});

// send player into game
function sendPlayer(room) {
    console.log("yooo: ",room);
    if (room != false) {
        currentRoom = room;
        // go to main game html
        document.getElementById("rooms").style.display = "none";
        document.getElementById("game").style.display = "block";
        document.getElementById("displayName").innerHTML = playerName;
        document.getElementById("game#").innerHTML = "Game #"+currentRoom;
        document.getElementById("displayScore").innerHTML = "Score: "+score.toString();
        socket.emit("sendingPlayer",[playerName,currentRoom]); // send player info to server
    } else {
        document.getElementById("create").disabled = false;
        alert("An error occured while joining. Please try again.");
    }
}

function checkAnswers() { // check answer
    console.log("clicked???",timeLeft);
    clearInterval(timer);
    let inputs = document.getElementsByName("answer");
    for (let d=0; d<inputs.length; d++) { // check thru each input
        // disable
        inputs[d].disabled = true;
        // check if selected, and if it's right answer
        if (inputs[d].checked && timeLeft != 0) {
            let valid = 'true';
            console.log("correct answer:",currentQuestion["correct_answer"]);
            if (inputs[d].value == currentQuestion["correct_answer"]) {
                score += Math.floor((10*timeLeft)/3); // score based on time taken to answer
                document.getElementById("status").innerHTML = "Correct!";
            } else {
                score -= 50; // -50 points if wrong
                if (score < 0) { // minimum 0 points
                    score = 0;
                }
                document.getElementById("status").innerHTML = "Wrong!";
                valid = 'false';
            }
            console.log(score);
            document.getElementById("displayScore").innerHTML = "Score: "+score.toString();
            socket.emit("answered",[currentRoom, playerName, score, valid]);
        }
    }
    if (timeLeft == 0) { // if not answered
        score -= 50;
        if (score < 0) {
            score = 0;
        }
        document.getElementById("displayScore").innerHTML = "Score: "+score.toString();
        socket.emit("answered",[currentRoom, playerName, score, '0']);
    }
}

// update main game page question (for joining or each question)
// ex. {"category":"Entertainment: Television","type":"boolean","difficulty":"medium","question":"AMC&#039;s &quot;The Walking Dead&quot;, Rick, Carl, Daryl, Morgan, Carol and Maggie were introduced to us in Season 1.","correct_answer":"False","incorrect_answers":["True"]}
function updateGame(question, num) {
    console.log(question);
    // measure count down and check each second if checkmark is checked
    // set timer, stop when input is clicked or time reaches 0
    currentQuestion = question;
    clearInterval(timer);
    timeLeft = 30;
    timer = setInterval(function(){
        timeLeft--;
        document.getElementById("displayTime").innerHTML = timeLeft.toString()+" seconds";
        if (timeLeft <= 0) {
            score -= 50;
            document.getElementById("status").innerHTML = "Not answered!";
            checkAnswers();
        }
    },1000);
    // show score
    document.getElementById("displayScore").innerHTML = "Score: "+score.toString();
    document.getElementById("question#").innerHTML = num.toString()+"/5";
    let questionBox = document.getElementById("questionBox");
    questionBox.innerHTML = "";
    questionBox.innerHTML += "<br>";
    // show question
    let questionText = document.createElement("p");
    questionText.innerHTML = question["question"];
    questionBox.appendChild(questionText);
    questionBox.innerHTML += "<br>";

    // show and randomize answers
    question["incorrect_answers"].push(question["correct_answer"]);
    question["incorrect_answers"].sort(function(a, b){return 0.5 - Math.random()});
    let form = document.createElement("form");
	form.style.marginLeft = "2%";
    for (let i=0; i<question["incorrect_answers"].length; i++) {
        question["incorrect_answers"][i]

        let radio = document.createElement("div");
        radio.className = "radio";
        let label = document.createElement("label");
        let input = document.createElement("input");
        input.type = "radio";
        input.value = question["incorrect_answers"][i];
        input.name = "answer";
        input.setAttribute("onclick","checkAnswers();");
        label.appendChild(input);
        label.innerHTML += " "+question["incorrect_answers"][i];
        radio.appendChild(label);
        form.appendChild(radio);
    }
    questionBox.appendChild(form);
}

// show stats at end of round
function endRound(stats) { // stats = [winner name, [[player1,score1],[player2,score2] ..etc..]]
    timeLeft = 20;
    document.getElementById("status").innerHTML = "Winner: "+stats[0]+"!";
    // reset score
    score = 0;

    // display players in questionBox
    let questionBox = document.getElementById("questionBox");
    questionBox.innerHTML = "";
    for (let i=0; i<stats[1].length; i++) {
        let playerText = document.createElement("h3");
        playerText.innerHTML = stats[1][i][0]+" - "+stats[1][i][1].toString();
        questionBox.appendChild(playerText);
    }
    // set timer before next round starts
    timer = setInterval(function(){
        timeLeft--;
        document.getElementById("displayTime").innerHTML = timeLeft.toString()+" seconds";
        if (timeLeft == 0) {
            clearInterval(timer);
        }
    },1000);
}

// sending chat
document.getElementById("chatButton").addEventListener("click", function () {
    let chatText = document.getElementById("talk");
    socket.emit("newMessage",[playerName,currentRoom,chatText.value]);
    chatText.value = "";
    // when u load chat or send a new chat message, scroll down
    let chatBox = document.getElementById("chat");
    chatBox.scrollTop = chatBox.scrollHeight;
});

// receiving chat
function getChat(message) {
    console.log("gettin message",message);
    let chatBox = document.getElementById("chat");
    let newChat = document.createElement("p");
    newChat.innerHTML = message;
    chatBox.appendChild(newChat);
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.onload = setupSocket();

function setupSocket() {
  if(socket == null){
    socket = io();
    socket.on("isValidRoom", sendPlayer);
    socket.on("onlineRooms",updateRooms);
    socket.on("nameValid", enterRooms);
    socket.on("nextQ", updateGame);
    socket.on("endScreen", endRound);
    socket.on("getScore", () => {socket.emit("giveScore",[playerName,score,currentRoom]);});
    socket.on("sendMessage",getChat);
  }
}