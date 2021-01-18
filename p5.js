let localCap;
let others = [];
let draggingVideo = null;
let capture = createCapture();

function setupVideo(stream){
console.log('aaaaa');
  capture.elt.srcObject = stream;
}

function setup() {
  imageMode(CENTER);
  //canvas作成
  createCanvas(windowWidth, windowHeight - 100);
  capture.elt.autoplay = true;
  capture.hide();
  let size = new Vec(160,120);
  let pos = new Vec(size.x/2,size.y/2);
  localCap = new Video(pos,size,capture);
}

function addOtherVideo(stream){
  console.log('add videos' + stream);
  let other = createVideo();
  other.elt.autoplay = true;
  other.elt.srcObject = stream;
  other.hide();
  let size = new Vec(160,120);
  let pos = new Vec(size.x/2,size.y/2);
  for(let i=0;i<others.length;i++){
    pos.x + others[i].size.x;
  }
  others.push(new Video(pos,size,other));
}
function removeOtherVideo(peerId) {
  let index = -1;
  for(let i=0;i<others.length;i++){
    if(others[i].capture.elt.srcObject.peerId === peerId){
      index = i;
      break;
    }
  }
  if(index === -1) {
    alert('not found video');
    return;
  }
  others.splice(index,1);
}

function draw() {

  background(100);
  if (localCap)
    image(localCap.capture, localCap.pos.x, localCap.pos.y, localCap.size.x, localCap.size.y);
  for(let i=0;i<others.length;i++){
    let cap = others[i];
    image(cap.capture, cap.pos.x, cap.pos.y, cap.size.x, cap.size.y);
  }

}

function mousePressed(){

  if(collide(mouseX,mouseY,localCap)){
    draggingVideo = localCap;
  }
  else{
    for(let i=0;i<others.length;i++){
      if(collide(mouseX,mouseY,others[i])){
        draggingVideo = others[i];
        break;
      }
    }
  }
  mouseDragged();

  function collide(x,y,video) {
    return (abs(video.pos.x-x) < video.size.x/2) && ((abs(video.pos.y-y) < video.size.y/2));
  }
}

function mouseDragged(){
  if(draggingVideo !== null){
    draggingVideo.pos = new Vec(mouseX,mouseY);
    Send(JSON.stringify(localCap.pos));
  }
}

function mouseReleased(){
  draggingVideo = null;
}
