let isCatchBall = false;
let ballManager;
let ballImg;

function catchBallInit() {
  ballManager = new BallManager(() => {
    catchEnd();
  });
  ballImg = loadImage('/image/ball.png');
}

function catchStart() {
  isCatchBall = true;
  ballManager.start();
}

function catchBallUpdate() {
  if (isCatchBall) {
    ballManager.update();
  }
}

function catchEnd(){
  isCatchBall = false;
}

function receiveBallStatus(fromAndTo) {
  if (fromAndTo === END) {
    catchEnd();
    return;
  }
  let target;
  if (fromAndTo.target === localVideo.ID) {
    target = localVideo;
  } else {
    let targetI = SearchOthers(fromAndTo.target);
    if (targetI === -1) {
      return;
    }
    target = others[targetI];
  }

  if (isCatchBall) {//2回目以降
    ballManager.ball.setTarget(target);
  } else {//初回はfromの設定が必要
    isCatchBall = true;
    ballManager.host = false;
    let from;
    if (fromAndTo.from === localVideo.ID) {//ここが処理されてる時点でキャッチボール主は他人であるため初回にfromが自分の可能性はないが一応書いてあるif文
      from = localVideo;
    } else {
      let fromI = SearchOthers(fromAndTo.from);
      if (fromI === -1) {
        return;
      }
      from = others[fromI];
    }
    ballManager.ball = new Ball(from.pos.copy(), from);
    ballManager.ball.setTarget(target);
  }
}

class Ball extends Obj {
  constructor(pos, target) {
    super(pos, 50);
    this.isMove = false;//投げられてる最中
    this.from;//出発
    this.fromPos;
    this.rotate = 0;
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
    //noStroke();
    //fill(255);
    //ellipse(this.pos.x, this.pos.y, this.size, this.size);
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotate);
    image(ballImg, 0, 0, this.size, this.size);
    pop();
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
      ball.rotate += 0.2;
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
