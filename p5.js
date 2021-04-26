//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localCap = null;
let others = [];
let draggingVideo = null;
let hideCapture = null;
let checkbox;
let movingVideo;
let blackimg;
let handsImg = null;

const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

const MOVING = 'MOVING';
const RESIZE = 'RESIZE';

function setupVideo(stream) {

  let  capture = createCapture(VIDEO);
    //capture.hide();
    capture.elt.srcObject = stream;
    capture.elt.autoplay = true;
    let size = new Vec(160, 120);
    let pos = new Vec(width / 2, width / 2);
    localCap = new Video(pos, stream.id, capture);

    movingVideo = localCap;
  localCap.capture.elt.srcObject = stream;
  ResizeAllVideos();
  console.log('setupVideo');
}

function setup() {
  console.log('setup');
  imageMode(CENTER);
  //canvas作成
  createCanvas(windowWidth, windowHeight);
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
  //other.hide();
  let size = new Vec(160, 120);
  let pos = new Vec(windowWidth / 2, windowHeight / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  others.push(new Video(pos, stream.id, other));
  ResizeAllVideos();
}

function removeOtherVideo(peerId) {
  let index = -1;
  for (let i = 0; i < others.length; i++) {
    if (others[i].capture.elt.srcObject.peerId === peerId) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    return;
  }
  others.splice(index, 1);
  ResizeAllVideos();
}
let dragInterval = 0;

function draw() {
  dragInterval++;
  if (draggingVideo !== null && dragInterval >= 15) {
    dragInterval = 0;
    Send(MOVING, localCap.pos);
  }
  background(100);
  if (localCap) {
    if (handsImg !== null) img(localCap);
    checkbox.position(localCap.pos.x, checkbox.size().height / 2 + localCap.pos.y + localCap.size.y / 2);
  }
  for (let i = 0; i < others.length; i++) {
    img(others[i]);
  }

}

function img(cap) {
  image(cap.capture === null ? blackimg : handsImg // cap.capture
    , cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
}

function SwitchVideo() {
  let capture = localCap.capture;
  localCap.capture = hideCapture;
  hideCapture = capture;
  localStream.getTracks().enable = !checkbox.checked();
}

function mousePressed() {

  if (collide(mouseX, mouseY, localCap)) {
    if (mouseButton === LEFT) {
      draggingVideo = localCap;
    } else { //RIGHT
      let resize = localCap.size;
      resize.x *= 0.75;
      resize.y *= 0.75;
      console.log('rigiht');
      if (resize.x < windowWidth / 20) {
        resize.x = 320;
        resize.y = 240;
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
    default:

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

function onResults(results){
    
}

hands.setOptions({
  maxNumHands: 2,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
hands.setOptions

