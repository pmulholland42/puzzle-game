// Page variables
var canvas; 			// <canvas> HTML tag
var c;					// Canvas rendering context
var container;			// <div> HTML tag
var width = window.innerWidth;
var height = window.innerHeight;

// Player physics variables:
var playerX; // Player position
var playerY;
var playerLastX; // Previous position of player
var playerLastY;
var playerXSpeed = 0;	
var playerYSpeed = 0;
var grounded = false;
// Used for collision detection:
var playerWidth;
var playerHeight;
var adjustX;
var adjustY;
var offsetX; // Half of player width
var offsetY;

// Adjustable values:
var physicsTickRate = 300;	// Number of times physics is calculated per second (max 1000)
var graphicsTickRate = 200;	// Number of times canvas is refreshed per second (max 1000)
var inputTickRate = 100;	// Number of times per second the keyboard inputs are processed (max 1000)

var gravity = 100;			// Downward acceleration
var maxFallSpeed = 0.07;	// Terminal velocity
var moveSpeed = 0.028;		// Horizontal movement speed of player

var jumpSpeed = 15;
var jumping = false;
var jumpTimer = 0;
var maxJumpTime = 200;

var devMode = true; // Displays stats and shows grid
var solitaireMode = false; // Skips resetting the canvas

// Level data
var gridWidth = 32;
var gridHeight = 16;
var blockSize;
var grid;
var numBlockTypes = 5;
var blocks = {
	air: 0,
	stone: 1,
	rainbow: 2,
	breakable: 3,
	jumpPower: 4
}

// Power-ups
var powers = {
	none: 0,
	jump: 1,
	smash: 2
}
var power; // Currently held power-up

// Sprites
var character;

// Input variables
var heldKeys = {};		// heldKey[x] is true when the key with that keyCode is being held down

// FPS counter
var now;
var then = 0;
var frameCount = 0;
var fps = 0;

if (window.innerWidth/gridWidth > window.innerHeight/gridHeight) blockSize = window.innerHeight/gridHeight;
else blockSize = window.innerWidth/gridWidth;

function createArray(length)
{
	// stackoverflow.com/questions/966225
    var arr = new Array(length || 0);
    var i = length;

    if (arguments.length > 1)
	{
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }

    return arr;
}

function init()
{
	// Initialize the canvas
	console.log("Initializing...");
	setupCanvas();
	
	// Editor array 32*16
	grid = createArray(gridWidth, gridHeight);
	for (var x = 0; x < gridWidth; x++)
	{
		for (var y = 0; y < gridHeight; y++)
		{
			grid[x][y] = 0;
		}
	}
	
	character = document.createElement( 'img' );
	character.src = "sprites/character.png";
	
	playerX = 5;
	playerY = 5;
	power = powers.none;
	
	// Render the canvas
	draw();
	setInterval(draw, 1000/graphicsTickRate);
	setInterval(physics, 1000/physicsTickRate);
	setInterval(parseKeyboard, 1000/inputTickRate);
	setInterval(countFrames, 1000);
}


function setupCanvas()
{
	// Create a <canvas> HTML tag
    canvas = document.createElement( 'canvas' );
	canvas.width = window.innerWidth;				
	canvas.height = window.innerHeight;
	
	// Hide scroll bars - stackoverflow.com/questions/26745292
	document.body.style.overflow = 'hidden';
	
	// Get a CanvasRenderingContext2D on the canvas
	c = canvas.getContext( '2d' );
	
	// Create a <div> HTML tag called container
	container = document.createElement( 'div' );
	container.className = "container";
	
	// Put the canvas in the container
	container.appendChild(canvas);
	// Put the container on the page
	document.body.appendChild( container );
}

function resetCanvas (e)
{
	//console.log("Resetting canvas...");
 	// Resize the canvas - but remember - this clears the canvas too
  	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// Scroll to the top left.
	window.scrollTo(0,0);
}

// Called when mouse is held down
document.onmousedown = function(event)
{
	// Set this key as being held
	var xBlock = Math.floor(event.clientX / blockSize);
	var yBlock = Math.floor(event.clientY / blockSize);
	if (xBlock < 32 && yBlock < 16)
	{
		grid[xBlock][yBlock] = (grid[xBlock][yBlock] + 1) % numBlockTypes;
	}
	else
	{
		console.log("Clicked outside grid");
	}
}
// Called when a key is held down
document.onkeydown = function(event)
{
	// Set this key as being held
	heldKeys[event.keyCode] = true;
}
// Called when a key is released
document.onkeyup = function(event)
{
	// Unset this key
	heldKeys[event.keyCode] = false;
		jumpStart = Date.now();
}


// Interpret player input
function parseKeyboard()
{
	// Check the heldKeys array to see what the current input is
	if (heldKeys[65]) { // A
	}
	if (heldKeys[87]) { // W
	}
	if (heldKeys[68]) {	// D
	}
	if (heldKeys[32]) { // Spacebar
	}
	if (heldKeys[72])
	{
		solitaireMode = false;
	}
	if (heldKeys[74])
	{
		solitaireMode = true;
	}
	if (heldKeys[75]) // K
	{
		devMode = true;
	}
	if (heldKeys[76]) // L
	{
		devMode = false;
	}
}


// Calculate player physics
function physics() {

	// Gravity
	if (!jumping && playerYSpeed <= maxFallSpeed) {
		playerYSpeed += gravity / (Math.pow(physicsTickRate, 2));
		if (playerYSpeed > maxFallSpeed)
		{
			playerYSpeed = maxFallSpeed;
		}
	}
	
	// Jump
	if ((heldKeys[87] || heldKeys[32]) && jumpTimer > 0) // W or Spacebar
	{
		jumpTimer -= (1000/physicsTickRate);
		jumping = true;
		playerYSpeed = -jumpSpeed / physicsTickRate;
	}
	else
	{
		jumping = false;
	}
	
	if (!(heldKeys[87] || heldKeys[32]) && !grounded)
	{
		jumping = false;
		jumpTimer = 0;
	}
	
	// Movement
	if (heldKeys[65]) // A
	{
		playerXSpeed = -moveSpeed;
	}
	else if (heldKeys[68]) // D
	{
		playerXSpeed = moveSpeed;
	}
	else
	{
		playerXSpeed = 0;
	}

	// Move the player based on their current velocity
	playerLastX = playerX;
	playerLastY = playerY;
	playerX += playerXSpeed;
	playerY += playerYSpeed;
	
	// Assume the player is in the air unless the collide with the ground
	grounded = false;
	
	// Detect collision for each corner of the player's collision box
	for (var corner = 0; corner < 4; corner++)
	{
		// The offset and adjust values change depending on which corner of the player's hitbox is colliding.
		// The offset value tells you where the corner is in relation to the center of the player
		// The player coordinates are the center of the hitbox so the corners are left/right/up/down from that, depending on if the offset is negative
		// The adjust value is to account for the fact that the actual coordinate of a block is its top left corner
		// When we reset the player position, we want to put it next to the side it collided with, so we may have to add 1 to the block coordinate
		
		// Bottom right corner
		if (corner == 0) {
			offsetX = playerWidth/(blockSize*2);
			offsetY = playerHeight/(blockSize*2);
			adjustX = 0;
			adjustY = 0;
		}
		// Top right corner
		else if (corner == 1) {
			offsetX = playerWidth/(blockSize*2);
			offsetY = -playerHeight/(blockSize*2);
			adjustX = 0;
			adjustY = 1;
		} 
		// Top left corner
		else if (corner == 2) {
			offsetX = -playerWidth/(blockSize*2);
			offsetY = -playerHeight/(blockSize*2);
			adjustX = 1;
			adjustY = 1;
		}
		// Bottom left corner
		else if (corner == 3) {
			offsetX = -playerWidth/(blockSize*2);
			offsetY = playerHeight/(blockSize*2);
			adjustX = 1;
			adjustY = 0;
		}
		
		// Determine what block this corner is in
		pBlockX = Math.floor(playerX + offsetX);
		pBlockY = Math.floor(playerY + offsetY);
		
		// Make sure it's inbounds
		if (pBlockX >= 0 && pBlockX < gridWidth && pBlockY >= 0 && pBlockY < gridHeight)
		{	
			// Check if it is a solid block
			if (isSolid(grid[pBlockX][pBlockY]))
			{
				// If we are in a solid block, it's a collision
				// Check if we are colliding with the side or top/bottom of the block
				if (Math.floor(playerLastY+offsetY) == pBlockY && playerLastY+offsetY != pBlockY)
				{
					// Colliding with the side
					playerX = pBlockX + adjustX - offsetX;
					playerXSpeed = 0;
				} 
				else if (Math.floor(playerLastX+offsetX) == pBlockX && playerLastX+offsetX!= pBlockX)
				{
					// Colliding with the top or bottom
					playerY = pBlockY + adjustY - offsetY;
					playerYSpeed = 0;
					
					if (corner == 0 || corner == 3)
					{
						// If one of the bottom corners is colliding then the player is on a surface
						grounded = true;
						jumpTimer = maxJumpTime;
					}
					else
					{
						// If one of the top corners is colliding then the player is hitting their head on a block
						jumping = false;
						jumpTimer = 0;
					}
				}
			}
			// Check if it is a power up
			if (isPowerUp(grid[pBlockX][pBlockY]))
			{
				power = blockToPower(grid[pBlockX][pBlockY]);
				grid[pBlockX][pBlockY] = blocks.air;
			}
		}
		else
		{
			// Ceiling collision detection
			if (playerY + offsetY < 0)
			{
				playerY = -offsetY;
				playerYSpeed = 0;
			}
			// Ground collision detection
			else if (playerY + offsetY > gridHeight)
			{
				playerY = gridHeight - offsetY;
				playerYSpeed = 0;
				grounded = true;
				jumpTimer = maxJumpTime;
			}	
			// Left wall collision detection
			if (playerX + offsetX < 0)
			{
				playerX = -offsetX;
				playerXSpeed = 0;
			}
			// Right wall collision detection
			else if (playerX + offsetX > gridWidth)
			{
				playerX = gridWidth - offsetX;
				playerXSpeed = 0; 
			}
		}
	}
}


// Render the canvas - called every 20 ms
function draw() {
	
	if (window.innerWidth/gridWidth > window.innerHeight/gridHeight) 
	{
		// Screen is too wide, base the grid off screen height
		blockSize = window.innerHeight/gridHeight;
	}
	else
	{
		// Screen is not wide enough, base the grid off screen width
		blockSize = window.innerWidth/gridWidth;
	}
	playerWidth = blockSize*0.4635; // Golden ratio
	playerHeight = blockSize*0.75;
	offsetX = playerWidth/(blockSize*2);
	offsetY = playerHeight/(blockSize*2);
	
	if (!solitaireMode)
	{
		resetCanvas(); // TODO: make this faster
	}
	
	// Draw the blocks
	var red = 0;
	var green = 0;
	var blue = 0;
	for (var x = 0; x < gridWidth; x++)
	{
		for (var y = 0; y < gridHeight; y++)
		{
			var block = grid[x][y];
			if (block != blocks.air)
			{
				// Change the color depending on the block type
				if (block == blocks.stone)
				{
					c.fillStyle = "rgba(80, 80, 80, 1)"; // Dark gray
				}
				else if (block == blocks.rainbow)
				{
					red = Math.random() * 255;
					green = Math.random() * 255;
					blue = Math.random() * 255;
					c.fillStyle = "rgba(" + red + ", " + green + ", " + blue + ", 1)"; // Random color each frame
				}
				else if (block == blocks.breakable)
				{
					c.fillStyle = "rgba(175, 175, 210, 1)"; // Pale blue
				}
				else if (block == blocks.jumpPower)
				{
					c.fillStyle = "rgba(34, 139, 34, 1)"; // Green
				}
				// Draw the block
				c.fillRect(x * blockSize, y * blockSize, blockSize+1, blockSize+1);
			}
		}
	}
	
	// Draw grid lines
	if (devMode)
	{
		c.strokeStyle = "rgba(150, 150, 150, .3)";
		for (var x = 0; x <= gridWidth; x++)
		{
			c.beginPath();
			c.moveTo(x * blockSize, 0);
			c.lineTo(x * blockSize, blockSize * gridHeight);
			c.stroke();
		}
		for (var y = 0; y <= gridHeight; y++)
		{
			c.beginPath();
			c.moveTo(0, y * blockSize);
			c.lineTo(blockSize * gridWidth, blockSize * y);
			c.stroke();
		}
	}

	// Draw the floor
	c.fillStyle = "rgba(80, 80, 80, 1)";
	c.fillRect(0, blockSize * gridHeight, window.innerWidth, window.innerWidth - blockSize * gridHeight);
	
	// Draw the player
	c.fillStyle = "rgba(80, 80, 200, 1)";
	c.fillRect(playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight/2, playerWidth, playerHeight);
	c.drawImage(character, playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight/2, playerWidth, playerHeight);
	
	if (devMode)
	{
		// Red dot on player position
		c.fillStyle = "rgba(255, 80, 80, 1)";
		c.fillRect(playerX*blockSize-2, playerY*blockSize-2, 4, 4);
		
		// Display stats
		// X position and speed
		if (playerXSpeed > 0) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('X velocity: ' + playerXSpeed, 10, 40);
		c.fillText('X position: ' + playerX, 10, 60);
		
		// Y position and speed
		if (playerYSpeed > 0) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('Y velocity: ' + playerYSpeed, 10, 80);
		c.fillText('Y position: ' + playerY, 10, 100);
		
		// Grounded
		if (grounded) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('Grounded: ' + grounded, 10, 130);
		
		// Jumping
		if (jumping) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('Jumping: '+ jumping, 10, 150);
		
		// Power-up
		if (power != powers.none) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('Power: '+ power, 10, 170);
	}
}

function countFrames()
{
	now = Date.now();
	fps = Math.floor(frameCount/((now-then)/1000));
	then = now; // whoa, dude
	frameCount = 0;
}

// TODO: replace these helper functions with a class based system for block types
function isSolid(block)
{
	return !(block == blocks.air || block == blocks.jumpPower);
}
function isPowerUp(block)
{
	return block == blocks.jumpPower;
}
function blockToPower(block)
{
	return powers.jump;
}




