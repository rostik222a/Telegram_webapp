const info = document.getElementById("info");
const reset = document.getElementById("reset");
const board = document.getElementById("board");


const shots = new Set();


function createBoard() {

    board.innerHTML = "";
    shots.clear();

    for (let row = 0; row < 10; row++) {

        for (let col = 0; col < 10; col++) {

            const cell = document.createElement("button");

            cell.className = "cell";

            cell.dataset.row = row;
            cell.dataset.col = col;

            cell.addEventListener("click", function() {

                const key = `${row}-${col}`;

                // Если по этой клетке уже стреляли
                if (shots.has(key)) {
                    return;
                }

                // Запоминаем выстрел
                shots.add(key);

                // Меняем внешний вид клетки
                cell.classList.add("miss");

                // Показываем точку
                cell.textContent = "•";

                // Показываем координаты
                info.textContent =
                    `Выстрел: строка ${row + 1}, столбец ${col + 1}`;
            });

            board.appendChild(cell);
        }
    }
}


reset.addEventListener("click", function() {

    createBoard();

    info.textContent =
        "Нажми на клетку, чтобы сделать выстрел";
});


// Создаём поле при запуске
createBoard();