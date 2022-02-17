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
  constructor(pos, size, ID, capture) {
    super(pos, size);
    this.ID = ID;
    this.capture = capture;
    //this.capture.elt.muted = true;//ここでミュートにするとなぜかvideoDOMを表示しないと映像が更新されなくなるからしない
    //this.capture.elt.volume = 0;//同じく
    this.videoEnabled = true;
    this.mikeEnabled = true;
    this.minMaxes = [undefined, undefined];
    this.results = undefined;
    this.highFive = [false, false];
    this.ping = 1;

    this.videoButton = createImg(VideONImg);
    this.mikeButton = createImg(MikeONImg);
    /*
    let sketch = function(p){
      p.setup = function(){
        p.createCanvas(size.x,size.y);
      }
      p.draw = function(){
        p.background(200);
        p.ellipse(100,100,mouseX,mouseY);
        if(log)console.log("a");
      }
    }
    new p5(sketch,this.capture.elt);
    */
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
  setResults(results) {
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

  changeVideoImg() {
    let isVideo = !this.videoEnabled;
    let img;
    if (isVideo) {
      img = VideONImg;
    } else {
      img = VideOFFImg;
    }
    this.videoButton.elt.src = img;
    this.videoEnabled = isVideo;
  }

  changeMikeImg(enable) {
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
  }
  addEffect(circle) {
    let theta = int(random(360));
    let effect;
    if(this.pool.length > 0){
      effect = this.pool.unshift();
      effect.dire.x = mathf.cos[theta];
      effect.dire.y = mathf.sin[theta];
      dire.mult(this.speed);
    } else {
      let dire = createVector(mathf.cos[theta], mathf.sin[theta]);
      dire.mult(this.speed);
      dire.y *= -1;//上向きはマイナス
      effect = new Effect(circle.pos, this.size, dire, this.color);
    }
    
    effect.pos = circle.pos.add(effect.dire);
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
        continue;
      } else {
        //fill(effect.color.getColor());
        //rect(effect.pos.x, effect.pos.y, this.size, this.size);
        push();
        translate(effect.pos.x, effect.pos.y);
        rotate(effect.rotate += 0.2);
        image(effectImg, 0, 0, 10, 10);
        pop();
      }
      i++;
    }//while end }
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

class Ball extends Obj {
  constructor(pos, target) {
    super(pos, 20);
    this.isMove = false;//投げられてる最中
    this.from;//出発
    this.fromPos;
    this.target = target;//目標
    this.amt = 0;//線形補間の割合
  }
  update() {
    let from = this.from;
    //目標の人を枠取り
    stroke(0, 255, 0, 255);
    strokeWeight(5);
    noFill();
    rect(this.target.pos.x, this.target.pos.y, this.target.size.x, this.target.size.y);

    //ボールの表示
    noStroke();
    fill(255);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);

    if (!this.isMove) {
      let minMaxes = from.minMaxes;
      let handsPos = undefined;
      for (let i = 0; i < 2; i++) {
        if (minMaxes[i]) {
          handsPos = new Vec((minMaxes[i].maxX + minMaxes[i].minX) / 2, (minMaxes[i].maxY + minMaxes[i].minY) / 2);
          break;
        }
      }
      if (handsPos) {
        if (handsPos.y < 0.3) {//投げた判定
          this.isMove = true;
          this.fromPos = this.pos.copy();
        } else {
          let leftUp = getLeftUpPos(from);
          this.pos.x = leftUp.x + handsPos.x * from.size.x;
          this.pos.y = leftUp.y + handsPos.y * from.size.y;
        }
      }
    }


  }
  setTarget(target) {
    this.amt = 0;
    this.from = this.target;
    this.target = target;
    this.isMove = false;
  }
}

class BallManager {
  constructor(endFunc) {
    this.member;//参加者
    this.ball;//動かすの
    this.endFunc = endFunc;//終了時の処理
    this.host = false;
  }
  start() {
    //配列の早いコピーらしい
    //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#:~:text=let%20arr2%20%3D%20%5B...arr1%5D%3B
    this.member = [...others].concat(dummys);
    this.ball = new Ball(localVideo.pos.copy(), localVideo);
    this.selectTarget();
    this.host = true;
  }
  update() {
    let ball = this.ball;
    ball.update();

    if (ball.isMove) {
      ball.pos = p5.Vector.lerp(ball.fromPos, ball.target.pos, ball.amt);
      if (ball.amt >= 1) {
        ball.isMove = false;
        if (this.host) {
          this.selectTarget();
        }
      } else {
        ball.amt += 1 / getFrameRate() / 3;//3秒で到達
      }
    }
  }
  //次の目標地点設定
  selectTarget() {
    let next;
    //もう渡ってない人がいない
    if (this.member.length === 0) {
      if (this.ball.target === localVideo) { //ラストの目標が自分なら1周巡ったことになる
        this.endFunc();
        Send(CATCHBALL, END);
        this.host = false;
        return;//キャッチボール終了
      }
      next = localVideo;//ラスト自分
    } else {
      let index = randomInt(this.member.length);
      next = this.member[index];
      this.member.splice(index, 1);
    }

    this.ball.setTarget(next);
    let msg = { from: this.ball.from.ID, target: this.ball.target.ID };
    if (log) console.log(msg);
    Send(CATCHBALL, msg);
  }
}
