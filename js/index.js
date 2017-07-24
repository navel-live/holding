'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

console.clear();

var mesh = undefined;
var cloth = undefined;
var spacingX = 20;
var spacingY = 20;
var accuracy = 20;

var opts = {
  image: 'coming.svg',
  gravity: 860,
  friction: 0.99,
  bounce: 2,
  pointsX: 50,
  pointsY: 65,
  renderCloth: false,
  mouseInfluence: 175,
  pinCorners: true,
  randomImage: function randomImage() {
    this.image = 'https://unsplash.it/400/400?image=' + Math.floor(Math.random() * 1100);
    loadTexture();
  }
};

// var gui = new dat.GUI();
// gui.closed = window.innerWidth < 600;
// var renderCloth = gui.add(opts, 'renderCloth');

// var image = gui.add(opts, 'image', {
//   Face: 'shadow.png',
//   Water: 'https://unsplash.it/400/400?image=1053',
//   YellowCurtain: 'https://unsplash.it/400/400?image=855',
//   Tunnel: 'https://unsplash.it/400/400?image=137'
// });
// image.onChange(loadTexture);

// var random = gui.add(opts, 'randomImage');
// var influence = gui.add(opts, 'mouseInfluence', 0, 200).step(1);
// var gravity = gui.add(opts, 'gravity', 0, 1000).step(20);
// var friction = gui.add(opts, 'friction', 0.5, 1).step(0.005);
// var bounce = gui.add(opts, 'bounce', 0, 2).step(0.1);

// var pin = gui.add(opts, 'pinCorners');
// pin.onChange(loadTexture);

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
document.body.appendChild(canvas);

ctx.strokeStyle = '#555';

var mouse = {

  down: false,
  x: 0,
  y: 0,
  px: 0,
  py: 1
};

/*////////////////////////////////////////*/

var stage = new PIXI.Container();
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, { transparent: true });

document.body.insertBefore(renderer.view, canvas);
renderer.render(stage);

canvas.width = renderer.width;
canvas.height = renderer.height;

/*////////////////////////////////////////*/

function loadTexture() {

  console.log('loading texture', opts.image);

  document.body.className = 'loading';

  var texture = new PIXI.Texture.fromImage(opts.image);
  if (!texture.requiresUpdate) {
    texture.update();
  }

  texture.on('error', function () {
    console.error('AGH!');
  });

  texture.on('update', function () {
    document.body.className = '';

    console.log('texture loaded');

    if (mesh) {
      stage.removeChild(mesh);
    }

    mesh = new PIXI.mesh.Plane(this, opts.pointsX, opts.pointsY);
    mesh.width = this.width;
    mesh.height = this.height;

    spacingX = mesh.width / (opts.pointsX - 1);
    spacingY = mesh.height / (opts.pointsY - 1);

    cloth = new Cloth(opts.pointsX - 1, opts.pointsY - 1, !opts.pinCorners);

    stage.addChild(mesh);
  });
}

loadTexture(opts.image);

;(function update() {
  requestAnimationFrame(update);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (cloth) {
    cloth.update(0.016);
  }
  renderer.render(stage);
})(0);

/*////////////////////////////////////////*/

var Point = function () {
  function Point(x, y) {
    _classCallCheck(this, Point);

    this.x = x;
    this.y = y;
    this.px = x;
    this.py = y;
    this.vx = 0;
    this.vy = 0;
    this.pinX = null;
    this.pinY = null;

    this.constraints = [];
  }

  Point.prototype.update = function update(delta) {
    if (this.pinX && this.pinY) return this;

    if (mouse.down) {
      var dx = this.x - mouse.x;
      var dy = this.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (mouse.button === 1 && dist < opts.mouseInfluence) {
        this.px = this.x - (mouse.x - mouse.px);
        this.py = this.y - (mouse.y - mouse.py);
      } else if (dist < mouse.cut) {
        this.constraints = [];
      }
    }

    this.addForce(0, opts.gravity);

    var nx = this.x + (this.x - this.px) * opts.friction + this.vx * delta;
    var ny = this.y + (this.y - this.py) * opts.friction + this.vy * delta;

    this.px = this.x;
    this.py = this.y;

    this.x = nx;
    this.y = ny;

    this.vy = this.vx = 0;

    if (this.x >= canvas.width) {
      this.px = canvas.width + (canvas.width - this.px) * opts.bounce;
      this.x = canvas.width;
    } else if (this.x <= 0) {
      this.px *= -1 * opts.bounce;
      this.x = 0;
    }

    if (this.y >= canvas.height) {
      this.py = canvas.height + (canvas.height - this.py) * opts.bounce;
      this.y = canvas.height;
    } else if (this.y <= 0) {
      this.py *= -1 * opts.bounce;
      this.y = 0;
    }

    return this;
  };

  Point.prototype.draw = function draw() {
    var i = this.constraints.length;
    while (i--) {
      this.constraints[i].draw();
    }
  };

  Point.prototype.resolve = function resolve() {
    if (this.pinX && this.pinY) {
      this.x = this.pinX;
      this.y = this.pinY;
      return;
    }

    this.constraints.forEach(function (constraint) {
      return constraint.resolve();
    });
  };

  Point.prototype.attach = function attach(point) {
    this.constraints.push(new Constraint(this, point));
  };

  Point.prototype.free = function free(constraint) {
    this.constraints.splice(this.constraints.indexOf(constraint), 1);
  };

  Point.prototype.addForce = function addForce(x, y) {
    this.vx += x;
    this.vy += y;
  };

  Point.prototype.pin = function pin(pinx, piny) {
    this.pinX = pinx;
    this.pinY = piny;
  };

  Point.prototype.unpin = function unpin() {
    this.pinX = null;
    this.pinY = null;
  };

  return Point;
}();

/*////////////////////////////////////////*/

var Constraint = function () {
  function Constraint(p1, p2, length) {
    _classCallCheck(this, Constraint);

    this.p1 = p1;
    this.p2 = p2;
    this.length = length || spacingX;
  }

  Constraint.prototype.resolve = function resolve() {
    var dx = this.p1.x - this.p2.x;
    var dy = this.p1.y - this.p2.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.length) return;

    var diff = (this.length - dist) / dist;

    //if (dist > tearDist) this.p1.free(this)

    var mul = diff * 0.5 * (1 - this.length / dist);

    var px = dx * mul;
    var py = dy * mul;

    !this.p1.pinX && (this.p1.x += px);
    !this.p1.pinY && (this.p1.y += py);
    !this.p2.pinX && (this.p2.x -= px);
    !this.p2.pinY && (this.p2.y -= py);

    return this;
  };

  Constraint.prototype.draw = function draw() {
    ctx.moveTo(this.p1.x, this.p1.y);
    ctx.lineTo(this.p2.x, this.p2.y);
  };

  return Constraint;
}();

/*////////////////////////////////////////*/

var count = 0;

var Cloth = function () {
  function Cloth(clothX, clothY, free) {
    _classCallCheck(this, Cloth);

    this.points = [];

    var startX = canvas.width / 2 - clothX * spacingX / 2;
    var startY = canvas.height * 0.2;

    for (var y = 0; y <= clothY; y++) {
      for (var x = 0; x <= clothX; x++) {
        var point = new Point(startX + x * spacingX - spacingX * Math.sin(y), y * spacingY + startY + (y !== 0 ? 5 * Math.cos(x) : 0));
        !free && y === 0 && point.pin(point.x, point.y);
        x !== 0 && point.attach(this.points[this.points.length - 1]);
        y !== 0 && point.attach(this.points[x + (y - 1) * (clothX + 1)]);

        this.points.push(point);
      }
    }
  }

  Cloth.prototype.update = function update(delta) {
    var i = accuracy;

    while (i--) {
      this.points.forEach(function (point) {
        point.resolve();
      });
    }

    ctx.beginPath();

    this.points.forEach(function (point, i) {
      point.update(delta * delta);

      if (opts.renderCloth) {
        point.draw();
      }

      if (mesh) {
        i *= 2;
        mesh.vertices[i] = point.x;
        mesh.vertices[i + 1] = point.y;
      }
    });

    ctx.stroke();
  };

  return Cloth;
}();

function pointerMove(e) {
  var pointer = e.touches ? e.touches[0] : e;
  mouse.px = mouse.x || pointer.clientX;
  mouse.py = mouse.y || pointer.clientY;
  mouse.x = pointer.clientX;
  mouse.y = pointer.clientY;
}

function pointerDown(e) {
  mouse.down = true;
  mouse.button = 1;
  pointerMove(e);
}

function pointerUp(e) {
  mouse.down = false;
  mouse.px = null;
  mouse.py = null;
  console.log('pointer up');
}

document.body.addEventListener('mousedown', pointerDown);
document.body.addEventListener('touchstart', pointerDown);

document.body.addEventListener('mousemove', pointerMove);
document.body.addEventListener('touchmove', pointerMove);

document.body.addEventListener('mouseup', pointerUp);
document.body.addEventListener('touchend', pointerUp);
document.body.addEventListener('mouseleave', pointerUp);
