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


/* ==========================================
   СОСТОЯНИЕ ИГРЫ
========================================== */

let gameState = "setup";

let playerDirection = "H";

let selectedShipIndex = 0;

let playerShipsPlaced = [];


/*
 * Все клетки, по которым ИИ может стрелять.
 */

let aiAvailableShots = [];


/*
 * Клетки, которые ИИ хочет проверить
 * после попадания.
 */

let aiTargetQueue = [];


/* ==========================================
   СЛУЧАЙНАЯ РАССТАНОВКА ИГРОКА
========================================== */

function randomizePlayerFleet() {

    playerField.generateRandomFleet();

    playerShipsPlaced =
        [...SHIP_SIZES];

    selectedShipIndex =
        SHIP_SIZES.length;


    startBtn.disabled = false;

    statusElement.textContent =
        "Флот готов. Можно начинать игру.";

    renderPlayerField();
}


/* ==========================================
   ПОДГОТОВКА ИГРОКА
========================================== */

function resetSetup() {

    playerField.reset();

    selectedShipIndex = 0;

    playerShipsPlaced = [];

    playerDirection = "H";

    gameState = "setup";

    startBtn.disabled = true;

    setupPanel.classList.remove("hidden");

    resultMessage.classList.add("hidden");

    statusElement.textContent =
        "Разместите свои корабли.";

    renderPlayerField();

    renderEnemyField();
}


/*
 * Ручная установка кораблей.
 */

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
            "Все корабли размещены. Начинайте игру.";

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
    randomizePlayerFleet
);


/* ==========================================
   ОТРИСОВКА ИГРОВОГО ПОЛЯ
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


            /*
             * Корабли игрока видны.
             *
             * Корабли врага скрыты.
             */

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

    if (gameState !== "player") {
        return;
    }


    const result =
        enemyField.receiveShot(x, y);


    if (
        result.result === "already_shot"
    ) {

        return;
    }


    if (
        result.result === "invalid"
    ) {

        return;
    }


    renderEnemyField();


    if (
        result.result === "miss"
    ) {

        statusElement.textContent =
            "Мимо! Ход противника.";

        gameState = "ai";

        setTimeout(
            aiTurn,
            600
        );

        return;
    }


    if (
        result.result === "hit"
    ) {

        statusElement.textContent =
            "Попадание! Стреляйте ещё.";

        /*
         * При попадании игрок получает
         * ещё один ход.
         */

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
   ХОД ИИ
========================================== */

function getRandomAiDelay() {

    const minDelay = 700;
    const maxDelay = 1600;

    return Math.floor(
        Math.random() *
        (maxDelay - minDelay + 1)
    ) + minDelay;
}

function prepareAi() {

    aiAvailableShots = [];

    aiTargetQueue = [];

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


/*
 * Получить случайную доступную клетку.
 */

function getRandomAiShot() {

    if (
        aiAvailableShots.length === 0
    ) {
        return null;
    }


    const index =
        Math.floor(
            Math.random() *
            aiAvailableShots.length
        );


    return aiAvailableShots.splice(
        index,
        1
    )[0];
}


/*
 * Удаляем клетку из списка доступных.
 */

function removeAiAvailableShot(x, y) {

    aiAvailableShots =
        aiAvailableShots.filter(
            cell =>
                cell.x !== x ||
                cell.y !== y
        );
}


/*
 * После попадания добавляем соседние
 * клетки в очередь ИИ.
 */

function addAiTargets(x, y) {

    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];


    for (
        const [dx, dy]
        of directions
    ) {

        const nx = x + dx;
        const ny = y + dy;


        if (
            nx < 0 ||
            nx >= FIELD_SIZE ||
            ny < 0 ||
            ny >= FIELD_SIZE
        ) {
            continue;
        }


        const exists =
            aiTargetQueue.some(
                cell =>
                    cell.x === nx &&
                    cell.y === ny
            );


        if (exists) {
            continue;
        }


        const available =
            aiAvailableShots.some(
                cell =>
                    cell.x === nx &&
                    cell.y === ny
            );


        if (available) {

            aiTargetQueue.push({
                x: nx,
                y: ny
            });
        }
    }
}


/*
 * Выбираем клетку для ИИ.
 */

function chooseAiShot() {

    /*
     * Сначала пытаемся взять клетку из очереди целей.
     */

    while (aiTargetQueue.length > 0) {

        const target = aiTargetQueue.shift();

        /*
         * Проверяем реальное состояние поля игрока.
         * Если там уже был выстрел — пропускаем клетку.
         */
        if (
            playerField.grid[target.y][target.x] !== CELL_EMPTY &&
            playerField.grid[target.y][target.x] !== CELL_SHIP
        ) {
            continue;
        }

        removeAiAvailableShot(
            target.x,
            target.y
        );

        return target;
    }


    /*
     * Если целей нет — выбираем случайную
     * клетку только из реально доступных.
     */

    while (aiAvailableShots.length > 0) {

        const index =
            Math.floor(
                Math.random() * aiAvailableShots.length
            );

        const target =
            aiAvailableShots.splice(index, 1)[0];


        /*
         * Дополнительная защита от уже обстрелянной клетки.
         */

        const state =
            playerField.grid[target.y][target.x];


        if (
            state === CELL_EMPTY ||
            state === CELL_SHIP
        ) {

            return target;
        }
    }


    return null;
}

/* ==========================================
   ХОД ИИ
========================================== */

function aiTurn() {

    if (gameState !== "ai") {
        return;
    }


    const shot = chooseAiShot();


    /*
     * Если по какой-то причине не нашли клетку,
     * пробуем ещё раз через небольшой интервал.
     */

    if (!shot) {

        console.warn(
            "ИИ не смог выбрать клетку для выстрела."
        );

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


    /*
     * Защита от уже использованной клетки.
     *
     * Раньше именно здесь игра могла зависнуть.
     */

    if (
        result.result === "already_shot"
    ) {

        setTimeout(
            aiTurn,
            100
        );

        return;
    }


    renderPlayerField();


    /* ==============================
       ПРОМАХ
    ============================== */

    if (
        result.result === "miss"
    ) {

        statusElement.textContent =
            "ИИ промахнулся. Ваш ход.";

        gameState = "player";

        return;
    }


    /* ==============================
       ПОПАДАНИЕ
    ============================== */

    if (
        result.result === "hit"
    ) {

        addAiTargets(
            shot.x,
            shot.y
        );


        statusElement.textContent =
            "ИИ попал! Он думает над следующим выстрелом...";


        /*
         * ВАЖНО:
         * ИИ получает ещё один ход,
         * но не сразу.
         */

        setTimeout(
            aiTurn,
            getRandomAiDelay()
        );

        return;
    }


    /* ==============================
       УНИЧТОЖЕНИЕ
    ============================== */

    if (
        result.result === "killed"
    ) {

        /*
         * Старые цели относятся к уже
         * уничтоженному кораблю.
         */

        aiTargetQueue = [];


        /*
         * На всякий случай удаляем из списка
         * доступных все клетки, которые игра
         * автоматически пометила вокруг корабля.
         */

        aiAvailableShots =
            aiAvailableShots.filter(
                cell => {

                    const state =
                        playerField.grid[
                            cell.y
                        ][
                            cell.x
                        ];

                    return (
                        state === CELL_EMPTY ||
                        state === CELL_SHIP
                    );
                }
            );


        if (
            playerField.allShipsKilled()
        ) {

            endGame(false);

            return;
        }


        statusElement.textContent =
            "ИИ уничтожил ваш корабль!";


        /*
         * ИИ продолжает стрелять,
         * но с естественной задержкой.
         */

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

    if (gameState !== "setup") {
        return;
    }


    tryPlacePlayerShip(
        x,
        y
    );
}


/* ==========================================
   НАЧАЛО ИГРЫ
========================================== */

startBtn.addEventListener(
    "click",
    startGame
);


function startGame() {

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


    setupPanel.classList.add("hidden");


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


    if (playerWon) {

        statusElement.textContent =
            "🏆 Победа!";

        resultMessage.textContent =
            "🏆 Вы уничтожили весь флот противника!";

    } else {

        statusElement.textContent =
            "💀 Поражение!";

        resultMessage.textContent =
            "💀 ИИ уничтожил ваш флот.";
    }


    resultMessage.classList.remove(
        "hidden"
    );


    /*
     * Показываем флот противника
     * после окончания игры.
     */

    renderEnemyField();
}


/* ==========================================
   НОВАЯ ИГРА
========================================== */

newGameBtn.addEventListener(
    "click",
    () => {

        enemyField.reset();

        resetSetup();
    }
);


/* ==========================================
   ПЕРВЫЙ ЗАПУСК
========================================== */

resetSetup();