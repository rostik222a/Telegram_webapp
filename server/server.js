const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const httpServer =
    http.createServer(app);

const io =
    new Server(
        httpServer,
        {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        }
    );


const PORT =
    process.env.PORT || 3000;

const FIELD_SIZE = 10;

const SHIP_SIZES = [
    4,
    3, 3,
    2, 2, 2,
    1, 1, 1, 1
];


const rooms = new Map();


/* ==========================================
   HTTP
========================================== */

app.get("/", (_req, res) => {

    res.json({
        ok: true,
        service: "TMA Battleship multiplayer server"
    });
});


app.get("/health", (_req, res) => {

    res.json({
        ok: true
    });
});


/* ==========================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
========================================== */

function valid(x, y) {

    return (
        x >= 0 &&
        x < FIELD_SIZE &&
        y >= 0 &&
        y < FIELD_SIZE
    );
}


function emptyGrid() {

    return Array.from(
        {
            length: FIELD_SIZE
        },
        () =>
            Array(FIELD_SIZE).fill(0)
    );
}


function makeRoomCode() {

    const alphabet =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code;

    do {

        code = "";

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            code +=
                alphabet[
                    Math.floor(
                        Math.random() *
                        alphabet.length
                    )
                ];
        }

    } while (
        rooms.has(code)
    );

    return code;
}


/* ==========================================
   ПРОВЕРКА ФЛОТА
========================================== */

function validateFleet(grid) {

    if (
        !Array.isArray(grid) ||
        grid.length !== FIELD_SIZE
    ) {

        return false;
    }


    if (
        grid.some(
            row =>
                !Array.isArray(row) ||
                row.length !== FIELD_SIZE
        )
    ) {

        return false;
    }


    const ship =
        grid.map(
            row =>
                row.map(
                    value =>
                        Number(value) === 1
                            ? 1
                            : 0
                )
        );


    const visited =
        emptyGrid();

    const ships = [];


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

            if (
                ship[y][x] !== 1 ||
                visited[y][x]
            ) {

                continue;
            }


            const cells = [];

            const queue = [
                [x, y]
            ];

            visited[y][x] = 1;


            while (
                queue.length > 0
            ) {

                const [
                    cx,
                    cy
                ] =
                    queue.shift();


                cells.push([
                    cx,
                    cy
                ]);


                for (
                    const [dx, dy]
                    of [
                        [1, 0],
                        [-1, 0],
                        [0, 1],
                        [0, -1]
                    ]
                ) {

                    const nx =
                        cx + dx;

                    const ny =
                        cy + dy;


                    if (
                        valid(nx, ny) &&
                        ship[ny][nx] === 1 &&
                        !visited[ny][nx]
                    ) {

                        visited[ny][nx] = 1;

                        queue.push([
                            nx,
                            ny
                        ]);
                    }
                }
            }


            ships.push(cells);
        }
    }


    const sizes =
        ships
            .map(
                cells =>
                    cells.length
            )
            .sort(
                (a, b) =>
                    b - a
            );


    const expected =
        [...SHIP_SIZES]
            .sort(
                (a, b) =>
                    b - a
            );


    if (
        sizes.length !==
        expected.length
    ) {

        return false;
    }


    for (
        let i = 0;
        i < expected.length;
        i++
    ) {

        if (
            sizes[i] !== expected[i]
        ) {

            return false;
        }
    }


    /*
     * Каждый корабль должен быть
     * строго горизонтальным или вертикальным.
     */

    for (
        const cells of ships
    ) {

        if (
            cells.length <= 1
        ) {

            continue;
        }


        const sameY =
            cells.every(
                ([x, y]) =>
                    y === cells[0][1]
            );


        const sameX =
            cells.every(
                ([x, y]) =>
                    x === cells[0][0]
            );


        if (
            !sameX &&
            !sameY
        ) {

            return false;
        }


        /*
         * Проверяем отсутствие пропусков
         * внутри корабля.
         */

        const sorted =
            [...cells].sort(
                (a, b) =>
                    sameX
                        ? a[1] - b[1]
                        : a[0] - b[0]
            );


        for (
            let i = 1;
            i < sorted.length;
            i++
        ) {

            const diff =
                sameX
                    ? sorted[i][1] -
                      sorted[i - 1][1]
                    : sorted[i][0] -
                      sorted[i - 1][0];


            if (
                diff !== 1
            ) {

                return false;
            }
        }
    }


    /*
     * Корабли не должны соприкасаться
     * даже по диагонали.
     */

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

            if (
                ship[y][x] !== 1
            ) {

                continue;
            }


            for (
                let dx = -1;
                dx <= 1;
                dx++
            ) {

                for (
                    let dy = -1;
                    dy <= 1;
                    dy++
                ) {

                    if (
                        dx === 0 &&
                        dy === 0
                    ) {

                        continue;
                    }


                    const nx =
                        x + dx;

                    const ny =
                        y + dy;


                    if (
                        !valid(nx, ny)
                    ) {

                        continue;
                    }


                    if (
                        ship[ny][nx] !== 1
                    ) {

                        continue;
                    }


                    /*
                     * Диагональное касание запрещено.
                     */

                    if (
                        Math.abs(dx) === 1 &&
                        Math.abs(dy) === 1
                    ) {

                        return false;
                    }
                }
            }
        }
    }


    return true;
}


/* ==========================================
   ПОИСК КОРАБЛЯ
========================================== */

function findShip(
    board,
    startX,
    startY
) {

    if (
        board[startY][startX].ship !== 1
    ) {

        return [];
    }


    const visited =
        emptyGrid();

    const queue = [
        [startX, startY]
    ];

    visited[startY][startX] = 1;

    const cells = [];


    while (
        queue.length > 0
    ) {

        const [
            x,
            y
        ] =
            queue.shift();


        cells.push([
            x,
            y
        ]);


        for (
            const [dx, dy]
            of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1]
            ]
        ) {

            const nx =
                x + dx;

            const ny =
                y + dy;


            if (
                valid(nx, ny) &&
                board[ny][nx].ship === 1 &&
                !visited[ny][nx]
            ) {

                visited[ny][nx] = 1;

                queue.push([
                    nx,
                    ny
                ]);
            }
        }
    }


    return cells;
}


function isShipKilled(
    board,
    cells
) {

    return cells.every(
        ([x, y]) =>
            board[y][x].hit === true
    );
}


/* ==========================================
   КОМНАТЫ
========================================== */

function createPlayer(socketId) {

    return {
        socketId,
        ready: false,
        board: null,
        shots: new Set()
    };
}


function getOpponent(
    room,
    socketId
) {

    return room.players.find(
        player =>
            player.socketId !== socketId
    );
}


function roomForSocket(socketId) {

    for (
        const [
            code,
            room
        ] of rooms
    ) {

        if (
            room.players.some(
                player =>
                    player.socketId === socketId
            )
        ) {

            return {
                code,
                room
            };
        }
    }


    return null;
}


/* ==========================================
   СОСТОЯНИЕ БЕЗ СЕКРЕТНЫХ ДАННЫХ
========================================== */

function publicState(
    room,
    socketId
) {

    const me =
        room.players.find(
            player =>
                player.socketId === socketId
        );


    const opponent =
        getOpponent(
            room,
            socketId
        );


    return {
        roomCode: room.code,

        playerCount:
            room.players.length,

        ready:
            me?.ready || false,

        opponentReady:
            opponent?.ready || false,

        started:
            room.started,

        myTurn:
            room.turn === socketId,

        opponentConnected:
            !!opponent
    };
}


function emitState(room) {

    for (
        const player of room.players
    ) {

        io.to(
            player.socketId
        ).emit(
            "room-state",
            publicState(
                room,
                player.socketId
            )
        );
    }
}


/* ==========================================
   SOCKET.IO
========================================== */

io.on(
    "connection",
    socket => {

        console.log(
            "Connected:",
            socket.id
        );


        /* ==================================
           СОЗДАТЬ КОМНАТУ
        ================================== */

        socket.on(
            "create-room",
            callback => {

                if (
                    roomForSocket(
                        socket.id
                    )
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Вы уже находитесь в комнате."
                    });

                    return;
                }


                const code =
                    makeRoomCode();


                const room = {

                    code,

                    players: [
                        createPlayer(
                            socket.id
                        )
                    ],

                    started: false,

                    turn: null
                };


                rooms.set(
                    code,
                    room
                );


                socket.join(code);


                callback?.({
                    ok: true,
                    roomCode: code
                });


                emitState(room);
            }
        );


        /* ==================================
           ВОЙТИ В КОМНАТУ
        ================================== */

        socket.on(
            "join-room",
            (
                {
                    roomCode
                },
                callback
            ) => {

                const code =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();


                const room =
                    rooms.get(code);


                if (!room) {

                    callback?.({
                        ok: false,
                        error:
                            "Комната не найдена."
                    });

                    return;
                }


                if (
                    room.players.length >= 2
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "В комнате уже два игрока."
                    });

                    return;
                }


                if (
                    roomForSocket(
                        socket.id
                    )
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Вы уже находитесь в комнате."
                    });

                    return;
                }


                room.players.push(
                    createPlayer(
                        socket.id
                    )
                );


                socket.join(code);


                callback?.({
                    ok: true,
                    roomCode: code
                });


                emitState(room);
            }
        );


        /* ==================================
           ГОТОВНОСТЬ
        ================================== */

        socket.on(
            "player-ready",
            (
                {
                    grid
                },
                callback
            ) => {

                const found =
                    roomForSocket(
                        socket.id
                    );


                if (!found) {

                    callback?.({
                        ok: false,
                        error:
                            "Вы не в комнате."
                    });

                    return;
                }


                const {
                    room
                } =
                    found;


                const player =
                    room.players.find(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                if (
                    room.players.length !== 2
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Нужно дождаться второго игрока."
                    });

                    return;
                }


                if (
                    !validateFleet(grid)
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Сервер не принял расстановку флота."
                    });

                    return;
                }


                player.board =
                    grid.map(
                        row =>
                            row.map(
                                value => ({
                                    ship:
                                        Number(value) === 1
                                            ? 1
                                            : 0,
                                    hit: false
                                })
                            )
                    );


                player.ready = true;


                callback?.({
                    ok: true
                });


                emitState(room);


                if (
                    room.players.every(
                        p =>
                            p.ready
                    )
                ) {

                    room.started = true;


                    room.turn =
                        room.players[
                            Math.floor(
                                Math.random() * 2
                            )
                        ].socketId;


                    for (
                        const player
                        of room.players
                    ) {

                        io.to(
                            player.socketId
                        ).emit(
                            "game-started",
                            {
                                firstPlayer:
                                    room.turn ===
                                    player.socketId
                            }
                        );
                    }


                    emitState(room);
                }
            }
        );


        /* ==================================
           ВЫСТРЕЛ
        ================================== */

        socket.on(
            "shoot",
            (
                {
                    x,
                    y
                },
                callback
            ) => {

                const found =
                    roomForSocket(
                        socket.id
                    );


                if (!found) {

                    callback?.({
                        ok: false,
                        error:
                            "Вы не в комнате."
                    });

                    return;
                }


                const {
                    room
                } =
                    found;


                const shooter =
                    room.players.find(
                        p =>
                            p.socketId ===
                            socket.id
                    );


                const target =
                    getOpponent(
                        room,
                        socket.id
                    );


                if (
                    !room.started ||
                    !target ||
                    !target.board
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Игра ещё не началась."
                    });

                    return;
                }


                if (
                    room.turn !==
                    socket.id
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Сейчас не ваш ход."
                    });

                    return;
                }


                x = Number(x);

                y = Number(y);


                if (
                    !Number.isInteger(x) ||
                    !Number.isInteger(y) ||
                    !valid(x, y)
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Некорректная клетка."
                    });

                    return;
                }


                const key =
                    `${x}:${y}`;


                if (
                    shooter.shots.has(key)
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Вы уже стреляли сюда."
                    });

                    return;
                }


                shooter.shots.add(key);


                const targetCell =
                    target.board[y][x];


                if (
                    targetCell.hit
                ) {

                    callback?.({
                        ok: false,
                        error:
                            "Эта клетка уже обработана сервером."
                    });

                    return;
                }


                targetCell.hit = true;


                const result =
                    targetCell.ship
                        ? "hit"
                        : "miss";


                let killed = false;

                let gameOver = false;


                if (
                    targetCell.ship
                ) {

                    const ship =
                        findShip(
                            target.board,
                            x,
                            y
                        );


                    killed =
                        isShipKilled(
                            target.board,
                            ship
                        );


                    const allDestroyed =
                        target.board
                            .flat()
                            .filter(
                                cell =>
                                    cell.ship === 1
                            )
                            .every(
                                cell =>
                                    cell.hit === true
                            );


                    if (
                        allDestroyed
                    ) {

                        gameOver = true;
                    }
                }


                /*
                 * Попадание даёт ещё один ход.
                 * Промах передаёт ход.
                 */

                if (
                    !gameOver &&
                    result === "miss"
                ) {

                    room.turn =
                        target.socketId;
                }


                callback?.({
                    ok: true,
                    x,
                    y,
                    result,
                    killed,
                    gameOver
                });


                io.to(
                    target.socketId
                ).emit(
                    "incoming-shot",
                    {
                        x,
                        y,
                        result,
                        killed
                    }
                );


                io.to(
                    shooter.socketId
                ).emit(
                    "shot-result",
                    {
                        x,
                        y,
                        result,
                        killed,
                        gameOver
                    }
                );


                if (
                    gameOver
                ) {

                    for (
                        const player
                        of room.players
                    ) {

                        io.to(
                            player.socketId
                        ).emit(
                            "game-over",
                            {
                                winnerIsYou:
                                    player.socketId ===
                                    shooter.socketId
                            }
                        );
                    }


                    /*
                     * Оставляем комнату,
                     * но сбрасываем матч.
                     */

                    room.started = false;

                    room.turn = null;


                    for (
                        const player
                        of room.players
                    ) {

                        player.ready = false;

                        player.board = null;

                        player.shots =
                            new Set();
                    }


                    emitState(room);

                    return;
                }


                emitState(room);
            }
        );


        /* ==================================
           ВЫХОД
        ================================== */

        socket.on(
            "leave-room",
            () => {

                removePlayerFromRoom(
                    socket.id
                );
            }
        );


        /* ==================================
           ОТКЛЮЧЕНИЕ
        ================================== */

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Disconnected:",
                    socket.id
                );


                removePlayerFromRoom(
                    socket.id
                );
            }
        );
    }
);


/* ==========================================
   УДАЛЕНИЕ ИГРОКА ИЗ КОМНАТЫ
========================================== */

function removePlayerFromRoom(
    socketId
) {

    const found =
        roomForSocket(
            socketId
        );


    if (!found) {
        return;
    }


    const {
        code,
        room
    } =
        found;


    room.players =
        room.players.filter(
            player =>
                player.socketId !==
                socketId
        );


    for (
        const player
        of room.players
    ) {

        io.to(
            player.socketId
        ).emit(
            "opponent-left"
        );
    }


    if (
        room.players.length === 0
    ) {

        rooms.delete(code);

    } else {

        room.started = false;

        room.turn = null;

        for (
            const player
            of room.players
        ) {

            player.ready = false;

            player.board = null;

            player.shots =
                new Set();
        }


        emitState(room);
    }
}


/* ==========================================
   ЗАПУСК
========================================== */

httpServer.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `TMA Battleship server listening on port ${PORT}`
        );
    }
);
