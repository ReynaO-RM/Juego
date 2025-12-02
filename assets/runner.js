/**
 * Ergo VR - Versión simplificada para Meta Quest 3
 **/

const POSITION_X_LEFT = -0.5;
const POSITION_X_CENTER = 0;
const POSITION_X_RIGHT = 0.5;

/************
 * CONTROLS *
 ************/

var player_position_index = 1;
var isGameRunning = false;
var score = 0;
var gameStarted = false;

/**
 * Move player to provided index
 */
function movePlayerTo(position_index) {
    if (position_index < 0) position_index = 0;
    if (position_index > 2) position_index = 2;
    player_position_index = position_index;

    let position = { x: 0, y: 0, z: 0 };
    if (player_position_index == 0) position.x = POSITION_X_LEFT;
    else if (player_position_index == 1) position.x = POSITION_X_CENTER;
    else position.x = POSITION_X_RIGHT;
    
    let player = document.getElementById('player');
    if (player) {
        player.setAttribute('position', position);
    }
}

/**
 * Setup VR controls for Meta Quest 3
 */
function setupVRControls() {
    console.log('Setting up VR controls...');
    
    // Componente para detectar controles VR
    AFRAME.registerComponent('vr-game-controls', {
        init: function() {
            console.log('VR Game Controls initialized');
            this.joystickActive = false;
            this.buttonPressed = false;
        },
        
        tick: function() {
            // Detectar gamepads
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (!gamepad) continue;
                
                // Detectar controles Quest
                if (gamepad.id && (gamepad.id.includes('Quest') || gamepad.id.includes('Oculus') || gamepad.id.includes('Touch'))) {
                    // Control izquierdo - movimiento (eje 0 = X, eje 1 = Y)
                    const leftStickX = gamepad.axes[0] || 0;
                    const deadzone = 0.3;
                    
                    // Movimiento con joystick
                    if (Math.abs(leftStickX) > deadzone) {
                        if (leftStickX < -deadzone) {
                            movePlayerTo(0); // Izquierda
                        } else if (leftStickX > deadzone) {
                            movePlayerTo(2); // Derecha
                        }
                        this.joystickActive = true;
                    } else if (this.joystickActive) {
                        movePlayerTo(1); // Centro
                        this.joystickActive = false;
                    }
                    
                    // Botones para empezar/reiniciar
                    // Botón A (índice 0 en algunos controles, 1 en otros)
                    const aButton = gamepad.buttons[0] || gamepad.buttons[1];
                    if (aButton && aButton.pressed && !this.buttonPressed) {
                        this.buttonPressed = true;
                        if (!gameStarted) {
                            startGame();
                        } else if (!isGameRunning) {
                            startGame();
                        }
                    } else if (aButton && !aButton.pressed) {
                        this.buttonPressed = false;
                    }
                }
            }
        }
    });
    
    // Agregar el componente a la escena
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.setAttribute('vr-game-controls', '');
        console.log('VR controls added to scene');
    }
}

/*********
 * GAME LOGIC *
 *********/

var treeContainer;
var treeTimer;
var countedTrees = new Set();

function setupTrees() {
    treeContainer = document.getElementById('tree-container');
    console.log('Tree container:', treeContainer);
}

function teardownTrees() {
    if (treeTimer) {
        clearInterval(treeTimer);
    }
    
    // Remover todos los árboles existentes
    const trees = document.querySelectorAll('.tree:not([id^="template"])');
    trees.forEach(tree => {
        if (tree.parentNode) {
            tree.parentNode.removeChild(tree);
        }
    });
}

function addTree() {
    // Crear un árbol en una posición aleatoria (0, 1, o 2)
    const positionIndex = Math.floor(Math.random() * 3);
    const templateId = `template-tree-${['left', 'center', 'right'][positionIndex]}`;
    const template = document.getElementById(templateId);
    
    if (template && treeContainer) {
        const newTree = template.cloneNode(true);
        newTree.id = 'tree-' + Date.now() + '-' + Math.random();
        newTree.setAttribute('data-tree-position-index', positionIndex);
        newTree.classList.add('tree');
        treeContainer.appendChild(newTree);
        
        // Reiniciar animación
        const animation = newTree.querySelector('a-animation');
        if (animation) {
            animation.setAttribute('from', `${positionIndex === 0 ? '-0.5' : positionIndex === 1 ? '0' : '0.5'} 0.55 -7`);
            animation.setAttribute('to', `${positionIndex === 0 ? '-0.5' : positionIndex === 1 ? '0' : '0.5'} 0.55 1.5`);
        }
    }
}

function addTreesRandomlyLoop() {
    // Agregar árbol cada 1.5 segundos
    treeTimer = setInterval(addTree, 1500);
    // Agregar primer árbol inmediatamente
    setTimeout(addTree, 500);
}

/*********
 * SCORE *
 *********/

function setupScore() {
    score = 0;
    countedTrees.clear();
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score');
    if (scoreDisplay) {
        scoreDisplay.setAttribute('value', 'Puntuación: ' + score);
    }
}

/********
 * MENU *
 ********/

function hideEntity(el) {
    if (el) el.setAttribute('visible', false);
}

function showEntity(el) {
    if (el) el.setAttribute('visible', true);
}

function setupAllMenus() {
    console.log('Setting up menus...');
    
    // Ocultar todos los elementos de móvil/escritorio no necesarios
    const mobileElements = [
        document.getElementById('start-copy-mobile'),
        document.getElementById('game-over-copy-mobile'),
        document.getElementById('cursor-mobile')
    ];
    
    mobileElements.forEach(el => {
        if (el) hideEntity(el);
    });
    
    // Mostrar solo el menú de inicio
    showStartMenu();
}

function hideAllMenus() {
    const menuContainer = document.getElementById('menu-container');
    hideEntity(menuContainer);
}

function showGameOverMenu() {
    const menuContainer = document.getElementById('menu-container');
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over');
    const gameScore = document.getElementById('game-score');
    
    if (menuContainer && gameOverMenu && gameScore) {
        showEntity(menuContainer);
        hideEntity(startMenu);
        showEntity(gameOverMenu);
        gameScore.setAttribute('value', score);
    }
}

function showStartMenu() {
    const menuContainer = document.getElementById('menu-container');
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over');
    
    if (menuContainer && startMenu) {
        showEntity(menuContainer);
        showEntity(startMenu);
        hideEntity(gameOverMenu);
    }
}

/********
 * GAME *
 ********/

function gameOver() {
    console.log('Game Over!');
    isGameRunning = false;
    showGameOverMenu();
    teardownTrees();
}

function startGame() {
    console.log('Starting game...');
    
    if (isGameRunning) return;
    
    gameStarted = true;
    isGameRunning = true;
    hideAllMenus();
    setupScore();
    setupTrees();
    addTreesRandomlyLoop();
    
    // Actualizar instrucciones
    const instructions = document.getElementById('vr-instructions');
    if (instructions) {
        instructions.setAttribute('value', '¡Juego activo!\nJoystick: Mover\nEvita los árboles!');
    }
}

/**************
 * COLLISIONS *
 **************/

AFRAME.registerComponent('player', {
    tick: function() {
        if (!isGameRunning) return;
        
        const trees = document.querySelectorAll('.tree:not([id^="template"])');
        trees.forEach(tree => {
            const position = tree.getAttribute('position');
            const treePositionIndex = parseInt(tree.getAttribute('data-tree-position-index') || '1');
            const treeId = tree.getAttribute('id');
            
            // Remover árbol cuando pasa de la vista
            if (position.z > 1.5) {
                if (tree.parentNode) {
                    tree.parentNode.removeChild(tree);
                }
                return;
            }
            
            // Detectar colisión
            if (position.z > 0.5 && position.z < 0.8 && 
                treePositionIndex === player_position_index) {
                console.log('Collision detected!');
                gameOver();
            }
            
            // Aumentar puntuación cuando el árbol pasa
            if (position.z > 0.8 && !countedTrees.has(treeId)) {
                score++;
                countedTrees.add(treeId);
                updateScoreDisplay();
            }
        });
    }
});

/*************
 * INITIALIZATION *
 *************/

window.onload = function() {
    console.log('Window loaded');
    
    // Esperar a que A-Frame cargue
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', function() {
            console.log('A-Frame scene loaded');
            
            setTimeout(function() {
                setupAllMenus();
                setupVRControls();
                setupScore();
                
                // Mostrar instrucciones iniciales
                const instructions = document.getElementById('vr-instructions');
                if (instructions) {
                    instructions.setAttribute('value', '¡Bienvenido a ERGO VR!\nJoystick izquierdo: Mover\nBotón A: Empezar');
                }
                
                console.log('Game initialized for VR');
            }, 1000);
        });
    } else {
        console.error('No A-Frame scene found!');
    }
};

/*************
 * UTILITIES *
 *************/

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}