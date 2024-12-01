"use strict";

let effectManager;
let effectInterval;
let effectImage;
let clapAudio;
let highFiveCollision = false;

//ハイタッチのメイン関数
function HighFive() {
    highFiveCollision = false;
    strokeWeight(2);

    switch (highFiveType) {
        case highFiveTypes[1]:
            SamePosHandsHighFive();
            break;

        case highFiveTypes[2]:
            FixedPosHighFive();
            break;

        case highFiveTypes[3]:
            HybridHighFive();
            break;
    }
    effectManager.update();
    // otherEffectsMgr.update();

    if (highFiveCollision && frameCount % 20 == 0) {
        clapAudio.play();
    }
}

function HighFiveInit() {
    effectManager = new ParticleManager(color(255, 255, 0));
    effectInterval = new Timer(0.1);
    effectImage = loadImage('image/effect.png');
    effectImage.resize(effectManager.size, effectManager.size);
    clapAudio = new Howl({ src: 'audio/Clap01-1.mp3' });
    clapAudio.volume(0.5);

    // ハイタッチメニュー
    const highFiveMenu = $('#highSelect');
    for (let item of highFiveTypes) {
        let option = $('<option>');
        option.text(item);
        highFiveMenu.append(option);
    }
    highFiveMenu.on('change', () => {
        highFiveType = highFiveMenu.val();
        SendMessage(HIGHSELECT, highFiveType);
    });
}

/*111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111*/
//お互いの手の位置でハイタッチできるやつ
function SamePosHandsHighFive() {
    const lowestLine = 0.6;

    for (let myPalm of getPalmAreas(myVideo.handExtents)) {
        // if (myPalm.pos.y > lowestLine)
        //    continue;

        for (let video of memberVideos.values()) {
            if (video === myVideo) continue;
            
            for (let palm of getPalmAreas(video.handExtents)) {
                if (!palm) continue;

                if (touchCheck(myPalm, palm)) {
                    highFiveCollision = true;
                    if (frameCount % 5 == 0) {
                        effectManager.addParticle(winPos(myPalm.pos, myVideo));
                        effectManager.addParticle(winPos(palm.pos, video));
                    }
                }
            }
        }
    }
}

function touchCheck(center1, center2) {
    return p5.Vector.dist(center1.pos, center2.pos) < (center1.size.x + center2.size.x) / 2;

}

/*22222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222*/
function FixedPosHighFive() {
    let myInside = [ undefined, undefined ];
    for (let palm of getPalmAreas(myVideo.handExtents)) {
        if (!palm) continue;
        const myin = insideTouchArea(palm);
        if (myin[0]) myInside[0] = myin[0];
        if (myin[1]) myInside[1] = myin[1];
    }
    drawTouchArea(myVideo, [ myInside[0] ? 200 : 50, myInside[1] ? 200 : 50 ]);

    let touched = [ 0, 0 ];
    for (let video of memberVideos.values()) {
        if (video === myVideo) continue;

        for (let palm of getPalmAreas(video.handExtents)) {
            if (!palm) continue;

            const otherInside = insideTouchArea(palm);
            for (let i = 0; i < 2; i++) {
                if (myInside[i] && otherInside[i]) {
                    touched[i]++;
                    if (frameCount % 5 == 0) {
                        effectManager.addParticle(winPos(otherInside[i].pos, video));
                    }
                }
            }
        }
    }
    for (let i = 0; i < 2; i++) {
        if (touched[i] > 0) {
            highFiveCollision = true;
            if (frameCount % 5 == 0) {
                effectManager.addParticle(winPos(myInside[i].pos, myVideo));
            }
        }
    }
}

function insideTouchArea(palm) {
    const coll = [ undefined,  undefined ];
    if (!palm.pos) return coll;

    if (dist(0, 0, palm.pos.x, palm.pos.y) < 0.5)
        coll[0] = palm;
    if (dist(1, 0, palm.pos.x, palm.pos.y) < 0.5)
        coll[1] = palm;
    
    return coll;
}

/*3333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333333*/
function HybridHighFive() {
    for (let myPalm of getPalmAreas(myVideo.handExtents)) {
        // if (myPalm.pos.y > lowestLine)
        //     continue;

        const myInside = insideTouchArea(myPalm);
        drawTouchArea(myVideo, [ myInside[0] ? 100 : 0, myInside[1] ? 100 : 0 ]);

        for (let video of memberVideos.values()) {
            if (video === myVideo) continue;
            
            for (let palm of getPalmAreas(video.handExtents)) {
                if (!palm) continue;

                const otherInside = insideTouchArea(palm);

                if (((myInside[0] && otherInside[0]) || (myInside[1] && otherInside[1])) && touchCheck(myPalm, palm)) {
                    highFiveCollision = true;
                    if (frameCount % 5 == 0) {
                        effectManager.addParticle(winPos(myPalm.pos, myVideo));
                        effectManager.addParticle(winPos(palm.pos, video));
                    }
                }
            }
        }
    }
}
