/**
 * Created by Alvin Wan (alvinwan.com)
 **/

const POSITION_X_LEFT = -0.5;
const POSITION_X_CENTER = 0;
const POSITION_X_RIGHT = 0.5;

/************
 * CONTROLS *
 ************/

// Position is one of 0 (left), 1 (center), or 2 (right)
var player_position_index = 1;
var vrControllers = { left: null, right: null };
var gamepadState = { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } };
var buttonState = { start: false, restart: false };
var deadzone = 0.3;

/**
 * Move player to provided index
 * @param {int} Lane to move player to
 */
function movePlayerTo(position_index) {
  if (position_index < 0) position_index = 0;
  if (position_index > 2) position_index = 2;
  player_position_index = position_index;

  position = {x: 0, y: 0, z: 0}
  if      (player_position_index == 0) position.x = POSITION_X_LEFT;
  else if (player_position_index == 1) position.x = POSITION_X_CENTER;
  else                                 position.x = POSITION_X_RIGHT;
  document.getElementById('player').setAttribute('position', position);
}

/**
 * Setup VR controls for Meta Quest 3
 */
function setupVRControls() {
  // Find VR controllers
  setTimeout(function() {
    const controllers = document.querySelectorAll('[oculus-touch-controls], [vive-controls], [windows-motion-controls]');
    if (controllers.length >= 2) {
      vrControllers.left = controllers[0];
      vrControllers.right = controllers[1];
      console.log('VR controllers found:', vrControllers);
    }
  }, 1000);

  // Gamepad polling for joystick input
  AFRAME.registerComponent('vr-controls', {
    tick: function() {
      if (!isGameRunning) return;
      
      // Get gamepads
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      
      for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (!gamepad) continue;
        
        // Check for Oculus Touch, Vive, or Windows MR controllers
        if (gamepad.id.includes('Oculus') || gamepad.id.includes('Vive') || gamepad.id.includes('Windows')) {
          // Left controller - movement
          if (gamepad.hand === 'left' || (gamepad.buttons && gamepad.buttons.length > 15)) {
            const xAxis = gamepad.axes[2] || gamepad.axes[0] || 0;
            const yAxis = gamepad.axes[3] || gamepad.axes[1] || 0;
            
            // Apply deadzone
            if (Math.abs(xAxis) > deadzone) {
              if (xAxis < -deadzone) {
                movePlayerTo(0);
              } else if (xAxis > deadzone) {
                movePlayerTo(2);
              }
            } else {
              movePlayerTo(1);
            }
          }
          
          // Right controller - check for button presses
          if (gamepad.hand === 'right' || (gamepad.buttons && gamepad.buttons.length > 15)) {
            // A/X button (usually button 0 or 1) to start/restart
            const aButton = gamepad.buttons[0] || gamepad.buttons[1];
            const bButton = gamepad.buttons[1] || gamepad.buttons[2];
            
            if (aButton && aButton.pressed && !buttonState.start) {
              buttonState.start = true;
              startGame();
            } else if (aButton && !aButton.pressed) {
              buttonState.start = false;
            }
            
            if (bButton && bButton.pressed && !buttonState.restart) {
              buttonState.restart = true;
              if (!isGameRunning) {
                startGame();
              }
            } else if (bButton && !bButton.pressed) {
              buttonState.restart = false;
            }
          }
        }
      }
    }
  });

  // Add VR controls component to scene
  const scene = document.querySelector('a-scene');
  scene.setAttribute('vr-controls', '');
}

/**
 * Setup controller event listeners
 */
function setupControllerEvents() {
  // Controller connected event
  window.addEventListener('controllerconnected', function(event) {
    console.log('Controller connected:', event.detail.name);
    setupVRControls();
  });

  // Controller disconnected event
  window.addEventListener('controllerdisconnected', function(event) {
    console.log('Controller disconnected:', event.detail.name);
  });

  // Listen for controller buttons
  AFRAME.registerComponent('controller-listener', {
    init: function() {
      this.el.addEventListener('thumbstickmoved', this.onThumbstickMove.bind(this));
      this.el.addEventListener('gripdown', this.onGripDown.bind(this));
      this.el.addEventListener('triggerdown', this.onTriggerDown.bind(this));
      this.el.addEventListener('abuttondown', this.onAButtonDown.bind(this));
      this.el.addEventListener('bbuttondown', this.onBButtonDown.bind(this));
    },
    
    onThumbstickMove: function(evt) {
      if (!isGameRunning) return;
      
      const x = evt.detail.x;
      if (x < -0.5) {
        movePlayerTo(0);
      } else if (x > 0.5) {
        movePlayerTo(2);
      } else {
        movePlayerTo(1);
      }
    },
    
    onAButtonDown: function() {
      startGame();
    },
    
    onBButtonDown: function() {
      if (!isGameRunning) {
        startGame();
      }
    },
    
    onGripDown: function() {
      // Optional: Add grip functionality if needed
    },
    
    onTriggerDown: function() {
      // Optional: Add trigger functionality if needed
    }
  });
}

/**
 * Determine how `movePlayerTo` will be fired.
 * Force VR controls for Quest 3
 **/
function setupControls() {
  // Always setup VR controls for Quest 3
  setupVRControls();
  setupControllerEvents();
  
  // Keep minimal keyboard support for debugging, but disable normal desktop controls
  window.onkeydown = function(e) {
    // Only allow specific keys for debugging
    if (e.key === 'Escape' || e.key === 'F1') {
      // Debug keys
      console.log('Debug key pressed:', e.key);
    }
  }
}

// Remove the old mobileCheck function since we're forcing VR controls
function mobileCheck() {
  return true; // Force mobile/VR mode
}

/*********
 * TREES *
 *********/

var templateTreeLeft;
var templateTreeCenter;
var templateTreeRight;
var templates;
var treeContainer;
var numberOfTrees = 0;
var treeTimer;

function setupTrees() {
  templateTreeLeft    = document.getElementById('template-tree-left');
  templateTreeCenter  = document.getElementById('template-tree-center');
  templateTreeRight   = document.getElementById('template-tree-right');
  templates           = [templateTreeLeft, templateTreeCenter, templateTreeRight];
  treeContainer       = document.getElementById('tree-container');

  removeTree(templateTreeLeft);
  removeTree(templateTreeRight);
  removeTree(templateTreeCenter);
}

function teardownTrees() {
  clearInterval(treeTimer);
}

function addTree(el) {
  numberOfTrees += 1;
  el.id = 'tree-' + numberOfTrees;
  treeContainer.appendChild(el);
}

function removeTree(tree) {
  tree.parentNode.removeChild(tree);
}

function addTreeTo(position_index) {
  var template = templates[position_index];
  addTree(template.cloneNode(true));
}

/**
 * Add any number of trees across different lanes, randomly.
 **/
function addTreesRandomly(
  {
    probTreeLeft = 0.5,
    probTreeCenter = 0.5,
    probTreeRight = 0.5,
    maxNumberTrees = 2
  } = {}) {

  var trees = [
    {probability: probTreeLeft,   position_index: 0},
    {probability: probTreeCenter, position_index: 1},
    {probability: probTreeRight,  position_index: 2},
  ]
  shuffle(trees);

  var numberOfTreesAdded = 0;
  var position_indices = [];
  trees.forEach(function (tree) {
    if (Math.random() < tree.probability && numberOfTreesAdded < maxNumberTrees) {
      addTreeTo(tree.position_index);
      numberOfTreesAdded += 1;

      position_indices.push(tree.position_index);
    }
  });

  return numberOfTreesAdded;
}

function addTreesRandomlyLoop({intervalLength = 500} = {}) {
  treeTimer = setInterval(addTreesRandomly, intervalLength);
}

/**************
 * COLLISIONS *
 **************/

const POSITION_Z_OUT_OF_SIGHT = 1;
const POSITION_Z_LINE_START = 0.6;
const POSITION_Z_LINE_END = 0.7;

AFRAME.registerComponent('player', {
  tick: function() {
    document.querySelectorAll('.tree').forEach(function(tree) {
      position = tree.getAttribute('position');
      tree_position_index = tree.getAttribute('data-tree-position-index');
      tree_id = tree.getAttribute('id');

      if (position.z > POSITION_Z_OUT_OF_SIGHT) {
        removeTree(tree);
      }

      if (!isGameRunning) return;

      if (POSITION_Z_LINE_START < position.z && position.z < POSITION_Z_LINE_END
          && tree_position_index == player_position_index) {
        gameOver();
      }

      if (position.z > POSITION_Z_LINE_END && !countedTrees.has(tree_id)) {
        addScoreForTree(tree_id);
        updateScoreDisplay();
      }
    })
  }
})

/*********
 * SCORE *
 *********/

var score;
var countedTrees;
var gameOverScoreDisplay;
var scoreDisplay;

function setupScore() {
  score = 0;
  countedTrees = new Set();
  scoreDisplay = document.getElementById('score');
  gameOverScoreDisplay = document.getElementById('game-score');
}

function teardownScore() {
  scoreDisplay.setAttribute('value', '');
  gameOverScoreDisplay.setAttribute('value', score);
}

function addScoreForTree(tree_id) {
  score += 1;
  countedTrees.add(tree_id);
}

function updateScoreDisplay() {
  scoreDisplay.setAttribute('value', score);
}

/********
 * MENU *
 ********/

var menuStart;
var menuGameOver;
var menuContainer;
var isGameRunning = false;
var startButton;
var restartButton;

function hideEntity(el) {
  el.setAttribute('visible', false);
}

function showEntity(el) {
  el.setAttribute('visible', true);
}

function setupAllMenus() {
  menuStart     = document.getElementById('start-menu');
  menuGameOver  = document.getElementById('game-over');
  menuContainer = document.getElementById('menu-container');
  startButton   = document.getElementById('start-button');
  restartButton = document.getElementById('restart-button');

  showStartMenu();

  // Remove mouse event listeners since we're VR only
  startButton.classList.remove('clickable');
  restartButton.classList.remove('clickable');
  
  // Hide mouse-specific UI elements
  hideEntity(document.getElementById('cursor-mobile'));
}

function hideAllMenus() {
  hideEntity(menuContainer);
}

function showGameOverMenu() {
  showEntity(menuContainer);
  hideEntity(menuStart);
  showEntity(menuGameOver);
}

function showStartMenu() {
  showEntity(menuContainer);
  hideEntity(menuGameOver);
  showEntity(menuStart);
}

/******
 * UI *
 ******/

function setupCursor() {
  // Hide cursor for VR
  var cursor = document.getElementById('cursor-mobile');
  hideEntity(cursor);
}

function setupInstructions() {
  // Update instructions for VR
  const startCopy = document.getElementById('start-copy-desktop');
  const gameOverCopy = document.getElementById('game-over-copy-desktop');
  
  if (startCopy) {
    startCopy.setAttribute('value', 'Usa el joystick izquierdo para moverte\nPresiona A/X para empezar');
  }
  
  if (gameOverCopy) {
    gameOverCopy.setAttribute('value', 'Presiona A/X para jugar de nuevo');
  }
  
  // Hide mobile-specific UI since we're in VR mode
  hideEntity(document.getElementById('start-copy-mobile'));
  hideEntity(document.getElementById('game-over-copy-mobile'));
}

/********
 * GAME *
 ********/

function gameOver() {
  isGameRunning = false;

  showGameOverMenu();
  setupInstructions();
  teardownTrees();
  teardownScore();
}

function startGame() {
  if (isGameRunning) return;
  isGameRunning = true;

  hideAllMenus();
  setupScore();
  updateScoreDisplay();
  addTreesRandomlyLoop();
}

setupControls();

window.onload = function() {
  setupAllMenus();
  setupScore();
  setupTrees();
  setupInstructions();
  setupCursor();
}

/*************
 * UTILITIES *
 *************/

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
   var j, x, i;
   for (i = a.length - 1; i > 0; i--) {
       j = Math.floor(Math.random() * (i + 1));
       x = a[i];
       a[i] = a[j];
       a[j] = x;
   }
   return a;
}