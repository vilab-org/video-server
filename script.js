//Skyway関連処理
let APIKey = '96ff1dfd-a19d-4b53-a97d-376d0006d337';
let localStream = null;
let room;
let existingroom = null;
$(function() {

  let peer = null;
  let audioSelect = $('#audioSource');
  let videoSelect = $('#videoSource');

  navigator.mediaDevices.enumerateDevices()
    .then(function(deviceInfos) {
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
    }).catch(function(error) {
      console.error('mediaDevices.enumerateDevices() error:', error);
      return;
    });

  peer = new Peer({
    key: APIKey,
    debug: 3
  });

  peer.on('open', function() {
    $('#my-id').text(peer.id);
  });

  peer.on('error', function(err) {
    alert(err.message);
  });

  $('#make-call').submit(function(e) {
    e.preventDefault();
    let roomName = $('#join-room').val();

    if (!roomName) {
      return;
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
      .then(function(stream) {
        // $('#myStream').get(0).srcObject = stream;
        localStream = stream;
        setupVideo(stream);

        if (existingroom) {
          existingroom.replaceStream(stream);
        }

      });/*.catch(function(error) {
        console.error('mediaDevice.getUserMedia() error:', error);
        return;
      });*/
  }

  function setupRoomEventHandlers(room) {
    if (existingroom) {
      console.log('exist');
      existingroom.close();
    };

    existingroom = room;
    setupEndCallUI();
    $('#room-id').text(room.name);

    room.on('stream', function(stream) {
      addVideo(stream);
    });

    room.on('removeStream', function(stream) {
      console.log('removeStream:'+stream.peerId);
      removeVideo(stream.peerId);
    });

    room.on('peerLeave', function(peerId) {
      console.log('peerLeave:'+peerId);
      removeVideo(peerId);
    });

    room.on('close', function() {
      removeAllRemoteVideos();
      setupMakeCallUI();
    });

    room.on('data', ({
      data,
      src
    }) => {
      ReceiveMessage(src,Object.assign(new Message(), JSON.parse(data)));
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
    removeOtherVideo(peerId);
  }

  function removeAllRemoteVideos() {
    $('.videosContainer').empty();
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

function LeaveRoom(){
  existingroom.close();
}

function Send(type,msg) {
  if(room)room.send(JSON.stringify(new Message(type,msg)));
}

function ChangeUI() {
  $('#setting').toggle(500, 'swing');
}
