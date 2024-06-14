const pieceColors = {
    'F': '#FFA500', // Orange
    'I': '#00f0f0', // Cyan
    'T': '#a000f0', // Purple
    'O': '#f0f000', // Yellow
    'L': '#f0a000', // Orange
    'Z': '#f00000', // Red
    'N': '#00f000'  // Green
};

class Tetris {
    constructor(canvasId, scoreId, controls) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');
        this.context.scale(30, 30);

        this.arena = this.createMatrix(10, 20);
        this.player = {
            pos: {x: 0, y: 10},
            matrix: null,
            type: ''
        };

        this.score = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        this.scoreId = scoreId;
        this.controls = controls;
        this.gameover = false;
        this.singleGame = false;
        this.animationFrameId = null;

        this.playerReset();
        this.updateScore();
    }

    createMatrix(w, h) {
        const matrix = [];
        while (h--) {
            matrix.push(new Array(w).fill({value: 0, color: null}));
        }
        return matrix;
    }

    createPiece(type) {
        switch (type) {
            case 'F': return [[1, 1, 0], [0, 1, 0], [0, 1, 0]];
            case 'I': return [[0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
            case 'T': return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
            case 'O': return [[1, 1], [1, 1]];
            case 'L': return [[1, 0, 0], [1, 0, 0], [1, 1, 0]];
            case 'Z': return [[1, 1, 0], [0, 1, 1], [0, 0, 0]];
            case 'N': return [[0, 1, 1], [1, 1, 0], [0, 0, 0]];
        }
    }

    drawMatrix(matrix, offset) {
        matrix.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell.value !== 0) {
                    this.context.fillStyle = cell.color;
                    this.context.fillRect(x + offset.x, y + offset.y, 1, 1);

                    // Añadir borde negro
                    this.context.strokeStyle = 'black';
                    this.context.lineWidth = 0.05;
                    this.context.strokeRect(x + offset.x, y + offset.y, 1, 1);

                    // Añadir efecto visual (sombreado)
                    this.context.fillStyle = 'rgba(0, 0, 0, 0.1)';
                    this.context.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);
                }
            });
        });
    }

    draw() {
        this.context.fillStyle = '#000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawMatrix(this.arena, {x: 0, y: 0});
        this.drawMatrix(this.player.matrix.map(row => row.map(value => value ? {value, color: pieceColors[this.player.type]} : {value: 0, color: null})), this.player.pos);
    }

    merge(arena, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena[y + player.pos.y][x + player.pos.x] = {
                        value: value,
                        color: pieceColors[player.type]
                    };
                }
            });
        });
    }

    collide(arena, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (arena[y + o.y] && arena[y + o.y][x + o.x] && arena[y + o.y][x + o.x].value) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    playerDrop() {
        this.player.pos.y++;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.y--;
            this.merge(this.arena, this.player);
            this.playerReset();
            this.sweepArena();
        }
        this.updateDropInterval();
        this.dropCounter = 0;
    }

    updateDropInterval() {
        this.dropInterval = Math.max(100, 1000 - this.score * 0.1);
    }

    updateScore() {
        document.getElementById(this.scoreId).innerText = this.score;
    }

    playerMove(dir) {
        this.player.pos.x += dir;
        if (this.collide(this.arena, this.player)) {
            this.player.pos.x -= dir;
        }
    }

    playerRotate(dir) {
        const pos = this.player.pos.x;
        let offset = 1;
        this.rotate(this.player.matrix, dir);
        while (this.collide(this.arena, this.player)) {
            this.player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.player.matrix[0].length) {
                this.rotate(this.player.matrix, -dir);
                this.player.pos.x = pos;
                return;
            }
        }
    }

    rotate(matrix, dir) {
        for (let y = 0; y < matrix.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
            }
        }

        if (dir > 0) {
            matrix.forEach(row => row.reverse());
        } else {
            matrix.reverse();
        }
    }

    playerReset() {
        if (!this.gameOver) {
            const pieces = 'FITOLZN';
            this.player.type = pieces[pieces.length * Math.random() | 0];
            this.player.matrix = this.createPiece(this.player.type);
            this.player.pos.y = 0;
            this.player.pos.x = (this.arena[0].length / 2 | 0) -
                                (this.player.matrix[0].length / 2 | 0);
            if (this.collide(this.arena, this.player)) {
                if (this.player.pos.y <= 0) {
                    console.log("Game Over");
                    this.gameOver = true;

                    // Crear el mensaje de Game Over
                    const gameOverElement = document.createElement('div');
                    gameOverElement.id = 'game-over';
                    gameOverElement.innerText = 'GAME OVER';
                    gameOverElement.style.position = 'fixed';
                    gameOverElement.style.top = '50%';
                    gameOverElement.style.left = '50%';
                    gameOverElement.style.transform = 'translate(-50%, -50%)';
                    gameOverElement.style.zIndex = '9999';
                    gameOverElement.style.color = 'white';
                    gameOverElement.style.fontSize = '6rem';
                    gameOverElement.style.fontFamily = 'Exo, sans-serif';
                    gameOverElement.style.textAlign = 'center';
                    gameOverElement.style.background = 'transparent';
                    gameOverElement.style.padding = '20px';
                    gameOverElement.style.borderRadius = '10px';
                    gameOverElement.style.animation = 'fadeInScaleUp 0.5s ease';

                    // Añadir animación CSS
                    const style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = `
                        @keyframes fadeInScaleUp {
                            from {
                                opacity: 0;
                                transform: scale(0.5) translate(-50%, -50%);
                            }
                            to {
                                opacity: 1;
                                transform: scale(1) translate(-50%, -50%);
                            }
                        }
                    `;
                    document.head.appendChild(style);

                    document.body.appendChild(gameOverElement);

                    // Eliminar el mensaje de Game Over después de 5 segundos
                    setTimeout(() => {
                        if (gameOverElement && gameOverElement.parentNode) {
                            gameOverElement.parentNode.removeChild(gameOverElement);
                        }
                    }, 5000);

                    if (this.singleGame) {
                        document.getElementById('reset-button-single').style.display = 'block';
                    } else {
                        document.getElementById('reset-button-multi').style.display = 'block';
                    }
                    return;
                }
                this.arena.forEach(row => row.fill({value: 0, color: null}));
                this.score = 0;
                this.updateScore();
            }
        }
    }

    sweepArena() {
        let comboCount = 0; 
    
        outer: for (let y = this.arena.length - 1; y >= 0; --y) {
            for (let x = 0; x < this.arena[y].length; ++x) {
                if (this.arena[y][x].value === 0) {
                    continue outer;
                }
            }

            this.score += 100;
    
            if (this.score % 200 === 0) {
                comboCount++;
    
                // Mostrar el mensaje "COMBO!" en pantalla
                const comboElement = document.createElement('div');
                comboElement.id = 'combo-message';
                comboElement.textContent = 'COMBO!';
                comboElement.style.position = 'fixed';
                comboElement.style.top = '50%';
                comboElement.style.left = '50%';
                comboElement.style.transform = 'translate(-50%, -50%)';
                comboElement.style.zIndex = '9999';
                comboElement.style.color = 'white';
                comboElement.style.fontSize = '2rem';
                comboElement.style.fontFamily = 'Exo, sans-serif';
                comboElement.style.textAlign = 'center';
                comboElement.style.background = 'rgba(0, 0, 0, 0.5)';
                comboElement.style.padding = '10px 20px';
                comboElement.style.borderRadius = '10px';
                document.body.appendChild(comboElement);
    
                setTimeout(() => {
                    if (comboElement && comboElement.parentNode) {
                        comboElement.parentNode.removeChild(comboElement);
                    }
                }, 2000);
            }
    
            this.updateScore();
            const row = this.arena.splice(y, 1)[0].fill({ value: 0, color: null });
            this.arena.unshift(row);
            ++y;
        }
    }

    update(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }
        this.draw();
        this.animationFrameId = requestAnimationFrame(this.update.bind(this));
    }

    startWithCountdown() {
        let count = 4;
        const countdownElement = document.createElement('div');
        countdownElement.id = 'countdown';
        countdownElement.style.position = 'fixed';
        countdownElement.style.top = '50%';
        countdownElement.style.left = '50%';
        countdownElement.style.transform = 'translate(-50%, -50%)';
        countdownElement.style.zIndex = '9999';
        countdownElement.style.color = 'white';
        countdownElement.style.fontSize = '8rem';
        countdownElement.style.fontFamily = 'Exo';
        countdownElement.style.textAlign = 'center';
        countdownElement.style.background = 'transparent';
        countdownElement.style.padding = '20px';
        countdownElement.style.borderRadius = '10px';
        document.body.appendChild(countdownElement);

        const countdownInterval = setInterval(() => {
            count--;
            countdownElement.innerText = count;
            if (count < 0) {
                clearInterval(countdownInterval);
                document.body.removeChild(countdownElement);
                this.gameOver = false;
                this.arena.forEach(row => row.fill({value: 0, color: null}));
                this.score = 0;
                this.updateScore();
                this.start();
            } else if (count === 0) {
                countdownElement.innerText = 'GO!';
            }
        }, 1000);
    }

    start() {
        if (!this.gameOver) {
            this.playerReset();
            this.update();
        }
    }

    stop() {
        cancelAnimationFrame(this.animationFrameId);
    }
}

const tetris1 = new Tetris('tetris-game-1', 'score-1', {
    left: 'a',
    right: 'd',
    down: 's',
    rotateLeft: 'q',
    rotateRight: 'e',
});

const tetris2 = new Tetris('tetris-game-2', 'score-2', {
    left: 'ArrowLeft',
    right: 'ArrowRight',
    down: 'ArrowDown',
    rotateLeft: 'n',
    rotateRight: 'm',
});

const titleBox = document.querySelector('.title-box');

document.getElementById('single-player-button').addEventListener('click', () => {
    tetris1.singleGame = true;
    titleBox.style.marginTop = '20px';
    document.getElementById('tetris-container').style.transform = 'translateX(45px) translateY(-35px)';
    document.getElementById('button-container').style.display = 'none';
    document.getElementById('controls-single').style.transform = 'translateX(-1px)';
    document.getElementById('single-player-container').style.display = 'contents';
    document.getElementById('display-single-flex').style.display = 'flex';
    document.getElementById('reset-button-multi').style.display = 'none';
    tetris2.stop();
    tetris1.startWithCountdown();
});

document.getElementById('multi-player-button').addEventListener('click', () => {
    titleBox.style.marginTop = '1px';
    document.getElementById('tetris-container').style.transform = 'translateX(40px) translateY(-35px)';
    document.getElementById('title').style.fontSize = '10em';
    document.getElementById('title').style.transition = '0.5s';
    document.getElementById('button-container').style.display = 'none';
    document.getElementById('controls-single').style.transform = 'translateX(-25px) translateY(-5px)';
    document.getElementById('controls-multi').style.transform = 'translateX(-25px) translateY(-5px)';
    document.getElementById('single-player-container').style.display = 'inline-block';
    document.getElementById('multi-player-container').style.display = 'inline-block';
    document.getElementById('reset-button-single').style.display = 'none';
    tetris1.singleGame = false;
    tetris1.startWithCountdown();
    tetris2.startWithCountdown();
});

document.getElementById('reset-button-single').addEventListener('click', () => {
    tetris1.startWithCountdown();
    document.getElementById('reset-button-single').style.display = 'none';
});

document.getElementById('reset-button-multi').addEventListener('click', () => {
    tetris1.startWithCountdown();
    tetris2.startWithCountdown();
    document.getElementById('reset-button-multi').style.display = 'none';
});

document.addEventListener('keydown', event => {
    handleKeyPress(tetris1, event);
    if (!tetris1.singleGame) {
        handleKeyPress(tetris2, event);
    }
});

function handleKeyPress(tetris, event) {
    const { left, right, down, rotateLeft, rotateRight } = tetris.controls;
    if (event.key === left) {
        tetris.playerMove(-1);
    } else if (event.key === right) {
        tetris.playerMove(1);
    } else if (event.key === down) {
        tetris.playerDrop();
    } else if (event.key === rotateLeft) {
        tetris.playerRotate(-1);
    } else if (event.key === rotateRight) {
        tetris.playerRotate(1);
    }
}

// buttons movement
document.getElementById('move-left-single').addEventListener('click', () => {
    tetris1.playerMove(-1);
});

document.getElementById('move-right-single').addEventListener('click', () => {
    tetris1.playerMove(1);
});

document.getElementById('rotate-left-single').addEventListener('click', () => {
    tetris1.playerRotate(-1);
});

document.getElementById('rotate-right-single').addEventListener('click', () => {
    tetris1.playerRotate(1);
});

document.getElementById('move-down-single').addEventListener('click', () => {
    tetris1.playerDrop();
});

document.getElementById('move-left-multi').addEventListener('click', () => {
    tetris2.playerMove(-1);
});

document.getElementById('move-right-multi').addEventListener('click', () => {
    tetris2.playerMove(1);
});

document.getElementById('rotate-left-multi').addEventListener('click', () => {
    tetris2.playerRotate(-1);
});

document.getElementById('rotate-right-multi').addEventListener('click', () => {
    tetris2.playerRotate(1);
});

document.getElementById('move-down-multi').addEventListener('click', () => {
    tetris2.playerDrop();
});


// Modal instructions

document.addEventListener('DOMContentLoaded', function() {
    const howToPlayButton = document.getElementById('how-to-play-button');
    const modal = document.getElementById('how-to-play-modal');
    const closeButton = modal.querySelector('.close');

    howToPlayButton.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// entrance animations

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        document.getElementById('single-player-container').classList.add('show');
    }, 1000); 
});
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        document.getElementById('multi-player-container').classList.add('show');
    }, 1000); 
});
