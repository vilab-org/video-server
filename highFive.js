let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];
let effectsMana;
let otherEffectsMana;

function HighFiveInit() {
  effectsMana = new EffectsManager(new Color(255, 255, 0));//init effect manager
  otherEffectsMana = new EffectsManager(new Color(255, 0, 255));
}
//ハイタッチのメイン関数
function HighFive() {
  //SamePosHandsHighFive();
  UpPosHighFive(localVideo);
  effectsMana.update2();
  otherEffectsMana.update2();
}

//お互いの手の位置でハイタッチできるやつ
function SamePosHandsHighFive() {
  let localHandsMinMax = getHandsMinMax(localVideo);

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
  let othersMark = getCenterMarks(localVideo, aveOthersHands);
  let handsCollision = UpCollision(localMarks);
  let othersCollision = UpCollision(othersMark);
  //let handsCollision = [collisionPos(leftUp, createVector(mouseX, mouseY)),collisionPos(rightUp, createVector(mouseX, mouseY))];
  DrawArch([handsCollision[0] ? 200 : 50, handsCollision[1] ? 200 : 50]);

  //Effect
  for (let i = 0; i < 2; i++) {
    //自分がハイタッチ範囲に手をかざしてたらエフェクト
    if (localMarks[i] && handsCollision[i]) {
      effectsMana.addEffect(localMarks[i]);
    }
    //他の人の平均の手の位置がハイタッチ範囲に手をかざしてたらエフェクト
    if (othersMark[i] && othersCollision[i] && others.length > 0) {
      otherEffectsMana.addEffect(othersMark[i]);
    }
  }
  function UpCollision(marks) {
    let coll = [false, false];
    let r = 15;
    noFill(); stroke(100, 100, 255);
    if (marks[0]) {
      ellipse(marks[0].pos.x, marks[0].pos.y, r, r);
      coll[0] = collisionPos(leftUp, marks[0].pos);
    }
    if (marks[1]) {
      ellipse(marks[1].pos.x, marks[1].pos.y, r, r);
      coll[1] = collisionPos(rightUp, marks[1].pos);
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
    arc(leftUp.x, leftUp.y, size * 2, size * 2, 0, HALF_PI);
    fill(c.r, c.g, c.b, colorings[1]);
    arc(rightUp.x, rightUp.y, size * 2, size * 2, HALF_PI, PI);
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


