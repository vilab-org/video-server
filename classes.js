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
  constructor(pos,size,capture){
    this.pos = pos;
    this.size = size;
    this.capture = capture;
  }
}
