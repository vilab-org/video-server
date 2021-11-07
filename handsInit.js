

const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});
hands.setOptions({
  modelComplexity: 1,//https://github.com/google/mediapipe/issues/2181#:~:text=model.setOptions(%7B%0A%20%20%20%20%20%20modelComplexity%3A%201%0A%20%20%20%20%7D)%3B
  maxNumHands: 2,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

function onResults(results) {
  if (!checkGoodResults(results)) return;
  localVideo.results = results;

  function checkGoodResults(results) {
    //console.log("hands on results");
    //console.log(results);
    if (results.multiHandedness) return true;
    //video.results.multiHandedness[i].label "left" or "right"
    for (let i = 0; i < results.multiHandedness.length; i++) {
      if (results.multiHandedness[i].score < 0.6) return false;
    }
    return true;
  }
}
hands.onResults(onResults);
