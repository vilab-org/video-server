let isCatched = false;
let ballManager;
let selfBall;//他人がホストのキャッチボール時の表示用のボール

function catchBallInit() {
    ballManager = new BallManager(() => {
        isCatched = false;
    });
}

function catchStart() {
    isCatched = true;
    ballManager.start();
}

function catchBallUpdate() {
    if (isCatched) {
        ballManager.update();
    }
    if (selfBall) {
        selfBall.update();
    }
}
