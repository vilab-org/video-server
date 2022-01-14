class Mathf {
  constructor() {
    this.sin = [];
    this.cos = [];
    for (let i = 0; i < 360; i++) {
      this.sin.push(sin(i));
      this.cos.push(cos(i));
    }
    this.sin.push(this.sin[0]);
    this.cos.push(this.cos[0]);
  }
}

class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
Vec.prototype.toString = function () {
  return '(' + this.x + ',' + this.y + ')';
}

class Obj {
  constructor(pos, size) {
    this.pos = pos;
    this.size = size;
  }
}

class Color {
  constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a ? a : 255;
  }
  getColor() {
    return color(this.r, this.g, this.b, this.a);
  }
  set(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}

class Video extends Obj {
  constructor(pos, ID, capture) {
    super(pos, new Vec(0, 0));
    this.ID = ID;
    this.capture = capture;
    this.videoEnable = true;
    this.results = undefined;
    this.handsEnable = true;
    /*
        let hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });
        hands.setOptions({
          maxNumHands: 2,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
    
        let camera = new Camera(capture.elt, {
          onFrame: async () => {
            await hands.send({
              image: capture.elt
            });
          },
          width: capture.width,
          height: capture.height
        });
        camera.start();
    
        //ラムダ式じゃないとthis.が使えない
        //https://pisuke-code.com/javascript-class-this-in-callback/
        hands.onResults((results) => {
          this.results = results;
        });
        */
  }
}

Video.prototype.toString = function () {
  return 'video ' + this.ID + '\n{ pos:' + this.pos + ' size:' + this.size + ' enable:' +
    this.videoEnable + ' stream:' + this.capture.elt.stream + ' }';
}

class Message {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}
Message.prototype.toString = function () {
  return '[' + this.type + ' , ' + this.data + ']';
}
class Effect extends Obj {
  constructor(pos, size, dire, color) {
    super(pos, size);
    this.dire = dire;
    this.initDire = dire.copy();
    this.color = color;
  }
  reset() {
    this.dire = initDire.copy();
    this.color.a = 255;
  }
}

class EffectsManager {
  constructor(video) {
    this.video = video;
    this.effects = [];
    this.pool = [];
    this.force = createVector(0, 1.0);
    this.speed = 10;
    this.size = 5;
  }
  addEffect(pos) {
    let theta = int(random(360));
    let effect;

    if (this.pool.length > 0) {
      effect = this.pool.pop();
      effect.pos = pos;
      effect.reset();
    } else {
      let dire = createVector(mathf.cos[theta],mathf.sin[theta]);
      dire.mult(this.speed);
      dire.y *= -1;//上向きはマイナス
      effect = new Effect(pos, this.size * theta, dire, new Color(225, 225, 0, 255));
    }
    effect.pos = pos.add(effect.dire);
    this.effects.push(effect);
  }
  update() {
    noStroke();
    let i = 0;
    while (i < this.effects.length) {
      let effect = this.effects[i];
      if (!effect) {
        i++;
        continue;
      }

      effect.dire.add(this.force);//自由落下
      effect.color.a -= this.speed * 2;//フェードアウト
      effect.pos.add(effect.dire);
      if (effect.pos.x - this.size < 0 || effect.pos.x + this.size > width ||//X画面外
        effect.pos.y - this.size < 0 || effect.pos.y + this.size > height ||//Y画面外
        effect.color.a <= 0) {//透明になった
        this.pool.push(this.effects[i]);
        this.effects.splice(i, 1);//i番目1個取り出す
        continue;
      }
      fill(effect.color.getColor());
      ellipse(effect.pos.x, effect.pos.y, this.size, this.size);
      i++;
    }

  }
}