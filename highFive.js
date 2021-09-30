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
  for (let i = 0; i < 2; i++) {
    if (localHandsMinMax[i]) {
      DrawRectC(localVideo, localHandsMinMax[i], 1,color(0,0,255));
      DrawCenterMarkC(localVideo, localHandsMinMax[i], 2,color(0,0,255));
    }
    if (aveOthersHands[i]) {
      DrawRectC(localVideo, aveOthersHands[i], 1,color(0,0,255));
      DrawCenterMarkC(localVideo, aveOthersHands[i], 2,color(0,0,255));
    }
  }
  //noFill();
  //if(others.length > 0)ellipse(others[0].pos.x,others[0].pos.y,500,500);
}
