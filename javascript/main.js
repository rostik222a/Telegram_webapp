const FIELD_SIZE = 10;

// Константы состояний клетки
const CELL_EMPTY = 0;   // Пусто
const CELL_SHIP = 1;    // Целая палуба
const CELL_MISS = 2;    // Промах (мимо)
const CELL_HIT = 3;     // Подбитая палуба

class Battlefield {
    constructor() {
        // Создаем матрицу 10х10, заполненную нулями
        this.grid = Array(FIELD_SIZE).fill(null).map(() => Array(FIELD_SIZE).fill(CELL_EMPTY));
    }

    // Проверка: находятся ли координаты внутри игрового поля
    isValidCoords(x, y) {
        return x >= 0 && x < FIELD_SIZE && y >= 0 && y < FIELD_SIZE;
    }

    // 1. АЛГОРИТМ ВАЛИДАЦИИ: можно ли поставить корабль в эти координаты?
    canPlaceShip(x, y, size, direction) {
        for (let i = 0; i < size; i++) {
            let currentX = direction === 'H' ? x + i : x;
            let currentY = direction === 'V' ? y + i : y;

            // Если корабль вылезает за границы поля — ставить нельзя
            if (!this.isValidCoords(currentX, currentY)) return false;

            // Проверяем саму клетку и все 8 клеток вокруг нее (буферная зона)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    let checkX = currentX + dx;
                    let checkY = currentY + dy;

                    if (this.isValidCoords(checkX, checkY)) {
                        // Если в буфере нашли другую палубу — ставить нельзя
                        if (this.grid[checkY][checkX] !== CELL_EMPTY) {
                            return false; 
                        }
                    }
                }
            }
        }
        return true;
    }

    // Вспомогательный метод для физической записи палуб в матрицу
    _writeShip(x, y, size, direction) {
        for (let i = 0; i < size; i++) {
            let currentX = direction === 'H' ? x + i : x;
            let currentY = direction === 'V' ? y + i : y;
            this.grid[currentY][currentX] = CELL_SHIP;
        }
    }

    // 2. АЛГОРИТМ АВТОРАССТАНОВКИ всего флота
    generateRandomFleet() {
        // Очищаем поле перед расстановкой
        this.grid = Array(FIELD_SIZE).fill(null).map(() => Array(FIELD_SIZE).fill(CELL_EMPTY));
        
        // Стандартный набор кораблей: от 4-палубного до 1-палубных
        const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

        for (let size of shipSizes) {
            let placed = false;

            while (!placed) {
                let x = Math.floor(Math.random() * FIELD_SIZE);
                let y = Math.floor(Math.random() * FIELD_SIZE);
                let direction = Math.random() > 0.5 ? 'H' : 'V';

                if (this.canPlaceShip(x, y, size, direction)) {
                    this._writeShip(x, y, size, direction);
                    placed = true; 
                }
            }
        }
    }

    // 3. АЛГОРИТМ ПРОВЕРКИ: убит ли корабль полностью?
    // Использует метод волнового обхода (Flood Fill), чтобы найти все связанные палубы
    _isShipKilled(startX, startY) {
        const visited = Array(FIELD_SIZE).fill(null).map(() => Array(FIELD_SIZE).fill(false));
        const queue = [[startX, startY]];
        visited[startY][startX] = true;

        while (queue.length > 0) {
            const [cx, cy] = queue.shift();

            // Четыре направления: вверх, вниз, влево, вправо
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let [dx, dy] of directions) {
                let nx = cx + dx;
                let ny = cy + dy;

                if (this.isValidCoords(nx, ny) && !visited[ny][nx]) {
                    let cellState = this.grid[ny][nx];
                    
                    // Если нашли хоть одну ЖИВУЮ палубу, соединенную с этой — корабль еще ранен
                    if (cellState === CELL_SHIP) {
                        return false;
                    }
                    // Если палуба подбита — продолжаем сканировать корабль дальше
                    if (cellState === CELL_HIT) {
                        visited[ny][nx] = true;
                        queue.push([nx, ny]);
                    }
                }
            }
        }
        return true; // Живых палуб не найдено, корабль уничтожен!
    }

    // 4. АЛГОРИТМ ОБВЕДЕНИЯ УБИТОГО КОРАБЛЯ ТОЧКАМИ
    // Если корабль убит, этот метод автоматически ставит промахи (CELL_MISS) вокруг него
    _markEnvironmentAroundKilled(startX, startY) {
        const visited = Array(FIELD_SIZE).fill(null).map(() => Array(FIELD_SIZE).fill(false));
        const queue = [[startX, startY]];
        visited[startY][startX] = true;

        while (queue.length > 0) {
            const [cx, cy] = queue.shift();

            // Проверяем абсолютно все 8 клеток вокруг каждой подбитой палубы
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    let nx = cx + dx;
                    let ny = cy + dy;

                    if (this.isValidCoords(nx, ny)) {
                        if (this.grid[ny][nx] === CELL_EMPTY) {
                            this.grid[ny][nx] = CELL_MISS; // Ставим точку промаха
                        } else if (this.grid[ny][nx] === CELL_HIT && !visited[ny][nx]) {
                            // Если это соседняя подбитая палуба того же корабля — пускаем её в очередь
                            visited[ny][nx] = true;
                            queue.push([nx, ny]);
                        }
                    }
                }
            }
        }
    }

    // 5. ГЛАВНЫЙ АЛГОРИТМ ОБРАБОТКИ ВЫСТРЕЛА
    receiveShot(x, y) {
        if (!this.isValidCoords(x, y)) return { result: 'invalid' };
        
        const cell = this.grid[y][x];

        // Проверяем, стреляли ли сюда раньше
        if (cell === CELL_MISS || cell === CELL_HIT) {
            return { result: 'already_shot' };
        }

        // Если выстрел в пустоту
        if (cell === CELL_EMPTY) {
            this.grid[y][x] = CELL_MISS;
            return { result: 'miss' };
        }

        // Если попали в корабль
        if (cell === CELL_SHIP) {
            this.grid[y][x] = CELL_HIT; // Меняем статус на "подбит"
            
            // Проверяем, умер ли корабль целиком
            if (this._isShipKilled(x, y)) {
                this._markEnvironmentAroundKilled(x, y); // Обводим промахами
                return { result: 'killed' };
            }
            
            return { result: 'hit' }; // Просто ранен
        }
    }
}

// ==========================================
// ПРИМЕР ИСПОЛЬЗОВАНИЯ (Проверка в консоли)
// ==========================================

const myField = new Battlefield();

// 1. Генерируем флот
myField.generateRandomFleet();
console.log("=== ПОЛЕ ПОСЛЕ ГЕНЕРАЦИИ (1 - корабли) ===");
console.table(myField.grid);

// 2. Имитируем выстрелы в консоли
// Попробуем «обстрелять» левый верхний угол (координаты 0,0)
console.log("Выстрел в (0,0):", myField.receiveShot(0, 0));
console.log("Выстрел в (0,1):", myField.receiveShot(0, 1));

console.log("=== ПОЛЕ ПОСЛЕ ВЫСТРЕЛОВ (2 - промах, 3 - попал) ===");
console.table(myField.grid);
