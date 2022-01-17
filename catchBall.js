let isCatched = false;
let ballManager;

function catchBallInit(){
    ballManager = new BallManager(()=>{
        isCatched = false;
    });
}

function catchStart(){
    isCatched = true;
    ballManager.start();
}

function catchBallUpdate(){
    if(isCatched){
      ballManager.update();
    }

}
