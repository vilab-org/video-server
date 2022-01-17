let isCatched = false;
let ballManager;


function catchBallInit(){
    ballManager = new BallManager(()=>{
        isCatched = false;
    });
}

function catchStart(){
    isCatch = true;
    ballManager.start();
}

function catchBallUpdate(){
    ballManager.update();


}
