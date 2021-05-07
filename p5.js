//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localVideo = null;
let others = [];
let draggingVideo = null;
let hideCapture = null;
let checkbox;
let movingVideo;
let handResults;
let blackimg;

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
  localVideo.results = results;
}
hands.onResults(onResults);


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

    movingVideo = localVideo;
    handResults = localVideo.resulets;
  }
  localVideo.capture.elt.srcObject = stream;
  ResizeAllVideos();
  console.log(localVideo);
}



function setup() {
  console.log('setup');
  imageMode(CENTER);
  rectMode(CENTER);
  //canvas作成
  createCanvas(windowWidth, windowHeight);
  window.onresize = function () {
    resizeCanvas(windowWidth, windowHeight);
  };
  checkbox = createCheckbox('', true);
  checkbox.changed(SwitchVideo);
  blackimg = loadImage('/image/nekocan.png');
}

function addOtherVideo(otherStream) {
  console.log('add videos');
  console.log(otherStream);
  console.log(otherStream.id);
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
  if(localVideo === null) return;
  dragInterval++;
  if (dragInterval >= getFrameRate() / 2) {
    dragInterval = 0;
    if(draggingVideo !== null){
      Send(MOVING, new Vec(localVideo.pos.x / windowWidth , localVideo.pos.y / windowHeight));
    }
    if(localVideo.resulets || (localVideo.resulets === undefined && handResults)){
      Send(HNDRES,localVideo.results);
      handResults = localVideo.resulets;
    }
  }
  background(100);
  if (localVideo) {
    img(localVideo);
    checkbox.position(localVideo.pos.x, checkbox.size().height / 2 + localVideo.pos.y + localVideo.size.y / 2);
  }
  for (let i = 0; i < others.length; i++) {
    img(others[i]);
  }

}

function img(cap) {
  image(cap.videoEnable ? cap.capture : blackimg, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
  if (cap.handsEnable && cap.results && cap.results.multiHandLandmarks) {
    for (const landmarks of cap.results.multiHandLandmarks) {
      let obj = new Obj(cap.pos, cap.size);
      DrawRect(obj, minMax(landmarks), 3);
      DrawConnectors(obj, landmarks, 2);
    }
  }
  noFill();
  stroke(0);
  strokeWeight(1);
  text(cap.ID, cap.pos.x - cap.size.x / 2, cap.pos.y - cap.size.y / 2 - 10);
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
    case HNDRES:

      break;
    default:
      console.log('not format message:' + msg);
      break;

  }
}

function ResizeVideo(cap, size) {
  cap.size.x = size.x;
  cap.size.y = size.y;
}

function SearchOthers(peerId) {
  for (let i = 0; i < others.length; i++) {
    if (others[i].ID === peerId) return i;
  }
  console.log('not found:' + peerId);
  return -1;
}

function moveVideo(peerId, pos) {
  if (movingVideo.ID !== peerId) {
    let index = SearchOthers(peerId);
    if (index === -1) return;
    movingVideo = others[index];
  }
  movingVideo.pos = new Vec(pos.x * windowWidth, pos.y * windowHeight)
}

function ResizeOtherVideo(peerID, size) {
  let index = setupGetUserMediarchOthers(peerID);
  if (index === -1) return;
  ResizeVideo(others[index], size);
}

function EnableOtherVideo(peerID, enable) {
  let index = SearchOthers(peerID);
  if (index === -1) {
    return;
  }
  others[index].videoEnable = enable;
}

function HandsOthersResults(peerID,resulets){
  let index = SearchOthers(peerID);
  if (index === -1) {
    return;
  }
  others[idnex].resulets = resulets;
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
