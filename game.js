
// TODO contants for speeds etc.
// TODO enemies which shoot horizonal, vertical, and direct angle, all 3 diff primary colours (R, B, Y)
// TODO asteroids like roll around screen
// TODO particle emitters on destroy
// TOOD sound effects bsfx
// TODO points system
// TODO randomly generate more and more enemies, progressively get more hard
// TODO preload sound effects
// TODO starfield background, dark grey stars (not with entities since bad perf)
// TODO wrap this in an anon function to prevent hacking

function init() {

    Crafty.init( 
        window.innerWidth, window.innerHeight, 
        document.getElementById('game') 
    );

    defineEntityComponent();

}

/** Define the base Entity component used by all of our game ents */
function defineEntityComponent() {

    Crafty.c( 'Entity', {

        init: function() {

            this.addComponent( '2D, Canvas, Color, Collision' );

            this.origin( 'center' );

            this.x = 0;
            this.y = 0;

            // Set defaults for velocity
            this.attr( {
                velocity: 0,
                diffv: 0
            } );

            // Set defaults for rotation
            this.rotation = 0;
            this.diffr = 0;

        },

        events: {

            UpdateFrame: function( state ) {

                var diffsecs = state.dt / 1000;

                this.trigger( 'UpdateEntity', diffsecs );

                // Count time since last shot
                // TODO shoot() method which auto decrements this

                // Rotate entity according to its diffr
                this.rotation += this.diffr * diffsecs;

                // Accelarate the entity according to its diffv
                this.velocity += this.diffv * diffsecs;

                // Move the entity in its current direction according to its velocity
                var r = this.rotation * ( Math.PI / 180 );
                this.x += ( this.velocity * Math.cos( r ) ) * diffsecs;
                this.y += ( this.velocity * Math.sin( r ) ) * diffsecs;

                return this;

            }

        }

    } );

}

function handle_hit( ent, hits ) {

    ent.trigger( 'Hit' );

    for ( var i = 0; i < hits.length; i++ ) {
        var hit = hits[i].obj;
        hit.trigger( 'Hit' );
    }

}

function shoot( ent ) {
    Crafty.log( "shoot" );

    var bullet = Crafty.e( 'Entity, Bullet' );

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

    bullet.bind( 'UpdateEntity', function( diffsecs ) {

        // TODO kill once off screen

        return this;

    } );

    // TODO laser sound

}

function spawn_enemy() {

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
    enemy.diffshot = 0;

    enemy.bind( 'UpdateEntity', function( diffsecs ) {

        // Shoot at the player as fast as possible
        this.diffshot += diffsecs;
        if ( this.diffshot > 0.75 ) { // every 0.2 secs

            shoot( this );
            this.diffshot = 0;

        }

        // TODO kill once off screen
        
        return this;

    } );

    enemy.bind( 'Hit', function() {
        console.log("enemy hit");

        // TODO particle emitter explosion
        // TODO explosion noise

        this.destroy();
        return this;

    } );

    enemy.onHit( 'Bullet', function( hits ) {
        handle_hit( this, hits );
        return this;
    } );

    enemy.onHit( 'Player', function( hits ) {
        handle_hit( this, hits );
        return this;
    } );

}

function spawn_player() {

    var player = Crafty.e( 'Entity, Player, Keyboard' )
        .attr( {
            x: 100,
            y: 100,
            w: 50,
            h: 20
        } )
        .color( 'white' )
        .origin( 'center' );

    player.diffshot = 0;

    player.bind( 'UpdateEntity', function( diffsecs ) {

        // Handle rotation

        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.LEFT_ARROW ) ) {
            this.diffr -= 720 * diffsecs;
        } else if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.RIGHT_ARROW ) ) {
            this.diffr += 720 * diffsecs;
        } else {
            // Otherwise decay the rotation
            this.diffr *= 1.0 - ( 2.0 * diffsecs );  // 720/360 same as above
        }

        // Handle velocity/movement

        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.UP_ARROW ) ) {
            this.diffv += 350*4 * diffsecs;
        } else if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.DOWN_ARROW ) ) {
            this.diffv += -350*4 * diffsecs;
        } else {
            // Otherwise decay velocity
            this.diffv *= 1.0 - ( 3.0 * diffsecs );
        }

        this.diffv = Math.min( this.diffv, 350 );
        this.diffv = Math.max( this.diffv, -350 );

        // Handle shooting

        this.diffshot += diffsecs; // TODO move this to Entity?
        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.SPACE ) ) {
            if ( this.diffshot > 0.1 ) { // every 0.1 secs
                shoot( this );
                this.diffshot = 0;
            }
        }

        return this;

    } );

    player.bind( 'Hit', function() {
        console.log("player hit");

        // TODO particle emitter explosion
        // TODO explosion noise
        this.destroy();

        return this;

    } );

    player.onHit( 'Bullet', function( hits ) { // TODO move this to entity
        handle_hit( this, hits );
    } );

    player.onHit( 'Enemy', function( hits ) {
        handle_hit( this, hits );
    } );

}

init();
spawn_player();
spawn_enemy();
