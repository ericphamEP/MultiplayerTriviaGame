Eric Pham, 101104095, COMP 2406 - Assignment 2: Multiplayer Trivia
----------------------------
My kahoot ripoff that'll totally be good competition for it.

Instructions:
-------------
Starting server:
- Navigate to directory of the files and run in the command line: node server.js
Playing game:
- go to localhost:3000 on a browser (repeat for each client, because this game supports multiple people)
- Enter name, click button
- Name cannot be the same as any current or past player
- Input room code, or click available room code to fill in the input box, and click join
- Create a new room option (When the server is started, there is no starting game/room so you must create new game/room)
- When in a game, answer questions within time limit
- Player status shown in chat ("x has anwered correctly!", "x did not answer!")
- Show all player stats at the end (only show other player's scores at end of round to make winner reveal more fun)
- Can exit at any time

Addons:
- multiple games/rooms that can run at same time (and be created at any time)
- seperate chat in each game/room (chat also has a system host that tells players the status of the game and players)
- time limit for each question (30 seconds, even when joining late)
- scoring system based on time limit (Math.floor((10*timeLeft)/3) points for correct answer)

Score system:
If correct, add Math.floor((10*timeLeft)/3)
If wrong or no answer, -50 points
Minimum points of 0
