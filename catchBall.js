let isCatchBall = false;
let ballManager;
let ballImg;
const TRACKING = 'tracking';
const THROWING = 'throwing';
const BALLHOST = 'has ball host';

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

function catchEnd() {
  isCatchBall = false;
}

function receiveBallStatus(fromAndTarget) {
  if (fromAndTarget === END) {
    catchEnd();
    return;
  }
  let target = getVideoInst(fromAndTarget.target);

  if (isCatchBall) {//2回目以降
    ballManager.ball.setTarget(target);
  } else {//初回はfromの設定が必要
    isCatchBall = true;
    ballManager.host = false;
    let from = getVideoInst(fromandTarget.from);
    
    ballManager.ball = new Ball(from.pos.copy(), from, () => {
      if (ballManager.ball.from.ID === localVideo.ID) {
        Send(CATCHBALL, THROWING);
      }
    });
    ballManager.setTarget(target);
  }
}

class Ball extends Obj {
  constructor(pos, target, throwFunc = () => { }) {
    super(pos, 50);
    this.target = target;//目標
    this.throwFunc = throwFunc;
    this.mode = '';//ボールが動くモード
    this.from = target;//出発
    this.fromPos;
    this.rotate = 0;
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
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotate);
    image(ballImg, 0, 0, this.size, this.size);
    pop();
    switch (mode) {
      case TRACKING:
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
            this.fromPos = this.pos.copy();
            this.throwFunc();
          } else {
            let leftUp = getLeftUpPos(from);
            this.pos.x = leftUp.x + handsPos.x * from.size.x;
            this.pos.y = leftUp.y + handsPos.y * from.size.y;
          }
        }
        break;
      case THROWING:
        this.rotate = (1 / getFrameRate()) % TWO_PI;
        this.pos = move();
        this.amt += 1 / getFrameRate() / 3;//3秒で到達
        break;
      default: break;
    }
    function move() {
      return p5.Vector.lerp(this.fromPos, this.target.pos, this.amt);
    }
  }
  setTarget(target) {
    this.amt = 0;
    this.from = this.target;
    this.target = target;

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
    //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
    this.member = [...others];
    this.ball = new Ball(localVideo.pos.copy(), localVideo, () => {
      this.selectTarget();
    });
    this.selectTarget();
    this.host = true;
    this.ballHost = true;
  }
  update() {
    let ball = this.ball;
    ball.update();
  }
  //次の目標人物設定
  selectTarget() {
    let next;
    if (this.member.length > 0) {
      let index = randomInt(this.member.length);
      next = this.member[index];
      this.member.splice(index, 1);
    } else if (this.ball.target !== localVideo) {//もう渡ってない人がいない
      next = localVideo;//ラスト自分
    } else {//ラストの目標が自分なら1周巡ったことになる
      this.endFunc();
      Send(CATCHBALL, END);
      this.host = false;
      return;//キャッチボール終了
    }
    setTarget(next);
    let msg = { from: this.ball.from.ID, target: this.ball.target.ID };
    if (log) console.log(msg);
    Send(CATCHBALL, msg);
  }
  setTarget(next) {
    this.ball.setTarget(next);
  }
}
