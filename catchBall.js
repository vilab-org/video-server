let isCatchBall = false;
let ballManager;
let ballImg;
const TRACKING = 'tracking';
const THROWING = 'throwing';
const SELECT = 'select';
const CATCH = 'catch';

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

function getThrowJudge(video, handsPos) {
  return handsPos && handsPos.y < 0.3;
}

function ballThrowed(host = false) {
  if (ballManager.ball.from.ID === localVideo.ID) {
    Send(CATCHBALL, THROWING);
    ballManager.setMode(THROWING);
  }
  // if(host){
  //   Send(CATCHBALL, THROWING);
  //   ballManager.setMode(THROWING);
  // }else{
  //   if (ballManager.ball.from.ID === localVideo.ID) {
  //     Send(CATCHBALL, THROWING);
  //     ballManager.setMode(THROWING);
  //   }
  // }
}

function ballArrived(host = false) {
  ballManager.setMode(TRACKING);
  Send(CATCHBALL, CATCH);
  if (host) {
    ballManager.finish();
  }
  // if (host) {
  //   ballManager.setMode(TRACKING);
  //   Send(CATCHBALL, CATCH);
  //   ballManager.finish();
  // } else {
  //   ballManager.setMode(TRACKING);
  //   Send(CATCHBALL, CATCH);
  // }
}
function ballMovePos(fromPos, targetPos, amt) {
  return p5.Vector.lerp(fromPos, targetPos, amt);
}

function receiveBallStatus(fromAndTarget) {
  switch (fromAndTarget) {
    case END:
      catchEnd();
      return;

    case THROWING:
      ballManager.setMode(fromAndTarget);
      return;
    case CATCH:
      ballManager.setMode(TRACKING);
      if (ballManager.host) {
        ballManager.selectTarget();
      }
      return;

  }
  let target = getVideoInst(fromAndTarget.target);

  if (isCatchBall) {//2回目以降
    ballManager.setTarget(target);
  } else {//初回はfromの設定が必要
    isCatchBall = true;
    ballManager.host = false;
    let from = getVideoInst(fromAndTarget.from);

    ballManager.ball = new Ball(from.pos.copy(), from, false);
    ballManager.setTarget(target);
  }
}

class Ball extends Obj {
  constructor(pos, target, isHost) {
    super(pos, 50);
    this.target = target;//目標
    this.isHost = isHost;
    this.from = target;//出発
    this.fromPos = createVector();
    this.rotate = 0;
    this.amt = 0;//線形補間の割合
    this.speedR = 2;
  }
  update() {
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
  }
  setTarget(target) {
    this.amt = 0;
    this.from = this.target;
    this.target = target;
  }
  setPosVec(vec) {
    this.pos = vec;
  }
  setPos(x, y) {
    this.pos.x = x;
    this.pos.y = y;
  }
}

class BallManager {
  constructor(endFunc) {
    this.member;//参加者
    this.ball;//動かすの
    this.endFunc = endFunc;//終了時の処理
    this.isHost = false;
    this.mode = TRACKING;//ボールが動くモード
  }
  start() {
    //配列の早いコピーらしい
    //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
    this.member = [...others];
    this.ball = new Ball(localVideo.pos.copy(), localVideo, true);
    this.selectTarget();
    this.isHost = true;
  }
  update() {
    let ball = this.ball;
    ball.update();
    let from = ball.from;
    switch (this.mode) {
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
          let leftUp = getLeftUpPos(from);
          let x = leftUp.x + handsPos.x * from.size.x;
          let y = leftUp.y + handsPos.y * from.size.y;
          ball.setPos(x, y);
          ball.fromPos.x = x;
          ball.fromPos.y = y;
          if (getThrowJudge(from, handsPos)) {//投げた判定
            ballThrowed(this.isHost);
          }
        }

        break;
      case THROWING:
        ball.rotate += (1 / getFrameRate()) * ball.speedR;
        ball.setPosVec(ballMovePos(ball.fromPos, ball.target.pos, ball.amt));
        ball.amt += (1 / getFrameRate()) / 3;//3秒で到達
        if (ball.amt >= 1) {
          ball.amt = 1;
          if (ball.target.ID === localVideo.ID) {
            ballArrived(this.isHost);
          }
        }
        break;
      default: break;
    }
  }
  //次の目標人物設定
  selectTarget() {
    let next = this.getNext();
    this.setTarget(next);
    let msg = { from: this.ball.from.ID, target: this.ball.target.ID };
    if (log) console.log(msg);
    Send(CATCHBALL, msg);
  }
  setTarget(next) {
    this.ball.setTarget(next);
  }
  setMode(mode) {
    this.mode = mode;
  }
  finish() {
    this.endFunc();
    Send(CATCHBALL, END);
    this.isHost = false;
  }
  getNext() {
    let next;
    if (this.member.length > 0) {
      let index = randomInt(this.member.length);
      next = this.member[index];
      this.member.splice(index, 1);
    } else {//もう渡ってない人がいない
      next = localVideo;//ラスト自分
    }
    return next;
  }
}

