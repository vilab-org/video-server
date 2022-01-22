//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localVideo = null;
let others = [];
let dummys = [];
let draggingVideo = null;
let hideCapture = null;
let checkbox;
let handResults;
let blackimg;
let mathf;
let averagePing = 0;
let regularTime = new Timer(10);
let dragTimer = new Timer(0.5);

const MOVING = 'MOVING';
const RESIZE = 'RESIZE';
const ENAVID = 'ENAVID';
const HIGTOC = 'HIGTOC';
const HNDRES = 'HNDRES';
const REGULAR = 'REGULAR';//定期送信
const ISHIGH = 'ISHIGH';
const CATBAL = 'CATBAL';
const END = 'END';

function setupVideo(stream) {
  let first = localVideo === null;
  if (first) {
    let capture = createVideo();
    capture.hide();
    let videoSize = new Vec(321, 242);

    capture.elt.videowidth = videoSize.x;
    capture.elt.videoheight = videoSize.y;
    capture.elt.autoplay = true;

    let pos = createVector(width / 2, width / 2);

    localVideo = new Video(pos, videoSize, stream.peerId, capture);

    let camera = new Camera(capture.elt, {
      onFrame: async () => {
        await hands.send({//手の映像を送信
          image: capture.elt
        });
      },
      width: videoSize.x,
      height: videoSize.y
    });
    camera.start();
    console.log("camera", camera);
    HighFiveInit();
    catchBallInit();
  }
  localVideo.capture.elt.srcObject = stream;
  ResizeAllVideos();
  console.log("localVideo:", localVideo);
}



function setup() {
  imageMode(CENTER);
  rectMode(CENTER);
  mathf = new Mathf();
  //canvas作成
  createCanvas(windowWidth, windowHeight);
  window.onresize = function () {
    resizeCanvas(windowWidth, windowHeight);
  };
  checkbox = createCheckbox('', true);
  checkbox.changed(SwitchVideo);
  blackimg = loadImage('/image/nekocan.png');
  console.log('setup');
}

function addOtherVideo(otherStream) {
  console.log('add videos');
  console.log(otherStream);
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
  others.push(video);
  ResizeAllVideos();
  console.log("addOtherVideo");
  console.log(video);
}

function removeOtherVideo(peerId) {
  let index = SearchOthers(peerId);
  if (index === -1) {
    return;
  }
  others.splice(index, 1);
  ResizeAllVideos();
}

function draw() {
  background(100);
  if (!regularTime.isWait) {
    regularTime.startTimer();
    Send(REGULAR, new ReceiveMessage(Date.now()));
  }
  if (localVideo === null) return;
  rect(localVideo.pos.x, localVideo.pos.y, localVideo.size.x, localVideo.size.y);
  if (!dragTimer.isWait) {
    dragTimer.startTimer();

    if (draggingVideo !== null) {
      Send(MOVING, new Vec(localVideo.pos.x / windowWidth, localVideo.pos.y / windowHeight));
    }
    if (localVideo.results) {
      //(今回手を認識している || 前回手を認識している)
      if (localVideo.results.multiHandLandmarks.length > 0 || (handResults && handResults.multiHandLandmarks.length > 0)) {
        Send(HNDRES, localVideo.results);
        handResults = localVideo.results;
      }
    }
  }
  if (localVideo) {
    img(localVideo);
    checkbox.position(localVideo.pos.x, checkbox.size().height / 2 + localVideo.pos.y + localVideo.size.y / 2);
    if (isDrawRect) {
      DrawHands(localVideo, localVideo, 1, 1);
    }
  }
  if (others.length + dummys.length > 0) {
    aveOthersHands = DrawAndCalcOthers();//他参加者のdrawと手の位置の平均値計算して返す
  }
  if (isHighFive) {
    HighFive();
  }

  catchBallUpdate();

}

function img(cap) {
  if (cap.videoEnable) {
    /*
    push()
    tra(cap);
    scale(-1,1);
    image(cap.capture, 0, 0, cap.size.x, cap.size.y);//鏡チャレンジ
    pop();*/
    image(cap.capture, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);//鏡なし 通常
    //image(cap.capture,cap.pos.x,cap.pos.y,cap.capture.width,cap.capture.height);
  } else {
    image(blackimg, cap.pos.x, cap.pos.y, blackimg.width, blackimg.height);
  }
  text(cap.ID, cap);
}

function DrawHands(inVideo, outVideo, recStroke, connStroke) {

  if (inVideo.handsEnable && inVideo.results && inVideo.results.multiHandLandmarks) {
    for (let i = 0; i < inVideo.results.multiHandLandmarks.length; i++) {
      let landmarks = inVideo.results.multiHandLandmarks[i];
      let obj = new Obj(outVideo.pos, outVideo.size);
      let minMaxPos = minMax(landmarks);
      DrawRect(obj, minMaxPos, recStroke);
      DrawConnectors(obj, landmarks, connStroke);
      DrawCenterMark(outVideo, minMaxPos, 2);

      noFill();
      stroke(255);
      strokeWeight(1);
      let cap = outVideo;
      text(inVideo.results.multiHandedness[i].label, (cap.pos.x - cap.size.x / 2) + (cap.size.x * minMaxPos[0]), (cap.pos.y - cap.size.y / 2) + (cap.size.y * minMaxPos[3]) + 10);
    }
  }
}

function SwitchVideo() {
  localVideo.videoEnable = checkbox.checked();
  Send(ENAVID, checkbox.checked());
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
    draggingVideo.pos = createVector(mouseX, mouseY);
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
  console.log('receive:' + peerID + ':',msg);
  let index = SearchOthers(peerID);
  if (index === -1) {
    console.warn("not found peerID");
    return;
  }

  switch (msg.type) {
    case MOVING:
      moveVideo(index, msg.data);
      break;
    case RESIZE:
      ResizeOtherVideo(index, msg.data);
      break;
    case ENAVID:
      EnableOtherVideo(index, msg.data);
      break;
    case HNDRES:
      HandsOthersResults(index, msg.data);
      break;
    case REGULAR:
      ReceiveRegular(index, msg.data);
      break;
    case ISHIGH:
      ReceiveIsHighFive(index, msg.data);
      break;
    case CATBAL:
      ReceiveStartCatch(index, msg.data);
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
  cap.capture.elt.videowidth = size.x;
  cap.capture.elt.videoheight = size.y;
  //cap.size.x = cap.capture.width * 2;
  //cap.size.y = cap.capture.height * 2;
}

function SearchOthers(peerId) {
  for (let i = 0; i < others.length; i++) {
    if (others[i].ID === peerId) return i;
  }
  console.error('not found:' + peerId);
  return -1;
}

function moveVideo(index, pos) {
  others[index].pos = createVector(pos.x * windowWidth, pos.y * windowHeight);
}

function ResizeOtherVideo(index, size) {
  ResizeVideo(others[index], size);
}

function EnableOtherVideo(index, enable) {
  others[index].videoEnable = enable;
}

function HandsOthersResults(index, results) {
  others[index].results = results;

}

function ReceiveRegular(index, receiveMessage) {
  if (receiveMessage.isGo) {
    receiveMessage.isGo = false;
    receiveMessage.remsg = Date.now();
    Send(REGULAR, receiveMessage);
  }
  else {
    others[index].ping = receiveMessage.remsg - receiveMessage.msg;
    let ave = localVideo.ping;
    for (let i = 0; i < others.length; i++)ave += others[i].ping;
    averagePing = ave / (others.length + 1);
    console.log(averagePing);
  }

}

function ReceiveIsHighFive(index, isHigh) {
  isHighFive = isHigh;
  document.getElementById("ChangeIsHighFive").checked = isHighFive;
}

function ReceiveStartCatch(index, fromAndTo) {
  if (ball === END) selfBall = undefined;
  let targetI = SearchOthers(fromAndTo.target);
  if(targetI === -1){
    return;
  }
  let from = others[fromI];
  let target = others[targetI];
  if(selfBall){
    selfBall.setTarget(target);
  }
  else{
    let fromI = SearchOthers(fromAndTo.from);
    if(fromI === -1) {
      return;
    }
    selfBall = new Ball(from.pos,from);
    selfBall.setTarget(target);
  }
  
}

function text(text, cap) {
  noFill();
  stroke(0);
  strokeWeight(1);
  text(text, cap.pos.x - cap.size.x / 2, cap.pos.y - cap.size.y / 2 - 10);
}






//他参加者のdrawと手の位置の平均値計算して返す
function DrawAndCalcOthers() {
  let aveMinMaxPos = [//四隅の平均値
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  let valueChanged = [false, false];
  groupAverage(others);
  groupAverage(dummys);

  for (let i = 0; i < aveMinMaxPos.length; i++) {
    if (valueChanged[i]) {
      for (let j = 0; j < aveMinMaxPos[i].length; j++) aveMinMaxPos[i][j] /= others.length;
      if (isDrawRect) {
        DrawRect(localVideo, aveMinMaxPos[i], 1);
        DrawCenterMark(localVideo, aveMinMaxPos[i], 2);
      }
    }
    else {
      aveMinMaxPos[i] = undefined;
    }
  }
  return aveMinMaxPos;

  function groupAverage(group) {
    for (let i = 0; i < group.length; i++) {//他参加者を網羅するfor
      img(group[i]);
      if (isDrawRect) DrawHands(group[i], group[i], 0.7, 0.7);

      if (!group[i].results) continue;
      let handedness = group[i].results.multiHandedness;
      for (let j = 0; j < handedness.length; j++) { //右手左手用のfor
        let minMaxPos = minMax(group[i].results.multiHandLandmarks[j]);
        let index = getIndexLR(handedness[j]);
        if (index == -1) continue;
        for (let k = 0; k < minMaxPos.length; k++) { //検出した手の四隅用のfor
          aveMinMaxPos[index][k] += minMaxPos[k];
        }
        valueChanged[index] = true;
      }
    }
  }
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

function tranScale(video, scaleX, scaleY) {
  let pos = getLeftUpPos(video);
  translate(pos.x * scaleX, pos.y * scaleY);
}

function tra(video) {
  let pos = getLeftUpPos(video);
  translate(pos.x, pos.y);
}

function Line(video, pax, pay, pbx, pby) {
  line(pax * video.size.x, pay * video.size.y, pbx * video.size.x, pby * video.size.y);
}

function DrawRect(video, pos, weight) {
  DrawRectC(video, pos, weight, color(0, 255, 0));
}
function DrawRectC(video, pos, weight, color) {
  strokeWeight(weight);
  stroke(color);
  push();
  tra(video);
  //pos[minX, maxX, minY, maxY]
  Line(video, pos[0], pos[2], pos[0], pos[3]);
  Line(video, pos[0], pos[3], pos[1], pos[3]);
  Line(video, pos[1], pos[3], pos[1], pos[2]);
  Line(video, pos[1], pos[2], pos[0], pos[2]);
  pop();
}

function DrawCenterMark(video, pos, weight) {
  return DrawCenterMarkC(video, pos, weight, color(255, 0, 0));
}
function DrawCenterMarkC(video, pos, weight, color) {
  push();
  //tra(video);
  //let size = min(pos[1] - pos[0], pos[3] - pos[2]) * 0.3 * video.size.x;
  //translate((pos[0] + pos[1]) * 0.5 * video.size.x, (pos[2] + pos[3]) * 0.5 * video.size.y);
  let center = getCenterMark(video, pos);
  stroke(color);
  strokeWeight(weight);
  noFill();
  ellipse(center.pos.x, center.pos.y, center.size.x, center.size.y);
  pop();
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
  let size = min(minMaxPos[1] - minMaxPos[0], minMaxPos[3] - minMaxPos[2]) * 0.3 * max(video.size.x, video.size.y);
  let lu = getLeftUpPos(video);
  let pos = createVector(lu.x + ((minMaxPos[0] + minMaxPos[1]) * 0.5) * video.size.x, lu.y + ((minMaxPos[2] + minMaxPos[3]) * 0.5) * video.size.y);

  return new Obj(pos, createVector(size, size));
}

function minMax(marks) {
  let minX = 1,
    maxX = 0,
    minY = 1,
    maxY = 0;
  for (let i = 0; i < marks.length; i++) {
    minX = (minX < marks[i].x ? minX : marks[i].x);
    maxX = (maxX > marks[i].x ? maxX : marks[i].x);
    minY = (minY < marks[i].y ? minY : marks[i].y);
    maxY = (maxY > marks[i].y ? maxY : marks[i].y);
  }
  return [minX, maxX, minY, maxY];
}

function getHandsMinMax(video) {
  let handsMinMax = [undefined, undefined];
  if (video.results) {
    for (let i = 0; i < video.results.multiHandLandmarks.length; i++) {
      let index = getIndexLR(video.results.multiHandedness[i]);
      if (index == -1) continue;
      //[minX, maxX, minY, maxY];
      handsMinMax[index] = minMax(video.results.multiHandLandmarks[i]);
    }
  }
  return handsMinMax;
}

//https://google.github.io/mediapipe/solutions/hands#javascript-solution-api
function DrawConnectors(video, marks, weight) {
  function LineMarks(a, b) {
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