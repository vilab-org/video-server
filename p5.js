//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localVideo = null;
let others = [];
let draggingVideo = null;
let hideCapture = null;
let checkbox;
let handResults;
let blackimg;
const MOVING = 'MOVING';
const RESIZE = 'RESIZE';
const ENAVID = 'ENAVID';
const HIGTOC = 'HIGTOC';
const HNDRES = 'HNDRES';

function setupVideo(stream) {
  let first = localVideo === null;
  if (first) {
    let capture = createVideo();
    capture.hide();
    capture.elt.autoplay = true;
    let pos = new Vec(width / 2, width / 2);
    localVideo = new Video(pos, stream.peerId, capture);

    let camera = new Camera(capture.elt, {
      onFrame: async () => {
        await hands.send({
          image: capture.elt
        });
      },
      width: capture.width,
      height: capture.height
    });
    camera.start();
  }
  localVideo.capture.elt.srcObject = stream;
  ResizeAllVideos();
  console.log(localVideo);
}



function setup() {
  imageMode(CENTER);
  rectMode(CENTER);
  //canvas作成
  createCanvas(windowWidth, windowHeight);
  window.onresize = function() {
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
  let pos = new Vec(windowWidth / 2, windowHeight / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  let video = new Video(pos, otherStream.peerId, capture);
  video.capture.elt.srcObject = otherStream;
  others.push(video);
  ResizeAllVideos();
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
let dragInterval = 0;

function draw() {
  background(100);
  if (localVideo === null) return;
  dragInterval++;
  if (dragInterval >= getFrameRate() / 2) {
    dragInterval = 0;
    if (draggingVideo !== null) {
      Send(MOVING, new Vec(localVideo.pos.x / windowWidth, localVideo.pos.y / windowHeight));
    }
    if (localVideo.results) {
      if (localVideo.results.multiHandLandmarks.length > 0 || (handResults && handResults.multiHandLandmarks.length > 0)) {
        //if(localVideo.results.multiHandLandmarks.length > 0){
        Send(HNDRES, localVideo.results);
        handResults = localVideo.results;
        //}
      }
    }
  }
  if (localVideo) {
    img(localVideo);
    checkbox.position(localVideo.pos.x, checkbox.size().height / 2 + localVideo.pos.y + localVideo.size.y / 2);
    DrawHands(localVideo, localVideo, 0.5, 0.5);
  }
  if (others.length > 0) {
    DrawAndCalcOthers();
  }

}

function img(cap) {
  if (cap.videoEnable) {
    /*
    push()
    //tra(cap);
    //scale(-1,1);
    //tranScale(cap,-2,2);
    //image(cap.capture, 0, 0, 0, 0);
    pop();*/
    image(cap.capture, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
    //image(cap.capture,cap.pos.x,cap.pos.y,cap.capture.width,cap.capture.height);
  } else {
    image(blackimg, cap.pos.x, cap.pos.y, blackimg.width, blackimg.height);
  }
  text(cap.ID, cap);
}

function DrawHands(inVideo, outVideo, recStroke, connStroke) {

  if (inVideo.handsEnable && inVideo.results && inVideo.results.multiHandLandmarks) {
    for (let i = 0; i < inVideo.results.multiHandLandmarks.length; i++) {
      //for (const landmarks of inVideo.results.multiHandLandmarks) {
      let landmarks = inVideo.results.multiHandLandmarks[i];
      let obj = new Obj(outVideo.pos, outVideo.size);
      let minMaxPos = minMax(landmarks);
      DrawRect(obj, minMaxPos, recStroke);
      DrawConnectors(obj, landmarks, connStroke);

      noFill();
      stroke(255);
      strokeWeight(1);
      //[minX, maxX, minY, maxY]
      //console.log(inVideo.results);
      let cap = outVideo;
      text(inVideo.results.multiHandedness[i].label, (cap.pos.x - cap.size.x / 2) + (cap.size.x * minMaxPos[0]), (cap.pos.y - cap.size.y / 2) + (cap.size.y * minMaxPos[2]) + 10);
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
      resize.x *= 0.75;
      resize.y *= 0.75;
      if (resize.x < windowWidth / 20) {
        resize.x = localVideo.capture.width;
        resize.y = localVideo.capture.height;
      }
      Send(RESIZE, resize);
    }
  }

  function collide(x, y, video) {
    return (abs(video.pos.x - x) < video.size.x / 2) && ((abs(video.pos.y - y) < video.size.y / 2));
  }
}

function mouseDragged() {
  if (draggingVideo !== null) {
    draggingVideo.pos = new Vec(mouseX, mouseY);
  }
}

function mouseReleased() {
  mouseDragged();
  draggingVideo = null;
}

function ResizeAllVideos() {
  let i = 0;
  for (; i * i < others.length + 1; i++);
  let size = getSize(localVideo.capture, i);
  ResizeVideo(localVideo, size);
  for (i = 0; i < others.length; i++) {
    ResizeVideo(others[i], size);
  }

  function getSize(capture, num) {
    let ratio = capture.height / capture.width;
    let x = (windowWidth / 2) / num;
    let y = x * ratio;
    return new Vec(x, y);
  }
}

function ReceiveMessage(peerID, msg) {
  console.log('receive:' + peerID + ':');
  console.log(msg);
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
    default:
      console.warn('not format message:');
      console.warn(msg);
      break;

  }
}

function ResizeVideo(cap, size) {
  //cap.size.x = size.x;
  //cap.size.y = size.y;
  console.log(cap.capture);
  cap.size.x = cap.capture.width;
  cap.size.y = cap.capture.height;
}

function SearchOthers(peerId) {
  for (let i = 0; i < others.length; i++) {
    if (others[i].ID === peerId) return i;
  }
  console.log('not found:' + peerId);
  return -1;
}

function moveVideo(index, pos) {
  others[index].pos = new Vec(pos.x * windowWidth, pos.y * windowHeight)
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

function text(text, cap) {
  noFill();
  stroke(0);
  strokeWeight(1);
  text(text, cap.pos.x - cap.size.x / 2, cap.pos.y - cap.size.y / 2 - 10);
}






function DrawAndCalcOthers() {
  let othersHandAve = 0;
  let aveMinMaxPos = [
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];
  let valueChanged = [false, false];
  for (let i = 0; i < others.length; i++) {
    img(others[i]);
    //DrawHands(others[i], others[i],1,1);
    if (!others[i].results) continue;
    let handedness = others[i].results.multiHandedness;
    for (let j = 0; j < handedness.length; j++) {
      let minMaxPos = minMax(others[i].results.multiHandLandmarks[j]);
      let index = -1;
      if (handedness[j].label === "Left") index = 0;
      else if (handedness[j].label === "Right") index = 1;
      else continue;
      valueChanged[j] = true;
      for (let k = 0; k < minMaxPos.length; k++) {
        aveMinMaxPos[index][k] += minMaxPos[k];
      }
    }
  }

  for (let i = 0; i < aveMinMaxPos.length; i++) {
    if (valueChanged[i]) {
      for (let j = 0; j < aveMinMaxPos[i].length; j++)
        aveMinMaxPos[i][j] /= others.length;
      DrawRect(localVideo, aveMinMaxPos[i], 2);
    }
  }

}

function tranScale(video, scaleX, scaleY) {
  translate((video.pos.x - video.size.x / 2) * scaleX, (video.pos.y - video.size.y / 2) * scaleY);
}

function tra(video) {
  translate(video.pos.x - video.size.x / 2, video.pos.y - video.size.y / 2);
}

function Line(video, pax, pay, pbx, pby) {
  line(pax * video.size.x, pay * video.size.y, pbx * video.size.x, pby * video.size.y);
}

function DrawRect(video, pos, weight) {
  strokeWeight(weight);
  stroke(0, 255, 0);
  push();
  tra(video); //minX, maxX, minY, maxY]
  Line(video, pos[0], pos[2], pos[0], pos[3]);
  Line(video, pos[0], pos[3], pos[1], pos[3]);
  Line(video, pos[1], pos[3], pos[1], pos[2]);
  Line(video, pos[1], pos[2], pos[0], pos[2]);
  pop();
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
