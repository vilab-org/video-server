let isCatchBall = false;
let ballManager;

function catchBallInit() {
    ballManager = new BallManager(() => {
        isCatchBall = false;
    });
}

function catchStart() {
    isCatchBall = true;
    ballManager.start();
}

function catchBallUpdate() {
    if (isCatchBall) {
        ballManager.update();
    }
}

function receiveBallStatus(fromAndTo){
    if (fromAndTo === END) {
        selfBall = undefined;
        return;
      }
      let target;
      if (fromAndTo.target === localVideo.ID) {
        target = localVideo;
      } else {
        let targetI = SearchOthers(fromAndTo.target);
        if (targetI === -1) {
          return;
        }
        target = others[targetI];
      }
    
      if (isCatchBall) {//2回目以降
        ballManager.ball.setTarget(target);
      } else {//初回はfromの設定が必要
        let from;
        if (fromAndTo.from === localVideo.ID) {
          from = localVideo;
        } else {
          let fromI = SearchOthers(fromAndTo.from);
          if (fromI === -1) {
            return;
          }
          from = others[fromI];
          ballManager.ball = new Ball(from.pos, from);
          ballManager.ball.setTarget(target);
        }
      }
}
