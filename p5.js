//https://qiita.com/yusuke84/items/54dce88f9e896903e64f
let localCap = null;
let others = [];
let draggingVideo = null;
let capture = null;
let hideCapture = null;
let checkbox;
let movingVideo;
let blackimg;
function setupVideo(stream) {
  if(capture === null){
    capture = createCapture();
    capture.hide();
    capture.elt.srcObject = stream;
    capture.elt.autoplay = true;
    let size = new Vec(160, 120);
    let pos = new Vec(width / 2, width / 2);
    localCap = new Video(pos, stream.id, capture);

    movingVideo = localCap;
  }
  else localCap.capture.elt.srcObject = stream;
  ResizeVideos();
}

function setup() {
  imageMode(CENTER);
  //canvas作成
  createCanvas(windowWidth, windowHeight);
  checkbox = createCheckbox('',true);
  checkbox.changed(SwitchVideo);
  blackimg = loadImage('/image/god.ico');

}

function addOtherVideo(stream) {
  console.log('add videos' + stream);
  console.log('ID:'+stream.id);
  let other = createVideo();
  other.elt.autoplay = true;
  other.elt.srcObject = stream;
  other.hide();
  let size = new Vec(160, 120);
  let pos = new Vec(width / 2, height / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  others.push(new Video(pos, stream.id, other));
  ResizeVideos();
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
  ResizeVideos();
}
let dragInterval = 0;
function draw() {
  dragInterval++;
  if (draggingVideo !== null && dragInterval >= 15) {
    dragInterval = 0;
    draggingVideo.pos = new Vec(mouseX, mouseY);
    Send(JSON.stringify(localCap.pos));
  }
  background(100);
  if (localCap){
    img(localCap);
    checkbox.position(localCap.pos.x,checkbox.size().height/2 + localCap.pos.y + localCap.size.y/2);
  }
  for (let i = 0; i < others.length; i++) {
    img(others[i]);
  }

}

function img(cap){
  image(cap.capture === null ? blackimg : cap.capture, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
}

function SwitchVideo() {
  let capture = localCap.capture;
  localCap.capture= hideCapture;
  hideCapture = capture;
  localStream.getTracks().enable = ! checkbox.checked();
}

function mousePressed() {

  if (collide(mouseX, mouseY, localCap)) {
    draggingVideo = localCap;
  }

  function collide(x, y, video) {
    return (abs(video.pos.x - x) < video.size.x / 2) && ((abs(video.pos.y - y) < video.size.y / 2));
  }
}

function mouseDragged() {

}

function mouseReleased() {
  draggingVideo = null;
}

function ResizeVideos() {
  let i =0;
  for(;i * i< others.length + 1;i++);
  let size = getSize(localCap.capture,i);
  localCap.size = size;
  for(i=0;i<others.length;i++){
    others[i].size = size;
  }
  function getSize(capture,num) {
    let ratio = 240/320;
    let x = (windowWidth/2)/num;
    let y = x * ratio;
    return new Vec(x,y);
  }
}

function moveVideo(peerId,pos) {
  if(movingVideo.ID !== peerId){
    let index = SerchOthers(peerId);
    if(index === -1) return;
    movingVideo = others[index];
  }

  movingVideo.pos = pos;
  console.log(movingVideo);
  function SerchOthers(peerId) {
    for(let i=0;i<others.length;i++){
      console.log(others[i].ID);
      console.log(others[i].capture.elt.srcObject.peerId);
      if(others[i].capture.elt.srcObject.peerId === peerId) return i;
    }
    return -1;
  }
}
