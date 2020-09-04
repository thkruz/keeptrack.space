// CanvasRecorder.js - smusamashah
// To record canvas effitiently using MediaRecorder
// https://webrtc.github.io/samples/src/content/capture/canvas-record/

function CanvasRecorder(canvas, video_bits_per_sec) {
    this.start = startRecording;
    this.stop = stopRecording;
    this.save = download;

    var recordedBlobs = [];
    var supportedType = null;
    var mediaRecorder = null;

    // var stream = canvas.captureStream();
    var displayMediaOptions = {
        video: { cursor: 'always' },
        audio: false,
    };

    const video = document.createElement('video');
    video.style.display = 'none';

    function startCapture(displayMediaOptions) {
        let captureStream = null;

        if (window.location.protocol === 'https:') {
            if ('getDisplayMedia' in navigator) {
                return navigator
                    .getDisplayMedia(displayMediaOptions)
                    .catch((err) => {
                        console.warn('Error:' + err);
                        return null;
                    });
            } else if ('getDisplayMedia' in navigator.mediaDevices) {
                return navigator.mediaDevices
                    .getDisplayMedia(displayMediaOptions)
                    .catch((err) => {
                        console.warn('Error:' + err);
                        return null;
                    });
            } else {
                console.error('No Recording Support');
                isVideoRecording = false;
                $('#menu-record').removeClass('bmenu-item-selected');
                $('#menu-record').addClass('bmenu-item-disabled');
                if (!$('#menu-record:animated').length) {
                    $('#menu-record').effect('shake', { distance: 10 });
                }
                return false;
            }
        } else {
            console.error('No Recording Support in Http! Try Https!');
            isVideoRecording = false;
            $('#menu-record').removeClass('bmenu-item-selected');
            $('#menu-record').addClass('bmenu-item-disabled');
            if (!$('#menu-record:animated').length) {
                $('#menu-record').effect('shake', { distance: 10 });
            }
            return false;
        }
    }

    function startRecording() {
        let selectCapture = new Promise(function (resolve, reject) {
            resolve(startCapture());
        });
        selectCapture.then(function startRecording(srcObject) {
            if (srcObject == false) return;
            isVideoRecording = true;
            $('#menu-record').addClass('bmenu-item-selected');
            let stream = srcObject;
            video.srcObject = srcObject;
            let types = [
                'video/webm',
                'video/webm,codecs=vp9',
                'video/vp8',
                'video/webm;codecs=vp8',
                'video/webm;codecs=daala',
                'video/webm;codecs=h264',
                'video/mpeg',
            ];

            for (let i in types) {
                if (MediaRecorder.isTypeSupported(types[i])) {
                    supportedType = types[i];
                    break;
                }
            }
            if (supportedType == null) {
                console.log('No supported type found for MediaRecorder');
            }
            let options = {
                mimeType: supportedType,
                videoBitsPerSecond: video_bits_per_sec || 10000000, // 10.0Mbps
                // videoBitsPerSecond: video_bits_per_sec || 5000000 // 5.0Mbps
                // videoBitsPerSecond: video_bits_per_sec || 2500000 // 2.5Mbps
            };

            recordedBlobs = [];
            try {
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e) {
                // alert('MediaRecorder is not supported by this browser.');
                isVideoRecording = false;
                $('#menu-record').removeClass('bmenu-item-selected');
                console.warn('Exception while creating MediaRecorder:', e);
                return;
            }

            console.log(
                'Created MediaRecorder',
                mediaRecorder,
                'with options',
                options
            );
            mediaRecorder.onstop = handleStop;
            mediaRecorder.ondataavailable = handleDataAvailable;
            mediaRecorder.start(100); // collect 100ms of data blobs
            console.log('MediaRecorder started', mediaRecorder);
        });
    }

    function handleDataAvailable(event) {
        if (event.data && event.data.size > 0) {
            recordedBlobs.push(event.data);
        }
    }

    function handleStop(event) {
        console.log('Recorder stopped: ', event);
        const superBuffer = new Blob(recordedBlobs, { type: supportedType });
        video.src = window.URL.createObjectURL(superBuffer);
    }

    function stopRecording() {
        mediaRecorder.stop();
        console.log('Recorded Blobs: ', recordedBlobs);
        video.controls = true;
    }

    function download(file_name) {
        const name = file_name || 'recording.webm';
        const blob = new Blob(recordedBlobs, { type: supportedType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}
