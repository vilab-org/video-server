let isCatchBall = false;
let ballManager;
let ballImg;
let failedBallImg;
let defaultBallSize = 50;
const throwThreshold = 0.35;
const BALLMODE = 'BALLMODE';
const BALLMODE_TRACKING = 'TRACKING';
const BALLMODE_THROWING = 'THROWING';
const BALLMODE_CATCHING = 'CATCHING';
const STATE_NEXTUSER = 'NEXTUSER';
const STATE_CATCH = 'CATCH';
const USERSELECT = 'USERSELECT';
const FLYINGSELECT = 'FLYINGSELECT';
const BALLSELECT = 'BALLSELECT';
const MANUALCATCH = 'MANUALCATCH';
const ROUND1 = 'ROUND1';
const CATCHSUCCESSFUL = 'CATCHSUCCESSFUL';

let isManualCatch = false;
let isRound1 = true;
/**
 * キャッチボールのsetup
 */
function catchBallInit() {
  ballManager = new BallManager(() => {
    catchEnd();
  });
  ballImg = [loadImage('/image/ball.png'), loadImage('/image/nuigurumi_bear.png'), loadImage('/image/bakudan.png')];
  //ballImg[0] = loadImage('/image/sports_soft_tennis_ball.png');
  failedBallImg = [undefined, loadImage('/image/nuigurumi_bear_boroboro.png'), loadImage('/image/bakuhatsu.png')];
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
      ball.Rotate();
      ball.setPosVec(ballMovePos(ball.fromPos, ball.targetPos, ball.amt, ball.from, ball.target));
      ball.amt += deltaTime / 2;//2秒で到達（1秒は早いし3秒は長い）
      if (ball.amt >= 1) {
        ball.amt = 1;
        if (manager.flyingMode === flyingTypes[1] && isManualCatch) { //放物線で飛んできて、手動キャッチの時はモードごと変える
          manager.setMode(BALLMODE_CATCHING);//落ちる場所はわかってるから各自でモード移行してOK
        } else if (ball.target.ID === localVideo.ID) {//キャッチした判定
          ballArrived();
        }
      }
      break;
    case BALLMODE_CATCHING:
      ball.setPos(ball.pos.x, ball.pos.y + (ball.target.size.y / height) * ball.fallSpeed);
      ball.Rotate();
      ballManager.catching();
      ball.update();
      break;
  }
  function trackingMode() {
    let minMaxes = from.minMaxes;
    let handsPos = undefined;
    for (let i = 0; i < 2; i++) {
      if (minMaxes[i]) {
        handsPos = new Vec((minMaxes[i].maxX + minMaxes[i].minX) / 2, (minMaxes[i].maxY + minMaxes[i].minY) / 2);
        break;
      }
    }
    if (handsPos.y < from.pos.y) return;
    switch (ballManager.selectMode) {
      case catchUserTypes[0]://ランダム選択
        break;
      case catchUserTypes[1]:
        let lineP = getPointingLine(from);
        if (lineP) {//指さしあり
          let hitInfo = getCollVideo(from, lineP);
          push();
          stroke(0, 255, 0);
          strokeWeight(max(3, width * 0.003));
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
            drawingContext.setLineDash([width * 0.01, width * 0.02]);
            line(lineP.start.x, lineP.start.y, lineP.end.x, lineP.end.y);
          }
          pop();
          return;//指さしありならボールの描画はしない
        }// if (lineP) end
    }//switch end
    // 指さしなし
    //投げた判定の高さ
    push(); {
      stroke(0, 255, 0);
      strokeWeight(max(1, from.size.x * 0.01));
      drawingContext.setLineDash([from.size.x * 0.02, from.size.x * 0.05]);
      let y = from.leftUpPos.y + from.size.y * throwThreshold;
      line(from.leftUpPos.x, y, from.leftUpPos.x + from.size.x, y);
    } pop();
    ball.update();
    if (handsPos) {
      let leftUp = from.leftUpPos;
      let x = leftUp.x + handsPos.x * from.size.x;
      let y = leftUp.y + handsPos.y * from.size.y;
      ball.setPos(x, y);
      ball.setFromPos(x, y);
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
  ballManager.isHost = false;
  ballManager.isUserHost = false;
  ballManager.ball = undefined;
  ballManager.ballMode = BALLMODE_TRACKING;
  isCatchBall = false;
}
/**
 * ボールを投げた判定
 * @param {video} video 
 * @param {vec} handsPos 
 */
function getThrowJudge(video, handsPos) {
  return handsPos && handsPos.y < throwThreshold;
}
/**
 * ボールを投げたときに呼ばれる関数
 */
function ballThrowed() {
  ballManager.setMode(BALLMODE_THROWING);
  switch (ballManager.selectMode) {
    case catchUserTypes[0]: break;
    case catchUserTypes[1]:
      ballManager.isUserHost = false;
      break;
  }
  let int;
  switch (ballManager.flyingMode) {
    case flyingTypes[1]://放物線描くモード
      if (isManualCatch) {//手動キャッチの場合
        int = randomInt(3);
      }
      break;
  }
  ballManager.setTargetPos(int);
  Send(CATCHBALL, { mode: BALLMODE, state: BALLMODE_THROWING, fromPos: new Vec(ballManager.ball.pos.x / width, ballManager.ball.pos.y / height), int: int });
}
/**
 * ボールをキャッチときに呼ばれる関数
 */
function ballArrived() {
  ballManager.setMode(BALLMODE_TRACKING);
  switch (ballManager.selectMode) {
    case catchUserTypes[0]:
      if (ballManager.isHost) {
        if (isRound1) {
          ballManager.finish();
        } else {
          Send(CATCHBALL, { mode: BALLMODE, state: STATE_CATCH });
          ballManager.setTarget(ballManager.getNext());
        }
      } else {
        Send(CATCHBALL, { mode: BALLMODE, state: STATE_CATCH });
      }
      break;
    case catchUserTypes[1]:
      ballManager.setTarget();//Sendが被るから
      ballManager.isUserHost = true;//この処理順番
      if (ballManager.isHost && isRound1) {
        ballManager.finish();
      } else {
        Send(CATCHBALL, { mode: BALLMODE, state: STATE_CATCH });
      }
      break;
  }
}
/**
 * ボールの動き方
 * @param {PVector} fromPos 
 * @param {PVector} targetPos 
 * @param {value} amt 
 * @param {Video} from 
 * @param {Video} target 
 * @returns {PVector}
 */
function ballMovePos(fromPos, targetPos, amt, from, target) {
  switch (ballManager.flyingMode) {
    case flyingTypes[0]:
      return p5.Vector.lerp(fromPos, targetPos, amt);
    case flyingTypes[1]:
      let minPos = min(fromPos.y, targetPos.y);//より高い位置
      let y = - (from.size.y + target.size.y) * 2;
      if (minPos - (minPos - y) / 2 < 0) { //放物線の頂点が画面外なら
        y = -minPos;
      }
      let p2 = new Vec((fromPos.x + targetPos.x) / 2, y);
      return mathf.bezier(fromPos, p2, targetPos, amt);
  }
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
  dire.normalize();
  bent.normalize();
  let bentDot = dire.dot(bent);
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
          ballManager.ball.setFromPos(catchballMode.fromPos.x * width, catchballMode.fromPos.y * height);
          ballManager.setMode(catchballMode.state);
          ballManager.setTargetPos(catchballMode.int);
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
          return;
      }
      return;

    case STATE_NEXTUSER:
      nextUser();
      return;

    case USERSELECT:
      ballManager.setUserSelectMode(catchballMode.state);
      return;
    case FLYINGSELECT:
      ballManager.setFlyingSelectMode(catchballMode.state);
      return;
    case BALLSELECT:
      ballManager.setBallSelectMode(catchballMode.state);
      return;
    case MANUALCATCH:
      OnChangeManualCatch(catchballMode.state);
      return;
    case ROUND1:
      OnChangeRound1(catchballMode.state);
      return;
    case CATCHSUCCESSFUL:
      ballManager.catchSuccessful(catchballMode.state, false);
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
          ballManager.createBall(from);
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
          ballManager.setMode(BALLMODE_TRACKING);
          let from = getVideoInst(catchballMode.from);
          ballManager.createBall(from);
        }
        break;
    }
  }
}
function getCanChange() {
  return !isCatchBall || (!isRound1 && ballManager.ballMode === BALLMODE_TRACKING);
}
function OnChangeManualCatch(enabled) {
  if (enabled != null) {
    isManualCatch = enabled;
    document.getElementById('manualCatch').checked = enabled;
  } else {
    isManualCatch = $('#manualCatch').prop('checked');
    Send(CATCHBALL, { mode: MANUALCATCH, state: isManualCatch });
  }
}
function OnChangeRound1(enabled) {
  if (enabled != null) {
    isRound1 = enabled;
    document.getElementById('round1').checked = enabled;
  } else {
    isRound1 = $('#round1').prop('checked');
    Send(CATCHBALL, { mode: ROUND1, state: isRound1 });
  }
}

class BallManager {
  constructor(endFunc) {
    this.member = [];//参加者
    this.ball;//動かすの
    this.endFunc = endFunc;//終了時の処理
    this.isHost = false;
    this.isUserHost = false;
    this.selectMode = catchUserTypes[0];
    this.ballMode = BALLMODE_TRACKING;//ボールが動くモード
    this.flyingMode = flyingTypes[0];
    this.ballType = ballTypes[0];
    this.catchingTime = 0;
  }
  start() {
    this.isUserHost = true;
    this.isHost = true;
    this.ballMode = BALLMODE_TRACKING;
    this.createBall(localVideo);
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
  createBall(video) {
    let ballTypeIndex = this.getBallImgIndex();
    let speedR = this.getBallSpeedR(ballTypeIndex);
    this.ball = new Ball(video.pos.copy(), video, ballTypeIndex, speedR);
  }
  getBallSpeedR(index) {
    switch (index) {
      case 0: return 5;
      case 1: return 1;
      case 2: return 3;
    }
  }
  setUserSelectMode(mode) {
    let isCanChange = getCanChange();
    if (isCanChange) {
      this.selectMode = mode;
      $("#catchUserSelect").val(mode);

      switch (this.selectMode) {
        case catchUserTypes[0]:
          this.isUserHost = this.isHost === true;
          if (this.isHost) {
            this.setTarget(this.getNext());
          }
          break;
        case catchUserTypes[1]:
          this.isUserHost = this.ball && this.ball.from.ID === localVideo.ID;
          break;
      }

    } else {
      $("#catchUserSelect").val(this.selectMode);
    }
    return isCanChange;
  }
  setFlyingSelectMode(mode) {
    let isCanChange = getCanChange();
    if (isCanChange) {
      this.flyingMode = mode;
      $('#flyingSelect').val(mode);
      switch (mode) {
        case flyingTypes[0]:
          $('#manualCatchCheck').hide(100);
          break;
        case flyingTypes[1]:
          $('#manualCatchCheck').show(100);
          break;
      }
    } else {
      $('#flyingSelect').val(this.flyingMode);
    }
    return isCanChange;
  }
  setBallSelectMode(mode) {
    let isCanChange = getCanChange();
    if (isCanChange) {
      this.ballType = mode;
      $('#ballSelect').val(mode);
      let index = ballTypes.indexOf(this.ballType);
      if (this.ball) this.setBallImgIndex(index);
    } else {
      $('#ballSelect').val(this.ballType);
    }
    return isCanChange;
  }

  setTarget(next) {
    this.ball.setTarget(next);
    this.ball.rotation = 0;
    if (this.isUserHost) {
      let fAndT = this.ball.getFromTargetID();
      Send(CATCHBALL, { from: fAndT.from, target: fAndT.target, mode: STATE_NEXTUSER });
    }
  }
  changeTarget(target) {
    this.ball.changeTarget(target);
  }
  setFrom(from) {
    this.ball.setFrom(from);
  }
  setMode(ballMode) {
    if (log) console.log("change ball mode:", ballMode);
    this.ballMode = ballMode;
  }
  setBallImgIndex(index) {
    this.ball.ballTypeIndex = index;
    this.ball.speedR = this.getBallSpeedR(index);
  }
  finish() {
    this.member = [];
    this.endFunc();
    Send(CATCHBALL, { mode: END });
  }
  getBallImgIndex() {
    return ballTypes.indexOf(this.ballType);
  }
  /**
   * USERSELECTがランダムの時、ホストが呼ばれる関数
   * @returns {Video} 次のユーザのビデオクラス
   */
  getNext() {
    let next;
    if (isRound1) {
      if (this.member.length > 0) {
        let index = randomInt(this.member.length);
        next = this.member[index];
        this.member.splice(index, 1);
      } else {//もう渡ってない人がいない
        next = localVideo;//ラスト自分
      }
    } else {//ずっと巡るモード
      let targetID = this.ball.target ? this.ball.target.ID : localVideo;
      if (this.member.length === 0) {
        this.member = [...others];
        this.member.push(localVideo);
      }
      let index;
      do {
        index = randomInt(this.member.length);
        next = this.member[index];
      } while (next.ID === targetID);
      this.member.splice(index, 1);
    }
    return next;
  }
  setTargetPos(int) {
    let target = this.ball.target;
    if (int === undefined) { //!intだと0がtrueになる
      this.ball.targetPos = target.pos.copy();
      return;
    }
    let vec = target.leftUpPos.copy();
    let x = [vec.x + this.ball.size * 2, target.pos.x, target.pos.x + target.size.x / 2 - this.ball.size * 2];
    vec.x = x[int];
    this.ball.targetPos = vec;
  }
  catching() {
    let ball = this.ball;
    let pos = ball.pos;
    let movePos = collBallHands();
    let target = ball.target;
    for (let i = 0; i < 2; i++) {
      if (target.minMaxes[i]) DrawRect(target, target.minMaxes[i], 1);
    }
    if (movePos) ball.setPos(movePos.x, movePos.y);//他の参加者も当たり判定計算するからこの処理だけ外に出してる
    if (ball.target.ID === localVideo.ID) {
      if (movePos) {
        this.catchingTime += deltaTime;
        if (this.catchingTime >= 0.5) {
          this.catchingTime = 0;
          if (log) console.log("キャッチ成功");
          this.catchSuccessful((this.isHost && isRound1 ? 2 : 1), true);
          ballArrived();
        }
      } else if (pos.y - ball.size / 2 > ball.target.pos.y + ball.target.size.y / 2) {
        if (log) console.log("キャッチ失敗");
        this.catchSuccessful(0, true);
      }
    }
    function collBallHands() {
      for (let i = 0; i < 2; i++) {
        let minMax = formatMinMax(ball.target, ball.target.minMaxes[i]);
        if (minMax && collBallHand(minMax)) {
          return new Vec(pos.x, minMax.minY - ball.size / 2);
        }
      }
      return undefined;
      function collBallHand(minMax) {
        return pos.y + ball.size / 2 >= minMax.minY && pos.y - ball.size / 2 <= minMax.maxY &&
          pos.x + ball.size / 2 >= (mirror ? minMax.maxX : minMax.minX) && pos.x - ball.size / 2 <= (mirror ? minMax.minX : minMax.maxX);
      }
      function formatMinMax(video, minMax) {
        if (!minMax) return;
        let minPos = video.leftUpPos.copy();
        let size = video.size;

        return { minX: minPos.x + minMax.minX * size.x, minY: minPos.y + minMax.minY * size.y, maxX: minPos.x + minMax.maxX * size.x, maxY: minPos.y + minMax.maxY * size.y };
      }
    }
  }
  catchSuccessful(successValue, hasBall) {
    if (hasBall) {
      Send(CATCHBALL, { mode: CATCHSUCCESSFUL, state: successValue });
    }
    let anime;
    switch (successValue) {
      case 0:
        let index = this.getBallImgIndex();
        let failedImg = failedBallImg[index];
        if (failedImg) {
          anime = createAnimeImg(failedImg, this.ball.pos.copy(), createVector(0, -0.2), (index === 1 ? this.ball.rotation : 0));
        } else {
          anime = createAnimeText("失敗", 32, new Color(50, 50, 255), this.ball.pos.copy(), createVector(0, -1));
        }
        this.finish();
        break;
      case 1:
        anime = createAnimeText("成功", 32, new Color(50, 255, 50), this.ball.pos.copy(), createVector(0, -1));
        break;
      case 2:
        anime = createAnimeText("大成功", 48, new Color(50, 255, 50), createVector(width / 2, height / 2), createVector(0, -2));
        break;
    }
    if (anime) animation.addAnime(anime);
  }
}

class Ball extends Obj {
  constructor(pos, from, ballTypeIndex, speedR = 5) {
    super(pos, defaultBallSize);
    this.target;//目標
    this.from = from;//出発
    this.ballTypeIndex = ballTypeIndex;
    this.fromPos = createVector();
    this.targetPos = createVector();
    this.rotation = 0;
    this.amt = 0;//線形補間の割合
    this.speedR = speedR;
    this.fallSpeed = 10;
    this.prevPos = createVector();
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
    rotate(this.rotation);
    image(ballImg[this.ballTypeIndex], 0, 0, this.size, this.size);
    pop();
  }
  Rotate() {
    this.rotation = (this.rotation + deltaTime * this.speedR) % (PI * 2);
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
    this.setPos(vec.x, vec.y);
  }
  setPos(x, y) {
    this.prevPos = this.pos.copy();
    this.pos.x = x;
    this.pos.y = y;
  }
  setFromPos(x, y) {
    this.fromPos.x = x;
    this.fromPos.y = y;
  }
  getFromTargetID() {
    let from = this.from ? this.from.ID : undefined;
    let target = this.target ? this.target.ID : undefined;
    return { from: from, target: target };
  }
}
