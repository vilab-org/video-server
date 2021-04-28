class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
Vec.prototype.toString = function() {
  return '(' + this.x + ',' + this.y + ')';
}

class Video {




  constructor(pos, ID, capture) {
    this.size = null;
    this.pos = pos;
    this.ID = ID;
    this.capture = capture;
    this.videoEnable = true;
    let hands = new Hands({
     locateFile: (file) => {
       return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
     }
    });
    let camera = new Camera(capture.elt, {
      onFrame: async () => {
        await hands.send({
          image: capture.elt
        });
      },
      width: capture.width,
      height: capture.height
    });
    camera.start();
    hands.setOptions({
      maxNumHands: 2,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    hands.onResults(this.onResults);

  }

  onResults(results) {
    if (results.multiHandLandmarks) {
      console.log(results);
      for (const landmarks of results.multiHandLandmarks) {
        DrawRect(localCap, minMax(landmarks), 3);
        DrawConnectors(localCap, landmarks, 2);
      }
    }

  }



}

class Message {
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }
}
