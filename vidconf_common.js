"use strict";

const VideOnIcon = 'image/video_on.png';
const VideOffIcon = 'image/video_off.png';
const MicOnIcon = 'image/mic_on.png';
const MicOffIcon = 'image/mic_off.png';

// Skyway
const APIKey = '3a9e6853-1f94-483b-9f2f-5ea53f958e61';
let skyWayPeer;
let localStream;
let joinedRoom;
// let sendData = [];
let dataToSend = [];
let regularID;

// Media Pipe Hands
const mediaPipeHands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});
// let mediaPipeHands;

const highFiveTypes = [ 'OFF', '自由な位置', '固定の位置', 'ハイブリッド' ];
let highFiveType;

let isDrawingHands = false;
let isDynamicEffect = false;

const pointingTypes = [ 'ランダム', '指さし' ];
const flyingTypes = [ '直線', '曲線' ];
const ballTypes = [ 'ボール', "くまさん", "爆弾" ];
const ballRotatingSpeeds = [ 5, 1, 3];
let selectMode = pointingTypes[0];
let flyingMode = flyingTypes[0];
let ballType = ballTypes[0];

let myVideo;
let memberVideos = new Map();

//テキスト選択不可（ドラッグしてる時に選択されるのをやめたい）
document.onselectstart = function () { return false; }

$(function () {
/*
    // Media Pipe Hands
    mediaPipeHands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });
*/
    //初めて利用する人にカメラ許可ダイアログを出すためのgetUserMedia
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then((stream) => {
        })
        .catch((error) => {
            console.error(error);
        });

    // SkyWay 初期化
    skyWayPeer = new Peer({
        key: APIKey,
        debug: 3
    });

    skyWayPeer.on('open', () => {
        $('#my-id').text(skyWayPeer.id);
        console.log("SkyWay ID", skyWayPeer.id);
        if (myVideo && !myVideo.id) myVideo.id = skyWayPeer.id;
    });

    skyWayPeer.on('error', (error) => {
        alert(error.message);
    });

    // ルームメニュー
    $('#make-call').submit((e) => {
        e.preventDefault();
        let roomName = $('#join-room').val();

        if (!roomName) {
            roomName = "main";
        }
        if (joinedRoom) {
            if (log) console.log('exist');
            joinedRoom.close();
        }

        joinedRoom = skyWayPeer.joinRoom(roomName, {
            mode: 'sfu',
            stream: localStream
        });

        $('#make-call').hide();
        $('#end-call').show();
        $('#room-id').text(joinedRoom.name);

        joinedRoom.on('stream', (stream) => {
            addRemoteVideo(stream);
        });

        joinedRoom.on('removeStream', (stream) => {
            if (log) console.log('removeStream:' + stream.peerId);
            removeRemoteVideo(stream.peerId);
            $('#' + stream.peerId).remove();
        });

        joinedRoom.on('peerLeave', (peerId) => {
            if (log) console.log('peerLeave:' + peerId);
            removeRemoteVideo(peerId);
            $('#' + peerId).remove();
        });

        joinedRoom.on('close', () => {
            removeAllOthers();
            $('#make-call').show();
            $('#end-call').hide();
        });

        joinedRoom.on('data', ({
            data,//名前は変更しない
            src
        }) => {
            data = JSON.parse(data);
            for (let d of data) {
                messageHandler(src, d);
            }
        });
    });
/*
    $('#end-call').submit((e) => {
        joinedRoom.close();
        removeAllOthers();
        $('#make-call').show();
        $('#end-call').hide();
    });
*/
    // デバイスメニューと自動接続
    const audioMenu = $('#audioSource');
    const videoMenu = $('#videoSource');

    navigator.mediaDevices.enumerateDevices()
        .then((devs) => {
            for (let dev of devs) {
                let option = $('<option>');
                option.val(dev.deviceId);

                if (dev.kind === 'audioinput') {
                    option.text(dev.label);
                    audioMenu.append(option);
                } else if (dev.kind === 'videoinput') {
                    option.text(dev.label);
                    videoMenu.append(option);
                }
            }
            videoMenu.on('change', setupMediaStream);
            audioMenu.on('change', setupMediaStream);
            setupMediaStream();
        })
        .catch((error) => {
            console.error(error);
        });

    function setupMediaStream() {
        if (localStream) {
            localStream = undefined;
        }

        const audioSource = $('#audioSource').val();
        const videoSource = $('#videoSource').val();

        const constraints = {
            audio: { deviceId: { exact: audioSource } },
            video: { deviceId: { exact: videoSource },
                width:  { min: 320, max: 320 }, 
                height: { min: 240, max: 240 } }
        };
        navigator.mediaDevices.getUserMedia(constraints)
            .then((stream) => {
                localStream = stream;
                if (log) console.log("getUserMedia stream:", stream.id);

                //取得できたデバイス情報を取得
                //https://stackoverflow.com/questions/46926479/how-to-get-media-device-ids-that-user-selected-in-request-permission-dialog
                const tracks = stream.getTracks();
                for (let track of tracks) {
                    if (track.kind === 'video') {
                        $('#videoSource').val(track.getSettings().deviceId);
                    }
                    else if (track.kind === 'audio') {
                        $('#audioSource').val(track.getSettings().deviceId);
                    }
                }

                setupVideo(stream, skyWayPeer);

                if (joinedRoom) {
                    joinedRoom.replaceStream(stream);
                }

            })
            .catch((error) => {
                console.error(error);
                window.alert('カメラかマイクの設定を見直して\nリロードしてください（ctrl+R）');
            });
        
    }

    //https://google.github.io/mediapipe/solutions/hands#configuration-options より
    mediaPipeHands.setOptions({
        staticImageMode: false,
        /* falseに設定すると、入力画像をビデオストリームとして扱います。
        最初の入力画像で手の検出を試み、検出が成功したらさらに手のランドマークをローカライズします。
        それ以降の画像では、max_num_hands の手がすべて検出され、対応する手のランドマークが特定されると、
        どの手も見失うまで、別の検出を行わずにそれらのランドマークを単純に追跡します。
        これは待ち時間を減らすことができ、ビデオフレームを処理するのに最適な方法です。
        true に設定すると、すべての入力画像に対して手の検出が行われ、
        静的でおそらく無関係な画像のバッチ処理に最適です。デフォルトは false。 */

        maxNumHands: 2,
        /*検出するハンドの最大数。デフォルトは2。*/

        modelComplexity: 0,//負荷軽減のために0
        // https://github.com/google/mediapipe/issues/2181#:~:text=model.setOptions(%7B%0A%20%20%20%20%20%20modelComplexity%3A%201%0A%20%20%20%20%7D)%3B
        /* ハンドランドマークモデルの複雑さ。0または1。ランドマーク精度と推論レイテンシは、一般的にモデルの複雑さによって上昇する。デフォルトは1です。 */

        minDetectionConfidence: 0.6,
        /* 検出が成功したとみなされるための、手検出モデルからの最小信頼値（[0.0, 1.0]）。デフォルトは0.5。 */

        minTrackingConfidence: 0.6
        /*手のランドマークが正常に追跡されたとみなされるための，ランドマーク追跡モデルによる最小信頼度（[0.0, 1.0]），
        さもなければ次の入力画像で自動的に手の検出が行われます．この値を大きくすると，解の頑健性が増しますが，
        その分遅延が大きくなります．static_image_mode が true の場合は無視され，単にすべての画像に対して手指の検出が行われます．
        デフォルトは0.5。 */
    });
    console.log('hands options', mediaPipeHands.h.h.options);

    mediaPipeHands.onResults((results) => {
        myVideo.setHandResults(results);
    });
    
});

function removeAllOthers() {
    if (log) console.log('removeAllOthers()');
    for(let peerId of memberVideos.keys()) {
        removeRemoteVideo(peerId);
    }
}
function LeaveRoom() {
    joinedRoom.close();
    removeAllOthers();
    $('#make-call').show();
    $('#end-call').hide();
}

function startRegularSendMessage() {
    let sendData = [];

    regularID = setInterval((args) => {
        if (!joinedRoom) return;
        if (sendData.length === 0) {
            if (dataToSend.length === 0) return;
            //配列の早いコピーらしい
            //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
            sendData = [...dataToSend];
            dataToSend = [];
        }
        try {
            joinedRoom.send(JSON.stringify(sendData)); //JSONにしないと空の配列が受信されることがある
            if (log && !(sendData.length === 1 && sendData[0].type === HANDS_DETECTED)) {
                console.log('send', [...sendData]);
            }
            sendData = [];
        } catch (error) {
            sliceSendData();
        }
    }, 200);//これくらいが映像と合う
    if (log) console.log("定期送信開始", regularID);

    function sliceSendData() {
//        console.warn("warning size", sendData);
        if (sendData.length !== 1) {
            const half = Math.floor(sendData.length / 2);
            dataToSend = sendData.slice(half).concat(dataToSend); //sendDataの後半 + dataToSend
            sendData = sendData.slice(0, half); //前半だけに減らす
        } else {
//            console.error("maximum size", sendData[0]);
            sendData = [];
        }
    }
}

function stopRegularSendMessage() {
    clearInterval(regularID);
    if (log) console.log("定期送信停止", regularID);
}

function SendMessage(type, msg) {
    if (!joinedRoom) return;
    let message = new Message(type, msg);
    for (let i = 0; i < dataToSend.length; i++) {
        if (dataToSend[i].Equals(message)) {
            dataToSend[i] = message;
            return;
        }
    }
    dataToSend.push(message);
}

// HTMLから直接呼び出し
function OnChangeDynamic() {
    isDynamicEffect = $('#dynamicEffect').prop('checked');
    SendMessage(DYNAMICEFFECT, isDynamicEffect);
}

function ChangeDrawRect() {
    isDrawingHands = $('#changeDrawRect').prop('checked');
    SendMessage(CONFIG_HANDS_DISPLAY, isDrawingHands);
}

function ReceiveHighFiveSelect(video, select) {
    highFiveType = select;
    $("#highSelect").val(select);
}

function ReceiveDynamicEffect(enabled) {
    isDynamicEffect = enabled;
    document.getElementById('dynamicEffect').checked = enabled;
}

function ReceiveDrawHands(checked) {
    isDrawingHands = checked;
    document.getElementById('changeDrawRect').checked = checked;
}

function ChangeIsCatch() {
    catchBallStart();
}

class VisualObject {
    constructor(pos, size) {
        this.pos = pos;
        this.size = size;
    }
}

class Video {

    constructor(pos, size, id, videoTag) {
        if (log) console.log(id, videoTag);
        this.pos = pos;
        this.size = size;
        this.id = id;
        this.videoTag = videoTag;
        //this.videoTag.elt.muted = true; //ここでミュートにするとなぜかvideoDOMを表示しないと映像が更新されなくなるからしない
        //this.videoTag.elt.volume = 0; //同じく
        this.videoOn = false;
        this.micOn = false;
        this.handResults = { multiHandLandmarks: [] };
        this.handCenters = [ undefined, undefined ];
        this.handSizes = [ undefined, undefined ];
        this.handExtents = [ undefined, undefined ];
        this.topLeft = createVector();
        this.ping = 1;

        this.videoButton = createImg(VideOffIcon, "Video");  // <img>
        this.micButton = createImg(MicOffIcon, "Mic");  // <img>
    }

    changeVideoMode(isVideo) {
        this.videoOn = isVideo;
        this.videoButton.elt.src = isVideo ? VideOnIcon : VideOffIcon;
    }

    changeMicMode(enable) {
        this.micOn = enable;
        this.micButton.elt.src = enable ? MicOnIcon : MicOffIcon;
        //this.video.elt.volume = volume;
    }

    updateTopLeft() {
        this.topLeft.set(this.pos.x - this.size.x / 2, this.pos.y - this.size.y / 2);
    }

    setHandResults(results) {
        delete results.image;
        this.handResults = results;

        this.handExtents = [ undefined, undefined ];
        this.handCenters = [ undefined, undefined ];
        this.handSizes = [ undefined, undefined ];

        if (results) {
            /*
            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                let minX = 1, minY = 1;
                let maxX = 0, maxY = 0;
                for (let mark of results.multiHandLandmarks[i]) {
                    minX = Math.min(mark.x, minX);
                    minY = Math.min(mark.y, minY);
                    maxX = Math.max(mark.x, maxX);
                    maxY = Math.max(mark.y, maxY);
                }

                let lr = (results.multiHandedness[i].label === 'Left') ? 0 : 1;
                this.handExtents[lr] = (mirroring ?
                    { minX: 1 - maxX, minY: minY, maxX: 1 - minX, maxY: maxY } :
                    { minX: minX, minY: minY, maxX: maxX, maxY: maxY });
                
                let x = (minX + maxX) / 2;
                if (mirroring) x = 1 - x;
                this.handCenters[lr] = createVector(x, (minY + maxY) / 2);
                this.handSizes[lr] = createVector(maxX - minX, maxY - minY);
            }
            */

            this.handExtents = [];
            this.handCenters = [];
            this.handSizes = [];

            for (let handMarks of results.multiHandLandmarks) {
                let minX = 1, minY = 1;
                let maxX = 0, maxY = 0;
                for (let mark of handMarks) {
                    minX = Math.min(mark.x, minX);
                    minY = Math.min(mark.y, minY);
                    maxX = Math.max(mark.x, maxX);
                    maxY = Math.max(mark.y, maxY);
                }

                this.handExtents.push(mirroring ?
                    { minX: 1 - maxX, minY: minY, maxX: 1 - minX, maxY: maxY } :
                    { minX: minX, minY: minY, maxX: maxX, maxY: maxY });
                
                let x = (minX + maxX) / 2;
                if (mirroring) x = 1 - x;
                this.handCenters.push(createVector(x, (minY + maxY) / 2));
                this.handSizes.push(createVector(maxX - minX, maxY - minY));
            }
        }
    }
}

Video.prototype.toString = function () {
    return 'video ' + this.id + '\n{ pos:' + this.pos + ' size:' + this.size + ' enable:' +
        this.videoOn+ ' stream:' + this.videoTag.elt.stream + ' }';
}

function setupVideo(stream, peer) {
    if (!myVideo) {
        const videoTag = createVideo();  // <video>生成
        videoTag.elt.autoplay = true;
        videoTag.elt.muted = true;

        // Canvas API https://developer.mozilla.org/ja/docs/Web/API/Canvas_API
        // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Manipulating_video_using_canvas 
        const videoSize = createVector(320, 240);
        const pos = createVector(width / 2, height / 3);
        /*
        setTimeout(() => {
            if (pos.x < 0) pos.x *= -1;
            else if (pos.x <= 50) pos.x = width / 2;
            if (pos.y < 0) pos.y *= -1;
            else if (pos.y <= 50) pos.y = height / 2;
        }, 1000);
        */

        myVideo = new Video(pos, videoSize, peer.id, videoTag);

        const camera = new Camera(videoTag.elt, {
            onFrame: async () => {
                if (handInterval > HANDSENDINTERVAL) {
                    handInterval = 0;
                    await mediaPipeHands.send({ //手の映像を送信
                        image: videoTag.elt
                    });
                }
            },
            width: videoSize.x,
            height: videoSize.y
        });
        camera.start();
        // image(camera);

        myVideo.videoButton.mousePressed(OnVideoEnabled);
        myVideo.micButton.mousePressed(() => {
            myVideo.changeMicMode(!myVideo.micOn);
            SendMessage(MIC_MODE, myVideo.micOn);
        });

        memberVideos.set(peer.id, myVideo);

        if (log) console.log("camera", camera);
        // HighFiveInit();
        // catchBallInit();
        setTimeout(() => { mediaPipeHands.send({ image: videoTag.elt }); }, 0); //タスクキューに追加して処理を後回しにする
    }

    myVideo.videoTag.elt.srcObject = stream;
    myVideo.videoTag.show();
    myVideo.videoTag.hide();
    resizeAllVideos();
    if (log) console.log("myVideo:", myVideo);
    console.log(stream.getVideoTracks()[0]);
}

function addRemoteVideo(stream) {
    if (log) console.log('add videos', stream);

    let videoTag = createVideo();  // <video>
    videoTag.elt.autoplay = true;
    videoTag.hide();

    let pos = createVector(windowWidth / 2, windowHeight / 2);
    pos.x += memberVideos.size * 100;
    pos.y += memberVideos.size * 100;

    let video = new Video(pos, createVector(320, 240), stream.peerId, videoTag);
    video.videoTag.elt.srcObject = stream;
    video.videoButton.size(16, 16);
    video.micButton.size(16, 16);
    memberVideos.set(video.id, video);

    resizeAllVideos();
    repositionAllVideos();
    if (log) console.log("addRemoteVideo", video);

    setTimeout(() => {
        SendMessage(VIDEO_MODE, myVideo.videoOn);
        SendMessage(MIC_MODE, myVideo.micOn);
        SendMessage(VIDEO_MOVING, createVector(myVideo.pos.x / windowWidth, myVideo.pos.y / windowHeight));
    }, 2000);
}

function removeRemoteVideo(peerId) {
    let video = memberVideos.get(peerId);
    video.videoButton.elt.remove();
    video.micButton.elt.remove();
    video.videoTag.elt.remove();
    memberVideos.delete(peerId);
    resizeAllVideos();
    repositionAllVideos();
}

class Timer {
    constructor(seconds) {
        this.waitTime = seconds;
        this.waiting = false;
    }

    startTimer() {
        this.waiting = true;
        setTimeout(() => {
            this.waiting = false;
        }, this.waitTime * 1000);
    }
}

class Message {
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    Equals(msg) {
        if (this.data.mode && msg.data.mode) {
            return msg.data.mode === this.data.mode;
        } else {
            return msg.type === this.type;
        }
    }
}

Message.prototype.toString = function () {
    return '[' + this.type + ' , ' + this.data + ']';
}

function relPos(pos) {
    return createVector(pos.x / width, pos.y / height);
}

function winPos(pos, video = undefined) {
    if (video) {
        return createVector(video.topLeft.x + pos.x * video.size.x, video.topLeft.y + pos.y * video.size.y);
    } else {
        return createVector(pos.x * width, pos.y * height);
    }
}
