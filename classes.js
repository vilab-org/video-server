class Vec{
  constructor(x,y){
    this.x = x;
    this.y = y;
  }
}
Vec.prototype.toString = function(){
  return '(' + this.x + ',' + this.y +')';
}

class Video{
  constructor(pos,ID,capture){
    this.size = null;
    this.pos = pos;
    this.ID = ID;
    this.capture = capture;
    this.videoEnable = true;
  }
}

class Message{
  constructor(type,data){
    this.type = type;
    this.data = data;
  }
}
