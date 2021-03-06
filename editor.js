// Page variables
var canvas; 			// <canvas> HTML tag
var c;					// Canvas rendering context
var container;			// <div> HTML tag

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
var physicsTickRate = 500; // Number of times physics is calculated per second (max 1000)
var graphicsTickRate = 250; // Number of times canvas is refreshed per second (max 1000)

var gravity = 30; // Downward acceleration (blocks per second^2)
var maxFallSpeed = 9; // Terminal velocity (blocks per second)
var moveSpeed = 3.5; // Horizontal movement speed of player (blocks per second)

var jumpSpeed = 9; // Vertical speed in blocks per second.
var jumpHeight = 3; // Height in blocks. The player can jump higher than this though because gravity takes time to slow them.
var jumpTimer = 0; // Used to track how long the player is jumping.
var maxJumpTime = jumpHeight/jumpSpeed; // How long the player can go up (seconds) before gravity starts working on them.
var jumping = false;
var canJump = true;

var devMode = true; // Displays stats and shows grid

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
var controls = {
	left: 65, // A
	right: 68, // D
	jump: 87, // W
	devMode: 76 // L
}

// Physics timing
var now = Date.now();
var then = now;
var deltaT;

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
}


function setupCanvas()
{
	// Create a <canvas> HTML tag
    canvas = document.createElement('canvas');
	
	// Hide scroll bars
	document.body.style.overflow = 'hidden';
	
	// Get a CanvasRenderingContext2D on the canvas
	c = canvas.getContext('2d');
	
	// Create a <div> HTML tag called container
	container = document.createElement('div');
	container.className = "container";
	
	// Put the canvas in the container
	container.appendChild(canvas);
	// Put the container on the page
	document.body.appendChild(container);
	
	// Set up click listender on the canvas
	canvas.addEventListener('click', editBlock, false);
}

// Changes block type when clicked on
function editBlock(event)
{
	var xBlock = Math.floor((event.pageX - canvas.offsetLeft) / blockSize);
	var yBlock = Math.floor((event.pageY - canvas.offsetTop) / blockSize);
	
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
	
	switch (event.keyCode)
	{
		case controls.devMode:
			devMode = !devMode;
			break;
	}
}
// Called when a key is released
document.onkeyup = function(event)
{
	// Unset this key
	heldKeys[event.keyCode] = false;
	
	switch (event.keyCode)
	{
		case controls.jump:
			// You can only jump again once you release the jump key and press it again
			canJump = true;
			// Letting go of the jump key while going up ends the jump
			if (playerYSpeed <= 0)
			{
				playerYSpeed = 0;
				jumping = false;
				jumpTimer = 0;
			}
			break;
	}
}

// Calculate player physics
function physics()
{
	// Calculate the time since the last physics update
	now = Date.now();
	deltaT = (now - then)/1000;

	// Gravity
	if (!jumping && playerYSpeed <= maxFallSpeed) {
		playerYSpeed += gravity * deltaT;
		if (playerYSpeed > maxFallSpeed)
		{
			playerYSpeed = maxFallSpeed;
		}
	}
	
	// Jump
	if (heldKeys[controls.jump] && jumpTimer > 0 && ((canJump && grounded) || jumping)) // W or Spacebar
	{
		jumpTimer -= deltaT;
		jumping = true;
		canJump = false;
		playerYSpeed = -jumpSpeed;
	}
	else
	{
		jumping = false;
	}
	
	// Movement
	if (heldKeys[controls.left]) // A
	{
		playerXSpeed = -moveSpeed;
	}
	else if (heldKeys[controls.right]) // D
	{
		playerXSpeed = moveSpeed;
	}
	else
	{
		playerXSpeed = 0;
	}

	// Move the player based on their current velocity.
	playerLastX = playerX;
	playerLastY = playerY;
	playerX += playerXSpeed * deltaT;
	playerY += playerYSpeed * deltaT;
	
	// Assume the player is in the air unless they collide with the ground.
	grounded = false;
	
	// Detect collision for each corner of the player's collision box.
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
				jumping = false;
				jumpTimer = 0;
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
	
	// Reset the physics timer
	then = now;
}


// Render the canvas - called every 20 ms
function draw()
{
	if (window.innerWidth/gridWidth > window.innerHeight/gridHeight) 
	{
		// Screen is too wide, base the grid off screen height
		// Should see walls
		blockSize = window.innerHeight/gridHeight;
	}
	else
	{
		// Screen is not wide enough, base the grid off screen width
		// Should see floor
		blockSize = window.innerWidth/gridWidth;
	}
	
	canvas.width = blockSize * gridWidth;
	canvas.height = blockSize * gridHeight;
	
	playerWidth = blockSize*0.4635; // Golden ratio
	playerHeight = blockSize*0.75;
	offsetX = playerWidth/(blockSize*2);
	offsetY = playerHeight/(blockSize*2);
	
	// Draw the background
	c.fillStyle = "rgba(255, 255, 255, 1)";
	c.fillRect(0, 0, canvas.width, canvas.height);
	
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
			c.lineTo(x * blockSize, canvas.height);
			c.stroke();
		}
		for (var y = 0; y < gridHeight; y++)
		{
			c.beginPath();
			c.moveTo(0, y * blockSize);
			c.lineTo(canvas.width, blockSize * y);
			c.stroke();
		}
	}
	
	// Draw the player
	c.fillStyle = "rgba(80, 80, 200, 1)";
	c.fillRect(playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight/2, playerWidth, playerHeight);
	c.drawImage(character, playerX*blockSize-playerWidth/2, playerY*blockSize-playerHeight/2, playerWidth, playerHeight);
	
	if (devMode)
	{
		// Red dot on player position
		c.fillStyle = "rgba(255, 80, 80, 1)";
		c.fillRect(playerX*blockSize-2, playerY*blockSize-2, 4, 4);
		
		// Debug stats:
		// X position and speed
		if (playerXSpeed > 0)
			c.fillStyle = "green";
		else if (playerXSpeed < 0)
			c.fillStyle = "red";
		else
			c.fillStyle = "black";
		c.fillText('X velocity: ' + playerXSpeed, 10, 40);
		c.fillText('X position: ' + playerX, 10, 60);
		
		// Y position and speed
		if (playerYSpeed < 0)
			c.fillStyle = "green";
		else if (playerYSpeed > 0)
			c.fillStyle = "red";
		else
			c.fillStyle = "black";
		c.fillText('Y velocity: ' + playerYSpeed, 10, 80);
		c.fillText('Y position: ' + playerY, 10, 100);
		
		// Grounded
		if (grounded)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Grounded: ' + grounded, 10, 130);
		
		// Jumping
		if (jumping)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Jumping: '+ jumping, 10, 150);
		
		// Can Jump
		if (canJump)
			c.fillStyle = "green";
		else
			c.fillStyle = "red";
		c.fillText('Can Jump: '+ canJump, 10, 170);
		
		// Power-up
		if (power != powers.none) c.fillStyle = "green";
		else c.fillStyle = "red";
		c.fillText('Power: '+ power, 10, 190);
		
		// Screen size
		c.fillStyle = "black";
		c.fillText('Canvas width: '+ canvas.width, 10, 230);
		c.fillText('Window width: ' + window.innerWidth, 10, 250);
		c.fillText('Canvas height: ' + canvas.height, 10, 270);
		c.fillText('Window height: ' + window.innerHeight, 10, 290);

	}
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




