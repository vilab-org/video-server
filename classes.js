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
  Sin(rad) {
    rad %= 360;
    if (rad < 0) rad = 360 + rad;
    return this.sin[rad];
  }
  Cos(rad) {
    rad %= 360;
    if (rad < 0) rad = 360 + rad;
    return this.cos[rad];
  }
  sqrMag(vec) {
    return vec.x * vec.x + vec.y * vec.y;
  }
  sqrDist(vec1, vec2) {
    let vec = new Vec(vec1.x - vec2.x, vec1.y - vec2.y);
    return this.sqrMag(vec);
  }
  bezier(p1, p2, p3, amt) {//https://ja.javascript.info/bezier-curve
    let subT = 1 - amt;
    let x = pow(subT, 2) * p1.x + 2 * subT * amt * p2.x + pow(amt, 2) * p3.x;
    let y = pow(subT, 2) * p1.y + 2 * subT * amt * p2.y + pow(amt, 2) * p3.y;
    return createVector(x, y);
  }
}

class ReceiveMessage {
  constructor(msg) {
    this.isGo = true;
    this.msg = msg;
    this.remsg;
  }
}

class Vec {
  constructor(x, y) {
    this.set(x, y);
  }
  set(x, y) {
    this.x = x;
    this.y = y;
  }
  copy() {
    return new Vec(this.x, this.y);
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
  constructor(r, g, b, a = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
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
  constructor(pos, size, ID, capture) {
    super(pos, size);
    this.ID = ID;
    this.capture = capture;
    //this.capture.elt.muted = true;//ここでミュートにするとなぜかvideoDOMを表示しないと映像が更新されなくなるからしない
    //this.capture.elt.volume = 0;//同じく
    this.videoEnabled = false;
    this.mikeEnabled = true;
    this.minMaxes = [undefined, undefined];
    this.results = { multiHandLandmarks: [] };
    this.highFive = [false, false];
    this.leftUpPos;
    this.ping = 1;

    this.videoButton = createImg(VideOFFImg);
    this.mikeButton = createImg(MikeONImg);
    /* //ビデオコンテナ上にprocessingのスケッチを置くチャレンジ
    //原因不明だが不可
    let sketch = function(p){
      p.setup = function(){
        p.createCanvas(size.x,size.y);
      }
      p.draw = function(){
        p.background(200);
        p.ellipse(100,100,mouseX,mouseY);
      }
    }
    new p5(sketch,this.capture.elt);
    */
    /*//ビデオごとに手検出を用意する場合のプログラム（MediaPipeのシステム的に不可能だし、負荷の観点から不可）
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
  setResults(results) {
    delete results.image;
    this.results = results;
    this.minMaxes = getHandsMinMax();

    function minMax(marks) {
      let minX = 1, minY = 1;
      let maxX = 0, maxY = 0;
      for (let i = 0; i < marks.length; i++) {
        minX = (minX < marks[i].x ? minX : marks[i].x);
        maxX = (maxX > marks[i].x ? maxX : marks[i].x);
        minY = (minY < marks[i].y ? minY : marks[i].y);
        maxY = (maxY > marks[i].y ? maxY : marks[i].y);
      }
      if (mirror)
        return { minX: 1 - minX, minY: minY, maxX: 1 - maxX, maxY: maxY };
      else
        return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
    }

    function getHandsMinMax() {
      let handsMinMaxes = [undefined, undefined];
      if (results) {
        let len = results.multiHandLandmarks.length;
        for (let i = 0; i < len; i++) {
          let index = getIndexLR(results.multiHandedness[i]);
          if (index == -1) continue;
          //{minX, maxX, minY, maxY};
          handsMinMaxes[index] = minMax(results.multiHandLandmarks[i]);
        }
      }
      return handsMinMaxes;
    } //end getHandsMinMax }
  }// end setResults

  changeVideoImg(isVideo = !this.videoEnabled) {
    let img;
    if (isVideo) {
      img = VideONImg;
    } else {
      img = VideOFFImg;
    }
    this.videoButton.elt.src = img;
    this.videoEnabled = isVideo;
  }

  changeMikeImg(enable = !this.mikeEnabled) {
    this.mikeEnabled = enable;
    let img;
    //let volume = 0.00000001;
    if (enable) {
      img = MikeONImg;
      //volume = 1;
    } else {
      img = MikeOFFImg;
    }
    this.mikeButton.elt.src = img;
    //this.capture.elt.volume = volume;
  }
  updateLeftUpPos() {
    this.leftUpPos = createVector(this.pos.x - this.size.x / 2, this.pos.y - this.size.y / 2);
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
  Equals(msg) {
    if (this.data.mode && msg.data.mode) {
      return msg.data.mode === this.data.mode;
    } else {
      return msg.type === this.type;
    }
  }
}
Message.prototype.toString = function () {
  return '[' + this.type + ' , ' + this.data + ']';
}
class Effect extends Obj {
  constructor(pos, size, dire, color) {
    super(pos, size);
    this.dire = dire;
    this.color = color;
    this.enbale = true;
    this.rotate = 0;
  }
}

class EffectsManager {
  constructor(color) {
    this.color = color;
    this.effects = [];
    this.pool = [];
    this.force = createVector(0, 0.5);
    this.speed = 10;
    this.size = 5;
    for (let i = 0; i < 50; i++) {
      this.pool.push(new Effect(createVector(), this.size, createVector(), this.color));
    }
  }
  addEffect(circle, setColor = this.color) {
    let theta = int(random(360));
    let effect;
    if (this.pool.length > 0) {
      effect = this.pool.pop();
      effect.dire.x = mathf.cos[theta];
      effect.dire.y = mathf.sin[theta];
      effect.dire.mult(this.speed);
    } else {
      let dire = createVector(mathf.cos[theta], mathf.sin[theta]);
      dire.mult(this.speed);
      dire.y *= -1;//上向きはマイナス
      effect = new Effect(circle.pos, this.size, dire, this.color);
    }

    effect.pos = circle.pos.add(effect.dire);
    effect.color = setColor;
    this.effects.push(effect);
  }
  update() {
    noStroke();
    let i = 0;
    tint(this.color.getColor());
    while (i < this.effects.length) {
      let effect = this.effects[i];
      if (!effect) {
        i++;
        continue;
      }

      effect.dire.add(this.force);//自由落下
      //effect.color.a -= this.speed * 2;//フェードアウト
      effect.pos.add(effect.dire);
      if (this.out(effect)) {
        this.effects.splice(i, 1);//i番目1個取り出す
        continue;
      }
      //fill(effect.color.getColor());
      //ellipse(effect.pos.x, effect.pos.y, this.size, this.size);
      //rect(effect.pos.x, effect.pos.y, this.size, this.size);
      push();
      rotate(effect.rotate += 0.1);
      image(effectImg, effect.pos.x, effect.pos.y, 10, 10);
      pop();
      i++;
    }// while end }
    tint(255);

  }
  out(effect) {
    return effect.pos.x - this.size < 0 || effect.pos.x + this.size > width ||//X画面外
      effect.pos.y - this.size < 0 || effect.pos.y + this.size > height ||//Y画面外
      effect.color.a <= 0;//透明になった
  }
  update2() {
    noStroke();
    let i = 0;
    let effectsLen = this.effects.length;
    while (i < effectsLen) {
      let effect = this.effects[i];
      effect.dire.add(this.force);//自由落下
      //effect.color.a -= this.speed * 2;//フェードアウト
      effect.pos.add(effect.dire);
      if (this.out(effect)) {
        this.pool.push(effect);
        this.effects.splice(i, 1);
        effectsLen--;
        continue;
      } else {
        //fill(effect.color.getColor());
        //rect(effect.pos.x, effect.pos.y, this.size, this.size);
        push();
        translate(effect.pos.x, effect.pos.y);
        rotate(effect.rotate += 0.2);
        tint(effect.color.getColor());
        image(effectImg, 0, 0, 10, 10);
        pop();
      }
      i++;
    }//while end }
    tint(255);
  }
}

class Timer {
  constructor(second) {
    this.waitTime = second;
    this.isWait = false;
  }
  startTimer() {
    this.isWait = true;
    setTimeout(() => {
      this.isWait = false;
    }, this.waitTime * 1000);
  }
}

class LineSeg {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
}

class Animation {
  constructor() {
    this.animes = [];
  }
  update() {
    let animesLen = this.animes.length;
    let i = 0;
    while (i < animesLen) {
      let anime = this.animes[i];
      anime.update();

      if (anime.judge()) {
        anime.finish();
        this.animes.splice(i, 1);
        animesLen--;
        continue;
      }
      i++;
    }
  }
  addAnime(anime) {
    this.animes.push(anime);
  }
}
class Anime {
  constructor(updateFunc, judge, finishFunc) {
    this.update = updateFunc;
    this.judge = judge;
    this.finish = finishFunc;
  }
}
