let aveOthersHands = [
  [0, 0, 0, 0],
  [0, 0, 0, 0]
];

function HighFive() {
  let localHandsMinMax = [];
  let localResults = localVideo.results;
  if (localResults) {
    for (let i = 0; i < localResults.multiHandLandmarks.length; i++) {
      localHandsMinMax.push(minMax(localResults.multiHandLandmarks[i]));

      DrawCenterMark(localVideo,localHandsMinMax[i],2);
    }
  }


}
