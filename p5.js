//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
//アイコン https://icooon-mono.com/
let log = false;
let localVideo = null;
let localID;
let others = [];
let dummys = [];
let draggingVideo = null;
let hideCapture = null;
let handResults;
let blackimg;
let handImgs;
let VideONImg = '/image/VideON green.png';
let VideOFFImg = '/image/VideOFF red.png';
let MikeONImg = '/image/MikeON green.png';
let MikeOFFImg = '/image/MikeOFF red.png';
let mathf;
let averagePing = 0;
let regularTime = new Timer(10);
let dragTimer = new Timer(0.5);
let mirror = true;
let handInterval = 0;

const MOVING = 'Moving';
const RESIZE = 'Resize';
const ENABLEVIDEO = 'Enable Video';
const ENABLEMIKE = 'Enable Mike';
const HIGHTOUCH = 'High Touch';
const HANDRESULT = 'Hand Result';
const REGULAR = 'Regular';//定期送信
const HIGHSELECT = 'High Touch Select';
const DYNAMICEFFECT = 'Dynamic effect';
const CATCHBALL = 'Catch Ball';
const END = 'END';

function setupVideo(stream, peer) {
  let first = localVideo === null;
  if (first) {
    let capture = createVideo();
    //Canvas API https://developer.mozilla.org/ja/docs/Web/API/Canvas_API
    //capture.hide();//canvas を使用した動画の操作 (en-US) https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas 
    let videoSize = new Vec(320, 240);

    capture.elt.autoplay = true;
    capture.elt.muted = true;

    let pos = createVector(width / 3, height / 3);

    localVideo = new Video(pos, videoSize, peer.id, capture);
    if (!localVideo.ID) {
      console.error("not set ID", peer.id);
      localVideo.ID = localID;
    }
    let camera = new Camera(capture.elt, {
      onFrame: async () => {
        if(handInterval++ > 0){
          handInterval = 0;
          await hands.send({//手の映像を送信
            image: capture.elt
          });
        }
        
      },
      width: videoSize.x,
      height: videoSize.y
    });
    camera.start();

    localVideo.videoButton.mousePressed(OnVideoEnabled);
    localVideo.mikeButton.mousePressed(() => {
      localVideo.changeMikeImg(!localVideo.mikeEnabled);
      Send(ENABLEMIKE, localVideo.mikeEnabled);
    });

    if (log) console.log("camera", camera);
    HighFiveInit();
    catchBallInit();
  }
  localVideo.capture.elt.srcObject = stream;
  localVideo.capture.show();
  localVideo.capture.hide();
  ResizeAllVideos();
  if (log) console.log("localVideo:", localVideo);
  console.log(stream.getVideoTracks()[0]);
}



function setup() {
  frameRate(30);
  imageMode(CENTER);
  rectMode(CENTER);
  ellipseMode(CENTER);
  mathf = new Mathf();
  //canvas作成
  createCanvas(windowWidth, windowHeight);
  window.onresize = function () {
    resizeCanvas(windowWidth, windowHeight);
    ResizeAllVideos();
  };
  blackimg = loadImage('/image/nekocan.png');
  handImgs = [loadImage('/image/handLef.png'),loadImage('/image/handRig.png')]
  if (log) console.log('setup');
}

function addOtherVideo(otherStream) {
  if (log) console.log('add videos', otherStream);
  let capture = createVideo();
  capture.elt.autoplay = true;
  //capture.elt.srcObject = otherStream;
  capture.hide();
  let pos = createVector(windowWidth / 2, windowHeight / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  let video = new Video(pos, new Vec(320, 240), otherStream.peerId, capture);
  video.capture.elt.srcObject = otherStream;
  video.videoButton.size(24, 24);
  video.mikeButton.size(24, 24);
  others.push(video);
  ResizeAllVideos();
  if (log) console.log("addOtherVideo", video);

  setTimeout(() => {
    Send(ENABLEVIDEO, localVideo.videoEnabled);
    Send(ENABLEMIKE, localVideo.mikeEnabled);
    Send(MOVING, new Vec(localVideo.pos.x / windowWidth, localVideo.pos.y / windowHeight));
  }, 2000);
}

function removeOtherVideo(video) {
  video.videoButton.elt.remove();
  video.mikeButton.elt.remove();
  others.splice(video);
  aveOthersHands = [undefined, undefined];
  ResizeAllVideos();
}

function draw() {
  background(100);
  if (!regularTime.isWait) {
    regularTime.startTimer();
    //Send(REGULAR, new ReceiveMessage(Date.now()));
  }
  if (localVideo === null) return;

  if (!dragTimer.isWait) {
    dragTimer.startTimer();

    if (draggingVideo !== null) {
      Send(MOVING, new Vec(localVideo.pos.x / windowWidth, localVideo.pos.y / windowHeight));
    }
    if (localVideo.results) {
      //(今回手を認識している || 前回手を認識している)
      if (localVideo.results.multiHandLandmarks.length > 0 || (handResults && handResults.multiHandLandmarks.length > 0)) {
        Send(HANDRESULT, localVideo.results);
        handResults = localVideo.results;
      }
    }
  }
  if (localVideo) {
    img(localVideo);

    if (isDrawRect) {
      DrawHands(localVideo, localVideo, 1, 1);
    }
  }
  if (others.length + dummys.length > 0) {
    aveOthersHands = DrawAndCalcOthers();//他参加者のdrawと手の位置の平均値計算して返す
  }
  if (highFiveSelected !== 'none') {
    HighFive();
  }

  catchBallUpdate();

}

function img(cap) {
  let pos = cap.pos;
  let size = cap.size;
  if (cap.videoEnabled) {
    if (mirror) {//鏡チャレンジ
      push()
      translate(pos.x, pos.y);
      scale(-1, 1);
      image(cap.capture, 0, 0, size.x, size.y);
      pop();
    }
    else {
      image(cap.capture, pos.x, pos.y, size.x, size.y);//鏡なし 通常
    }

  } else {
    fill(50);
    noStroke();
    rect(pos.x, pos.y, size.x, size.y);
  }
  cap.videoButton.position(pos.x - cap.videoButton.size().width, pos.y + size.y / 2 + cap.videoButton.size().height / 2);
  cap.mikeButton.position(pos.x + cap.mikeButton.size().width, pos.y + size.y / 2 + cap.mikeButton.size().height / 2);
}

function DrawHands(inVideo, outVideo, recStroke, connStroke) {

  if (inVideo.results && inVideo.results.multiHandLandmarks) {
    let len = inVideo.results.multiHandLandmarks.length;
    for (let i = 0; i < len; i++) {
      let landmarks = inVideo.results.multiHandLandmarks[i];
      if (!landmarks) continue;
      let obj = new Obj(outVideo.pos, outVideo.size);
      let leftRight = getIndexLR(inVideo.results.multiHandedness[i]);
      let minMaxPos = inVideo.minMaxes[leftRight];
      DrawRect(obj, minMaxPos, recStroke);
      DrawConnectors(obj, landmarks, connStroke);
      DrawCenterMark(outVideo, minMaxPos, 2);

      noFill();
      stroke(255);
      strokeWeight(1);
      let cap = outVideo;
      let lefRigStr = ['Left','Right'];
      let displayIndex = (mirror ? 1-leftRight:leftRight);
      text(lefRigStr[displayIndex]+ ":" + Math.round(inVideo.results.multiHandedness[i].score * 100) + "%", (cap.pos.x - cap.size.x / 2) + (cap.size.x * (mirror?minMaxPos.maxX:minMaxPos.minX)), (cap.pos.y - cap.size.y / 2) + (cap.size.y * minMaxPos.maxY) + 10);
    }
  }
}

function OnVideoEnabled() {
  localVideo.changeVideoImg();
  Send(ENABLEVIDEO, localVideo.videoEnabled);
}

function mousePressed() {

  if (collide(mouseX, mouseY, localVideo)) {
    if (mouseButton === LEFT) {
      draggingVideo = localVideo;
    } else { //RIGHT
      let resize = localVideo.size;
      //resize.x *= 0.75;
      //resize.y *= 0.75;
      resize.set(resize.x * 0.75, resize.y * 0.75);
      if (resize.x < windowWidth / 20) {
        resize.set(localVideo.capture.width, localVideo.capture.height);
        //resize.x = localVideo.capture.width;
        //resize.y = localVideo.capture.height;
      }
      Send(RESIZE, resize);
    }
  } else { //マウスの位置は自分のビデオじゃない
    for (let i = 0; i < dummys.length; i++) { //ダミーをクリックしてる説
      if (collide(mouseX, mouseY, dummys[i])) {
        draggingVideo = dummys[i];
      }
    }
  }

  function collide(x, y, video) {
    return (abs(video.pos.x - x) < video.size.x / 2) && ((abs(video.pos.y - y) < video.size.y / 2));
  }
}

function mouseDragged() {
  if (draggingVideo !== null) {
    moveVideo(localVideo, new Vec(mouseX, mouseY));
  }
}

function mouseReleased() {
  mouseDragged();
  draggingVideo = null;
}

function ResizeAllVideos() {
  let i = 1;//自身の1
  for (; i * i <= others.length + dummys.length; i++);
  let size = getSize(localVideo, i);
  ResizeVideo(localVideo, size);
  for (i = 0; i < others.length; i++) {
    ResizeVideo(others[i], size);
  }
  for (i = 0; i < dummys.length; i++) {
    ResizeVideo(dummys[i], size);
  }

  function getSize(video, num) {
    let ratio = video.size.x / video.size.y;
    let x = (windowWidth * 0.5) / num;
    let y = x / ratio;
    return new Vec(x, y);
  }
}

function ReceivedMessage(peerID, msg) {
  if (log) console.log('receive:' + peerID + ':', msg);
  let index = SearchOthers(peerID);
  if (index === -1) {
    console.warn("not found peerID");
    return;
  }
  let video = others[index];
  switch (msg.type) {
    case MOVING:
      moveOtherVideo(video, msg.data);
      break;
    case RESIZE:
      ResizeVideo(video, msg.data);
      break;
    case ENABLEVIDEO:
      EnableOtherVideo(video, msg.data);
      break;
    case ENABLEMIKE:
      SetMike(video, msg.data);
      break;
    case HANDRESULT:
      HandsOthersResults(video, msg.data);
      break;
    case REGULAR:
      ReceiveRegular(video, msg.data);
      break;
    case HIGHSELECT:
      ReceiveHighFiveSelect(video, msg.data);
      break;
      case DYNAMICEFFECT:
        ReceiveDynamicEffect(msg.data);
      break;
    case CATCHBALL:
      ReceiveStartCatch(video, msg.data);
      break;
    default:
      console.warn('not format message:');
      console.warn(msg);
      break;

  }
}

function ResizeVideo(cap, size) {
  //cap.size.x = size.x;
  //cap.size.y = size.y;
  cap.size.set(size.x, size.y);
  let element = cap.capture.elt;
  element.style.width = size.x;
  element.style.height = size.y;
  //cap.capture.elt.videoWidth = size.x;
  //cap.capture.elt.videoHeight = size.y;
  //cap.size.x = cap.capture.width * 2;
  //cap.size.y = cap.capture.height * 2;
}

function SetMike(video, is) {
  video.capture.elt.muted = !is;//othersだけを対象にミュート変更したいのでここで記述
  video.changeMikeImg(is);
}

function SearchOthers(peerId) {
  for (let i = 0; i < others.length; i++) {
    if (others[i].ID === peerId) return i;
  }
  console.warn('not found:' + peerId);
  return -1;
}

function moveVideo(video, pos) {
  video.pos = createVector(pos.x, pos.y);
  video.capture.position(pos.x - video.size.x / 2, pos.y - video.size.y / 2);
}
function moveOtherVideo(video, pos) {
  moveVideo(video, new Vec(pos.x * windowWidth, pos.y * windowHeight));
}

function EnableOtherVideo(video, enable) {
  video.changeVideoImg(enable);
}

function HandsOthersResults(video, results) {
  video.setResults(results);

}

function ReceiveRegular(video, receiveMessage) {
  if (receiveMessage.isGo) {
    receiveMessage.isGo = false;
    receiveMessage.remsg = Date.now();
    Send(REGULAR, receiveMessage);
  }
  else {
    video.ping = receiveMessage.remsg - receiveMessage.msg;
    let ave = localVideo.ping;
    for (let i = 0; i < others.length; i++)ave += others[i].ping;
    averagePing = ave / (others.length + 1);
    if (log) console.log(averagePing);
  }

}

function ReceiveHighFiveSelect(video, select) {
  //$("#highSelect option[value='"+select+"']").prop('selected', true);
  //$("#highSelect").find("option[value='"+select+"']").prop('selected', true);
  highFiveSelected = select;
  $("#highSelect").val(select);
}

function ReceiveDynamicEffect(enabled){
  isDynamicEffect = enabled;
  document.getElementById('dynamicEffect').checked = enabled;
}

function ReceiveStartCatch(video, fromAndTo) {
  receiveBallStatus(fromAndTo);//→ catchBall.js
}

function textVideo(tex, cap) {
  noFill();
  stroke(0);
  strokeWeight(1);
  text(tex, cap.pos.x - cap.size.x / 2, cap.pos.y - cap.size.y / 2 - 10);
}






//他参加者のdrawと手の位置の平均値計算して返す
function DrawAndCalcOthers() {
  let aveMinMaxPos = [//四隅の平均値
    { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  ];
  let valueChanged = [false, false];
  let othersLen = others.length;
  let otherHandsNum = [0,0];
  for (let i = 0; i < othersLen; i++) {//他参加者を網羅するfor
    img(others[i]);
    if (isDrawRect) DrawHands(others[i], others[i], 0.7, 0.7);
    if (!others[i].results) continue;
    for (let j = 0; j < 2; j++) { //右手左手用のfor
      let minMax = others[i].minMaxes[j];
      if (!minMax) continue;
      otherHandsNum[j]++;
      aveMinMaxPos[j].minX += minMax.minX;
      aveMinMaxPos[j].minY += minMax.minY;
      aveMinMaxPos[j].maxX += minMax.maxX;
      aveMinMaxPos[j].maxY += minMax.maxY;
      valueChanged[j] = true;
    }
  }

  for (let i = 0; i < 2; i++) {
    if (valueChanged[i]) {
      aveMinMaxPos[i].minX /= otherHandsNum[i];
      aveMinMaxPos[i].minY /= otherHandsNum[i];
      aveMinMaxPos[i].maxX /= otherHandsNum[i];
      aveMinMaxPos[i].maxY /= otherHandsNum[i];
    } else {
      aveMinMaxPos[i] = undefined;
    }
  }
  return aveMinMaxPos;
}

//左手は0右手は1　その他がありえたら-1を返す
function getIndexLR(handedness) {
  if (handedness.label === "Left") return 0;
  else if (handedness.label === "Right") return 1;
  else return -1;
}

//映像の左上を取得
function getLeftUpPos(video) {
  return createVector(video.pos.x - video.size.x / 2, video.pos.y - video.size.y / 2);
}

function getRightUpPos(video) {
  return createVector(video.pos.x + video.size.x / 2, video.pos.y - video.size.y / 2);
}

function DrawArch(leftUp, rightUp, size, alphaArray) {
  let c = new Color(100, 225, 100);
  stroke(c.r, c.g, c.b, 200);
  //arc(x,y,w,h,start,end,[mode]);x: 中心のx座標,y: 中心のy座標,w: 幅,h: 高さ,start: 描画開始角度,end: 描画終了角度,mode: 描画モード

  fill(c.r, c.g, c.b, alphaArray[(mirror ? 1 : 0)]);
  arc(leftUp.x, leftUp.y, size * 2, size * 2, 0, HALF_PI);
  fill(c.r, c.g, c.b, alphaArray[(mirror ? 0 : 1)]);
  arc(rightUp.x, rightUp.y, size * 2, size * 2, HALF_PI, PI);
}

function tra(video) {
  let pos = getLeftUpPos(video);
  translate(pos.x, pos.y);
}

function Line(video, pax, pay, pbx, pby) {
  let size = video.size;
  line(pax * size.x, pay * size.y, pbx * size.x, pby * size.y);
}

function DrawRect(video, pos, weight) {
  DrawRectC(video, pos, weight, color(0, 255, 0));
}
function DrawRectC(video, pos, weight, color) {
  strokeWeight(weight);
  stroke(color);
  push();
  tra(video);
  //pos{minX, maxX, minY, maxY}
  Line(video, pos.minX, pos.minY, pos.minX, pos.maxY);
  Line(video, pos.minX, pos.maxY, pos.maxX, pos.maxY);
  Line(video, pos.maxX, pos.maxY, pos.maxX, pos.minY);
  Line(video, pos.maxX, pos.minY, pos.minX, pos.minY);
  pop();
}

function DrawCenterMark(video, pos, weight) {
  return DrawCenterMarkC(video, pos, weight, color(255, 0, 0));
}
function DrawCenterMarkC(video, pos, weight, color) {
  let center = getCenterMark(video, pos);
  stroke(color);
  strokeWeight(weight);
  noFill();
  ellipse(center.pos.x, center.pos.y, center.size.x, center.size.y);
  return center;
}
function getCenterMarks(video, minMaxPoses) {
  let marks = [undefined, undefined];
  for (let i = 0; i < 2; i++) {
    if (!minMaxPoses[i]) continue;
    marks[i] = getCenterMark(video, minMaxPoses[i]);
  }
  return marks;
}
function getCenterMark(video, minMaxPos) {
  //minMaxPos{minX, maxX, minY, maxY}
  let size;
  if (mirror)
    size = max(minMaxPos.maxX - minMaxPos.minX, minMaxPos.maxY - minMaxPos.minY) * 0.3 * max(video.size.x, video.size.y);
  else
    size = min(minMaxPos.maxX - minMaxPos.minX, minMaxPos.maxY - minMaxPos.minY) * 0.3 * max(video.size.x, video.size.y);
  let lu = getLeftUpPos(video);
  let pos = createVector(lu.x + ((minMaxPos.minX + minMaxPos.maxX) * 0.5) * video.size.x, lu.y + ((minMaxPos.minY + minMaxPos.maxY) * 0.5) * video.size.y);

  return new Obj(pos, createVector(size, size));
}


//https://google.github.io/mediapipe/solutions/hands#javascript-solution-api
function DrawConnectors(video, marks, weight) {
  function LineMarks(a, b) {
    if(mirror)
      Line(video, 1 - marks[a].x, marks[a].y, 1 - marks[b].x, marks[b].y);
    else
      Line(video, marks[a].x, marks[a].y, marks[b].x, marks[b].y);
  }
  strokeWeight(weight);
  stroke(0, 0, 255);
  push();
  tra(video);
  //LineMarks(,);
  LineMarks(0, 1);
  LineMarks(1, 2);
  LineMarks(2, 3);
  LineMarks(3, 4);

  LineMarks(0, 5);
  LineMarks(5, 9);
  LineMarks(9, 13);
  LineMarks(13, 17);
  LineMarks(17, 0);

  LineMarks(5, 6);
  LineMarks(6, 7);
  LineMarks(7, 8);

  LineMarks(9, 10);
  LineMarks(10, 11);
  LineMarks(11, 12);

  LineMarks(13, 14);
  LineMarks(14, 15);
  LineMarks(15, 16);

  LineMarks(17, 18);
  LineMarks(18, 19);
  LineMarks(19, 20);
  pop();
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}
