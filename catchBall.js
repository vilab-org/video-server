let isCatchBall = false;
let ballManager;
let ballImg;
const TRACKING = 'tracking';
const THROWING = 'throwing';
const NEXTUSER = 'nextuser';
const SELECT = 'select';
const CATCH = 'catch';
const USERSELECT_RANDOM = 'user select random';
/**
 * キャッチボールのsetup
 */
function catchBallInit() {
  ballManager = new BallManager(() => {
    catchEnd();
  });
  ballImg = loadImage('/image/ball.png');
}
/**
 * キャッチボールスタート
 */
function catchStart() {
  isCatchBall = true;
  ballManager.start();
}
/**
 * キャッチボール機能の更新
 */
function catchBallUpdate() {
  if (isCatchBall) {
    ballManager.update();
  }
  let lineP = getPointingLine(localVideo);
  if (lineP) {
    stroke(255);
    strokeWeight(3);
    line(lineP.start.x, lineP.start.y, lineP.end.x, lineP.end.y);
  }
  let hitVideo = getCollVideo(lineP);
  if(hitVideo){
    stroke(0, 255, 0, 255);
    strokeWeight(5);
    noFill();
    rect(hitVideo.pos.x, hitVideo.pos.y, hitVideo.size.x, hitVideo.size.y);
  }
}
/**
 * キャッチボール終了
 */
function catchEnd() {
  isCatchBall = false;
}
/**
 * ボールを投げた判定
 * @param {video} video 
 * @param {vec} handsPos 
 * @returns 投げた判定
 */
function getThrowJudge(video, handsPos) {
  return handsPos && handsPos.y < 0.3;
}
/**
 * ボールを投げたときに呼ばれる関数
 * @param {boolean} isHost キャッチボールのホスト
 */
function ballThrowed(isHost = false) {
  if (ballManager.ball.from.ID === localVideo.ID) {
    Send(CATCHBALL, { mode: THROWING });
    ballManager.setMode(THROWING);
  }
}
/**
 * ボールが届いたときに呼ばれる関数
 * @param {boolean} isHost キャッチボールのホスト
 */
function ballArrived(isHost = false) {
  ballManager.setMode(TRACKING);
  Send(CATCHBALL, { mode: CATCH });
  if (isHost) {
    ballManager.finish();
  }
}
/**
 * ボールの動き方
 * @param {PVector} fromPos 
 * @param {PVector} targetPos 
 * @param {float} amt 
 * @returns {PVector} pvector
 */
function ballMovePos(fromPos, targetPos, amt) {
  return p5.Vector.lerp(fromPos, targetPos, amt);
}

/**
 * ビデオの指からレーザーを出せる座標を取得
 */
function getPointingLine(video) {
  if (video.results.multiHandLandmarks.length === 0) return;
  let floorValue = 10000000; // 線がブレブレにならないように精度を下げる
  let threshold = 0.45;//指が曲がってる判定のしきい値
  let marks = video.results.multiHandLandmarks[0];
  let startP = createVector(floor(marks[8].x * floorValue) / floorValue, floor(marks[8].y * floorValue) / floorValue);
  let dire = startP.copy().sub(floor(marks[5].x * floorValue) / floorValue, floor(marks[5].y * floorValue) / floorValue);
  let bent = createVector(floor((marks[7].x - marks[6].x) * floorValue) / floorValue, floor((marks[7].y - marks[6].y) * floorValue) / floorValue);
  let bentDot = floor(dire.dot(bent) * 10000) / 100;
  if (bentDot < threshold) return;
  if (mirror) {
    startP.x = 1 - startP.x;
    dire.x *= -1;
  }
  startP.x *= video.size.x;
  startP.y *= video.size.y;
  startP.add(video.leftUpPos);
  let a = dire.y / dire.x;
  let b = -a * startP.x + startP.y;
  if (a === 0) return;
  let y = (a * dire.x > 0 ? height : 0);
  let x = (y - b) / a;
  return { start: startP, end: createVector(x, y), a: a };
}

function getCollVideo(pointingLine){
  for(let i = 0; i < others.length; i++){
    if(collLineVideo(others[i], pointingLine)) return others[i];
  }
  function collLineVideo(video, lineP) {
    let leftUp = video.leftUpPos;
    if(!leftUp || !lineP) return;
    let rightBottom = new Vec(leftUp.x + video.size.x, leftUp.y + video.size.y);
    return collLineLine(leftUp, rightBottom, lineP.start, lineP.end) ||
      collLineLine(new Vec(leftUp.x,rightBottom.y), new Vec(rightBottom.x,leftUp.y), lineP.start, lineP.end);
  
    //当たり判定の計算
    //https://qiita.com/ykob/items/ab7f30c43a0ed52d16f2
    /**
     * 
     * @param {vec} a
     * @param {vec} b 
     * @param {vec} c 
     * @param {vec} d 
     */
    function collLineLine(a, b, c, d) {
      let ta = (c.x - d.x) * (a.y - c.y) + (c.y - d.y) * (c.x - a.x);
      let tb = (c.x - d.x) * (b.y - c.y) + (c.y - d.y) * (c.x - b.x);
      let tc = (a.x - b.x) * (c.y - a.y) + (a.y - b.y) * (a.x - c.x);
      let td = (a.x - b.x) * (d.y - a.y) + (a.y - b.y) * (a.x - d.x);
      return ta * tb <= 0 && tc * td <= 0;
    }
  }
}

/**
 * キャッチボールに関する受信データの振り分け関数
 * @param {*} ModeAndFromAndTarget モードかボールの送信,受信相手
 */
function receiveBallStatus(ModeAndFromAndTarget) {
  switch (ModeAndFromAndTarget.mode) {
    case END:
      catchEnd();
      return;

    case THROWING:
      ballManager.setMode(ModeAndFromAndTarget.mode);
      return;

    case CATCH:
      ballManager.setMode(TRACKING);
      if (ballManager.isYouserHost) {
        ballManager.selectTarget();
      }
      return;

    case NEXTUSER:
      let target = getVideoInst(ModeAndFromAndTarget.target);
      let count = 0;
      while (!target) {
        target = getVideoInst(ModeAndFromAndTarget.target);
        count++;
        if (count >= 10) return;
      }
      if (isCatchBall) {//2回目以降
        ballManager.setTarget(target);
      } else {//初回はfromの設定が必要
        isCatchBall = true;
        ballManager.isYouserHost = false;
        let from = getVideoInst(ModeAndFromAndTarget.from);

        ballManager.ball = new Ball(from.pos.copy(), from, false);
        ballManager.setTarget(target);
      }
      return;
  }
}

class Ball extends Obj {
  constructor(pos, target, isYouserHost) {
    super(pos, 50);
    this.target = target;//目標
    this.isYouserHost = isYouserHost;
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
    this.isYouserHost = false;
    this.mode = TRACKING;//ボールが動くモード
  }
  start() {
    //配列の早いコピーらしい
    //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
    this.member = [...others];
    this.ball = new Ball(localVideo.pos.copy(), localVideo, true);
    this.selectTarget();
    this.isYouserHost = true;
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
          let leftUp = from.leftUpPos;
          let x = leftUp.x + handsPos.x * from.size.x;
          let y = leftUp.y + handsPos.y * from.size.y;
          ball.setPos(x, y);
          ball.fromPos.x = x;
          ball.fromPos.y = y;
          if (getThrowJudge(from, handsPos)) {//投げた判定
            ballThrowed(this.isYouserHost);
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
            ballArrived(this.isYouserHost);
          }
        }
        break;
      default: break;
    }
  }
  /**
   * 次の目標人物設定
   */
  selectTarget() {
    let next = this.getNext();
    this.setTarget(next);
    let msg = { from: this.ball.from.ID, target: this.ball.target.ID, mode: NEXTUSER };
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
    Send(CATCHBALL, { mode: END });
    this.isYouserHost = false;
  }
  /**
   * USERSELECT_RANDOMの時、ホストが呼ばれる関数
   * @returns 次のユーザのビデオクラス
   */
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

