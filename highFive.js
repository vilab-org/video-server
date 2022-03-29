let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];
let effectsMana;
let otherEffectsMana;
let effectInterval;
let isDynamicEffect = false;
let effectImg;
let clapAudio;
let high5Collision = false;


function HighFiveInit() {
  effectsMana = new EffectsManager(new Color(255, 255, 0));//init effect manager
  otherEffectsMana = new EffectsManager(new Color(255, 0, 255));
  effectInterval = new Timer(0.1);
  effectImg = loadImage('/image/effect.png');
  clapAudio = loadSound('/audio/Clap01-1.mp3');
}
//ハイタッチのメイン関数
function HighFive() {

  high5Collision = false;
  strokeWeight(2);
  switch (highFiveSelected) {
    case highFiveTypes[1]:
      SamePosHandsHighFive();
      break;
    case highFiveTypes[2]:
      UpPosHighFive(localVideo);
      break;
    case highFiveTypes[3]:
      HybridHighFive(localVideo);
      break;
  }
  effectsMana.update2();
  otherEffectsMana.update2();
  if (high5Collision) {
    clapAudio.play();
  }
}

function OnChangeDynamic() {
  isDynamicEffect = $('#dynamicEffect').prop('checked');
  Send(DYNAMICEFFECT, isDynamicEffect);
}


/*111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111*/
//お互いの手の位置でハイタッチできるやつ
function SamePosHandsHighFive() {
  let localHandsMinMaxes = localVideo.minMaxes;

  for (let i = 0; i < 2; i++) {
    if (localHandsMinMaxes[i]) {
      DrawRectC(localVideo, localHandsMinMaxes[i], 1, color(50, 200, 50));
      DrawCenterMarkC(localVideo, localHandsMinMaxes[i], 2, color(50, 200, 50));
    }
    if (aveOthersHands[i]) {
      DrawRectC(localVideo, aveOthersHands[i], 1, color(200, 50, 50));
      DrawCenterMarkC(localVideo, aveOthersHands[i], 2, color(255, 0, 0));
    }
  }

  let localMarks = getCenterMarks(localVideo, localHandsMinMaxes);
  let otherMarks = getCenterMarks(localVideo, aveOthersHands);
  for (let i = 0; i < 2; i++) {
    if (!localMarks[i] || !otherMarks[i]) continue;//どっちかがundefinedならcontinue
    let colDist = SameCollision(localMarks[i], otherMarks[i]);
    if (colDist.col) {
      high5Collision = true;
      let num = (isDynamicEffect ? max(min(50 / colDist.dist, 5), 1) : 1);
      for (let j = 0; j < num; j++) {
        effectsMana.addEffect(localMarks[i]);
        otherEffectsMana.addEffect(otherMarks[i]);
      }
    }
  }
}

function SameCollision(center1, center2) {
  let colDist = { col: false, dist: undefined };
  let minSize = Math.min(center1.size.x, center2.size.x) * 2;
  let absolute = Math.abs(center1.size.x - center2.size.x) * 2;
  //中央円の大きさが小さい方の円2個分違ったらfalse
  if (absolute > minSize) return colDist;

  //let distX = center1.pos.x - center2.pos.x;
  //let distY = center1.pos.y - center2.pos.y;
  let root = mathf.sqrDist(center1.pos,center2.pos);//Math.sqrt((distX * distX) + (distY * distY));
  //距離が小さい円よりあったらfalse
  if (root > minSize * minSize) return colDist;
  colDist.col = true;
  colDist.dist = Math.sqrt(root);
  return colDist;
}

/*22222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222*/
function UpPosHighFive(video) {
  let handsMinMax = video.minMaxes;
  let size = video.size.y / 2;

  let leftUp = getLeftUpPos(video);
  let rightUp = getRightUpPos(video);
  let localMarks = getCenterMarks(localVideo, handsMinMax);
  let otherMarks = getCenterMarks(localVideo, aveOthersHands);
  let handsCollision = UpCollision(leftUp, rightUp, localMarks, size);
  let othersCollision = UpCollision(leftUp, rightUp, otherMarks, size);
  //let handsCollision = [collisionPos(leftUp, createVector(mouseX, mouseY)),collisionPos(rightUp, createVector(mouseX, mouseY))];
  DrawArch([handsCollision[0] ? 200 : 50, handsCollision[1] ? 200 : 50]);
  high5Collision = handsCollision[0] || handsCollision[1];
  //Effect
  if (!effectInterval.isWait) {
    effectInterval.startTimer();
    for (let i = 0; i < 2; i++) {
      //自分がハイタッチ範囲に手をかざしてたらエフェクト
      if (localMarks[i] && handsCollision[i]) {
        effectsMana.addEffect(localMarks[i]);
      }
      //他の人の平均の手の位置がハイタッチ範囲に手をかざしてたらエフェクト
      if (otherMarks[i] && othersCollision[i]) {
        otherEffectsMana.addEffect(otherMarks[i]);
      }
    }
  }
}

function UpCollision(leftUp, rightUp, marks, dist) {
  let coll = [false, false];
  //let r = 15;
  //noFill(); stroke(100, 100, 255);
  if (marks[0]) {
    //ellipse(marks[0].pos.x, marks[0].pos.y, r, r);
    coll[0] = collisionPos((mirror ? rightUp : leftUp), marks[0].pos);
  }
  if (marks[1]) {
    //ellipse(marks[1].pos.x, marks[1].pos.y, r, r);
    coll[1] = collisionPos((mirror ? leftUp : rightUp), marks[1].pos);
  }
  return coll;
  function collisionPos(targetPos, movePos) {
    return mathf.sqrDist(targetPos, movePos) < dist * dist;
  }
}

/*3333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333*/
function HybridHighFive(video) {
  let size = video.size.y / 2;
  let leftUp = getLeftUpPos(video);
  let rightUp = getRightUpPos(video);
  let localMarks = getCenterMarks(localVideo, video.minMaxes);
  let otherMarks = getCenterMarks(localVideo, aveOthersHands);
  let localUpCollisions = UpCollision(leftUp, rightUp, localMarks, size);
  DrawArch([handsCollision[0] ? 150 : 25, handsCollision[1] ? 150 : 25]);
  for(let i = 0; i < 2; i++){
    if (!localUpCollisions[i]) continue;//どっちかがundefinedならcontinue
    let colDist = SameCollision(localMarks[i], otherMarks[i]);
    if (colDist.col) {
      high5Collision = true;
      let num = (isDynamicEffect ? max(min(50 / colDist.dist, 5), 1) : 1);
      for (let j = 0; j < num; j++) {
        effectsMana.addEffect(localMarks[i]);
        otherEffectsMana.addEffect(otherMarks[i]);
      }
    }
  }
}
