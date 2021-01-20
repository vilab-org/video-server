let localCap = null;
let others = [];
let draggingVideo = null;
let capture = null;
let hideCapture = null;
let checkbox;
let blackimg;
function setupVideo(stream) {
  if(capture === null){
    capture = createCapture();
    capture.hide();
    capture.elt.srcObject = stream;
    capture.elt.autoplay = true;
    let size = new Vec(160, 120);
    let pos = new Vec(size.x / 2, size.y / 2);
    localCap = new Video(pos, size, capture);
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
  let other = createVideo();
  other.elt.autoplay = true;
  other.elt.srcObject = stream;
  other.hide();
  let size = new Vec(160, 120);
  let pos = new Vec(size.x / 2, size.y / 2);
  for (let i = 0; i < others.length; i++) {
    pos.x + others[i].size.x;
  }
  others.push(new Video(pos, size, other));
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

function draw() {

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
  } else {
    for (let i = 0; i < others.length; i++) {
      if (collide(mouseX, mouseY, others[i])) {
        draggingVideo = others[i];
        break;
      }
    }
  }
  mouseDragged();

  function collide(x, y, video) {
    return (abs(video.pos.x - x) < video.size.x / 2) && ((abs(video.pos.y - y) < video.size.y / 2));
  }
}

function mouseDragged() {
  if (draggingVideo !== null) {
    draggingVideo.pos = new Vec(mouseX, mouseY);
    Send(JSON.stringify(localCap.pos));
  }
}

function mouseReleased() {
  draggingVideo = null;
}

function ResizeVideos() {
  //let ratio = localCap.capture.height / localCap.capture.width;
  let ratio = 240/320;
  console.log(localCap.capture.height +'/'+localCap.capture.width +' =ratio='+ratio);
  let i =0;
  for(;i * i< others.length + 1;i++);
  let x = (windowWidth/2)/i;
  console.log('x='+x);
  let y = x * ratio;
  localCap.size = new Vec(x,y);
  console.log(localCap);
  for(i=0;i<others.length;i++){
    others[i].size = new Vec(x,y);
  }
}
