const FIELD_SIZE = 10;

const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CELL_MISS = 2;
const CELL_HIT = 3;


/* ==========================================
   ФЛОТ
========================================== */

const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];


/* ==========================================
   КЛАСС ПОЛЯ
========================================== */

class Battlefield {

    constructor() {

        this.reset();
    }


    reset() {

        this.grid = Array.from(
            { length: FIELD_SIZE },
            () => Array(FIELD_SIZE).fill(CELL_EMPTY)
        );

        this.ships = [];

        this.remainingShips = SHIP_SIZES.length;
    }


    isValidCoords(x, y) {

        return (
            x >= 0 &&
            x < FIELD_SIZE &&
            y >= 0 &&
            y < FIELD_SIZE
        );
    }


    canPlaceShip(x, y, size, direction) {

        for (let i = 0; i < size; i++) {

            const currentX =
                direction === "H" ? x + i : x;

            const currentY =
                direction === "V" ? y + i : y;


            if (!this.isValidCoords(currentX, currentY)) {
                return false;
            }


            for (let dx = -1; dx <= 1; dx++) {

                for (let dy = -1; dy <= 1; dy++) {

                    const checkX = currentX + dx;
                    const checkY = currentY + dy;


                    if (!this.isValidCoords(checkX, checkY)) {
                        continue;
                    }


                    if (
                        this.grid[checkY][checkX] !== CELL_EMPTY
                    ) {
                        return false;
                    }
                }
            }
        }

        return true;
    }


    _writeShip(x, y, size, direction) {

        const cells = [];


        for (let i = 0; i < size; i++) {

            const currentX =
                direction === "H" ? x + i : x;

            const currentY =
                direction === "V" ? y + i : y;


            this.grid[currentY][currentX] = CELL_SHIP;

            cells.push({
                x: currentX,
                y: currentY,
                hit: false
            });
        }


        this.ships.push({
            size,
            cells,
            killed: false
        });
    }


    placeShip(x, y, size, direction) {

        if (
            !this.canPlaceShip(
                x,
                y,
                size,
                direction
            )
        ) {
            return false;
        }


        this._writeShip(
            x,
            y,
            size,
            direction
        );

        return true;
    }


    generateRandomFleet() {

        this.reset();


        for (const size of SHIP_SIZES) {

            let placed = false;

            let attempts = 0;


            while (!placed && attempts < 1000) {

                attempts++;


                const x =
                    Math.floor(
                        Math.random() * FIELD_SIZE
                    );

                const y =
                    Math.floor(
                        Math.random() * FIELD_SIZE
                    );


                const direction =
                    Math.random() > 0.5
                        ? "H"
                        : "V";


                placed =
                    this.placeShip(
                        x,
                        y,
                        size,
                        direction
                    );
            }


            /*
             * Теоретически сюда почти невозможно
             * попасть, но это защищает от
             * бесконечного цикла.
             */

            if (!placed) {

                this.generateRandomFleet();

                return;
            }
        }
    }


    findShipAt(x, y) {

        return this.ships.find(ship =>
            ship.cells.some(
                cell =>
                    cell.x === x &&
                    cell.y === y
            )
        );
    }


    isShipKilled(ship) {

        return ship.cells.every(
            cell => cell.hit
        );
    }


    markEnvironmentAroundKilled(ship) {

        for (const cell of ship.cells) {

            for (let dx = -1; dx <= 1; dx++) {

                for (let dy = -1; dy <= 1; dy++) {

                    const x = cell.x + dx;
                    const y = cell.y + dy;


                    if (!this.isValidCoords(x, y)) {
                        continue;
                    }


                    if (
                        this.grid[y][x] === CELL_EMPTY
                    ) {
                        this.grid[y][x] = CELL_MISS;
                    }
                }
            }
        }
    }


    receiveShot(x, y) {

        if (!this.isValidCoords(x, y)) {

            return {
                result: "invalid"
            };
        }


        const cell = this.grid[y][x];


        if (
            cell === CELL_MISS ||
            cell === CELL_HIT
        ) {

            return {
                result: "already_shot"
            };
        }


        if (cell === CELL_EMPTY) {

            this.grid[y][x] = CELL_MISS;

            return {
                result: "miss"
            };
        }


        if (cell === CELL_SHIP) {

            this.grid[y][x] = CELL_HIT;


            const ship =
                this.findShipAt(x, y);


            const shipCell =
                ship.cells.find(
                    c =>
                        c.x === x &&
                        c.y === y
                );


            shipCell.hit = true;


            if (this.isShipKilled(ship)) {

                ship.killed = true;

                this.remainingShips--;

                this.markEnvironmentAroundKilled(
                    ship
                );


                return {
                    result: "killed",
                    ship
                };
            }


            return {
                result: "hit",
                ship
            };
        }


        return {
            result: "invalid"
        };
    }


    allShipsKilled() {

        return this.remainingShips === 0;
    }
}