let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];

function HighFive() {
  let localHandsMinMax = [undefined, undefined];
  let localResults = localVideo.results;
  if (localResults) {
    for (let i = 0; i < localResults.multiHandLandmarks.length; i++) {
      let index = getIndexLR(localResults.multiHandedness[i]);
      if (index == -1) continue;
      localHandsMinMax[index] = minMax(localResults.multiHandLandmarks[i]);
    }
  }
  for (let i = 0; i < 2 ; i++) {
    if (localHandsMinMax[i]) {
      DrawRectC(localVideo, localHandsMinMax[i], 1,color(0,0,255));
      DrawCenterMarkC(localVideo, localHandsMinMax[i], 2,color(0,0,255));
    }
    if (aveOthersHands[i]) {
      DrawRectC(localVideo, aveOthersHands[i], 1,color(0,0,255));
      DrawCenterMarkC(localVideo, aveOthersHands[i], 2,color(0,0,255));
    }
  }
  if(CollisionHands(getMinMaxPoses(localHandsMinMax),getMinMaxPoses(aveOthersHands))){
    backColor += 20;
    backColor %= 255;
  }
}

//両手が当たってる判定ならtrue
function CollisionHands(localHands,othersHands){
  for (let i = 0; i < 2; i++) {
    if(!localHands[i] || !othersHands[i]) continue;//どっちかがundefinedならcontinue
    if(!Collision(localHands[i],othersHands[i]))return false;
  }
  return true;
}

function Collision(center1,center2){
  let minSize = Math.min(center1.size.x,center2.size.x);
  //中央円の大きさが小さい方の円2個分違ったらfalse
  if(Math.abs(center1.size.x - center2.size.x) >  minSize) return false;

  let distX = center1.pos.x - center2.pos.x;
  let distY = center1.pos.y - center2.pos.y;
  //距離が小さい円よりあったらfalse
  if(Math.sqrt((distX * distX)+(distY * distY)) > minSize)return false;
  return true;
}