"use strict";

const throwThreshold = 0.35;
const defaultBallSize = 50;

const BALL_NONE = 'NONE';
const BALL_SELECTING = 'SELECTING';
const BALL_THROWING = 'THROWING';
const BALL_MOVING = 'MOVING';
const BALL_CATCHING = 'CATCHING';
const BALL_ANIME = 'ANIME';
const BALL_CAUGHT = 'CAUGHT';
const BALL_FINISH = 'FINISH';

const USERSELECT = 'USERSELECT';
const FLYINGSELECT = 'FLYINGSELECT';
const BALLSELECT = 'BALLSELECT';
const MANUALCATCH = 'MANUALCATCH';
const ROUNDONCE = 'ROUND1';

let isCatchBall = false;
let isManualCatch = false;
let isRoundOnce = false;

let ballImages;
let failedBallImages;

let members = []; //参加者
let ball;
let host;
let catchingTime = 0;

class Ball {

    constructor() {
        this.pos = createVector();
        this.size = defaultBallSize;

        this.state = BALL_NONE;

        this.thrower = undefined;
        this.receiver = undefined;
        this.startPos = createVector();
        this.targetPos = createVector();
        this.amt = 0; //線形補間の割合

        this.ballTypeNo = 0;
        this.angle = 0;
        this.rotSpeed = 5;
        this.fallSpeed = 10;
    }

    set(pos, ballTypeIndex, rotSpeed) {
        this.pos.set(pos);
        this.ballTypeNo = ballTypeIndex;
        this.rotSpeed = rotSpeed;
    }

    draw() {
        //ボールの表示
        push();
        translate(this.pos.x, this.pos.y);
        if (this.state === BALL_MOVING || this.state === BALL_CATCHING)
            rotate(this.angle);
        if (ballImages[this.ballTypeNo]) {
            imageMode(CENTER);
            image(ballImages[this.ballTypeNo], 0, 0, this.size, this.size);
        }
        pop();
    }

    rotate() {
        this.angle += deltaTime * this.rotSpeed;
    }

    startThrowing() {
        this.amt = 0;
        this.startPos.set(this.pos);
        this.targetPos.set(this.receiver.pos);
        this.angle = 0;
        this.state = BALL_MOVING;
    }

    move() {
        if (flyingMode === flyingTypes[1]) {
            const x = (this.startPos.x + this.targetPos.x) / 2;
            const y = Math.min(this.startPos.y, this.targetPos.y) - myVideo.size.y;
            this.pos.x = bezierPoint(this.startPos.x, x, x, this.targetPos.x, this.amt);
            this.pos.y = bezierPoint(this.startPos.y, y, y, this.targetPos.y, this.amt);
        } else {
            this.pos.x = lerp(this.startPos.x, this.targetPos.x, this.amt);
            this.pos.y = lerp(this.startPos.y, this.targetPos.y, this.amt);
        }
        this.amt += deltaTime / 2;//2秒で到達（1秒は早いし3秒は長い）
    }
}

/**
 * キャッチボールのsetup
 */
function catchBallInit() {
    ballImages = [ loadImage('image/ball.png'), loadImage('image/kumasan.png'), loadImage('image/bakudan.png') ];
    failedBallImages = [ ballImages[0], loadImage('image/kumasan_boro.png'), loadImage('image/bakuhatsu.png') ];

    //キャッチボールメニュー
    //ユーザ選択方法
    const pointingSelect = $('#catchUserSelect');
    for (let item of pointingTypes) {
        let option = $('<option>');
        option.text(item);
        pointingSelect.append(option);
    }
    pointingSelect.on('change', () => {
        const changed = setUserSelectMode(pointingSelect.val());
        if (changed) {
            SendMessage(CATCHBALL, { mode: USERSELECT, value: selectMode });
        }
    });

    //ボールの飛び方
    const flyingSelect = $('#flyingSelect');
    for (let item of flyingTypes) {
        const option = $('<option>');
        option.text(item);
        flyingSelect.append(option);
    }
    flyingSelect.on('change', () => {
        const changed = setFlyingSelectMode(flyingSelect.val());
        if (changed) {
            SendMessage(CATCHBALL, { mode: FLYINGSELECT, value: flyingMode });
        }
    });
    // $('#manualCatchCheck').hide();

    //ボールの種類
    const ballSelect = $('#ballSelect');
    for (let item of ballTypes) {
        let option = $('<option>');
        option.text(item);
        ballSelect.append(option);
    }
    ballSelect.on('change', () => {
        const changed = setSelectMode(ballSelect.val());
        if (changed) {
            SendMessage(CATCHBALL, { mode: BALLSELECT, value: ballType });
        }
    });
    /*
        const cis = $('#ChangeIsCatch');
        cis.on('click', () => {
            ChangeIsCatch();
        });
        */

    ball = new Ball();
}

/**
 * キャッチボールスタート
 */
function catchBallStart() {
    const index = ballTypes.indexOf(ballType);
    const rotSpeed = ballRotatingSpeeds[index];
    const pos = createVector(myVideo.pos);
    ball.set(pos, index, rotSpeed);

    isCatchBall = true;
    host = myVideo;

    if (log) console.log(selectMode);

    ball.state = BALL_SELECTING;
    ball.thrower = myVideo
}

/**
 * キャッチボール更新処理
 */
function catchBallUpdate() {
    if (!isCatchBall || !ball.thrower) return;

    const thrower = ball.thrower;
    const receiver = ball.receiver;

    //ボール保持者の強調
    if (thrower) {
        stroke(255, 255, 0, 255);
        strokeWeight(2);
        noFill();
        rect(thrower.pos.x, thrower.pos.y, thrower.size.x, thrower.size.y);
    }
    //目標の人を枠取り
    if (receiver) {
        stroke(0, 255, 0, 255);
        strokeWeight(5);
        noFill();
        rect(receiver.pos.x, receiver.pos.y, receiver.size.x, receiver.size.y);
    }

    switch (ball.state) {
        case BALL_SELECTING:
            // ボール保持者が次を選択中
            selectingReceiver();
            break;

        case BALL_THROWING:  
            // （自分がボール保持者なら）投球処理をする
            throwingBall();
            break;

        case BALL_MOVING:
            // 飛んでいるボールは全員の画面で別々に計算して動く
            ball.rotate();
            ball.move();
            // SendMessage(CATCHBALL, { mode: BALL_MOVING, thrower: thrower.id, receiver: undefined, position: relPos(Ball.pos) });

            // ボールが到達したらキャッチ処理へ
            if (ball.amt >= 1)
                ball.state = BALL_CATCHING;
            break;

        case BALL_CATCHING:
            // （自分がレシーバーなら）キャッチ処理をする
            ball.amt = 0;
            catchingBall();
            if (isManualCatch && receiver) {
               // ボールは全員の画面で別々に計算して落ちる
                ball.pos.y += (receiver.size.y / height) * ball.fallSpeed;
                ball.rotate();
            }
            break;

        case BALL_CAUGHT:
            ball.thrower = ball.receiver;
            ball.state = BALL_SELECTING;
            break;
        
    }
    ball.draw();
}

function setBallType(index) {
    ball.ballTypeNo = index;
    ball.rotSpeed = ballRotatingSpeeds[index];
}

function finishCatchBall() {
    members = [];
    // endFunc();
    SendMessage(CATCHBALL, { mode: BALL_FINISH });
    isCatchBall = false;
}

function getBallImgIndex() {
    return ballTypes.indexOf(ballType);
}

/**
 * USERSELECTがランダムの時、ホストが呼ばれる関数
 * @returns {Video} 次のユーザのビデオクラス
 */
function nextReceiver() {

    let id;
    do {
        id = random([...memberVideos.values()]);
    } while (id === myVideo);
    return id;

    /*
    if (members.length === 0) {        
        members = [...memberVideos.values()]; // 配列のコピー
        if (log) console.log(members.length);
        {
            const i = members.indexOf(myVideo);
            [ members[i], members[0] ] = [ members[0], members[i] ]
        }
        for (let i = members.length - 1; i > 1; i--) {
            const j = int(random(1, i + 1));
            [ members[i], members[j] ] = [ members[j], members[i] ]
        }
    }
    if (log) console.log(members);
   
    return members.pop();
    */
}

class LineSeg {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

function selectingReceiver() {
    const thrower = ball.thrower;

    if (selectMode !== pointingTypes[1]) {
        if (thrower === myVideo) {
            ball.receiver = nextReceiver();
            SendMessage(CATCHBALL, { mode: BALL_SELECTING, 
                thrower: ball.thrower.id, receiver: ball.receiver.id, position: relPos(ball.pos) });
            ball.state = BALL_THROWING;
        }
        return;
    }

    const lineP = getPointingLine(thrower);
    if (lineP) {
        // 指差し中
        const hitInfo = getCollVideo(thrower, lineP);

        push();
        stroke(0, 255, 0);
        strokeWeight(max(3, width * 0.003));
        if (hitInfo) {
            noFill();
            line(lineP.start.x, lineP.start.y, hitInfo.hitPos.x, hitInfo.hitPos.y);
            const hitVideo = hitInfo.video;
            rect(hitVideo.pos.x, hitVideo.pos.y, hitVideo.size.x, hitVideo.size.y);

            if (thrower === myVideo && hitVideo !== ball.receiver) {
                ball.receiver = hitVideo;
                SendMessage(CATCHBALL, { mode: BALL_SELECTING, thrower: myVideo.id, receiver: hitVideo.id });
            }
        } else {
            drawingContext.setLineDash([width * 0.01, width * 0.02]);
            line(lineP.start.x, lineP.start.y, lineP.end.x, lineP.end.y);
        }
        pop();
    } else if (thrower === myVideo && ball.receiver) {
        ball.state = BALL_THROWING;
        SendMessage(CATCHBALL, { mode: BALL_THROWING, 
            thrower: ball.thrower.id, receiver: ball.receiver.id, position: relPos(ball.pos) });
    }
    console.log("B");
}

function throwingBall() {
    const thrower = ball.thrower;

    // この処理はボール保持者だけが実行する
    if (thrower !== myVideo) return;

    if (!ball.receiver) {
        ball.state = BALL_SELECTING;
        return;
    }

    // 投げた判定の高さ
    push();
    stroke(0, 255, 0);
    strokeWeight(max(1, thrower.size.x * 0.01));
    drawingContext.setLineDash([thrower.size.x * 0.02, thrower.size.x * 0.05]);
    const yline = thrower.topLeft.y + thrower.size.y * throwThreshold;
    line(thrower.topLeft.x, yline, thrower.topLeft.x + thrower.size.x, yline);
    pop();

    let handCenter;
    for (let i = 0; i < thrower.handCenters.length; i++) {
        if (thrower.handCenters[i])
            handCenter = thrower.handCenters[i];
    }
    if (!handCenter) return;

    const x = thrower.topLeft.x + handCenter.x * thrower.size.x;
    const y = thrower.topLeft.y + handCenter.y * thrower.size.y;
    ball.pos.set(x, y);

    SendMessage(CATCHBALL, { mode: BALL_THROWING, 
        thrower: ball.thrower.id, receiver: ball.receiver.id, position: relPos(ball.pos) });

    if (handCenter.y < throwThreshold) { //投げた判定
        ball.startThrowing();
        ball.state = BALL_MOVING;
        SendMessage(CATCHBALL, { mode: BALL_MOVING, 
            startPos: relPos(ball.startPos), targetPos: relPos(ball.targetPos) });
    }
}

function catchingBall() {
    const receiver = ball.receiver;

    // この処理はレシーバーだけが実行する
    if (receiver !== myVideo || ball.amt > 0) return;

    if (!isManualCatch) {
        ballCaught();
        return;
    }

    //for (let i = 0; i < receiver.handCenters.length; i++) {
    //    if (receiver.handCenters[i])
    //        drawRect(receiver, receiver.handCenters[i], receiver.handSizes[i], 1);
    //}

    // if (movePos) ball.pos.set(movePos);//他の参加者も当たり判定計算するからこの処理だけ外に出してる

    // SendMessage(CATCHBALL, { mode: BALL_CATCHING, position: relPos(ball.pos) });

    if (collBallHands()) {
        catchingTime += deltaTime;
        if (catchingTime >= 0.5) {
            catchingTime = 0;
            if (log) console.log("キャッチ成功");
            catchingAnimation((host === myVideo && isRoundOnce ? 2 : 1));
            ballCaught();
        }
    } else if (ball.pos.y > ball.receiver.pos.y + ball.receiver.size.y / 2 + defaultBallSize / 2) {
        if (log) console.log("キャッチ失敗");
        catchingAnimation(0);
        ballCaught();
    }

    function collBallHands() {
        for (let extent of myVideo.handExtents) {
            if (collBallAndHand(extent)) {
                return true;
            }
        }
        return false;
    }

    function collBallAndHand(extent) {
        const minX = myVideo.topLeft.x + extent.minX * myVideo.size.x;
        const minY = myVideo.topLeft.y + extent.minY * myVideo.size.y;
        const maxX = myVideo.topLeft.x + extent.maxX * myVideo.size.x;
        const maxY = myVideo.topLeft.y + extent.maxY * myVideo.size.y;
        return minY <= ball.pos.y && ball.pos.y <= maxY && minX <= ball.pos.x && ball.pos.x <= maxX;
    }
}

function catchingAnimation(successValue) {
    const receiver = ball.receiver;
    if (receiver === myVideo) {
        SendMessage(CATCHBALL, { mode: BALL_ANIME, value: successValue });
    }

    let anime;
    switch (successValue) {
        case 0: {
            const index = getBallImgIndex();
            const failedImg = failedBallImages[index];
            if (failedImg) {
                animation.addAnime(
                    createAnimeImg(failedImg, ball.pos.copy(), createVector(0, 2), (index === 1 ? ball.rotation : 0)));
            }
            animation.addAnime(
                createAnimeText("失敗", 24, color(50, 50, 255), ball.pos.copy().add(0, defaultBallSize), createVector(0, 2)));
            ball.pos.y = receiver.topLeft.y + receiver.size.y - defaultBallSize / 2;
            break;
        }

        case 1:
            animation.addAnime(
                createAnimeText("成功", 24, color(50, 255, 50), ball.pos.copy(), createVector(0, -2)));
            break;

        case 2:
            animation.addAnime(
                createAnimeText("大成功", 32, color(50, 255, 50), createVector(width / 2, height / 2), createVector(0, -2)));
            break;
    }
}

/**
 * ボールをキャッチしたときに呼ばれる関数
 */
function ballCaught() {
    //if (!ball.receiver) return;
    //ball.receiver = undefined;

    //if (isRoundOnce) {
    //    finishCatchBall();
    //    return;
    //}

    // console.log(Ball.receiver, myVideo);

    const pos = relPos(ball.pos);
    ball.state = BALL_CAUGHT;
    ball.amt = 0;
    if (ball.receiver === myVideo)
        SendMessage(CATCHBALL, { mode: BALL_CAUGHT, receiver: ball.receiver.id });
}

/**
 * ビデオの指からレーザーを出せる座標を取得
 * @param {Video} video 
 * @returns {LineSeg}
 */
function getPointingLine(video) {
 
    if (!video || !video.handResults || video.handResults.multiHandLandmarks.length === 0)
        return undefined;

    const threshold = 0.5;//指が曲がってる判定のしきい値
    const landmarks = video.handResults.multiHandLandmarks[0];

    const r = (value) => Math.floor(value * 10000) / 10000;
    let startP = createVector(r(landmarks[8].x), r(landmarks[8].y));
    let dirVec = startP.copy().sub(r(landmarks[6].x), r(landmarks[6].y));
    let tipVec = createVector(r(landmarks[6].x - landmarks[5].x), r(landmarks[6].y - landmarks[5].y));

    dirVec.normalize();
    tipVec.normalize();
    if (dirVec.dot(tipVec) < threshold)
        return undefined;

    if (mirroring) {
        startP.x = 1 - startP.x;
        dirVec.x *= -1;
    }

    startP.x *= video.size.x;
    startP.y *= video.size.y;
    startP.add(video.topLeft);

    const linear = getLinear(dirVec, startP);
    if (linear.a === 0) return undefined;
    const y = (linear.a * dirVec.x > 0 ? height : 0);
    const x = (y - linear.b) / linear.a;
    return new LineSeg(startP, createVector(x, y));
}

/**
 * 
 * @param {Vector} dire
 * @param {Vector} pos
 * @returns {{傾きa,切片b}}
 */
function getLinear(dire, pos) {
    const a = dire.y / dire.x;
    const b = -a * pos.x + pos.y;
    return { a: a, b: b };
}

/**
 * 他の参加者と線の当たり判定
 * @param {Vector} from
 * @param {LineSeg} pointingLine
 * @returns {{video,Vec}}
 */
function getCollVideo(from, pointingLine) {
    let hitPos = collLineVideo(myVideo, from, pointingLine);
    if (hitPos) {
        return { video: myVideo, hitPos: hitPos };
    }
    for (let user of memberVideos.values()) {
        if (user === myVideo) continue;
        let hitPos = collLineVideo(user, from, pointingLine)
        if (hitPos) {
            return { video: user, hitPos: hitPos };
        }
    }

    function collLineVideo(video, from, lineP) {
        const topLeft = video.topLeft;
        if (!topLeft || video.id === from.id) return undefined;
        const bottomRight = createVector(topLeft.x + video.size.x / 2, topLeft.y + video.size.y / 2);
        const topRight = createVector(bottomRight.x, topLeft.y);
        const bottomLeft = createVector(topLeft.x, bottomRight.y);
        const rectSides = [new LineSeg(topLeft, topRight), new LineSeg(topRight, bottomRight), new LineSeg(bottomRight, bottomLeft), new LineSeg(bottomLeft, topRight)]//4辺
        let hitPosition;
        let distance = Number.MAX_SAFE_INTEGER;
/*
        // a(x - x0) + b(y - y0) = 0  => y = -a(x - x0) / b + y0, x = -b(y - y0) / a + x0
        const x0 = lineP.start.x;
        const y0 = lineP.start.y;
        const a = -(lineP.end.y - lineP.start.y);
        const b = lineP.end.x - lineP.start.x;

        let x = -b * (topLeft.y - y0) / a + x0;
        if (Math.abs(video.pos.x - x) < video.size.x / 2) {

        }
        x = -b * (bottomRight.y - y0) / a + x0;
        if (Math.abs(video.pos.x - x) < video.size.x / 2) {
            
        }
        let y = -a * (topLeft.x - x0) / b + y0;
        if (Math.abs(video.pos.y - y) < video.size.y / 2) {

        }
        y = -a * (bottomRight.x - x0) / b + y0;
        if (Math.abs(video.pos.y - y) < video.size.y / 2) {
            
        }
*/

        const linear = getLinear(createVector(lineP.end.x - lineP.start.x, lineP.end.y - lineP.start.y), lineP.start);
        for (let i = 0; i < rectSides.length; i++) { // 基本的に2本の辺に被るから4辺forを回す
            const side = rectSides[i];
            if (collLineLine(side.start, side.end, lineP.start, lineP.end)) {
                let vec = createVector();
                if (i % 2 === 0) {//上辺か下辺
                    const y = side.start.y;
                    const x = (y - linear.b) / linear.a;
                    vec.set(x, y);
                } else {//右辺か左辺
                    const x = side.start.x;
                    let y = linear.a * x + linear.b;
                    vec.set(x, y);
                }
                const dist = Math.pow(vec.x - lineP.start.x, 2) + Math.pow(vec.y - lineP.start.y, 2);
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
         * @param {Vector} a
         * @param {Vector} b
         * @param {Vector} c
         * @param {Vector} d
         */
        function collLineLine(a, b, c, d) {
            const ta = (c.x - d.x) * (a.y - c.y) + (c.y - d.y) * (c.x - a.x);
            const tb = (c.x - d.x) * (b.y - c.y) + (c.y - d.y) * (c.x - b.x);
            const tc = (a.x - b.x) * (c.y - a.y) + (a.y - b.y) * (a.x - c.x);
            const td = (a.x - b.x) * (d.y - a.y) + (a.y - b.y) * (a.x - d.x);
            return ta * tb <= 0 && tc * td <= 0;
        }
    }
}

/**
 * キャッチボールに関する受信データの振り分け関数
 * @param {*} msg モードかボールの送信,受信相手
 */
function receiveBallStatus(msg) {
    switch (msg.mode) {
        case BALL_SELECTING:
            ball.state = BALL_SELECTING;
            _setThrowerAndReceiver();
            selectingReceiver();
            break;

        case BALL_THROWING:
            ball.state = BALL_THROWING;
            _setThrowerAndReceiver();
            _setBallPosition();
            break;

        case BALL_MOVING:  // 動き始めに1回だけ呼ばれる 
            ball.state = BALL_MOVING;
            ball.startPos = winPos(msg.startPos);
            ball.targetPos = winPos(msg.targetPos);
            break;

        case BALL_CATCHING:
            ball.state = BALL_CATCHING;
            _setBallPosition();
            break;
    
        case BALL_ANIME:
            catchingAnimation(msg.value);
            break;

        case BALL_CAUGHT:
            ball.amt = 0;
            ball.state = BALL_CAUGHT;
            break;
    
    
        case BALL_FINISH:
            host = undefined;
            isCatchBall = false;
            break;
    
        case USERSELECT:
            setUserSelectMode(msg.value);
            break;

        case FLYINGSELECT:
            setFlyingSelectMode(msg.value);
            break;

        case BALLSELECT:
            setSelectMode(msg.value);
            break;

        case MANUALCATCH:
            OnChangeManualCatch(msg.value);
            break;

        case ROUNDONCE:
            OnChangeRound1(msg.value);
            break;

    }

    function _setThrowerAndReceiver() {
        isCatchBall = true;
        ball.thrower = memberVideos.get(msg.thrower);
        ball.receiver = memberVideos.get(msg.receiver);
        //console.log(ball.thrower, ball.receiver);
    }

    function _setBallPosition() {
        if (msg.position) {
            const index = ballTypes.indexOf(ballType);
            const rotSpeed = ballRotatingSpeeds[index];
            ball.set(winPos(msg.position), index, rotSpeed);
        }
    }
}

function canChange() {
    return !isCatchBall || !isRoundOnce;
}

function OnChangeManualCatch(enabled) {
    if (enabled) {
        isManualCatch = enabled;
        document.getElementById('manualCatch').checked = enabled;
    } else {
        isManualCatch = $('#manualCatch').prop('checked');
        SendMessage(CATCHBALL, { mode: MANUALCATCH, value: isManualCatch });
    }
}

function OnChangeRound1(enabled) {
    if (enabled) {
        isRoundOnce = enabled;
        document.getElementById('round1').checked = enabled;
    } else {
        isRoundOnce = $('#round1').prop('checked');
        SendMessage(CATCHBALL, { mode: ROUNDONCE, value: isRoundOnce });
    }
}

function setUserSelectMode(mode) {
    const isCanChange = canChange();
    if (isCanChange) {
        selectMode = mode;
        $("#catchUserSelect").val(mode);
    } else {
        $("#catchUserSelect").val(selectMode);
    }
    return isCanChange;
}

function setFlyingSelectMode(mode) {
    const isCanChange = canChange();
    if (isCanChange) {
        flyingMode = mode;
        $('#flyingSelect').val(mode);
        /*
        switch (mode) {
            case flyingTypes[0]:
                $('#manualCatchCheck').hide(100);
                break;

            case flyingTypes[1]:
                $('#manualCatchCheck').show(100);
                break;
        }
        */
    } else {
        $('#flyingSelect').val(flyingMode);
    }
    return isCanChange;
}

function setSelectMode(mode) {
    const isCanChange = canChange();
    if (isCanChange) {
        ballType = mode;
        $('#ballSelect').val(mode);
        const index = ballTypes.indexOf(ballType);
        if (ball) setBallType(index);
    } else {
        $('#ballSelect').val(ballType);
    }
    return isCanChange;
}

