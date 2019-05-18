
// TODO contants for speeds etc.
// TODO enemies which shoot horizonal, vertical, and direct angle, all 3 diff primary colours (R, B, Y)
// TODO asteroids like roll around screen
// TODO particle emitters on destroy
// TOOD sound effects bsfx
// TODO points system
// TODO randomly generate more and more enemies, progressively get more hard
// TODO resizable game field to window size
// TODO starfield background, dark grey stars (not with entities since bad perf)
// TODO preload sound effects

function handle_hit( ent, hits ) {

    ent.trigger( 'Hit' );

    for ( var i = 0; i < hits.length; i++ ) {
        var hit = hits[i].obj;
        hit.trigger( 'Hit' );
    }

}

function shoot( ent ) {console.log("shoot");

    var bullet = Crafty.e( 'Bullet, 2D, Canvas, Color, Collision' );

    var distx = ent.w / 2;
    var disty = ent.h / 2;

    bullet.x = ent.x + distx;
    bullet.y = ent.y + disty;

    var r = ent.rotation * (Math.PI/180);
    bullet.x += (distx+10) * Math.cos( r );
    bullet.y += (distx+10) * Math.sin( r );

    bullet.rotation = ent.rotation;

    bullet.attr( {
        w: 5,
        h: 5
    } );

    bullet.color( 'yellow' );

    bullet.bind( 'UpdateFrame', function( state ) {

        var diffsecs = state.dt / 1000;

        this.diffv = 750;

        var r = this.rotation * (Math.PI/180);
        this.x += (this.diffv*Math.cos(r)) * diffsecs;
        this.y += (this.diffv*Math.sin(r)) * diffsecs;

        // TODO kill once off screen

    } );

    // TODO laser sound

}

function spawn_enemy() {

    var types = [ 'Horizontal', 'Vertical', 'Hunter' ];
    var type = types[Math.floor(Math.random()*types.length)];

    var dirs = [ 1, -1 ];
    var dir = dirs[Math.floor(Math.random()*dirs.length)];

    var enemy = Crafty.e( 'Enemy, 2D, Canvas, Color, Collision, ' + type )
        .attr( {
            x: 500,
            y: 200,
            w: 50,
            h: 20
        } )
        .origin( 'center' );

    type = 'Vertical';

    if ( 'Horizontal' == type ) {
        enemy.color( 'blue' );
        if ( dir > 0 ) {
            enemy.rotation = 180;
        } else {
            enemy.rotation = 0;
        }
    } else if ( 'Vertical' == type ) {
        enemy.color( 'green' );
        if ( dir > 0 ) {
            enemy.rotation = 270;
        } else {
            enemy.rotation = 90;
        }
    } else if ( 'Hunter' == type ) {
        enemy.color( 'red' );
    }

    enemy.diffshot = 0;

    enemy.bind( 'UpdateFrame', function( state ) {

        var diffsecs = state.dt / 1000;

        if ( 'Horizontal' == type ) {
            this.x -= 75 * diffsecs * dir;
        } else if ( 'Vertical' == type ) {
            this.y -= 75 * diffsecs * dir;
            // this.rotation = 270;
        } else if ( 'Hunter' == type ) {
            // TODO slowely aim toward player
            // TODO move forward
        }

        // Shoot at the player as fast as possible
        this.diffshot += diffsecs;
        if ( this.diffshot > 0.75 ) { // every 0.2 secs

            shoot( this );
            this.diffshot = 0;

        }

        // TODO kill once off screen

    } );

    enemy.bind( 'Hit', function() {
        console.log("enemy hit");

        // TODO particle emitter explosion
        // TODO explosion noise
        this.destroy();

    } );

    enemy.onHit( 'Bullet', function( hits ) {
        handle_hit( this, hits );
    } );

    enemy.onHit( 'Player', function( hits ) {
        handle_hit( this, hits );
    } );

}

function spawn_player() {

    var player = Crafty.e( 'Player, 2D, Canvas, Color, Collision, Keyboard' )
        .attr( {
            x: 100,
            y: 100,
            w: 50,
            h: 20
        } )
        .color( 'white' )
        .origin( 'center' );

    player.diffrot = 0;
    player.diffv = 0;
    player.diffshot = 0;

    player.bind( 'UpdateFrame', function( state ) {

        var diffsecs = state.dt / 1000;

        // Handle rotation

        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.LEFT_ARROW ) ) {
            this.diffrot += -3.0 * diffsecs;
        } else if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.RIGHT_ARROW ) ) {
            this.diffrot += 3.0 * diffsecs;
        }

        this.diffrot = Math.min( this.diffrot, 1 );
        this.diffrot = Math.max( this.diffrot, -1 );

        this.rotation = this.rotation + (this.diffrot*300) * diffsecs; // 300 degrees

        // Handle locomotion

        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.UP_ARROW ) ) {
            this.diffv += 3.0 * diffsecs;
        } else if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.DOWN_ARROW ) ) {
            this.diffv += -3.0 * diffsecs;
        }

        this.diffv = Math.min( this.diffv, 1 );
        this.diffv = Math.max( this.diffv, -1 );

        var r = this.rotation * (Math.PI/180);
        this.x = this.x + (this.diffv*350*Math.cos(r)) * diffsecs;
        this.y = this.y + (this.diffv*350*Math.sin(r)) * diffsecs;

        // Decay velocities

        this.diffrot *= 1.0 - ( 3.0 * diffsecs );  // 3.0 same as above
        this.diffv *= 1.0 - ( 3.0 * diffsecs );

        // handle shooting

        this.diffshot += diffsecs;
        if ( Crafty.s( 'Keyboard' ).isKeyDown( Crafty.keys.SPACE ) ) {
            if ( this.diffshot > 0.1 ) { // every 0.1 secs
                shoot( this );
                this.diffshot = 0;
            }
        }

    } );

    player.bind( 'Hit', function() {
        console.log("player hit");

        // TODO particle emitter explosion
        // TODO explosion noise
        this.destroy();

    } );

    player.onHit( 'Bullet', function( hits ) {
        handle_hit( this, hits );
    } );

    player.onHit( 'Enemy', function( hits ) {
        handle_hit( this, hits );
    } );

}

Crafty.init( 800, 600, document.getElementById('game') );
spawn_player();
spawn_enemy();
