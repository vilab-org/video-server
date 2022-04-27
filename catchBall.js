let isCatchBall = false;
let ballManager;
let ballImg;
const BALLMODE = 'ball mode';
const BALLMODE_TRACKING = 'tracking';
const BALLMODE_THROWING = 'throwing';
const STATE_NEXTUSER = 'nextuser';
const STATE_CATCH = 'catch';
const USERSELECT = 'user select mode';
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
  let manager = ballManager;
  let ball = manager.ball;
  let from = ball.from;
  switch (manager.ballMode) {
    case BALLMODE_TRACKING:
      if (manager.selectMode === catchUserTypes[1]) {
        let lineP = getPointingLine(from);
        if (lineP) {//指さしあり
          let hitVideo = getCollVideo(from, lineP);
          push();
          stroke(0, 255, 0);
          strokeWeight(3);
          if (!hitVideo) drawingContext.setLineDash([10, 5]);
          line(lineP.start.x, lineP.start.y, lineP.end.x, lineP.end.y);
          pop();
          if (hitVideo && hitVideo !== ball.target) {
            ballManager.setTarget(hitVideo);
          }
          break;
        }
      }
      // 指さしなし
      ball.update();
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
        if (ball.target && getThrowJudge(from, handsPos)) {//投げた判定
          ballThrowed(manager.isUserHost);
        }

      }
      break;

    case BALLMODE_THROWING:
      ball.update();
      ball.rotate += (1 / getFrameRate()) * ball.speedR;
      ball.setPosVec(ballMovePos(ball.fromPos, ball.target.pos, ball.amt));
      ball.amt += (1 / getFrameRate()) / 3;//3秒で到達
      if (ball.amt >= 1) {
        ball.amt = 1;
        if (ball.target.ID === localVideo.ID) {
          ballArrived(manager.isUserHost);
        }
      }
      break;
    default: break;
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
    Send(CATCHBALL, { mode: BALLMODE, state: BALLMODE_THROWING });
    ballManager.setMode(BALLMODE_THROWING);
  }
}
/**
 * ボールが届いたときに呼ばれる関数
 * @param {boolean} isHost キャッチボールのホスト
 */
function ballArrived(isHost = false) {
  ballManager.setMode(BALLMODE_TRACKING);
  Send(CATCHBALL, { mode: BALLMODE, state: STATE_CATCH });
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
 * @param {Video} video 
 * @returns {Line}
 */
function getPointingLine(video) {
  if (!video || !video.results || video.results.multiHandLandmarks.length === 0) return;
  let floorValue = 10000; // 線がブレブレにならないように精度を下げる
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
  return new LineSeg(startP, createVector(x, y));
}

/**
 * 他の参加者と線の当たり判定
 * @param {Line} pointingLine 
 * @returns {video}
 */
function getCollVideo(from, pointingLine) {
  if (!pointingLine) return;
  if(collLineVideo(localVideo, pointingLine)) return localVideo;
  for (let i = 0; i < others.length; i++) {
    if (from.ID !== others[i].ID && collLineVideo(others[i], pointingLine)) {
      return others[i];
    }
  }
  function collLineVideo(video, lineP) {
    let leftUp = video.leftUpPos;
    if (!leftUp) return;
    let rightBottom = new Vec(leftUp.x + video.size.x, leftUp.y + video.size.y);
    return collLineLine(leftUp, rightBottom, lineP.start, lineP.end) ||
      collLineLine(new Vec(leftUp.x, rightBottom.y), new Vec(rightBottom.x, leftUp.y), lineP.start, lineP.end);//矩形の4辺ではなく対角線を当たり判定とする

    //当たり判定の計算
    //https://qiita.com/ykob/items/ab7f30c43a0ed52d16f2
    /**
     * 線分の当たり判定
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
 * @param {*} catchballMode モードかボールの送信,受信相手
 */
function receiveBallStatus(catchballMode) {
  switch (catchballMode.mode) {
    case END:
      catchEnd();
      return;

    case BALLMODE:
      switch (catchballMode.state) {
        case BALLMODE_THROWING:
          ballManager.setMode(catchballMode.state);
          return;
        case STATE_CATCH:
          ballManager.setMode(BALLMODE_TRACKING);
          switch (ballManager.selectMode) {
            case catchUserTypes[0]:
              if (ballManager.isUserHost) {
                ballManager.setTarget(ballManager.getNext());
              }
              break;
            case catchUserTypes[1]:
              break;
          }
          return;
      }
      return;

    case STATE_NEXTUSER:
      let target = getVideoInst(catchballMode.target);
      if (isCatchBall) {//2回目以降
        if(target === ballManager.ball.target) {
          ballManager.changeTarget(target);
        } else {
          ballManager.setTarget(target);
        }
      } else {//初回はfromの設定が必要
        isCatchBall = true;
        ballManager.isUserHost = false;
        let from = getVideoInst(catchballMode.from);
        ballManager.ball = new Ball(from.pos.copy(), from, false);
        ballManager.setTarget(target);
      }
      return;
      
    case USERSELECT:
      ballManager.setUserSelectMode(catchballMode.state);
      return;
  }
}

class BallManager {
  constructor(endFunc) {
    this.member;//参加者
    this.ball;//動かすの
    this.endFunc = endFunc;//終了時の処理
    this.isUserHost = false;
    this.selectMode = catchUserTypes[0];
    this.ballMode = BALLMODE_TRACKING;//ボールが動くモード
  }
  start() {
    this.isUserHost = true;
    this.ball = new Ball(localVideo.pos.copy(), localVideo, true);
    switch (this.selectMode) {
      case catchUserTypes[0]:
        //配列の早いコピーらしい
        //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
        this.member = [...others];
        this.setTarget(this.getNext());
        break;
      case catchUserTypes[1]:
        Send(CATCHBALL, {from:this.ball.from.ID, target: undefined, mode:STATE_NEXTUSER });
        break;
    }
  }
  setUserSelectMode(mode){
    if(isCatchBall) {
      $("#catchUserSelect").val(this.selectMode);
      return false;
    }
    this.selectMode = mode;
    $("#catchUserSelect").val(mode);
    return true;
  }
  setTarget(next) {
    this.ball.setTarget(next);
    if (this.isUserHost) {
      let msg = { from: this.ball.from.ID, target: this.ball.target.ID, mode: STATE_NEXTUSER };
      if (log) console.log(msg);
      Send(CATCHBALL, msg);
    }
  }
  changeTarget(target){
    this.ball.changeTarget(target);
  }
  setMode(ballMode) {
    this.ballMode = ballMode;
  }
  finish() {
    this.endFunc();
    Send(CATCHBALL, { mode: END });
    this.isUserHost = false;
    this.ball = undefined;
    this.member = [];
  }
  /**
   * USERSELECTがランダムの時、ホストが呼ばれる関数
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

class Ball extends Obj {
  constructor(pos, target, isUserHost) {
    super(pos, 50);
    this.target = target;//目標
    this.isUserHost = isUserHost;
    this.from = target;//出発
    this.fromPos = createVector();
    this.rotate = 0;
    this.amt = 0;//線形補間の割合
    this.speedR = 2;
  }
  update() {
    //目標の人を枠取り
    if(this.target){
      stroke(0, 255, 0, 255);
      strokeWeight(5);
      noFill();
      rect(this.target.pos.x, this.target.pos.y, this.target.size.x, this.target.size.y);
    }

    //ボールの表示
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.rotate);
    image(ballImg, 0, 0, this.size, this.size);
    pop();
  }
  setTarget(target) {
    this.amt = 0;
    if (target) {
      this.from = this.target;
      this.target = target;
    } else {
      this.target = undefined;
    }
  }
  changeTarget(target){
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
