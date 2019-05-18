
// TODO contants for speeds etc.
// TODO enemies which shoot horizonal, vertical, and direct angle, all 3 diff primary colours (R, B, Y)
// TODO hunter enemies which track player, rotating towards them
// TODO asteroids like roll around screen
// TODO particle emitters on destroy
// TOOD sound effects bsfx
// TODO points system
// TODO randomly generate more and more enemies, progressively get more hard
// TODO preload sound effects
// TODO starfield background, dark grey stars (not with entities since bad perf)
// TODO wrap this in an anon function to prevent hacking

/** CONFIG ****************************************************************************************/


// PLAYER CONFIG  ==================================================================================

PLAYER_COLOR        = 'white';

PLAYER_WIDTH        = 50;   // in pixels
PLAYER_HEIGHT       = 20;  

PLAYER_SHOOT_SPD    = 10;   // shots per second

PLAYER_SPD_MAX      = 450;  // in pixels per second
PLAYER_ACCEL        = 16;   // acceleration multiplier (larger = faster)
PLAYER_FRICTION     = 4;    // friction multiplier (larger = faster)

PLAYER_ROT_MAX      = 540;  // degrees per second
PLAYER_ROT_ACCEL    = 2;    // rotation acceleration multiplier (larger = faster) 
PLAYER_ROT_FRICTION = 8;    // rotation friction multiplier (larger = faster) 

// END PLAYER CONFIG  ==============================================================================


/** ENTITIES **************************************************************************************/


/** Define the base Entity component used by all of our game ents */
function defineEntityComponent() {

    Crafty.c( 'Entity', {

        init: function() {

            this.addComponent( '2D, Canvas, Color, Collision' );

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

                that.trigger( 'Hit' );

                for ( var i = 0; i < hits.length; i++ ) {
                    var hit = hits[i].obj;
                    hit.trigger( 'Hit' );
                }

            } );

        },

        shoot: function() {
            spawnBullet( this );
            this.diffshot = 0;
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

    var distx = ent.w / 2;
    var disty = ent.h / 2;

    bullet.x = ent.x + distx;
    bullet.y = ent.y + disty;

    var r = ent.rotation * (Math.PI/180);
    bullet.x += (distx+15) * Math.cos( r );
    bullet.y += (distx+15) * Math.sin( r );

    bullet.rotation = ent.rotation;

    bullet.attr( {
        w: 5,
        h: 5
    } );

    bullet.velocity = 750;

    bullet.color( 'yellow' );

    bullet.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        // TODO kill once off screen

        return this;

    } );

    // TODO laser sound

    Crafty.log( 'Bullet: spawned' );

}

function spawnEnemy() {

    var dirs = [ 'N', 'S', 'E', 'W' ];
    var dir = dirs[Math.floor(Math.random()*dirs.length)];

    var enemy = Crafty.e( 'Entity, Enemy' )
        .attr( {
            x: 500,  // TODO spawn off screen, depending on direction
            y: 200,
            w: 50,
            h: 20
        } )
        .origin( 'center' );

    dir = 'S';

    if ( 'N' == dir ) {
        enemy.color( 'blue' );
        enemy.rotation = 270;
    } else if ( 'S' == dir ) {
        enemy.color( 'blue' );
        enemy.rotation = 90;
    } else if ( 'E' == dir ) {
        enemy.color( 'green' );
        enemy.rotation = 0;
    } else if ( 'W' == dir ) {
        enemy.color( 'green' );
        enemy.rotation = 180;
    }

    enemy.velocity = 25;

    enemy.bind( 'UpdateBeforePhysics', function( diffsecs ) {

        // Shoot at the player as fast as possible
        if ( this.diffshot > 0.75 ) { // every 0.2 secs
            this.shoot()
        }

        // TODO kill once off screen
        
        return this;

    } );

    enemy.bind( 'Hit', function() {
        Crafty.log( 'Enemy: killed' );

        // TODO particle emitter explosion
        // TODO explosion noise

        this.destroy();
        return this;

    } );

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

        // Handle shooting

        if ( keyboard.isKeyDown( Crafty.keys.SPACE ) ) {
            if ( this.diffshot > ( 1.0 / PLAYER_SHOOT_SPD ) ) {
                this.shoot();
            }
        }

        return this;

    } );

    player.bind( 'UpdateAfterPhysics', function( diffsecs ) {

        this.velocity = Math.min( this.velocity, PLAYER_SPD_MAX );
        this.velocity = Math.max( this.velocity, -PLAYER_SPD_MAX );

    } );

    player.bind( 'Hit', function() {
        Crafty.log( 'Player: killed' );

        // TODO particle emitter explosion
        // TODO explosion noise
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
        window.innerWidth, window.innerHeight, 
        document.getElementById('game') 
    );

    defineEntityComponent();

}

function gameStart() {
    Crafty.log( 'Game: starting' );

    gameLoop();

}

function gameRestart() {
    Crafty.log( 'Game: restarting' );

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

    spawnPlayer();
    spawnEnemy();

    // TODO setTimeout loop to spawn enemies

}


/** BOOT ******************************************************************************************/

gameInit();
gameStart();
