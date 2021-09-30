let aveOthersHands = [//四隅の平均値
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ];

function HighFive(){
    let localHandsMinMax = [];
    for(let i=0;i<localVideo.results.multiHandLandmarks.length;i++){
        localHandsMinMax.push(minMax(localVideo.results));
    }
    console.log(localHandsMinMax);
    
}