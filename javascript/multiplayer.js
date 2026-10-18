/*
 * multiplayer.js
 *
 * Подключение браузера к Node.js + Socket.IO серверу.
 *
 * Перед подключением:
 * 1. Укажи URL своего backend в MULTIPLAYER_SERVER_URL.
 * 2. Подключи Socket.IO client в index.html.
 */

const MULTIPLAYER_SERVER_URL =
    window.MULTIPLAYER_SERVER_URL ||
    "https://YOUR-SERVER-URL.example";

let multiplayerSocket = null;
let multiplayerRoomCode = null;
let multiplayerActive = false;

function connectMultiplayer() {
    if (typeof io !== "function") {
        console.error("Socket.IO client не подключён.");
        return;
    }

    if (
        multiplayerSocket &&
        multiplayerSocket.connected
    ) {
        return;
    }

    multiplayerSocket = io(
        MULTIPLAYER_SERVER_URL,
        {
            transports: ["websocket", "polling"]
        }
    );

    multiplayerSocket.on("connect", () => {
        console.log("Multiplayer connected:", multiplayerSocket.id);
        setMultiplayerStatus("Подключено к серверу.");
    });

    multiplayerSocket.on("connect_error", error => {
        console.error("Multiplayer connection error:", error);
        setMultiplayerStatus("Не удалось подключиться к серверу.");
    });

    multiplayerSocket.on("room-state", state => {
        multiplayerRoomCode = state.roomCode;

        updateMultiplayerUI(state);

        if (
            state.playerCount === 2 &&
            state.opponentReady &&
            !state.ready
        ) {
            setMultiplayerStatus(
                "Соперник готов. Разместите флот и нажмите «Готов»."
            );
        }

        if (
            state.ready &&
            !state.opponentReady
        ) {
            setMultiplayerStatus(
                "Ваш флот готов. Ждём соперника."
            );
        }
    });

    multiplayerSocket.on("game-started", data => {
        multiplayerActive = true;

        if (typeof setupPanel !== "undefined") {
            setupPanel.classList.add("hidden");
        }

        gameState = data.firstPlayer
            ? "multiplayer-player"
            : "multiplayer-wait";

        statusElement.textContent =
            data.firstPlayer
                ? "Мультиплеер: ваш ход."
                : "Мультиплеер: ход соперника.";

        renderPlayerField();
        renderEnemyField();
    });

    multiplayerSocket.on("incoming-shot", data => {
        /*
         * Соперник выстрелил в наше поле.
         */
        if (
            data.result === "miss"
        ) {
            playerField.grid[data.y][data.x] = CELL_MISS;
        } else {
            playerField.grid[data.y][data.x] = CELL_HIT;
        }

        renderPlayerField();

        if (
            gameState !== "gameover"
        ) {
            gameState = "multiplayer-player";

            statusElement.textContent =
                data.result === "miss"
                    ? "Соперник промахнулся. Ваш ход."
                    : data.killed
                        ? "Соперник уничтожил корабль. Он стреляет снова."
                        : "Соперник попал. Он стреляет снова.";
        }
    });

    multiplayerSocket.on("shot-result", data => {
        /*
         * Результат нашего выстрела.
         */

        if (
            data.result === "miss"
        ) {
            enemyField.grid[data.y][data.x] = CELL_MISS;
        } else {
            enemyField.grid[data.y][data.x] = CELL_HIT;
        }

        renderEnemyField();

        if (
            data.gameOver
        ) {
            gameState = "gameover";

            statusElement.textContent =
                "🏆 Победа!";

            resultMessage.textContent =
                "🏆 Вы уничтожили весь флот соперника!";

            resultMessage.classList.remove("hidden");

            return;
        }

        if (
            data.result === "miss"
        ) {
            gameState = "multiplayer-wait";

            statusElement.textContent =
                "Мимо. Ход соперника.";

        } else if (
            data.killed
        ) {
            gameState = "multiplayer-player";

            statusElement.textContent =
                "Корабль уничтожен! Стреляйте ещё.";

        } else {
            gameState = "multiplayer-player";

            statusElement.textContent =
                "Попадание! Стреляйте ещё.";
        }
    });

    multiplayerSocket.on("opponent-left", () => {
        multiplayerActive = false;
        gameState = "setup";

        setMultiplayerStatus(
            "Соперник вышел из игры."
        );

        statusElement.textContent =
            "Соперник отключился.";

        renderPlayerField();
        renderEnemyField();
    });

    multiplayerSocket.on("game-over", data => {
        multiplayerActive = false;
        gameState = "gameover";

        if (data.winnerIsYou) {
            statusElement.textContent = "🏆 Победа!";
            resultMessage.textContent =
                "🏆 Вы уничтожили весь флот соперника!";
        } else {
            statusElement.textContent = "💀 Поражение!";
            resultMessage.textContent =
                "💀 Соперник уничтожил ваш флот.";
        }

        resultMessage.classList.remove("hidden");
        renderPlayerField();
        renderEnemyField();
    });
}


function createMultiplayerRoom() {
    connectMultiplayer();

    const waitForConnection = () => {
        if (
            !multiplayerSocket ||
            !multiplayerSocket.connected
        ) {
            setTimeout(
                waitForConnection,
                100
            );
            return;
        }

        multiplayerSocket.emit(
            "create-room",
            response => {
                if (!response.ok) {
                    setMultiplayerStatus(
                        response.error
                    );
                    return;
                }

                multiplayerRoomCode =
                    response.roomCode;

                setMultiplayerStatus(
                    `Комната создана. Код: ${response.roomCode}`
                );

                showRoomCode(
                    response.roomCode
                );
            }
        );
    };

    waitForConnection();
}


function joinMultiplayerRoom() {
    connectMultiplayer();

    const input =
        document.getElementById(
            "room-code-input"
        );

    if (!input) {
        return;
    }

    const roomCode =
        input.value
            .trim()
            .toUpperCase();

    if (
        roomCode.length !== 5
    ) {
        setMultiplayerStatus(
            "Введите код из 5 символов."
        );

        return;
    }

    const waitForConnection = () => {

        if (
            !multiplayerSocket ||
            !multiplayerSocket.connected
        ) {

            setTimeout(
                waitForConnection,
                100
            );

            return;
        }

        multiplayerSocket.emit(
            "join-room",
            {
                roomCode
            },
            response => {

                if (!response.ok) {

                    setMultiplayerStatus(
                        response.error
                    );

                    return;
                }

                multiplayerRoomCode =
                    response.roomCode;

                setMultiplayerStatus(
                    `Вы вошли в комнату ${response.roomCode}.`
                );

                showRoomCode(
                    response.roomCode
                );
            }
        );
    };

    waitForConnection();
}


function multiplayerReady() {

    if (
        !multiplayerSocket ||
        !multiplayerSocket.connected
    ) {
        setMultiplayerStatus(
            "Сначала подключитесь к серверу."
        );

        return;
    }


    if (
        !playerField ||
        !playerField.grid
    ) {
        return;
    }


    multiplayerSocket.emit(
        "player-ready",
        {
            grid:
                playerField.grid.map(
                    row =>
                        row.map(
                            value =>
                                value === CELL_SHIP
                                    ? 1
                                    : 0
                        )
                )
        },
        response => {

            if (!response.ok) {

                setMultiplayerStatus(
                    response.error
                );

                return;
            }

            setMultiplayerStatus(
                "Флот принят сервером. Ждём соперника."
            );
        }
    );
}


function multiplayerShoot(x, y) {

    if (
        gameState !==
        "multiplayer-player"
    ) {
        return;
    }


    if (
        !multiplayerSocket ||
        !multiplayerSocket.connected
    ) {
        setMultiplayerStatus(
            "Соединение с сервером потеряно."
        );

        return;
    }


    multiplayerSocket.emit(
        "shoot",
        {
            x,
            y
        },
        response => {

            if (
                !response.ok
            ) {

                setMultiplayerStatus(
                    response.error
                );
            }
        }
    );
}


function leaveMultiplayerRoom() {

    if (
        multiplayerSocket &&
        multiplayerSocket.connected
    ) {

        multiplayerSocket.emit(
            "leave-room"
        );
    }


    multiplayerRoomCode = null;

    multiplayerActive = false;
}


function setMultiplayerStatus(text) {

    const element =
        document.getElementById(
            "multiplayer-status"
        );

    if (element) {
        element.textContent = text;
    }
}


function showRoomCode(code) {

    const element =
        document.getElementById(
            "room-code-display"
        );

    if (element) {
        element.textContent =
            `Код комнаты: ${code}`;
    }
}


function updateMultiplayerUI(state) {

    const players =
        document.getElementById(
            "players-count"
        );

    if (players) {
        players.textContent =
            `${state.playerCount}/2`;
    }

    const turn =
        document.getElementById(
            "multiplayer-turn"
        );

    if (turn) {

        if (!state.started) {

            turn.textContent =
                state.ready
                    ? "Ждём соперника..."
                    : "Подготовьте флот.";

        } else {

            turn.textContent =
                state.myTurn
                    ? "Ваш ход"
                    : "Ход соперника";
        }
    }
}
