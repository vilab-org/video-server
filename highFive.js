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

  let localMarks = getCenterMarks(localVideo,localHandsMinMax);
  let otherMarks = getCenterMarks(localVideo,aveOthersHands);
  if(CollisionHands(localMarks,otherMarks)){
    console.log("HIT");
    backColor += 20;
    backColor %= 255;
  }
}

//両手が当たってる判定ならtrue
function CollisionHands(localHands,othersHands){
  let nondefined  =false;
  if(!localHands || !othersHands) return false;
  for (let i = 0; i < 2; i++) {
    if(!localHands[i] || !othersHands[i]) continue;//どっちかがundefinedならcontinue
    nondefined = true;
    if(!Collision(localHands[i],othersHands[i]))return false;
  }
  if(!nondefined) return false;
  return true;
}

function Collision(center1,center2){
  let minSize = Math.min(center1.size.x,center2.size.x);
  let absolute = Math.abs(center1.size.x - center2.size.x);
  //中央円の大きさが小さい方の円2個分違ったらfalse
  if(absolute >  minSize) return false;

  let distX = center1.pos.x - center2.pos.x;
  let distY = center1.pos.y - center2.pos.y;
  let root = Math.sqrt((distX * distX)+(distY * distY)) ;
  //距離が小さい円よりあったらfalse
  if(root > minSize)return false;
  return true;
}
