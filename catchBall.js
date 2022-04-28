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
      trackingMode();
      break;
    case BALLMODE_THROWING:
      ball.update();
      ball.rotate += (1 / getFrameRate()) * ball.speedR;
      ball.setPosVec(ballMovePos(ball.fromPos, ball.target.pos, ball.amt));
      ball.amt += (1 / getFrameRate()) / 3;//3秒で到達
      if (ball.amt >= 1) {
        ball.amt = 1;
        if (ball.target.ID === localVideo.ID) {
          ballArrived();
        }
      }
      break;
  }
  function trackingMode() {
    switch (ballManager.selectMode) {
      case catchUserTypes[0]:
        break;
      case catchUserTypes[1]:
        let lineP = getPointingLine(from);
        if (lineP) {//指さしあり
          let hitInfo = getCollVideo(from, lineP);
          push();
          stroke(0, 255, 0);
          strokeWeight(3);
          if (hitInfo) {
            noFill();
            line(lineP.start.x, lineP.start.y, hitInfo.hitPos.x, hitInfo.hitPos.y);
            let hitVideo = hitInfo.video;
            rect(hitVideo.pos.x, hitVideo.pos.y, hitVideo.size.x, hitVideo.size.y);
            if (ballManager.isUserHost && hitVideo !== ball.target) {
              ballManager.changeTarget(hitVideo);
              Send(CATCHBALL, { mode: STATE_NEXTUSER, from: undefined, target: hitVideo.ID });
            }
          } else {
            drawingContext.setLineDash([10, 20]);
            line(lineP.start.x, lineP.start.y, lineP.end.x, lineP.end.y);
          }
          pop();
          return;
        }
    }//switch end
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
      if (ball.target && ball.from.ID === localVideo.ID && getThrowJudge(from, handsPos)) {//投げた判定
        ballThrowed();
      }
    }
  }// end trackingMode()
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
 */
function getThrowJudge(video, handsPos) {
  return handsPos && handsPos.y < 0.35;
}
/**
 * ボールを投げたときに呼ばれる関数
 */
function ballThrowed() {
  ballManager.setMode(BALLMODE_THROWING);
  Send(CATCHBALL, { mode: BALLMODE, state: BALLMODE_THROWING });
  switch (ballManager.selectMode) {
    case catchUserTypes[0]: break;
    case catchUserTypes[1]:
      ballManager.isUserHost = false;
      break;
  }

}
/**
 * ボールが届いたときに呼ばれる関数
 */
function ballArrived() {
  ballManager.setMode(BALLMODE_TRACKING);
  switch (ballManager.selectMode) {
    case catchUserTypes[0]: break;
    case catchUserTypes[1]:
      ballManager.setTarget();
      ballManager.isUserHost = true;
      break;
  }
  Send(CATCHBALL, { mode: BALLMODE, state: STATE_CATCH });
  if (ballManager.isHost) {
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
  let threshold = 0.5;//指が曲がってる判定のしきい値
  let marks = video.results.multiHandLandmarks[0];
  let startP = createVector(floor(marks[8].x * floorValue) / floorValue, floor(marks[8].y * floorValue) / floorValue);
  let dire = startP.copy().sub(floor(marks[6].x * floorValue) / floorValue, floor(marks[6].y * floorValue) / floorValue);
  let bent = createVector(floor((marks[6].x - marks[5].x) * floorValue) / floorValue, floor((marks[6].y - marks[5].y) * floorValue) / floorValue);
  let bentDot = floor(dire.dot(bent) * 10000) / 100;
  if (bentDot < threshold) return;
  if (mirror) {
    startP.x = 1 - startP.x;
    dire.x *= -1;
  }
  startP.x *= video.size.x;
  startP.y *= video.size.y;
  startP.add(video.leftUpPos);
  let linear = getLinear(dire, startP);
  if (linear.a === 0) return;
  let y = (linear.a * dire.x > 0 ? height : 0);
  let x = (y - linear.b) / linear.a;
  return new LineSeg(startP, createVector(x, y));
}
/**
 * 
 * @param {vec} dire 
 * @param {vec} pos 
 * @returns {{傾きa,切片b}}
 */
function getLinear(dire, pos) {
  let a = dire.y / dire.x;
  let b = -a * pos.x + pos.y;
  return { a: a, b: b };
}

/**
 * 他の参加者と線の当たり判定
 * @param {Line} pointingLine 
 * @returns {{video,Vec}}
 */
function getCollVideo(from, pointingLine) {
  let hitPos;
  if (hitPos = collLineVideo(localVideo, from, pointingLine)) {
    return { video: localVideo, hitPos: hitPos };
  }
  for (let i = 0; i < others.length; i++) {
    if (hitPos = collLineVideo(others[i], from, pointingLine)) {
      return { video: others[i], hitPos: hitPos };
    }
  }
  function collLineVideo(video, from, lineP) {
    let leftUp = video.leftUpPos;
    if (!leftUp || video.ID === from.ID) return undefined;
    let rightBottom = new Vec(leftUp.x + video.size.x, leftUp.y + video.size.y);
    let rightUp = new Vec(rightBottom.x, leftUp.y);
    let leftBottom = new Vec(leftUp.x, rightBottom.y);
    let sideArray = [new LineSeg(leftUp, rightUp), new LineSeg(rightUp, rightBottom), new LineSeg(rightBottom, leftBottom), new LineSeg(leftBottom, rightUp)]//4辺
    let sideArrayLen = sideArray.length;
    let hitPosition = undefined;
    let distance = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < sideArrayLen; i++) { //基本的に2本の辺に被るから4辺forを回す
      if (collLineLine(sideArray[i].start, sideArray[i].end, lineP.start, lineP.end)) {
        let linear = getLinear(new Vec(lineP.end.x - lineP.start.x, lineP.end.y - lineP.start.y), lineP.start);
        let vec;
        if (i % 2 === 0) {//上辺か下辺
          let y = sideArray[i].start.y;
          let x = (y - linear.b) / linear.a;
          vec = new Vec(x, y);
        } else {//右辺か左辺
          let x = sideArray[i].start.x;
          let y = linear.a * x + linear.b;
          vec = new Vec(x, y);
        }
        let dist = pow(vec.x - lineP.start.x, 2) + pow(vec.y - lineP.start.y, 2);
        if (dist < distance) {//より短い距離の交点を求める
          distance = dist;
          hitPosition = vec;
        }
      }
    }
    return hitPosition;
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
              ballManager.setTarget();
              break;
          }
      }
      return;

    case STATE_NEXTUSER:
      nextUser();
      return;

    case USERSELECT:
      ballManager.setUserSelectMode(catchballMode.state);
      return;
  }
  function nextUser() {
    switch (ballManager.selectMode) {
      case catchUserTypes[0]:
        let target = getVideoInst(catchballMode.target);
        if (isCatchBall) {//2回目以降
          ballManager.setTarget(target);
        } else {//初回
          isCatchBall = true;
          ballManager.isUserHost = false;
          let from = getVideoInst(catchballMode.from);
          ballManager.ball = new Ball(from.pos.copy(), from);
          ballManager.setTarget(target);
        }
        break;
      case catchUserTypes[1]:
        if (isCatchBall) {
          let target = getVideoInst(catchballMode.target);
          ballManager.changeTarget(target);
          let from = getVideoInst(catchballMode.from);
          if (from) ballManager.setFrom(from);
        } else {//初回
          isCatchBall = true;
          ballManager.isUserHost = false;
          ballManager.ballMode = BALLMODE_TRACKING;
          let from = getVideoInst(catchballMode.from);
          ballManager.ball = new Ball(from.pos.copy(), from);
        }
        break;
    }
  }
}

class BallManager {
  constructor(endFunc) {
    this.member;//参加者
    this.ball;//動かすの
    this.endFunc = endFunc;//終了時の処理
    this.isHost = false;
    this.isUserHost = false;
    this.selectMode = catchUserTypes[0];
    this.ballMode = BALLMODE_TRACKING;//ボールが動くモード
  }
  start() {
    this.isUserHost = true;
    this.isHost = true;
    this.ball = new Ball(localVideo.pos.copy(), localVideo);
    switch (this.selectMode) {
      case catchUserTypes[0]:
        //配列の早いコピーらしい
        //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
        this.member = [...others];
        this.setTarget(this.getNext());
        break;
      case catchUserTypes[1]:
        let fAndT = this.ball.getFromTargetID();
        Send(CATCHBALL, { from: fAndT.from, target: undefined, mode: STATE_NEXTUSER });
        break;
    }
  }
  setUserSelectMode(mode) {
    if (isCatchBall) {
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
      let fAndT = this.ball.getFromTargetID();
      let msg = { from: fAndT.from, target: fAndT.target, mode: STATE_NEXTUSER };
      if (log) console.log(msg);
      Send(CATCHBALL, msg);
    }
  }
  changeTarget(target) {
    this.ball.changeTarget(target);
  }
  setFrom(from) {
    this.ball.setFrom(from);
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
  constructor(pos, from) {
    super(pos, 50);
    this.target;//目標
    this.from = from;//出発
    this.fromPos = createVector();
    this.rotate = 0;
    this.amt = 0;//線形補間の割合
    this.speedR = 2;
  }
  update() {
    //目標の人を枠取り
    if (this.target) {
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
    if (this.target) this.from = this.target;
    this.changeTarget(target);
  }
  changeTarget(target) {
    this.target = target;
  }
  setFrom(from) {
    this.from = from;
  }
  setPosVec(vec) {
    this.pos = vec;
  }
  setPos(x, y) {
    this.pos.x = x;
    this.pos.y = y;
  }
  getFromTargetID() {
    let from = this.from ? this.from.ID : undefined;
    let target = this.target ? this.target.ID : undefined;
    return { from: from, target: target };
  }
}
