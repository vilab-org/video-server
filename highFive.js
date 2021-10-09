let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];
let effectsMana;

//ハイタッチのメイン関数
function HighFive() {
  //SamePosHandsHighFive();
  UpPosHighFive();
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
  effectsMana.update();

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

function UpPosHighFive(video) {
  let localMinMax = getHandsMinMax(localVideo);
  let size = video.size.y / 3;
  let leftUp = getLeftUpPos(video);

  CalcArch();
  DrawArch();
  let handsCollision = UpCollision();
  console.log(handsCollision);

  function UpCollision() {
    let coll = [false, false];
    if (localMinMax[0]) {
      let dist = leftUp.dist(createVector(localMinMax[0][1], localMinMax[0][3]));
      coll[0] = dist < size;
    }
    if (localMinMax[1]) {
      let rightUp = leftUp.add(createVector(video.size.x, 0));
      let dist = rightUp.dist(createVector(localMinMax[1][0], localMinMax[1][2]));
      coll[1] = dist < size;
    }
    return coll;

  }
  function DrawArch() {
    //arc(x,y,w,h,start,end,[mode]);x: 中心のx座標,y: 中心のy座標,w: 幅,h: 高さ,start: 描画開始角度,end: 描画終了角度,mode: 描画モード
    let c = color(100, 225, 100);
    fill(c.r, c.g, c.b, 150);
    stroke(c.r, c.g, c.b, 255);
    arc(leftUp.x, leftUp.y, size, size, 0, PI / 2);
    push();
    rotate(0, 0, PI);
    arc(leftUp.x, leftUp.y, size, size, 0, PI / 2);
    pop();
  }
}



