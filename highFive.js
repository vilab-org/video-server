let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];
let effectsMana;

function HighFiveInit(){
  effectsMana = new EffectsManager(localVideo);//init effect manager
}
//ハイタッチのメイン関数
function HighFive() {
  //SamePosHandsHighFive();
  UpPosHighFive(localVideo);
  effectsMana.update();
}

//お互いの手の位置でハイタッチできるやつ
function SamePosHandsHighFive() {
  let localHandsMinMax = getHandsMinMax(localVideo);
  /*[undefined, undefined];
  let localResults = localVideo.results;
  if (localResults) {
    for (let i = 0; i < localResults.multiHandLandmarks.length; i++) {
      let index = getIndexLR(localResults.multiHandedness[i]);
      if (index == -1) continue;
      localHandsMinMax[index] = minMax(localResults.multiHandLandmarks[i]);
    }
  }
  */
  for (let i = 0; i < 2; i++) {
    if (localHandsMinMax[i]) {
      DrawRectC(localVideo, localHandsMinMax[i], 1, color(50, 200, 50));
      DrawCenterMarkC(localVideo, localHandsMinMax[i], 2, color(50, 200, 50));
    }
    if (aveOthersHands[i]) {
      DrawRectC(localVideo, aveOthersHands[i], 1, color(200, 50, 50));
      DrawCenterMarkC(localVideo, aveOthersHands[i], 2, color(255, 0, 0));
    }
  }

  let localMarks = getCenterMarks(localVideo, localHandsMinMax);
  let otherMarks = getCenterMarks(localVideo, aveOthersHands);
  if (CollisionHands(localMarks, otherMarks)) {
    for (let i = 0; i < 2; i++) {
      if (localHandsMinMax[i]) {
        effectsMana.addEffect(localHandsMinMax[i]);
        effectsMana.addEffect(localHandsMinMax[i]);
      }
    }
  }

  //両手が当たってる判定ならtrue
  function CollisionHands(localHands, othersHands) {
    let nondefined = false;
    if (!localHands || !othersHands) return false;
    for (let i = 0; i < 2; i++) {
      if (!localHands[i] || !othersHands[i]) continue;//どっちかがundefinedならcontinue
      nondefined = true;
      if (!Collision(localHands[i], othersHands[i])) return false;
    }
    if (!nondefined) return false;
    return true;
  }

  function Collision(center1, center2) {
    let minSize = Math.min(center1.size.x, center2.size.x);
    let absolute = Math.abs(center1.size.x - center2.size.x);
    //中央円の大きさが小さい方の円2個分違ったらfalse
    if (absolute > minSize) return false;

    let distX = center1.pos.x - center2.pos.x;
    let distY = center1.pos.y - center2.pos.y;
    let root = Math.sqrt((distX * distX) + (distY * distY));
    //距離が小さい円よりあったらfalse
    if (root > minSize) return false;
    return true;
  }
}
/***************************************************************************************************/
function UpPosHighFive(video) {
  let handsMinMax = getHandsMinMax(video);//[minX, maxX, minY, maxY];
  let size = video.size.y / 2;

  let leftUp = getLeftUpPos(video);
  let rightUp = getRightUpPos(video);
  let localMarks = getCenterMarks(localVideo, handsMinMax);
  
  let handsCollision = UpCollision();
  //let handsCollision = [collisionPos(leftUp, createVector(mouseX, mouseY)),collisionPos(rightUp, createVector(mouseX, mouseY))];
  DrawArch([handsCollision[0] ? 200 : 50,handsCollision[1] ? 200 : 50]);

  //Effect
  for (let i = 0; i < 2; i++) {
    if (handsMinMax[i] && handsCollision[i]) {
      effectsMana.addEffect(handsMinMax[i]);
      effectsMana.addEffect(handsMinMax[i]);
    }
  }

  
  function UpCollision() {
    let coll = [false, false];
    let r = 5;
    noFill();stroke(100,225,100);
    if(localMarks[0]){
      ellipse(localMarks[0].pos.x,localMarks[0].pos.y,r,r);
      coll[0] = collisionPos(leftUp,localMarks[0].pos);
    }
    if(localMarks[1]){
      ellipse(localMarks[1].pos.x,localMarks[1].pos.y,r,r);
      coll[1] = collisionPos(rightUp,localMarks[1].pos);
    }
    return coll;
  }
  function collisionPos(targetPos, movePos) {
    //out of image size
    //if (movePos.x < leftUp.x || movePos.x > rightUp.x || movePos.y < leftUp.y || movePos.y > leftUp.y + video.size.y)
    //  return false;
    return targetPos.dist(movePos) < size;
  }

  function DrawArch(colorings) {
    let c = new Color(100, 225, 100);
    stroke(c.r, c.g, c.b, 255);
    //arc(x,y,w,h,start,end,[mode]);x: 中心のx座標,y: 中心のy座標,w: 幅,h: 高さ,start: 描画開始角度,end: 描画終了角度,mode: 描画モード
    
    fill(c.r, c.g, c.b, colorings[0]);
    arc(leftUp.x, leftUp.y, size * 2, size * 2, 0, PI / 2);
    fill(c.r, c.g, c.b, colorings[1]);
    arc(rightUp.x, rightUp.y, size * 2, size * 2, PI / 2, PI);
  }
  function mouseCollision() {
    let coll = [false, false];
    let dist0 = leftUp.dist(createVector(mouseX, mouseY));
    coll[0] = dist0 < size;
    if (coll[0])
      line(leftUp.x, leftUp.y, mouseX, mouseY);
    let dist1 = rightUp.dist(createVector(mouseX, mouseY));
    coll[1] = dist1 < size;
    return coll;
  }
}


