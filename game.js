( function() {


/** CONFIG ****************************************************************************************/


// PLAYER CONFIG  ==================================================================================

PLAYER_COLOR        = 'white';

PLAYER_WIDTH        = 50;   // in pixels
PLAYER_HEIGHT       = 20;

PLAYER_SHOOT_SPD    = 10;   // shots per second

PLAYER_SPD_MAX      = 450;  // in pixels per second
PLAYER_ACCEL        = 8;   // acceleration multiplier (larger = faster)
PLAYER_FRICTION     = 4;    // friction multiplier (larger = faster)

PLAYER_ROT_MAX      = 360;  // degrees per second
PLAYER_ROT_ACCEL    = 2;    // rotation acceleration multiplier (larger = faster)
PLAYER_ROT_FRICTION = 8;    // rotation friction multiplier (larger = faster)

// END PLAYER CONFIG  ==============================================================================


// ENEMY CONFIG  ===================================================================================

ENEMY_COLORS = [ 'red', 'green', 'blue' ];

ENEMY_WIDTH        = 50;    // in pixels
ENEMY_HEIGHT       = 20;

ENEMY_SPD_MAX      = 35;    // in pixels per second
ENEMY_SHOOT_SPD    = 0.33;  // shots per second

ENEMY_SPD_MAX      = 60;    // in pixels per second
HUNTER_SHOOT_SPD   = 0.25;  // shots per second

ENEMY_KILL_POINTS  = 250;   // points awarded for killing a normal enemy
HUNTER_KILL_POINTS = 1500;  // points awarded for killing a hunter

// END ENEMY CONFIG  ===============================================================================


// ENEMY CONFIG  ===================================================================================

BULLET_COLOR  = 'yellow';

BULLET_WIDTH    = 5;    // in pixels
BULLET_HEIGHT   = 2;

BULLET_SPD_MAX  = 750;  // in pixels per second

BULLET_BUFFER   = 25;   // distance between parent ent and spawn point, in pixels

// END ENEMY CONFIG  ===============================================================================


// SPAWN RATES CONFIG  =============================================================================

SPAWN_INTERVAL    = 0.85;           // enemy spawn rate in seconds
SPAWN_INTERVAL_MOBILE_MULT = 0.95;  // multiplier applied on mobile

SPAWN_HUNTER_PROB = 0.15;  // probability a hunter will spawn along with normal enemy
SPAWN_HUNTER_MAX  = 2;     // Max number of hunters to spawn at any given time

// END SPAWN RATES CONFIG  =========================================================================


/** STATE *****************************************************************************************/


var score = 0;  // the players score


var playerEntity = undefined; // the player entity object


/** ENTITIES **************************************************************************************/


/** Define the base Entity component used by all of our game ents */
function defineEntityComponent() {

    Crafty.c( 'Entity', {

        init: function() {

            this.addComponent( '2D, Canvas, Color, Collision' );

            this.type = 'Entity';

            this.origin( 'center' );
            this.x = this.y = 0;

            // Time since last shot fired
            this.diffshot = 0;

            // Set defaults for velocity
            this.velocity = 0;
            this.diffv = 0;

            // Set defaults for rotation
            this.rotation = 0;
            this.diffr = 0;

            // Handle hit detection/collisions
            var that = this;
            this.onHit( 'Entity', function( hits ) {

                for ( var i = 0; i < hits.length; i++ ) {
                    var hit = hits[i].obj;
                    that.trigger( 'Hit', hit );
                    hit.trigger( 'Hit', that );
                }

            } );

        },

        shoot: function() {
            spawnBullet( this );
            this.diffshot = 0;
        },

        isOnScreen: function() {
            // NOTE this uses a quick approximate, so it is far from pixel perfect

            var maxlength = this.w + this.h;

            var isOnScreen = this.within(
                -maxlength,
                -maxlength,
                gameWidth() + ( maxlength * 2 ),
                gameHeight() + ( maxlength * 2 )
            );

            return isOnScreen;

        },

        events: {

            UpdateFrame: function( state ) {

                var diffsecs = state.dt / 1000;

                this.trigger( 'BeforeUpdate', diffsecs );

                this.trigger( 'UpdateBeforePhysics', diffsecs );

                // Count time since last shot
                this.diffshot += diffsecs;

                // Rotate entity according to its diffr
                this.rotation += this.diffr * diffsecs;

                // Accelarate the entity according to its diffv
                this.velocity += this.diffv * diffsecs;

                this.trigger( 'UpdateAfterPhysics', diffsecs );

                // Move the entity in its current direction according to its velocity
                var r = this.rotation * ( Math.PI / 180 );
                this.x += ( this.velocity * Math.cos( r ) ) * diffsecs;
                this.y += ( this.velocity * Math.sin( r ) ) * diffsecs;

                this.trigger( 'AfterUpdate', diffsecs );

                return this;

            }

        }

    } );

}

function spawnExplosion( ent ) {

    var particles = Crafty.e( '2D, Canvas, Particles' );

    particles.x = ent.x;
    particles.y = ent.y;
    particles.w = 500; particles.h = 500;

    // parse the entities color, so we can match it
    var colorStart = [ 255, 255, 255, 1.0 ];
    var colorEnd = [ 255, 255, 255, 1.0 ];
    var cssColor = ent.color();
    var matches = cssColor.match( /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i );
    if ( matches ) {
        colorStart = [ matches[1], matches[2], matches[3], 1.0 ];
        colorEnd = [ matches[1], matches[2], matches[3], 0.0 ];
    }

    // Configure particle emitter to explode
    particles.particles( {
        fastMode: true,
        maxParticles: 22,
        size: 20,
        sizeRandom: 10,
        speed: 4,
        speedRandom: 1.2,
        angle: 0,
        angleRandom: 360,
        startColour: colorStart,
        startColourRandom: [0, 0, 0, 0],
        endColour: colorEnd,
        endColourRandom: [0, 0, 0, 0],
        spread: 40,
        lifeSpan: 30,
        lifeSpanRandom: 0,
        duration: 40,
        gravity: { x: 0, y: 0 },
        jitter: 2
    } );

}

function spawnBullet( ent ) {

    var bullet = Crafty.e( 'Entity, Bullet' );
    bullet.origin( 'center' );
    bullet.type = 'Bullet';
    bullet.color( 'yellow' );

    bullet.attr( {
        w: BULLET_WIDTH,
        h: BULLET_HEIGHT,
        rotation: ent.rotation,
        velocity: BULLET_SPD_MAX,
        parent: ent
    } );

    // calculate the bullets position based on parent entities position and rotation

    var distx = ent.w / 2;
    var disty = ent.h / 2;

    bullet.x = ent.x + distx;
    bullet.y = ent.y + disty;

    var r = ent.rotation * ( Math.PI / 180 );
    bullet.x += ( distx + BULLET_BUFFER ) * Math.cos( r );
    bullet.y += ( distx + BULLET_BUFFER ) * Math.sin( r );
        // we add the BULLET_BUFFER here to ensure we don't immediately collide with the parent ent


    bullet.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        // Destroy enemy once off screen
        if ( ! this.isOnScreen() ) {
            this.destroy();
        }

        return this;

    } );

    // Crafty.log( 'Bullet: spawned' );

}

function spawnEnemy() {

    // Select a random direction for the enemy
    var dirs = [ 'N', 'S', 'E', 'W' ];
    var dir = dirs[ Math.floor( Math.random() * dirs.length ) ];

    // Select random colour for enemy
    window.enemyColorIndex = window.enemyColorIndex || 0;
    var color = ENEMY_COLORS[ ( window.enemyColorIndex++ ) % ENEMY_COLORS.length ];

    var enemy = Crafty.e( 'Entity, Enemy' )
        .attr( {
            w: ENEMY_WIDTH,
            h: ENEMY_HEIGHT,
            velocity: ENEMY_SPD_MAX
        } )
        .origin( 'center' );

    enemy.type = 'Enemy';
    enemy.color( color );

    // Set enemy params based on direction, spawn point etc
    if ( 'N' == dir ) {

        enemy.rotation = 270;
        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = gameHeight() + ENEMY_HEIGHT;

    } else if ( 'S' == dir ) {

        enemy.rotation = 90;
        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = -ENEMY_HEIGHT;

    } else if ( 'E' == dir ) {

        enemy.rotation = 0;
        enemy.x = -ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    } else if ( 'W' == dir ) {

        enemy.rotation = 180;
        enemy.x = gameWidth() + ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    }

    enemy.bind( 'AfterUpdate', function( diffsecs ) {

        // Shoot at the player as fast as possible
        if ( this.diffshot > ( 1.0 / ENEMY_SHOOT_SPD ) ) {
            this.shoot();
            Crafty.audio.play( 'enemyShoot', 1, 0.5 );
        }

        // Destroy enemy once off screen
        if ( ! this.isOnScreen() ) {
            Crafty.log( 'Enemy: despawned' );
            this.destroy();
        }

        return this;

    } );

    enemy.bind( 'Hit', function( hit ) {

        // If collided with players bullet, then we die
        if ( undefined != hit.parent && 'Player' == hit.parent.type ) {
            Crafty.log( 'Enemy: killed' );

            spawnExplosion( this );

            gameScorePoints( ENEMY_KILL_POINTS );

            Crafty.audio.play( 'enemyExplode' );

            this.destroy();

        }

        return this;

    } );

    // Crafty.audio.play( 'enemySpawn' );
    Crafty.log( 'Enemy: spawned (dir='+ dir +')' );

}

function spawnHunter() {

    // Select a random direction for the enemy
    var dirs = [ 'N', 'S', 'E', 'W' ];
    var dir = dirs[ Math.floor( Math.random() * dirs.length ) ];

    var enemy = Crafty.e( 'Entity, Enemy, Hunter' )
        .attr( {
            w: ENEMY_WIDTH,
            h: ENEMY_HEIGHT,
            velocity: ENEMY_SPD_MAX
        } )
        .origin( 'center' );

    enemy.type = 'Enemy';
    enemy.color( '#f0f' );

    // Set enemy params based on direction, spawn point etc
    if ( 'N' == dir ) {

        enemy.rotation = 270;
        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = gameHeight() + ENEMY_HEIGHT;

    } else if ( 'S' == dir ) {

        enemy.rotation = 90;
        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = -ENEMY_HEIGHT;

    } else if ( 'E' == dir ) {

        enemy.rotation = 0;
        enemy.x = -ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    } else if ( 'W' == dir ) {

        enemy.rotation = 180;
        enemy.x = gameWidth() + ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    }

    enemy.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        var player = gamePlayerEntity();

        var deltaX = player.x - this.x;
        var deltaY = player.y - this.y;
        var rad = Math.atan2( deltaY, deltaX );

        this.rotation = rad * ( 180 / Math.PI );

        return this;

    } );

    enemy.bind( 'AfterUpdate', function( diffsecs ) {

        // Shoot at the player as fast as possible
        if ( this.diffshot > ( 1.0 / ENEMY_SHOOT_SPD ) ) {
            this.shoot();
            Crafty.audio.play( 'hunterShoot' );
        }

        return this;

    } );

    enemy.bind( 'Hit', function( hit ) {

        // If collided with players bullet, then we die
        if ( undefined != hit.parent && 'Player' == hit.parent.type ) {
            Crafty.log( 'Hunter: killed' );

            spawnExplosion( this );

            gameScorePoints( HUNTER_KILL_POINTS );

            Crafty.audio.play( 'hunterExplode' );

            this.destroy();

        }

        return this;

    } );

    Crafty.audio.play( 'hunterSpawn' );
    Crafty.log( 'Hunter: spawned' );

}

function spawnPlayer() {

    var player = Crafty.e( 'Entity, Player, Keyboard' )
        .attr( {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            w: PLAYER_WIDTH,
            h: PLAYER_HEIGHT
        } )
        .color( PLAYER_COLOR )
        .origin( 'center' );

    player.type = 'Player';
    player.rotation = 270;

    player.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        var keyboard = Crafty.s( 'Keyboard' );
        var mouse = Crafty.s( 'Mouse' );

        var isTouch = gameIsMobile() && mouse.isButtonDown( 'LEFT' );

        // Handle rotation

        var diffr = PLAYER_ROT_MAX * PLAYER_ROT_ACCEL * diffsecs;
        if ( keyboard.isKeyDown( Crafty.keys.D ) || keyboard.isKeyDown( Crafty.keys.RIGHT_ARROW ) ) {
            this.diffr += diffr;
        } else if ( keyboard.isKeyDown( Crafty.keys.A ) || keyboard.isKeyDown( Crafty.keys.LEFT_ARROW ) ) {
            this.diffr += -diffr;
        } else {
            // Otherwise decay the rotation
            this.diffr *= 1.0 - ( PLAYER_ROT_FRICTION * diffsecs );
        }

        this.diffr = Math.min( this.diffr, PLAYER_ROT_MAX );
        this.diffr = Math.max( this.diffr, -PLAYER_ROT_MAX );

        // Handle velocity & momentum

        var diffv = PLAYER_SPD_MAX * PLAYER_ACCEL * diffsecs;
        if ( keyboard.isKeyDown( Crafty.keys.W ) || keyboard.isKeyDown( Crafty.keys.UP_ARROW )) {
            this.diffv += diffv;
        } else if ( keyboard.isKeyDown( Crafty.keys.S ) || keyboard.isKeyDown( Crafty.keys.DOWN_ARROW ) ) {
            this.diffv += -diffv;
        } else if ( isTouch ) {
            this.diffv += diffv;
        } else {
            // Otherwise decay velocity
            this.diffv = -this.velocity * PLAYER_FRICTION;
        }

        // Handle touch controls
        if ( isTouch ) {
            if ( mouse.lastMouseEvent ) {
                var x = mouse.lastMouseEvent.realX;
                var y = mouse.lastMouseEvent.realY;

                var deltaX = x - player.x;
                var deltaY = y - player.y;
                var rad = Math.atan2( deltaY, deltaX );

                this.rotation = rad * ( 180 / Math.PI );

            }
        }

        return this;

    } );

    player.bind( 'UpdateAfterPhysics', function( diffsecs ) {

        // Limit the max speed of the player
        this.velocity = Math.min( this.velocity, PLAYER_SPD_MAX );
        this.velocity = Math.max( this.velocity, -PLAYER_SPD_MAX );

        // If offscreen, roll around to the other side, like asteroids

        var maxlength = this.w + this.h;

        if ( this.x < -maxlength ) { // offscreen left
            this.x = gameWidth() + maxlength;
        }

        if ( this.x > ( gameWidth() + maxlength ) ) { // offscreen right
            this.x = -maxlength;
        }

        if ( this.y < -maxlength ) { // offscreen top
            this.y = gameHeight() + maxlength;
        }

        if ( this.y > ( gameHeight() + maxlength ) ) { // offscreen bottom
            this.y = -maxlength;
        }

    } );

    player.bind( 'AfterUpdate', function( diffsecs ) {

        var keyboard = Crafty.s( 'Keyboard' );
        var mouse = Crafty.s( 'Mouse' );

        // Handle shooting

        var isTouch = gameIsMobile() && mouse.isButtonDown( 'LEFT' );

        if ( keyboard.isKeyDown( Crafty.keys.SPACE ) || isTouch ) {
            if ( this.diffshot > ( 1.0 / PLAYER_SHOOT_SPD ) ) {
                this.shoot();
                Crafty.audio.play( 'playerShoot', 1, 0.75 );
            }
        }

    } );

    player.bind( 'Hit', function( hit ) {
        Crafty.log( 'Player: killed' );

        Crafty.audio.play( 'playerExplode' );

        this.destroy();

        gameShowScore();
        gameRestart();

        return this;

    } );

    Crafty.log( 'Player: spawned' );
    return player;

}

function spawnScoreboard() {

    var scoreboard = Crafty.e( '2D, Canvas, Text, Scoreboard' );
    scoreboard.x = 20;
    scoreboard.y = 20;

    scoreboard.textColor( 'white' );

    scoreboard.textFont( {
        size:   '32px',
        weight: 'bold',
        family: 'monospace'
    } );

}


/** GAME LOGIC ************************************************************************************/


function gameInit() {
    Crafty.log( 'Game: initialising' );

    Crafty.init(
        gameWidth(), gameHeight(),
        document.getElementById('game')
    );

    Crafty.multitouch( false );

    // Crafty.viewport.scale(0.5);

    // Add flag to DOM for mobile v desktop devices
    if ( gameIsMobile() ) {
        document.body.className = 'mobile';
    } else {
        document.body.className = 'desktop';
    }

    gameLoadAudio();

    defineEntityComponent();
    spawnScoreboard();

}

function gameLoadAudio() {

    var sfx = {
        playerShoot: [
            'sfx/playerShoot.ogg',
            'sfx/playerShoot.wav'
        ],
        playerExplode: [
            'sfx/playerExplode.ogg',
            'sfx/playerExplode.wav'
        ],
        enemyShoot: [
            'sfx/enemyShoot.ogg',
            'sfx/enemyShoot.wav'
        ],
        enemyExplode: [
            'sfx/enemyExplode.ogg',
            'sfx/enemyExplode.wav'
        ],
        hunterSpawn: [
            'sfx/hunterSpawn.ogg',
            'sfx/hunterSpawn.wav'
        ],
        hunterShoot: [
            'sfx/hunterShoot.ogg',
            'sfx/hunterShoot.wav'
        ],
        hunterExplode: [
            'sfx/hunterExplode.ogg',
            'sfx/hunterExplode.wav'
        ]
    };

    // Preload audio files
    for ( var key in sfx ) {
        var audio = new Audio( sfx[key][0] );
    }

    // Load in Crafty
    Crafty.audio.setChannels( 64 );
    Crafty.audio.add( sfx );

}

function gameWidth() {
    return window.innerWidth;
}

function gameHeight() {
    return window.innerHeight;
}

function gamePlayerEntity() {
    return playerEntity;
}

 function gameIsMobile() {

    var isMobile =  navigator.userAgent.match( /Android/i )
        || navigator.userAgent.match( /webOS/i )
        || navigator.userAgent.match( /iPhone/i )
        || navigator.userAgent.match( /iPad/i )
        || navigator.userAgent.match( /iPod/i )
        || navigator.userAgent.match( /BlackBerry/i )
        || navigator.userAgent.match( /Windows Phone/i );

    return isMobile;

}

function gameStart() {
    Crafty.log( 'Game: starting' );

    playerEntity = spawnPlayer();

    // Spawn the first hunter
    // setTimeout( function() {  // NOTE I think this might be a bit too harsh
    //     spawnHunter();
    // }, 1000 );

    // Start up the game loop
    // Run one immediately then start it up on a timer

    gameLoop();

    var spawnInterval = 1000 * SPAWN_INTERVAL;
    if ( gameIsMobile() ) {
        spawnInterval *= SPAWN_INTERVAL_MOBILE_MULT;
    }
    window.gameLoopInterval = setInterval( gameLoop, spawnInterval );

    // Initialise the scoreboard
    score = 0;
    gameScorePoints( 0 ); // force render

}

function gameRestart() {
    Crafty.log( 'Game: restarting' );

    // Remove the game loop interval
    clearInterval( window.gameLoopInterval );

    // Delete all entities to reset the game
    Crafty( 'Entity' ).each( function() {
        this.destroy();
    } );

    // Start the game over again
    gameStart();

}

function gameScore() {

    return score;

}

function gameScorePoints( points ) {

    score += points;

    // Update the scoreboard
    var scoreboard = Crafty( 'Scoreboard' );
    scoreboard.text( 'SCORE: ' + score );

}

function gameShowScore() {

    alert( 'Noice try. You scored ' + score + ' points' ); // TODO display points

}

function gameLoop() {

    spawnEnemy();

    // Spawn hunter randomly, up to the maximum
    var dice = parseInt( Math.random() * ( 1 / SPAWN_HUNTER_PROB ) );
    if ( ! dice ) {

        var hunters = Crafty( 'Hunter' );
        if ( hunters.length < SPAWN_HUNTER_MAX ) {
            spawnHunter();
        }

    }

}


/** BOOT ******************************************************************************************/


gameInit();

if ( ! gameIsMobile() ) {
    alert( "Press WASD to move, SPACE to shoot." );
} else {
    alert( "Touch where you want to fly." );
}

gameStart();


} )();
