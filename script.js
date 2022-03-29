//Skyway関連処理
let APIKey = '96ff1dfd-a19d-4b53-a97d-376d0006d337';
let localStream = null;
let room;
let existingroom = null;
let isDrawRect = false;
let highFiveTypes = ['none', 'high five 1', 'high five 2','high five 3'];
let highFiveSelected;
$(function () {

  let peer = null;
  let audioSelect = $('#audioSource');
  let videoSelect = $('#videoSource');

  //high five
  let highSelect = $('#highSelect');
  let highFiveTypesLen = highFiveTypes.length;
  for(let i=0;i< highFiveTypesLen;i++){
    let option = $('<option>');
    option.text(highFiveTypes[i]);
    highSelect.append(option);
  }
  highSelect.on('change', () => {
    highFiveSelected = highSelect.val();
    Send(HIGHSELECT, highFiveSelected);
  });
  
  //初めて利用する人にカメラ許可ダイアログを出すためのgetUsrMedia
  let permit = false;
  navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    .then(function (stream) {
      permit = true;
      return;
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
      console.error('mediaDevices.enumerateDevices() error:', error);
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
        setupVideo(stream, peer);

        if (existingroom) {
          existingroom.replaceStream(stream);
        }

      }).catch(function (error) {
        console.error('mediaDevice.getUserMedia() error:', error);
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
      data,
      src
    }) => {
      ReceivedMessage(src, Object.assign(new Message(), JSON.parse(data)));
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
    removeOtherVideo(others[index]);
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

function Send(type, msg) {
  if (room) room.send(toJSON(new Message(type, msg)));
}
function toJSON(classtype) {
  return JSON.stringify(classtype);
}

function ChangeUI() {
  $('#settings').toggle(500, 'swing');
}

function ChangeDrawRect() {
  isDrawRect = $('#changeDrawRect').prop('checked');
}

function ChangeIsCatch() {
  if (isCatchBall) {
    if (ballManager.host) {
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
