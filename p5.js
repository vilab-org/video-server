//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localCap = null;
let others = [];
let draggingVideo = null;
let hideCapture = null;
let checkbox;
let movingVideo;
let blackimg;
/*
const hands = new Hands({
 locateFile: (file) => {
   return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
 }
});
hands.setOptions({
 maxNumHands: 2,
 minDetectionConfidence: 0.5,
 minTrackingConfidence: 0.5
});
function onResults(results) {
  if (results.multiHandLandmarks) {
    //console.log(results);
    for (const landmarks of results.multiHandLandmarks) {
      DrawRect(localCap, minMax(landmarks), 3);
      DrawConnectors(localCap, landmarks, 2);
    }
  }

}
hands.onResults(onResults);
*/

const MOVING = 'MOVING';
const RESIZE = 'RESIZE';
const ENAVID = 'ENAVID';
const HIGTOC = 'HIGTOC';

function setupVideo(stream) {
  let first = localCap === null;
  if (first) {
    let capture = createCapture(VIDEO);
    capture.hide();
    capture.elt.srcObject = stream;
    capture.elt.autoplay = true;
    console.log(capture);
    let size = new Vec(capture.width, capture.height);
    let pos = new Vec(width / 2, width / 2);
    localCap = new Video(pos, stream.id, capture);
    /*
    let camera = new Camera(capture.elt, {
      onFrame: async () => {
        await hands.send({
          image: capture.elt
        });
      },
      width: capture.width,
      height: capture.height
    });
    camera.start();*/

  }
  movingVideo = localCap;
  localCap.capture.elt.srcObject = stream;
  ResizeAllVideos();
}



function setup() {
  console.log('setup');
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
}

function addOtherVideo(stream) {
  console.log('add videos' + stream);
  console.log('ID:' + stream.id);
  let other = createVideo();
  other.elt.autoplay = true;
  other.elt.srcObject = stream;
  other.hide();
  let size = new Vec(160, 120);
  let pos = new Vec(windowWidth / 2, windowHeight / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  others.push(new Video(pos, stream.id, other));
  ResizeAllVideos();
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
  dragInterval++;
  if (draggingVideo !== null && dragInterval >= getFrameRate()/2) {
    dragInterval = 0;
    Send(MOVING, localCap.pos);
  }
  background(100);
  if (localCap) {
    img(localCap);
    checkbox.position(localCap.pos.x, checkbox.size().height / 2 + localCap.pos.y + localCap.size.y / 2);
  }
  for (let i = 0; i < others.length; i++) {
    img(others[i]);
  }

}

function img(cap) {
  image(cap.videoEnable ? cap.capture : blackimg, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
}

function SwitchVideo() {
  localCap.videoEnable = checkbox.checked();
  Send(ENAVID, checkbox.checked());
}

function mousePressed() {

  if (collide(mouseX, mouseY, localCap)) {
    if (mouseButton === LEFT) {
      draggingVideo = localCap;
    } else { //RIGHT
      let resize = localCap.size;
      resize.x *= 0.75;
      resize.y *= 0.75;
      if (resize.x < windowWidth / 20) {
        resize.x = localCap.capture.width;
        resize.y = localCap.capture.height;
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
  draggingVideo = null;
}

function ResizeAllVideos() {
  let i = 0;
  for (; i * i < others.length + 1; i++);
  let s = getSize(localCap.capture, i);
  ResizeVideo(localCap, new Vec(s.x, s.y));
  for (i = 0; i < others.length; i++) {
    ResizeVideo(others[i], new Vec(s.x, s.y));
  }

  function getSize(capture, num) {
    let ratio = 240 / 320;
    let x = (windowWidth / 2) / num;
    let y = x * ratio;
    return new Vec(x, y);
  }
}

function ReceiveMessage(peerID, msg) {
  console.log(peerID + ':' + msg.data);
  switch (msg.type) {
    case MOVING:
      moveVideo(peerID, msg.data);
      break;
    case RESIZE:
      ResizeOtherVideo(peerID, msg.data);
      break;
    case ENAVID:
      EnableOtherVideo(peerID, msg.data);
      break;
    default:
      break;

  }
}

function ResizeVideo(cap, size) {
  cap.size = size;
}

function SerchOthers(peerId) {
  for (let i = 0; i < others.length; i++) {
    if (others[i].capture.elt.srcObject.peerId === peerId) return i;
  }
  return -1;
}

function moveVideo(peerId, pos) {
  if (movingVideo.ID !== peerId) {
    let index = SerchOthers(peerId);
    if (index === -1) return;
    movingVideo = others[index];
  }
  movingVideo.pos = pos;
}

function ResizeOtherVideo(peerID, size) {
  let index = SerchOthers(peerID);
  if (index === -1) return;
  ResizeVideo(others[index], size);
}

function EnableOtherVideo(peerID, enable) {
  let index = SerchOthers(peerID);
  if (index === -1) {
    console('not found');
    return;
  }
  others[index].videoEnable = enable;
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
  tra(video);
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
function DrawConnectors(video, marks,weight) {
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
