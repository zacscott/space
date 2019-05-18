( function() {

// TODO enemy bullets to kill player only
// TODO hunter enemies which track player, rotating towards them
// TODO asteroids like roll around screen
// TODO particle emitters on destroy
// TODO points system
// TODO randomly generate more and more enemies, progressively get more hard
// TODO starfield background, dark grey stars (not with entities since bad perf)

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

ENEMY_HORIZONTAL_COLOR  = 'blue';
ENEMY_VERTICAL_COLOR    = 'green';

ENEMY_WIDTH        = 50;    // in pixels
ENEMY_HEIGHT       = 20;  

ENEMY_SPD_MAX      = 35;    // in pixels per second

ENEMY_SHOOT_SPD    = 0.75;  // shots per second

// END ENEMY CONFIG  ===============================================================================


// ENEMY CONFIG  ===================================================================================

BULLET_COLOR  = 'yellow';

BULLET_WIDTH    = 5;    // in pixels
BULLET_HEIGHT   = 2;  

BULLET_SPD_MAX  = 750;  // in pixels per second

BULLET_BUFFER   = 25;   // distance between parent ent and spawn point, in pixels

// END ENEMY CONFIG  ===============================================================================


// SPAWN RATES CONFIG  =============================================================================

SPAWN_INTERVAL    = 2.5  // enemy spawn rate in seconds
SPAWN_HUNTER_PROB = 0.25  // probability a hunter will spawn along with normal enemy

// END SPAWN RATES CONFIG  =========================================================================


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

    var enemy = Crafty.e( 'Entity, Enemy' )
        .attr( {
            w: ENEMY_WIDTH,
            h: ENEMY_HEIGHT,
            velocity: ENEMY_SPD_MAX
        } )
        .origin( 'center' );

    enemy.type = 'Enemy';

    // Set enemy params based on direction, spawn point etc
    if ( 'N' == dir ) {
        
        enemy.color( ENEMY_VERTICAL_COLOR );
        enemy.rotation = 270;

        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = gameHeight() + ENEMY_HEIGHT;

    } else if ( 'S' == dir ) {

        enemy.color( ENEMY_VERTICAL_COLOR );
        enemy.rotation = 90;

        enemy.x = parseInt( Math.random() * gameWidth() );
        enemy.y = -ENEMY_HEIGHT;

    } else if ( 'E' == dir ) {

        enemy.color( ENEMY_HORIZONTAL_COLOR );
        enemy.rotation = 0;

        enemy.x = -ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    } else if ( 'W' == dir ) {

        enemy.color( ENEMY_HORIZONTAL_COLOR );
        enemy.rotation = 180;

        enemy.x = gameWidth() + ENEMY_WIDTH;
        enemy.y = parseInt( Math.random() * gameHeight() );

    }

    enemy.bind( 'AfterUpdate', function( diffsecs ) {

        // Shoot at the player as fast as possible
        if ( this.diffshot > ( 1.0 / ENEMY_SHOOT_SPD ) ) {
            this.shoot();
            Crafty.audio.play( 'enemyShoot' );
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
        if ( 'Player' == hit.parent.type ) {
            Crafty.log( 'Enemy: killed' );

            // TODO particle emitter explosion
            // TODO count point

            Crafty.audio.play( 'enemyExplode' );

            this.destroy();

        }

        return this;

    } );

    Crafty.audio.play( 'enemySpawn' );
    Crafty.log( 'Enemy: spawned (dir='+ dir +')' );

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

    player.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        var keyboard = Crafty.s( 'Keyboard' );

        // Handle rotation

        var diffr = PLAYER_ROT_MAX * PLAYER_ROT_ACCEL * diffsecs;
        if ( keyboard.isKeyDown( Crafty.keys.RIGHT_ARROW ) ) {
            this.diffr += diffr;
        } else if ( keyboard.isKeyDown( Crafty.keys.LEFT_ARROW ) ) {
            this.diffr += -diffr;
        } else {
            // Otherwise decay the rotation
            this.diffr *= 1.0 - ( PLAYER_ROT_FRICTION * diffsecs );
        }

        this.diffr = Math.min( this.diffr, PLAYER_ROT_MAX );
        this.diffr = Math.max( this.diffr, -PLAYER_ROT_MAX );

        // Handle velocity & momentum

        var diffv = PLAYER_SPD_MAX * PLAYER_ACCEL * diffsecs;
        if ( keyboard.isKeyDown( Crafty.keys.UP_ARROW ) ) {
            this.diffv += diffv;
        } else if ( keyboard.isKeyDown( Crafty.keys.DOWN_ARROW ) ) {
            this.diffv += -diffv;
        } else {
            // Otherwise decay velocity
            this.diffv = -this.velocity * PLAYER_FRICTION;
        }

        return this;

    } );

    player.bind( 'UpdateAfterPhysics', function( diffsecs ) {

        // Limit the max speed of the player
        this.velocity = Math.min( this.velocity, PLAYER_SPD_MAX );
        this.velocity = Math.max( this.velocity, -PLAYER_SPD_MAX );

    } );

    player.bind( 'AfterUpdate', function( diffsecs ) {

        var keyboard = Crafty.s( 'Keyboard' );

        // Handle shooting

        if ( keyboard.isKeyDown( Crafty.keys.SPACE ) ) {
            if ( this.diffshot > ( 1.0 / PLAYER_SHOOT_SPD ) ) {
                this.shoot();
                Crafty.audio.play( 'playerShoot' );
            }
        }

    } );

    player.bind( 'Hit', function( hit ) {
        Crafty.log( 'Player: killed' );

        // TODO particle emitter explosion
        
        Crafty.audio.play( 'playerExplode' );

        this.destroy();

        gameShowScore();
        gameRestart();

        return this;

    } );

    Crafty.log( 'Player: spawned' );

}


/** GAME LOGIC ************************************************************************************/

function gameInit() {
    Crafty.log( 'Game: initialising' );

    Crafty.init( 
        gameWidth(), gameHeight(), 
        document.getElementById('game') 
    );

    defineEntityComponent();

    // Preload the game audio
    Crafty.audio.setChannels( 64 );
    Crafty.audio.add( { // TODO convert these to OGG
        playerShoot: [ 'sfx/playerShoot.wav' ],
        playerExplode: [ 'sfx/playerExplode.wav' ],
        enemySpawn: [ 'sfx/enemySpawn.wav' ],
        enemyShoot: [ 'sfx/enemyShoot.wav' ],
        enemyExplode: [ 'sfx/enemyExplode.wav' ],
    } );

}

function gameWidth() {
    return window.innerWidth;    
}

function gameHeight() {
    return window.innerHeight;   
}


function gameStart() {
    Crafty.log( 'Game: starting' );

    spawnPlayer();

    // Start up the game loop
    // Run one immediately then start it up on a timer
    gameLoop();
    setInterval( gameLoop, 1000 * SPAWN_INTERVAL );

}

function gameRestart() {
    Crafty.log( 'Game: restarting' );

    // Remove the game loop interval
    clearInterval( gameLoop );

    // Delete all entities to reset the game
    Crafty( 'Entity' ).each( function() { 
        this.destroy(); 
    } );

    // Start the game over again
    gameStart();

}

function gameShowScore() {

    alert( 'You suck' ); // TODO display points

}

function gameLoop() {

    spawnEnemy();

    // Spawn hunter randomly
    var dice = parseInt( Math.random() * SPAWN_HUNTER_PROB );
    if ( dice % SPAWN_HUNTER_PROB ) {
        // spawnHunter();
    }

}


/** BOOT ******************************************************************************************/

gameInit();
gameStart();


} )();