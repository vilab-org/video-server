//テキスト選択不可（ドラッグしてる時に選択されるのをやめたい）
document.onselectstart = function () {
  return false;
}

//Skyway関連処理
let APIKey = '96ff1dfd-a19d-4b53-a97d-376d0006d337';
let localStream = null;
let room;
let existingroom = null;
let sendData = [];
let stackSendData = [];
let regularID;

let isDrawRect = false;
let highFiveTypes = ['機能なし', '自由な位置', '固定の位置', 'ハイブリッド'];
let highFiveSelected;
let catchUserTypes = ['ランダム', '指さし'];
let flyingTypes = ['直線', '曲線'];
let ballTypes = ['ボール', "くまさん", "ボム"];
$(function () {

  let peer = null;
  let audioSelect = $('#audioSource');
  let videoSelect = $('#videoSource');

  //ハイタッチ
  let highSelect = $('#highSelect');
  let highFiveTypesLen = highFiveTypes.length;
  for (let i = 0; i < highFiveTypesLen; i++) {
    let option = $('<option>');
    option.text(highFiveTypes[i]);
    highSelect.append(option);
  }
  highSelect.on('change', () => {
    highFiveSelected = highSelect.val();
    Send(HIGHSELECT, highFiveSelected);
  });

  //キャッチボール
  let catchUserSelect = $('#catchUserSelect');
  let catchUserTypesLen = catchUserTypes.length;
  for (let i = 0; i < catchUserTypesLen; i++) {
    let option = $('<option>');
    option.text(catchUserTypes[i]);
    catchUserSelect.append(option);
  }
  catchUserSelect.on('change', () => {
    let isChanged = ballManager.setUserSelectMode(catchUserSelect.val());
    if (isChanged) {
      Send(CATCHBALL, { mode: USERSELECT, state: ballManager.selectMode });
    }
  });
  //ボールの飛び方
  let flyingSelect = $('#flyingSelect');
  let flyingTypesLen = flyingTypes.length;
  for (let i = 0; i < flyingTypesLen; i++) {
    let option = $('<option>');
    option.text(flyingTypes[i]);
    flyingSelect.append(option);
  }
  flyingSelect.on('change', () => {
    let isChanged = ballManager.setFlyingSelectMode(flyingSelect.val());
    if (isChanged) {
      Send(CATCHBALL, { mode: FLYINGSELECT, state: ballManager.flyingMode });
    }
  });

  //ボールの種類
  let ballSelect = $('#ballSelect');
  let ballTypesLen = ballTypes.length;
  for (let i = 0; i < ballTypesLen; i++) {
    let option = $('<option>');
    option.text(ballTypes[i]);
    ballSelect.append(option);
  }
  ballSelect.on('change', () => {
    let changed = ballManager.setBallSelectMode(ballSelect.val());
    if (changed) {
      Send(CATCHBALL, { mode: BALLSELECT, state: ballManager.ballType });
    }
  });

  //初めて利用する人にカメラ許可ダイアログを出すためのgetUsrMedia
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(function (stream) {
    }).catch(function (error) {
      console.error(error);
    });

  navigator.mediaDevices.enumerateDevices()
    .then(function (deviceInfos) {
      for (let i = 0; i !== deviceInfos.length; ++i) {
        let deviceInfo = deviceInfos[i];
        let option = $('<option>');
        option.val(deviceInfo.deviceId);
        if (deviceInfo.kind === 'audioinput') {
          option.text(deviceInfo.label);
          audioSelect.append(option);
        } else if (deviceInfo.kind === 'videoinput') {
          option.text(deviceInfo.label);
          videoSelect.append(option);
        }
      }
      videoSelect.on('change', setupGetUserMedia);
      audioSelect.on('change', setupGetUserMedia);
      setupGetUserMedia();
    }).catch(function (error) {
      console.error(error);
      return;
    });

  peer = new Peer({
    key: APIKey,
    debug: 3
  });

  peer.on('open', function () {
    let id = peer.id;
    $('#my-id').text(id);
    localID = id;
  });

  peer.on('error', function (err) {
    alert(err.message);
  });

  $('#make-call').submit(function (e) {
    e.preventDefault();
    let roomName = $('#join-room').val();

    if (!roomName) {
      roomName = "samproom";
    }

    room = peer.joinRoom(roomName, {
      mode: 'sfu',
      stream: localStream
    });
    setupRoomEventHandlers(room);
  });
  /*
    $('#end-call').click(function() {
      existingroom.close();
    });
  */
  function setupGetUserMedia() {
    let audioSource = $('#audioSource').val();
    let videoSource = $('#videoSource').val();
    let constraints = {
      audio: {
        deviceId: {
          exact: audioSource
        }
      },
      video: {
        deviceId: {
          exact: videoSource
        }
      }
    };
    constraints.video.width = {
      min: 320,
      max: 320
    };
    constraints.video.height = {
      min: 240,
      max: 240
    };

    if (localStream) {
      localStream = null;
    }

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (stream) {
        // $('#myStream').get(0).srcObject = stream;
        localStream = stream;
        if (log) console.log("getUserMedia stream:", stream);
        //取得できたデバイス情報を取得
        //https://stackoverflow.com/questions/46926479/how-to-get-media-device-ids-that-user-selected-in-request-permission-dialog
        let tracks = stream.getTracks();
        let trackLen = tracks.length;
        for (let i = 0; i < trackLen; i++) {
          if (tracks[i].kind === 'video') {
            $('#videoSource').val(tracks[i].getSettings().deviceId);
          }
          if (tracks[i].kind === 'audio') {
            $('#audioSource').val(tracks[i].getSettings().deviceId);
          }
        }

        setupVideo(stream, peer);

        if (existingroom) {
          existingroom.replaceStream(stream);
        }

      }).catch(function (error) {
        console.error(error);
        window.alert('カメラかマイクの設定を見直して\nリロードしてください（ctrl+R）');
        return;
      });
  }

  function setupRoomEventHandlers(room) {
    if (existingroom) {
      if (log) console.log('exist');
      existingroom.close();
    };

    existingroom = room;
    setupEndCallUI();
    $('#room-id').text(room.name);

    room.on('stream', function (stream) {
      addVideo(stream);
    });

    room.on('removeStream', function (stream) {
      if (log) console.log('removeStream:' + stream.peerId);
      removeVideo(stream.peerId);
    });

    room.on('peerLeave', function (peerId) {
      if (log) console.log('peerLeave:' + peerId);
      removeVideo(peerId);
    });

    room.on('close', function () {
      removeAllRemoteVideos();
      setupMakeCallUI();
    });

    room.on('data', ({
      data,//名前は変更しない
      src
    }) => {
      let dataLen = data.length;
      for (i = 0; i < dataLen; i++) {
        ReceivedMessage(src, data[i]);
      }
    });
  }

  function addVideo(otherStream) {
    /*
            const videoDom = $('<video autoplay>');
            videoDom.attr('id',otherStream.peerId);
            videoDom.get(0).srcObject = otherStream;
            $('.videosContainer').append(videoDom);
    */
    addOtherVideo(otherStream);
  }

  function removeVideo(peerId) {
    $('#' + peerId).remove();

    let index = SearchOthers(peerId);
    if (index === -1) {
      return;
    }
    removeOtherVideo(others[index], index);
  }

  function removeAllRemoteVideos() {
    $('.videosContainer').empty();
    removeAllOthers();
  }


  function setupMakeCallUI() {
    $('#make-call').show();
    $('#end-call').hide();
  }

  function setupEndCallUI() {
    $('#make-call').hide();
    $('#end-call').show();
  }

});

function removeAllOthers() {

  while (others.length > 0) {
    removeOtherVideo(others[0]);
  }
}
function LeaveRoom() {
  existingroom.close();
  removeAllOthers();
}

function startRegularSend() {
  regularID = setInterval((args) => {
    do {
      if (sendData.length === 0) {
        //配列の早いコピーらしい
        //https://qiita.com/takahiro_itazuri/items/882d019f1d8215d1cb67#comment-1b338078985aea9f600a
        sendData = [...stackSendData];
      }
      try {
        room.send(sendData);
        if (log && !(sendData.length === 1 && sendData[0].type === HANDRESULT)) console.log(sendData);
        sendData.length = 0;
        break;
      } catch (error) {
        sliceSendData();
      }
    } while (true);

  }, 150);
  if (log) console.log("定期送信開始", regularID);

  function sliceSendData() {
    if (sendData.length !== 1) {
      let half = Math.floor(sendData.length / 2);
      stackSendData = sendData.slice(half).concat(stackSendData);//sendDataの後半 + stackSendData
      sendData = sendData.slice(0, half);//前半だけに減らす
    } else {
      console.error("maximum size", sendData[0]);
      sendData.length = 0;
    }
  }
}
function stopRegularSend() {
  clearInterval(regularID);
  if (log) console.log("定期送信停止", regularID);
}

function Send(type, msg) {
  if (room) {
    let message = new Message(type, msg);
    for (let i = 0; i < stackSendData.length; i++) {
      if (stackSendData[i].equals(message)) {
        stackSendData[i] = message;
        return;
      }
    }
    stackSendData.push([message]);
  }
}
function toJSON(classtype) {
  return JSON.stringify(classtype);
}

function ChangeDrawRect() {
  isDrawRect = $('#changeDrawRect').prop('checked');
  Send(DRAWHANDSDEBUG, isDrawRect);
}

function ChangeIsCatch() {
  if (isCatchBall) {
    if (ballManager.isHost) {
      catchEnd();
    }
    return;
  }
  //メモ$('#ChangeIsCatch').prop('checked');
  catchStart();
}

function AddDummy() {
  let pos = localVideo.pos.copy().add(createVector(localVideo.size.x / 2, localVideo.size.y / 2));
  dummys.push(new Video(pos, new Vec(320, 240), localVideo.ID, localVideo.capture));
  //dummys.push(localVideo);//位置が同じになるから没

  ResizeAllVideos();
}
