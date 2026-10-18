const playerField =
    new Battlefield();

const enemyField =
    new Battlefield();


/* ==========================================
   DOM
========================================== */

const playerContainer =
    document.getElementById("player-field");

const enemyContainer =
    document.getElementById("enemy-field");

const statusElement =
    document.getElementById("game-status");

const setupPanel =
    document.getElementById("setup-panel");

const rotateBtn =
    document.getElementById("rotate-btn");

const randomBtn =
    document.getElementById("random-btn");

const startBtn =
    document.getElementById("start-btn");

const newGameBtn =
    document.getElementById("new-game-btn");

const resultMessage =
    document.getElementById("result-message");

const modePanel =
    document.getElementById("mode-panel");

const aiModeBtn =
    document.getElementById("ai-mode-btn");

const multiplayerModeBtn =
    document.getElementById("multiplayer-mode-btn");

const multiplayerPanel =
    document.getElementById("multiplayer-panel");

const createRoomBtn =
    document.getElementById("create-room-btn");

const joinRoomBtn =
    document.getElementById("join-room-btn");

const readyBtn =
    document.getElementById("multiplayer-ready-btn");

const leaveRoomBtn =
    document.getElementById("leave-room-btn");

const roomCodeInput =
    document.getElementById("room-code-input");


/* ==========================================
   СОСТОЯНИЕ ИГРЫ
========================================== */

let gameState = "setup";

let gameMode = "ai";

let playerDirection = "H";

let selectedShipIndex = 0;

let playerShipsPlaced = [];


/* ==========================================
   СОСТОЯНИЕ ИИ
========================================== */

let aiAvailableShots = [];

let aiHits = [];

let aiDirection = null;

let aiSearchDirection = 1;

let aiMode = "HUNT";


/* ==========================================
   СОСТОЯНИЕ МУЛЬТИПЛЕЕРА
========================================== */

let multiplayerSocket = null;

let multiplayerRoomCode = null;

let multiplayerConnected = false;

let multiplayerActive = false;

let multiplayerShotPending = false;


/* ==========================================
   URL СЕРВЕРА
========================================== */

const MULTIPLAYER_SERVER_URL =
    window.MULTIPLAYER_SERVER_URL ||
    "https://YOUR-SERVER-URL.example";


/* ==========================================
   РЕЖИМЫ
========================================== */

function selectGameMode(mode) {

    if (
        gameState !== "setup" &&
        gameState !== "gameover"
    ) {
        return;
    }

    gameMode = mode;

    if (mode === "ai") {

        multiplayerPanel.style.display = "none";

        modePanel.style.display = "block";

        statusElement.textContent =
            "Разместите свои корабли.";

    } else {

        multiplayerPanel.style.display = "block";

        statusElement.textContent =
            "Создайте комнату или войдите по коду.";
    }
}


aiModeBtn.addEventListener(
    "click",
    () => {

        selectGameMode("ai");

        resetSetup();
    }
);


multiplayerModeBtn.addEventListener(
    "click",
    () => {

        selectGameMode("multiplayer");

        resetSetup();
    }
);


/* ==========================================
   СЛУЧАЙНАЯ РАССТАНОВКА ИГРОКА
========================================== */

function randomizePlayerFleet() {

    playerField.generateRandomFleet();

    playerShipsPlaced =
        [...SHIP_SIZES];

    selectedShipIndex =
        SHIP_SIZES.length;

    startBtn.disabled =
        false;

    statusElement.textContent =
        gameMode === "multiplayer"
            ? "Флот готов. Нажмите «Готов»."
            : "Флот готов. Можно начинать игру.";

    renderPlayerField();
}


/* ==========================================
   ПОДГОТОВКА / СБРОС
========================================== */

function resetSetup() {

    playerField.reset();

    enemyField.reset();

    selectedShipIndex = 0;

    playerShipsPlaced = [];

    playerDirection = "H";

    gameState = "setup";

    multiplayerShotPending = false;

    startBtn.disabled = true;

    setupPanel.classList.remove("hidden");

    resultMessage.classList.add("hidden");

    renderPlayerField();

    renderEnemyField();

    if (gameMode === "ai") {

        statusElement.textContent =
            "Разместите свои корабли.";

    } else {

        statusElement.textContent =
            "Создайте комнату или войдите по коду.";
    }
}


/* ==========================================
   РУЧНАЯ УСТАНОВКА КОРАБЛЕЙ
========================================== */

function tryPlacePlayerShip(x, y) {

    if (
        selectedShipIndex >=
        SHIP_SIZES.length
    ) {
        return;
    }

    const size =
        SHIP_SIZES[selectedShipIndex];

    const placed =
        playerField.placeShip(
            x,
            y,
            size,
            playerDirection
        );

    if (!placed) {

        statusElement.textContent =
            "Сюда поставить корабль нельзя.";

        return;
    }

    playerShipsPlaced.push(size);

    selectedShipIndex++;

    if (
        selectedShipIndex >=
        SHIP_SIZES.length
    ) {

        startBtn.disabled = false;

        statusElement.textContent =
            gameMode === "multiplayer"
                ? "Все корабли размещены. Нажмите «Готов»."
                : "Все корабли размещены. Начинайте игру.";

    } else {

        statusElement.textContent =
            `Разместите корабль длиной ${
                SHIP_SIZES[selectedShipIndex]
            }.`;
    }

    renderPlayerField();
}


/* ==========================================
   ПОВОРОТ
========================================== */

rotateBtn.addEventListener(
    "click",
    () => {

        if (
            gameState !== "setup"
        ) {
            return;
        }

        playerDirection =
            playerDirection === "H"
                ? "V"
                : "H";

        statusElement.textContent =
            `Направление: ${
                playerDirection === "H"
                    ? "горизонтально"
                    : "вертикально"
            }`;
    }
);


/* ==========================================
   СЛУЧАЙНАЯ РАССТАНОВКА
========================================== */

randomBtn.addEventListener(
    "click",
    () => {

        if (
            gameState !== "setup"
        ) {
            return;
        }

        randomizePlayerFleet();
    }
);


/* ==========================================
   ОТРИСОВКА
========================================== */

function renderPlayerField() {

    renderField(
        playerContainer,
        playerField,
        true
    );
}


function renderEnemyField() {

    renderField(
        enemyContainer,
        enemyField,
        false
    );
}


function renderField(
    container,
    battlefield,
    showShips
) {

    container.innerHTML = "";

    for (
        let y = 0;
        y < FIELD_SIZE;
        y++
    ) {

        for (
            let x = 0;
            x < FIELD_SIZE;
            x++
        ) {

            const cell =
                document.createElement("div");

            cell.classList.add("cell");

            const state =
                battlefield.grid[y][x];

            if (
                state === CELL_SHIP &&
                showShips
            ) {

                cell.classList.add("ship");
            }

            if (
                state === CELL_MISS
            ) {

                cell.classList.add("miss");
            }

            if (
                state === CELL_HIT
            ) {

                cell.classList.add("hit");
            }

            cell.dataset.x = x;
            cell.dataset.y = y;

            if (
                container === playerContainer
            ) {

                cell.addEventListener(
                    "click",
                    () =>
                        handlePlayerCellClick(
                            x,
                            y
                        )
                );

            } else {

                cell.addEventListener(
                    "click",
                    () =>
                        handlePlayerShot(
                            x,
                            y
                        )
                );
            }

            container.appendChild(cell);
        }
    }
}


/* ==========================================
   ИГРОК СТРЕЛЯЕТ
========================================== */

function handlePlayerShot(x, y) {

    /*
     * В мультиплеере решение о выстреле
     * принимает сервер.
     */

    if (
        gameMode === "multiplayer"
    ) {

        multiplayerShoot(x, y);

        return;
    }


    /*
     * Обычная игра против ИИ.
     */

    if (
        gameState !== "player"
    ) {
        return;
    }


    const result =
        enemyField.receiveShot(
            x,
            y
        );


    if (
        result.result ===
        "already_shot"
    ) {
        return;
    }


    if (
        result.result ===
        "invalid"
    ) {
        return;
    }


    renderEnemyField();


    if (
        result.result === "miss"
    ) {

        statusElement.textContent =
            "Мимо! ИИ готовится стрелять.";

        gameState = "ai";

        setTimeout(
            aiTurn,
            getRandomAiDelay()
        );

        return;
    }


    if (
        result.result === "hit"
    ) {

        statusElement.textContent =
            "Попадание! Стреляйте ещё.";

        return;
    }


    if (
        result.result === "killed"
    ) {

        statusElement.textContent =
            "Корабль уничтожен! Стреляйте ещё.";

        if (
            enemyField.allShipsKilled()
        ) {

            endGame(true);

            return;
        }
    }
}


/* ==========================================
   ЗАДЕРЖКА ИИ
========================================== */

function getRandomAiDelay() {

    const minDelay = 700;

    const maxDelay = 1600;

    return Math.floor(
        Math.random() *
        (
            maxDelay -
            minDelay +
            1
        )
    ) + minDelay;
}


/* ==========================================
   ПОДГОТОВКА ИИ
========================================== */

function prepareAi() {

    aiAvailableShots = [];

    aiHits = [];

    aiDirection = null;

    aiSearchDirection = 1;

    aiMode = "HUNT";


    for (
        let y = 0;
        y < FIELD_SIZE;
        y++
    ) {

        for (
            let x = 0;
            x < FIELD_SIZE;
            x++
        ) {

            aiAvailableShots.push({
                x,
                y
            });
        }
    }
}


/* ==========================================
   ПРОВЕРКА КЛЕТКИ ДЛЯ ИИ
========================================== */

function isAiCellAvailable(x, y) {

    if (
        !playerField.isValidCoords(
            x,
            y
        )
    ) {

        return false;
    }

    const state =
        playerField.grid[y][x];

    return (
        state === CELL_EMPTY ||
        state === CELL_SHIP
    );
}


/* ==========================================
   УДАЛЕНИЕ КЛЕТКИ ИЗ ДОСТУПНЫХ
========================================== */

function removeAiAvailableShot(
    x,
    y
) {

    aiAvailableShots =
        aiAvailableShots.filter(
            cell =>
                cell.x !== x ||
                cell.y !== y
        );
}


/* ==========================================
   СЛУЧАЙНЫЙ ВЫСТРЕЛ ИИ
========================================== */

function getRandomAiShot() {

    while (
        aiAvailableShots.length > 0
    ) {

        const index =
            Math.floor(
                Math.random() *
                aiAvailableShots.length
            );

        const shot =
            aiAvailableShots.splice(
                index,
                1
            )[0];

        if (
            isAiCellAvailable(
                shot.x,
                shot.y
            )
        ) {

            return shot;
        }
    }

    return null;
}


/* ==========================================
   ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ КОРАБЛЯ
========================================== */

function determineAiDirection() {

    if (
        aiHits.length < 2
    ) {

        return null;
    }

    const first =
        aiHits[0];

    const second =
        aiHits[1];

    if (
        first.y === second.y
    ) {

        return "H";
    }

    if (
        first.x === second.x
    ) {

        return "V";
    }

    return null;
}


/* ==========================================
   СОСЕДИ ПОСЛЕ ПЕРВОГО ПОПАДАНИЯ
========================================== */

function getFirstHitTargets() {

    if (
        aiHits.length !== 1
    ) {

        return [];
    }

    const hit =
        aiHits[0];

    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    const targets = [];

    for (
        const [dx, dy]
        of directions
    ) {

        const x =
            hit.x + dx;

        const y =
            hit.y + dy;

        if (
            isAiCellAvailable(
                x,
                y
            )
        ) {

            targets.push({
                x,
                y
            });
        }
    }

    return targets;
}


/* ==========================================
   ВЫСТРЕЛ ПО ЛИНИИ КОРАБЛЯ
========================================== */

function getDirectionalShot() {

    if (
        !aiDirection ||
        aiHits.length < 2
    ) {

        return null;
    }

    const sortedHits =
        [...aiHits].sort(
            (a, b) => {

                if (
                    aiDirection === "H"
                ) {

                    return a.x - b.x;
                }

                return a.y - b.y;
            }
        );

    const first =
        sortedHits[0];

    const last =
        sortedHits[
            sortedHits.length - 1
        ];

    let target = null;


    if (
        aiDirection === "H"
    ) {

        if (
            aiSearchDirection === 1
        ) {

            target = {
                x: last.x + 1,
                y: last.y
            };

        } else {

            target = {
                x: first.x - 1,
                y: first.y
            };
        }

    } else {

        if (
            aiSearchDirection === 1
        ) {

            target = {
                x: last.x,
                y: last.y + 1
            };

        } else {

            target = {
                x: first.x,
                y: first.y - 1
            };
        }
    }


    if (
        target &&
        isAiCellAvailable(
            target.x,
            target.y
        )
    ) {

        removeAiAvailableShot(
            target.x,
            target.y
        );

        return target;
    }


    aiSearchDirection *= -1;


    if (
        aiDirection === "H"
    ) {

        if (
            aiSearchDirection === 1
        ) {

            target = {
                x: last.x + 1,
                y: last.y
            };

        } else {

            target = {
                x: first.x - 1,
                y: first.y
            };
        }

    } else {

        if (
            aiSearchDirection === 1
        ) {

            target = {
                x: last.x,
                y: last.y + 1
            };

        } else {

            target = {
                x: first.x,
                y: first.y - 1
            };
        }
    }


    if (
        target &&
        isAiCellAvailable(
            target.x,
            target.y
        )
    ) {

        removeAiAvailableShot(
            target.x,
            target.y
        );

        return target;
    }


    return null;
}


/* ==========================================
   ВЫБОР ВЫСТРЕЛА ИИ
========================================== */

function chooseAiShot() {

    if (
        aiMode === "TARGET" &&
        aiDirection
    ) {

        const directionalShot =
            getDirectionalShot();

        if (directionalShot) {
            return directionalShot;
        }
    }


    if (
        aiMode === "TARGET" &&
        aiHits.length === 1
    ) {

        const targets =
            getFirstHitTargets();

        if (
            targets.length > 0
        ) {

            const index =
                Math.floor(
                    Math.random() *
                    targets.length
                );

            const shot =
                targets[index];

            removeAiAvailableShot(
                shot.x,
                shot.y
            );

            return shot;
        }
    }


    return getRandomAiShot();
}


/* ==========================================
   ХОД ИИ
========================================== */

function aiTurn() {

    if (
        gameState !== "ai"
    ) {

        return;
    }


    const shot =
        chooseAiShot();


    if (!shot) {

        gameState = "player";

        statusElement.textContent =
            "Ваш ход.";

        return;
    }


    const result =
        playerField.receiveShot(
            shot.x,
            shot.y
        );


    if (
        result.result ===
        "already_shot"
    ) {

        removeAiAvailableShot(
            shot.x,
            shot.y
        );

        setTimeout(
            aiTurn,
            100
        );

        return;
    }


    renderPlayerField();


    if (
        result.result === "miss"
    ) {

        if (
            aiMode === "TARGET" &&
            aiDirection
        ) {

            aiSearchDirection *= -1;
        }

        statusElement.textContent =
            "ИИ промахнулся. Ваш ход.";

        gameState = "player";

        return;
    }


    if (
        result.result === "hit"
    ) {

        aiMode = "TARGET";

        aiHits.push({
            x: shot.x,
            y: shot.y
        });


        if (
            aiHits.length >= 2 &&
            !aiDirection
        ) {

            aiDirection =
                determineAiDirection();

            aiSearchDirection = 1;
        }


        statusElement.textContent =
            aiDirection
                ? "ИИ попал и продолжает добивать корабль."
                : "ИИ попал! Ищет продолжение корабля.";


        setTimeout(
            aiTurn,
            getRandomAiDelay()
        );

        return;
    }


    if (
        result.result === "killed"
    ) {

        if (
            playerField.allShipsKilled()
        ) {

            endGame(false);

            return;
        }


        aiHits = [];

        aiDirection = null;

        aiSearchDirection = 1;

        aiMode = "HUNT";


        aiAvailableShots =
            aiAvailableShots.filter(
                cell =>
                    isAiCellAvailable(
                        cell.x,
                        cell.y
                    )
            );


        statusElement.textContent =
            "ИИ уничтожил ваш корабль. Ищет следующий.";


        setTimeout(
            aiTurn,
            getRandomAiDelay()
        );
    }
}


/* ==========================================
   КЛИК ПО ПОЛЮ ИГРОКА
========================================== */

function handlePlayerCellClick(x, y) {

    if (
        gameState !== "setup"
    ) {

        return;
    }

    tryPlacePlayerShip(
        x,
        y
    );
}


/* ==========================================
   НАЧАЛО ИГРЫ С ИИ
========================================== */

startBtn.addEventListener(
    "click",
    startGame
);


function startGame() {

    if (
        gameMode !== "ai"
    ) {

        return;
    }


    if (
        playerField.ships.length !==
        SHIP_SIZES.length
    ) {

        statusElement.textContent =
            "Сначала разместите весь флот.";

        return;
    }


    enemyField.generateRandomFleet();

    prepareAi();

    gameState = "player";

    setupPanel.classList.add(
        "hidden"
    );

    statusElement.textContent =
        "Ваш ход. Стреляйте по полю противника.";

    renderPlayerField();

    renderEnemyField();
}


/* ==========================================
   КОНЕЦ ИГРЫ
========================================== */

function endGame(playerWon) {

    gameState = "gameover";

    multiplayerActive = false;

    if (playerWon) {

        statusElement.textContent =
            "🏆 Победа!";

        resultMessage.textContent =
            "🏆 Вы уничтожили весь флот противника.";

    } else {

        statusElement.textContent =
            "💀 Поражение!";

        resultMessage.textContent =
            "💀 ИИ уничтожил ваш флот.";
    }


    resultMessage.classList.remove(
        "hidden"
    );


    renderEnemyField();
}


/* ==========================================
   НОВАЯ ИГРА
========================================== */

newGameBtn.addEventListener(
    "click",
    () => {

        if (
            gameMode === "multiplayer" &&
            multiplayerSocket &&
            multiplayerSocket.connected &&
            multiplayerRoomCode
        ) {

            leaveMultiplayerRoom();
        }

        enemyField.reset();

        resetSetup();
    }
);


/* ==========================================
   MULTIPLAYER: ПОДКЛЮЧЕНИЕ
========================================== */

function connectMultiplayer() {

    if (
        typeof io !== "function"
    ) {

        setMultiplayerStatus(
            "Socket.IO не подключён."
        );

        return;
    }


    if (
        multiplayerSocket &&
        multiplayerSocket.connected
    ) {

        multiplayerConnected = true;

        return;
    }


    multiplayerSocket =
        io(
            MULTIPLAYER_SERVER_URL,
            {
                transports: [
                    "websocket",
                    "polling"
                ]
            }
        );


    multiplayerSocket.on(
        "connect",
        () => {

            multiplayerConnected = true;

            setMultiplayerStatus(
                "Подключено к серверу."
            );
        }
    );


    multiplayerSocket.on(
        "connect_error",
        error => {

            multiplayerConnected = false;

            console.error(
                "Multiplayer connection error:",
                error
            );

            setMultiplayerStatus(
                "Не удалось подключиться к серверу."
            );
        }
    );


    multiplayerSocket.on(
        "disconnect",
        () => {

            multiplayerConnected = false;

            multiplayerActive = false;

            multiplayerShotPending = false;

            if (
                gameMode === "multiplayer"
            ) {

                gameState = "setup";

                setMultiplayerStatus(
                    "Соединение с сервером потеряно."
                );
            }
        }
    );


    multiplayerSocket.on(
        "room-state",
        state => {

            multiplayerRoomCode =
                state.roomCode;

            updateMultiplayerUI(
                state
            );


            if (
                state.ready &&
                !state.opponentReady
            ) {

                setMultiplayerStatus(
                    "Ваш флот готов. Ждём соперника."
                );
            }


            if (
                state.opponentReady &&
                !state.ready
            ) {

                setMultiplayerStatus(
                    "Соперник готов. Подготовьте свой флот."
                );
            }
        }
    );


    multiplayerSocket.on(
        "game-started",
        data => {

            multiplayerActive = true;

            multiplayerShotPending = false;

            setupPanel.classList.add(
                "hidden"
            );


            if (
                data.firstPlayer
            ) {

                gameState =
                    "multiplayer-player";

                statusElement.textContent =
                    "Мультиплеер: ваш ход.";

            } else {

                gameState =
                    "multiplayer-wait";

                statusElement.textContent =
                    "Мультиплеер: ход соперника.";
            }


            renderPlayerField();

            renderEnemyField();
        }
    );


    multiplayerSocket.on(
        "incoming-shot",
        data => {

            /*
             * Соперник выстрелил в наше поле.
             */

            if (
                data.result === "miss"
            ) {

                playerField.grid[
                    data.y
                ][
                    data.x
                ] = CELL_MISS;

            } else {

                playerField.grid[
                    data.y
                ][
                    data.x
                ] = CELL_HIT;
            }


            renderPlayerField();


            if (
                gameState === "gameover"
            ) {

                return;
            }


            /*
             * Если соперник попал или убил,
             * он стреляет ещё.
             *
             * Если промахнулся — наш ход.
             */

            if (
                data.result === "miss"
            ) {

                gameState =
                    "multiplayer-player";

                statusElement.textContent =
                    "Соперник промахнулся. Ваш ход.";

            } else {

                gameState =
                    "multiplayer-wait";

                statusElement.textContent =
                    data.killed
                        ? "Соперник уничтожил ваш корабль и стреляет снова."
                        : "Соперник попал и стреляет снова.";
            }
        }
    );


    multiplayerSocket.on(
        "shot-result",
        data => {

            multiplayerShotPending = false;


            if (
                data.result === "miss"
            ) {

                enemyField.grid[
                    data.y
                ][
                    data.x
                ] = CELL_MISS;

            } else {

                enemyField.grid[
                    data.y
                ][
                    data.x
                ] = CELL_HIT;
            }


            renderEnemyField();


            if (
                data.gameOver
            ) {

                multiplayerActive = false;

                gameState =
                    "gameover";

                statusElement.textContent =
                    "🏆 Победа!";

                resultMessage.textContent =
                    "🏆 Вы уничтожили весь флот соперника!";

                resultMessage.classList.remove(
                    "hidden"
                );

                return;
            }


            if (
                data.result === "miss"
            ) {

                gameState =
                    "multiplayer-wait";

                statusElement.textContent =
                    "Мимо. Ход соперника.";

            } else if (
                data.killed
            ) {

                gameState =
                    "multiplayer-player";

                statusElement.textContent =
                    "Корабль уничтожен! Стреляйте ещё.";

            } else {

                gameState =
                    "multiplayer-player";

                statusElement.textContent =
                    "Попадание! Стреляйте ещё.";
            }
        }
    );


    multiplayerSocket.on(
        "game-over",
        data => {

            multiplayerActive = false;

            gameState = "gameover";

            if (
                data.winnerIsYou
            ) {

                statusElement.textContent =
                    "🏆 Победа!";

                resultMessage.textContent =
                    "🏆 Вы уничтожили весь флот соперника!";

            } else {

                statusElement.textContent =
                    "💀 Поражение!";

                resultMessage.textContent =
                    "💀 Соперник уничтожил ваш флот.";
            }


            resultMessage.classList.remove(
                "hidden"
            );


            renderPlayerField();

            renderEnemyField();
        }
    );


    multiplayerSocket.on(
        "opponent-left",
        () => {

            multiplayerActive = false;

            multiplayerShotPending = false;

            gameState = "setup";

            setupPanel.classList.remove(
                "hidden"
            );

            setMultiplayerStatus(
                "Соперник вышел из игры."
            );

            statusElement.textContent =
                "Соперник отключился.";

            renderPlayerField();

            renderEnemyField();
        }
    );
}


/* ==========================================
   MULTIPLAYER: ДОЖДАТЬСЯ СОЕДИНЕНИЯ
========================================== */

function whenMultiplayerConnected(callback) {

    connectMultiplayer();


    if (
        multiplayerSocket &&
        multiplayerSocket.connected
    ) {

        callback();

        return;
    }


    const timer =
        setInterval(
            () => {

                if (
                    multiplayerSocket &&
                    multiplayerSocket.connected
                ) {

                    clearInterval(timer);

                    callback();
                }
            },
            100
        );


    setTimeout(
        () => clearInterval(timer),
        10000
    );
}


/* ==========================================
   MULTIPLAYER: СОЗДАТЬ КОМНАТУ
========================================== */

function createMultiplayerRoom() {

    whenMultiplayerConnected(
        () => {

            multiplayerSocket.emit(
                "create-room",
                response => {

                    if (
                        !response.ok
                    ) {

                        setMultiplayerStatus(
                            response.error
                        );

                        return;
                    }


                    multiplayerRoomCode =
                        response.roomCode;


                    showRoomCode(
                        response.roomCode
                    );


                    setMultiplayerStatus(
                        "Комната создана. Отправьте код другу."
                    );
                }
            );
        }
    );
}


/* ==========================================
   MULTIPLAYER: ВОЙТИ В КОМНАТУ
========================================== */

function joinMultiplayerRoom() {

    const roomCode =
        roomCodeInput.value
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


    whenMultiplayerConnected(
        () => {

            multiplayerSocket.emit(
                "join-room",
                {
                    roomCode
                },
                response => {

                    if (
                        !response.ok
                    ) {

                        setMultiplayerStatus(
                            response.error
                        );

                        return;
                    }


                    multiplayerRoomCode =
                        response.roomCode;


                    showRoomCode(
                        response.roomCode
                    );


                    setMultiplayerStatus(
                        "Вы вошли в комнату. Разместите флот."
                    );
                }
            );
        }
    );
}


/* ==========================================
   MULTIPLAYER: ГОТОВ
========================================== */

function multiplayerReady() {

    if (
        gameMode !== "multiplayer"
    ) {

        return;
    }


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
        !multiplayerRoomCode
    ) {

        setMultiplayerStatus(
            "Сначала создайте комнату или войдите в неё."
        );

        return;
    }


    if (
        playerField.ships.length !==
        SHIP_SIZES.length
    ) {

        setMultiplayerStatus(
            "Сначала разместите весь флот."
        );

        return;
    }


    const grid =
        playerField.grid.map(
            row =>
                row.map(
                    value =>
                        value === CELL_SHIP
                            ? 1
                            : 0
                )
        );


    multiplayerSocket.emit(
        "player-ready",
        {
            grid
        },
        response => {

            if (
                !response.ok
            ) {

                setMultiplayerStatus(
                    response.error
                );

                return;
            }


            startBtn.disabled = true;

            setMultiplayerStatus(
                "Флот принят сервером. Ждём соперника."
            );
        }
    );
}


/* ==========================================
   MULTIPLAYER: ВЫСТРЕЛ
========================================== */

function multiplayerShoot(x, y) {

    if (
        gameState !==
        "multiplayer-player"
    ) {

        return;
    }


    if (
        multiplayerShotPending
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


    if (
        !multiplayerActive
    ) {

        return;
    }


    const state =
        enemyField.grid[y][x];


    if (
        state === CELL_HIT ||
        state === CELL_MISS
    ) {

        return;
    }


    multiplayerShotPending = true;


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

                multiplayerShotPending =
                    false;

                setMultiplayerStatus(
                    response.error
                );
            }
        }
    );
}


/* ==========================================
   MULTIPLAYER: ВЫЙТИ
========================================== */

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

    multiplayerShotPending = false;

    gameState = "setup";

    setupPanel.classList.remove(
        "hidden"
    );

    setMultiplayerStatus(
        "Вы вышли из комнаты."
    );
}


/* ==========================================
   MULTIPLAYER: UI
========================================== */

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


    if (!turn) {
        return;
    }


    if (
        !state.started
    ) {

        if (
            state.playerCount < 2
        ) {

            turn.textContent =
                "Ждём второго игрока...";

        } else if (
            state.ready
        ) {

            turn.textContent =
                "Ваш флот готов. Ждём соперника...";

        } else {

            turn.textContent =
                "Подготовьте флот и нажмите «Готов».";
        }

    } else {

        turn.textContent =
            state.myTurn
                ? "Ваш ход"
                : "Ход соперника";
    }
}


/* ==========================================
   КНОПКИ MULTIPLAYER
========================================== */

createRoomBtn.addEventListener(
    "click",
    createMultiplayerRoom
);


joinRoomBtn.addEventListener(
    "click",
    joinMultiplayerRoom
);


readyBtn.addEventListener(
    "click",
    multiplayerReady
);


leaveRoomBtn.addEventListener(
    "click",
    leaveMultiplayerRoom
);


/* ==========================================
   ПЕРВЫЙ ЗАПУСК
========================================== */

selectGameMode("ai");

resetSetup();
