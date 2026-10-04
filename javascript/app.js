// Инициализируем нашу математическую логику из mama.js
const battlefield = new Battlefield();
const uiContainer = document.getElementById('battlefield-ui');
const regenBtn = document.getElementById('regen-btn');

// Функция, которая полностью перерисовывает интерфейс на основе матрицы grid
function renderField() {
    uiContainer.innerHTML = ''; // Очищаем старую сетку

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cellState = battlefield.grid[y][x];
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');

            // Записываем координаты прямо в HTML-элемент ячейки
            cellElement.dataset.x = x;
            cellElement.dataset.y = y;

            // Подсвечиваем ячейку в зависимости от того, что в матрице
            if (cellState === CELL_SHIP) cellElement.classList.add('ship');
            if (cellState === CELL_MISS) cellElement.classList.add('miss');
            if (cellState === CELL_HIT)  cellElement.classList.add('hit');
            
            // Навешиваем событие клика (выстрела) на каждую ячейку
            cellElement.addEventListener('click', () => handleCellClick(x, y));

            uiContainer.appendChild(cellElement);
        }
    }
}

// Обработчик клика по клетке
function handleCellClick(x, y) {
    // Вызываем логику выстрела из движка
    const response = battlefield.receiveShot(x, y);

    if (response.result === 'miss') {
        console.log('Мимо!');
    } else if (response.result === 'hit') {
        console.log('Попадание!');
    } else if (response.result === 'killed') {
        console.log('Корабль уничтожен!');
    }

    // После выстрела обновляем картинку на экране
    renderField();
}

// Кнопка перезапуска флота
regenBtn.addEventListener('click', () => {
    battlefield.generateRandomFleet();
    renderField();
});

// Старт игры при загрузке страницы
battlefield.generateRandomFleet();
renderField();
