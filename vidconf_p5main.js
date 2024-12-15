"use strict";

const FRAME_RATE = 30;
const HANDSENDINTERVAL = 0.5; //手を認識してなかったらこの秒だけ空ける

const VIDEO_MOVING = 'VideoMoving';
const VIDEO_RESIZED = 'VideoResized';
const HANDS_DETECTED = 'HandDetected';

// ボタン
const VIDEO_MODE = 'VideoMode';
const MIC_MODE = 'MicMode';

// GUI
const CONFIG_HANDS_DISPLAY = 'HandsDisplay';

const HIGHSELECT = 'HighTouchSelect';
const DYNAMICEFFECT = 'DynamicEffect';

const CATCHBALL = 'CatchBall';

//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
//アイコン https://icooon-mono.com/
let log = true;
let canvasSize;
let draggingVideo;
let wasHandResults = false;
let deltaTime = 0;
let averagePing = 0;
let mirroring = true;
let handInterval = 0;

class Particle {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size;
        this.vel = createVector();
        this.col = color(255);
        this.active = false;
        this.angle = 0;
    }
}

class ParticleManager {

    constructor(col) {
        this.col = col;
        this.particles = new Array(500);
        this.gravity = createVector(0, 0.5);
        this.speed = 10;
        this.size = 5;
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i] = new Particle(0, 0, this.size);
        }
    }

    addParticle(pos, col = this.col) {
        for (let p of this.particles) {
            if (p.active === false) {
                const theta = random(TWO_PI);
                p.active = true;
                p.pos.set(pos);
                p.vel.set(this.speed * Math.cos(theta), this.speed * Math.sin(theta));
                p.col = col;
                break;
            }
        }
    }

    update() {
        noStroke();
        for (let p of this.particles) {
            if (!p || !p.active) continue;

            p.vel.add(this.gravity); // 自由落下
            p.pos.add(p.vel);
            if (this.isOut(p)) {
                p.active = false;
                continue;
            }
            push();
            translate(p.pos.x, p.pos.y);
            p.angle += 0.2;
            // rotate(p.angle);
            // tint(p.col);
            image(effectImage, 0, 0, 10, 10);
            pop();
        }
        // tint(255);
    }

    isOut(particle) {
        return particle.pos.x < 0 || particle.pos.x > width || //X画面外
            particle.pos.y < 0 || particle.pos.y > height || //Y画面外
            particle.col.a <= 0; //透明になった
    }
}

class Anime {
    constructor(updateFunc, judge, finishFunc) {
        this.update = updateFunc;
        this.judge = judge;
        this.finish = finishFunc;
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

let animation = new Animation();


function preload() {
    // font_nikumaru = loadFont('fonts/07にくまるフォント.otf');
    HighFiveInit();
    catchBallInit();
}

function setup() {
    frameRate(FRAME_RATE);
    imageMode(CENTER);
    rectMode(CENTER);
    ellipseMode(CENTER);

    //canvas作成
    //現在のキャンバスサイズを保持
    canvasSize = getCanvasSize();
    createCanvas(canvasSize.x, canvasSize.y);

    window.onresize = function () {
        const cs = getCanvasSize();
        resizeCanvas(cs.x, cs.y);
        resizeAllVideos();
        repositionAllVideos();
    };
    //textFont(font_nikumaru);

    // blackimg = loadImage('image/nekocan.png');
    // handImgs = [ loadImage('image/handLef.png'), loadImage('image/handRig.png') ];

    startSendingMessages();
    console.log('complete setup');
}

function draw() {
    if (!myVideo) {
        push();
        fill(255, 0, 0);
        textSize(24);
        textAlign(CENTER);
        background(0);
        text('system loading' + '...'.substring(0, second() % 4), width / 2, height / 2);
        pop();
        return;0
    }

    deltaTime = 1 / getFrameRate();
    background(100);

    for (let video of memberVideos.values()) {
        drawVideo(video);
        if (isDrawingHands)
            drawHands(video, 1, 1);
    }

    if (!myVideo.handResults || !myVideo.handResults.multiHandedness) {
        push();
        fill(255);
        textSize(24);
        textAlign(CENTER);
        text('system loading' + '...'.substring(0, second() % 4), width / 2, height / 2);
        pop();

        // mediaPipeHands.send({ image: myVideo.videoTag.elt });
        return;
    }

    const handResults = myVideo.handResults;
    if (handResults) {
        //(今回手を認識している || 前回手を認識している)
        if (handResults.multiHandLandmarks.length > 0) {
            handInterval += HANDSENDINTERVAL / 2;
            wasHandResults = (handResults.multiHandLandmarks.length > 0);
            SendMessage(HANDS_DETECTED, handResults);
        } else {
            handInterval += 1 / FRAME_RATE;
        }
    }
    if (highFiveType !== 'none') {
        HighFive();
    }
    if (isCatchBall) {
        catchBallUpdate();
    }
    animation.update();
}

function getCanvasSize() {
    const doc = document.getElementById('autoWidth');
    return createVector(doc.clientWidth, windowHeight - doc.clientHeight);
}

function drawVideo(video) {
    const pos = video.pos;
    const size = video.size;
    const isMyVideo = (video === myVideo);
    if (!pos || !size) return;
        
    if (video.videoOn) {
        if (mirroring) {//鏡チャレンジ
            push()
            translate(pos.x, pos.y);
            scale(-1, 1);
            image(video.videoTag, 0, 0, size.x, size.y);
            pop();
        }
        else {
            image(video.videoTag, pos.x, pos.y, size.x, size.y); //鏡なし 通常
        }

    } else {
        fill(50);
        noStroke();
        rect(pos.x, pos.y, size.x, size.y);
    }
    video.videoButton.position(pos.x - video.videoButton.size().width, pos.y + size.y / 2 - (video.videoButton.size().height * (isMyVideo ? -0.5 : 1)));
    video.micButton.position(pos.x + video.micButton.size().width, pos.y + size.y / 2 - (video.micButton.size().height * (isMyVideo ? -0.5 : 1)));
}

function drawHands(video, recStroke, connStroke) {
    if (!video.handResults || !video.handResults.multiHandLandmarks) return;

    const handResults = video.handResults;
    for (let i = 0; i < handResults.multiHandLandmarks.length; i++) {
        const landmarks = handResults.multiHandLandmarks[i];
        if (!landmarks) continue;
        drawHand(video, landmarks, connStroke);

        const extent = video.handExtents[i];
        if (!extent) continue;
        
        // drawRect(video, video.handCenters[lr], video.handSizes[lr], recStroke);
        drawRect(video, video.handCenters[i], video.handSizes[i], recStroke);
        drawPalm(video, extent, 2);

        fill(0);
        stroke(255);
        strokeWeight(0.7);
        text(handResults.multiHandedness[i].label + ":" + Math.round(handResults.multiHandedness[i].score * 100) + "%",
            (video.pos.x - video.size.x / 2) + (video.size.x * extent.minX), 
            (video.pos.y - video.size.y / 2) + (video.size.y * extent.maxY) + 10);
    }
}

function OnVideoEnabled() {
    myVideo.changeVideoMode(!myVideo.videoOn);
    SendMessage(VIDEO_MODE, myVideo.videoOn);
}

function mousePressed() {
    if (!myVideo) return;
    if ((abs(myVideo.pos.x - mouseX) < myVideo.size.x / 2) && 
        (abs(myVideo.pos.y - mouseY) < myVideo.size.y / 2)) {
        if (mouseButton === LEFT) {
            draggingVideo = myVideo;
        }
    }
}

function mouseDragged() {
    if (draggingVideo) {
        moveVideo(draggingVideo, mouseX, mouseY);
    }
}

function mouseReleased() {
    if (draggingVideo) {
        moveVideo(draggingVideo, mouseX, mouseY);
        sendVideoPos();
    }
    draggingVideo = undefined;
}

function sendVideoPos() {
    SendMessage(VIDEO_MOVING, createVector(myVideo.pos.x / windowWidth, myVideo.pos.y / windowHeight));
}

function resizeAllVideos() {
    if (!myVideo) return;
    const num = memberVideos.size;

    const ratio = myVideo.size.y / myVideo.size.x; //xを基準としたyの比率
    let w = (width * 0.9) / ceil(sqrt(num));
    let h = w * ratio;
    if (h > height * 0.7) {
        h = height * 0.7;
        w = h / ratio;
    }
    if (w === 0 || h === 0) {
        w = 320;
        h = 240;
    }

    for (let user of memberVideos.values()) {
        resizeVideo(user, w, h);
    }
}

function repositionAllVideos() {
    const cs = getCanvasSize();
    const ratioX = cs.x / canvasSize.x;
    const ratioY = cs.y / canvasSize.y; //現在のキャンバスサイズが前のサイズの何倍になるかを計算
    canvasSize = cs; //キャンバスサイズを更新
    //キャンバスサイズが変わったので、位置も更新
    for (let user of memberVideos.values()) {
        moveVideo(user, user.pos.x * ratioX, user.pos.y * ratioY);
    }
}

function messageHandler(peerId, msg) {
    if (log && msg.type !== HANDS_DETECTED)
        console.log('receive:' + peerId + ':', msg.type, msg.data);

    const video = memberVideos.get(peerId);
    if (!video) {
        window.alert("上手く通話ができてない参加者がいます\n更新ボタンを押してください（ctrl+R）")
        return;
    }

    switch (msg.type) {
        case VIDEO_MODE:
            video.changeVideoMode(msg.data);
            break;

        case MIC_MODE:
            SetMic(video, msg.data);
            break;

        case VIDEO_RESIZED:
            resizeVideo(video, msg.data.x, msg.data.y);
            break;
    
        case VIDEO_MOVING:
            moveVideo(video, msg.data.x * windowWidth, msg.data.y * windowHeight);
            break;

        case HANDS_DETECTED:
            video.setHandResults(msg.data);
            break;

        case CONFIG_HANDS_DISPLAY:
            ReceiveDrawHands(msg.data);
            break;

        case HIGHSELECT:
            ReceiveHighFiveSelect(video, msg.data);
            break;

        case DYNAMICEFFECT:
            ReceiveDynamicEffect(msg.data);
            break;

        case CATCHBALL:
            receiveBallStatus(msg.data);
            break;

        default:
            console.warn('message type unknown:');
            console.warn(msg);
            break;

    }
}

function SetMic(video, is) {
    video.videoTag.elt.muted = !is; //othersだけを対象にミュート変更したいのでここで記述
    video.changeMicMode(is);
}

function resizeVideo(video, w, h) {
    video.size.set(w, h);
    let elt = video.videoTag.elt;
    elt.style.width = w;
    elt.style.height = h;
    video.updateTopLeft();
}

function moveVideo(video, x, y) {
    x = constrain(x, video.size.x / 2, width - video.size.x / 2);
    y = constrain(y , video.size.y / 2, height - video.size.y / 2);
    video.pos.set(x, y);
    video.videoTag.position(x - video.size.x / 2, y - video.size.y / 2);
    video.updateTopLeft();
}

function createAnimeText(tex, texSize, texColor, pos, dire) {
    let update;
    let finish;
    let judge;
    let anime = new Anime(update, judge, finish);
    anime.text = tex;
    anime.texSize = texSize;
    anime.texColor = texColor;
    anime.pos = pos;
    anime.dire = dire;
    anime.update = () => {
        anime.pos.add(dire);
        push();
        stroke(255, 255, 255, anime.texColor.a);
        strokeWeight(anime.texSize / 10);
        fill(anime.texColor);
        textAlign(CENTER);
        textSize(anime.texSize);
        text(anime.text, anime.pos.x, anime.pos.y);
        anime.texColor.a -= deltaTime * 255;
        pop();
    };
    anime.judge = () => {
        return anime.texColor.a <= 0;
    };
    anime.finish = () => { };
    return anime;
}

function createAnimeImg(img, pos, dire, rotateR = 0) {
    let update;
    let finish;
    let judge;
    let anime = new Anime(update, judge, finish);
    anime.alpha = 255;
    anime.update = () => {
        pos.add(dire);
        anime.alpha -= deltaTime * 50;
        push();
        translate(pos.x, pos.y);
        tint(255, 255, 255, anime.alpha);
        rotate(rotateR);
        image(img, 0, 0, defaultBallSize, defaultBallSize);
        pop();
    };
    anime.judge = () => {
        return anime.alpha <= 0;
    }
    anime.finish = () => { };
    return anime;
}

function drawTouchArea(video, alphaArray) {
    const topLeft = video.topLeft;
    const size = video.size.y;
    
    noStroke();
    fill(100, 225, 100, alphaArray[0]);
    arc(topLeft.x, topLeft.y, size, size, 0, HALF_PI);
    fill(100, 225, 100, alphaArray[1]);
    arc(topLeft.x + video.size.x, topLeft.y, size, size, HALF_PI, PI);
}

function drawLine(video, pax, pay, pbx, pby) {
    const vsize = video.size;
    line(pax * vsize.x, pay * vsize.y, pbx * vsize.x, pby * vsize.y);
}

function drawRect(video, center, size, weight, col = color(0, 255, 0)) {
    const vsize = video.size;

    strokeWeight(weight);
    push();
    stroke(col);
    noFill();
    translate(video.topLeft.x, video.topLeft.y);
    rectMode(CENTER);
    rect(center.x * vsize.x, center.y * vsize.y, size.x * vsize.x, size.y * vsize.y);
    pop();
}

function drawPalm(video, extent, weight, col = color(255, 0, 0)) {
    if (!extent) return;
    const vsize = video.size;

    const palm = getPalmArea(extent);
    push();
    stroke(col);
    strokeWeight(weight);
    noFill();
    translate(video.topLeft.x, video.topLeft.y);
    ellipseMode(CENTER);
    const sz = max(vsize.x, vsize.y);
    ellipse(palm.pos.x * vsize.x, palm.pos.y * vsize.y, palm.size.x * sz, palm.size.y * sz);
    pop();
    return palm;
}

function getPalmArea(extent) {
    if (!extent) return;
    const pos = createVector((extent.minX + extent.maxX) / 2, (extent.minY + extent.maxY) / 2);
    const size = max(extent.maxX - extent.minX, extent.maxY - extent.minY) * 0.3;

    return new VisualObject(pos, createVector(size, size));
}

function getPalmAreas(extents) {
    let marks = [];
    for (let e of extents) {
        marks.push(getPalmArea(e));
    }
    return marks;
}

function drawHand(video, landmarks, weight) {
    function landmarkVertex(i) {
        if (mirroring)
            vertex((1 - landmarks[i].x) * video.size.x, landmarks[i].y * video.size.y);
        else
            vertex(landmarks[i].x * video.size.x, landmarks[i].y * video.size.y);
    }

    strokeWeight(weight);
    stroke(0, 0, 255);
    noFill();

    push();
    translate(video.topLeft.x, video.topLeft.y);

    beginShape()
    //landmarkVertex(0);
    landmarkVertex(1);
    landmarkVertex(2);
    landmarkVertex(3);
    landmarkVertex(4);
    endShape();

    beginShape()
    landmarkVertex(5);
    landmarkVertex(6);
    landmarkVertex(7);
    landmarkVertex(8);
    endShape();

    beginShape()
    landmarkVertex(9);
    landmarkVertex(10);
    landmarkVertex(11);
    landmarkVertex(12);
    endShape();

    beginShape()
    landmarkVertex(13);
    landmarkVertex(14);
    landmarkVertex(15);
    landmarkVertex(16);
    endShape();

    beginShape()
    landmarkVertex(17);
    landmarkVertex(18);
    landmarkVertex(19);
    landmarkVertex(20);
    endShape();

    beginShape()
    landmarkVertex(0);
    landmarkVertex(1);
    landmarkVertex(5);
    landmarkVertex(9);
    landmarkVertex(13);
    landmarkVertex(17);
    endShape(CLOSE);

    pop();
}
