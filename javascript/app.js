const playerField = new Battlefield();
const enemyField = new Battlefield();

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

/* ==========================================
СОСТОЯНИЕ ИИ
========================================== */

/*

* Клетки, которые ИИ ещё может проверить.
  */
  let aiAvailableShots = [];

/*

* Попадания по текущему кораблю.
* 
* Например:
* 
* [
* { x: 3, y: 5 },
* { x: 4, y: 5 }
* ]
  */
  let aiHits = [];

/*

* Направление текущего корабля:
* 
* null — пока неизвестно
* H    — горизонтально
* V    — вертикально
  */
  let aiDirection = null;

/*

* Направление, в котором ИИ сейчас
* пытается продолжить уничтожение корабля.
* 
* 1  — вправо / вниз
* -1 — влево / вверх
  */
  let aiSearchDirection = 1;

/*

* Режим ИИ:
* 
* HUNT   — ищем новый корабль
* TARGET — добиваем найденный корабль
  */
  let aiMode = "HUNT";

/* ==========================================
СЛУЧАЙНАЯ РАССТАНОВКА ИГРОКА
========================================== */

function randomizePlayerFleet() {

playerField.generateRandomFleet();

playerShipsPlaced = [...SHIP_SIZES];

selectedShipIndex = SHIP_SIZES.length;

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

/* ==========================================
РУЧНАЯ УСТАНОВКА КОРАБЛЯ
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
ПОВОРОТ КОРАБЛЯ
========================================== */

rotateBtn.addEventListener(
"click",
() => {

    if (gameState !== "setup") {
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

    if (gameState !== "setup") {
        return;
    }


    randomizePlayerFleet();
}

);

/* ==========================================
ОТРИСОВКА ПОЛЕЙ
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
         * Корабли игрока показываем.
         *
         * Корабли ИИ скрываем до конца игры.
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


/* =========================
   ПРОМАХ
========================= */

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


/* =========================
   ПОПАДАНИЕ
========================= */

if (
    result.result === "hit"
) {

    statusElement.textContent =
        "Попадание! Стреляйте ещё.";

    return;
}


/* =========================
   УНИЧТОЖЕНИЕ
========================= */

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
ПРОВЕРКА: МОЖНО ЛИ СТРЕЛЯТЬ?
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
СЛУЧАЙНЫЙ ВЫСТРЕЛ
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


    /*
     * Дополнительная защита:
     * автоматически отмеченные клетки
     * никогда не выбираются.
     */

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
ОПРЕДЕЛЕНИЕ НАПРАВЛЕНИЯ
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
ПОИСК СОСЕДНЕЙ КЛЕТКИ
ПОСЛЕ ПЕРВОГО ПОПАДАНИЯ
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
ПОИСК ВДОЛЬ УЖЕ НАЙДЕННОГО КОРАБЛЯ
========================================== */

function getDirectionalShot() {

if (
    !aiDirection ||
    aiHits.length < 2
) {

    return null;
}


/*
 * Сортируем попадания.
 *
 * Для горизонтального корабля
 * сортируем по X.
 *
 * Для вертикального — по Y.
 */

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


/*
 * =====================================
 * ГОРИЗОНТАЛЬНЫЙ КОРАБЛЬ
 * =====================================
 */

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
}


/*
 * =====================================
 * ВЕРТИКАЛЬНЫЙ КОРАБЛЬ
 * =====================================
 */

else {

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


/*
 * Если выбранная клетка доступна —
 * стреляем туда.
 */

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


/*
 * Дальше идти нельзя.
 *
 * Разворачиваемся.
 */

aiSearchDirection *= -1;


/*
 * После разворота пробуем
 * противоположный конец корабля.
 */

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

/*
 * =====================================
 * TARGET + НАПРАВЛЕНИЕ ИЗВЕСТНО
 * =====================================
 */

if (
    aiMode === "TARGET" &&
    aiDirection
) {

    const directionalShot =
        getDirectionalShot();


    if (
        directionalShot
    ) {

        return directionalShot;
    }
}


/*
 * =====================================
 * TARGET + ТОЛЬКО ОДНО ПОПАДАНИЕ
 * =====================================
 */

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


/*
 * =====================================
 * HUNT
 * =====================================
 */

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


/*
 * Теоретически этого не должно произойти.
 */

if (!shot) {

    console.warn(
        "ИИ не смог выбрать клетку."
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
 * Защита от повторного выстрела.
 */

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


/* =====================================
   ПРОМАХ
===================================== */

if (
    result.result === "miss"
) {

    /*
     * Если ИИ добивал корабль
     * и промахнулся, меняем направление.
     *
     * Следующий ход всё равно будет
     * у игрока, потому что по правилам
     * после промаха ход заканчивается.
     */

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


/* =====================================
   ПОПАДАНИЕ
===================================== */

if (
    result.result === "hit"
) {

    aiMode = "TARGET";


    aiHits.push({
        x: shot.x,
        y: shot.y
    });


    /*
     * После второго попадания
     * определяем направление.
     */

    if (
        aiHits.length >= 2 &&
        !aiDirection
    ) {

        aiDirection =
            determineAiDirection();


        aiSearchDirection = 1;
    }


    if (
        aiDirection === "H"
    ) {

        statusElement.textContent =
            "ИИ попал! Он определил горизонтальное направление.";

    } else if (
        aiDirection === "V"
    ) {

        statusElement.textContent =
            "ИИ попал! Он определил вертикальное направление.";

    } else {

        statusElement.textContent =
            "ИИ попал! Ищет продолжение корабля.";
    }


    /*
     * Попадание даёт ИИ ещё один ход.
     *
     * Но с естественной случайной задержкой.
     */

    setTimeout(
        aiTurn,
        getRandomAiDelay()
    );


    return;
}


/* =====================================
   КОРАБЛЬ УНИЧТОЖЕН
===================================== */

if (
    result.result === "killed"
) {

    /*
     * Проверяем победу игрока.
     */

    if (
        playerField.allShipsKilled()
    ) {

        endGame(false);

        return;
    }


    /*
     * Полностью забываем
     * уничтоженный корабль.
     */

    aiHits = [];

    aiDirection = null;

    aiSearchDirection = 1;

    aiMode = "HUNT";


    /*
     * Battlefield автоматически поставил
     * MISS вокруг уничтоженного корабля.
     *
     * Поэтому убираем такие клетки
     * из списка потенциальных выстрелов ИИ.
     */

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


    /*
     * Продолжаем ход ИИ,
     * потому что корабль был уничтожен.
     */

    setTimeout(
        aiTurn,
        getRandomAiDelay()
    );


    return;
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


/*
 * Генерируем скрытый флот ИИ.
 */

enemyField.generateRandomFleet();


/*
 * Обнуляем память ИИ.
 */

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


/*
 * После окончания игры показываем
 * расположение кораблей противника.
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