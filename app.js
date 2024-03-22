var synth = new Animalese('animalese/animalese.wav', function () {
    document.getElementById("preview").disabled = false;
    document.getElementById("download").disabled = true;
    preview(true);
});

var canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');

var base_image = null;

let recordedBlobs = [];
let mediaRecorder = null;
let audio = null;
let audioStream = null;
let canvasStream = canvas.captureStream();
let stream = null;

function makeBase(cb) {
    let go = function () {
        context.fillStyle = '#ffd1dc';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(base_image, 0, 15);
        cb();
    }
    if (base_image === null) {
        base_image = new Image();
        base_image.src = 'bubble.png';
        base_image.onload = go;
    } else {
        go();
    }
}

function niceText(line, x, y) {
    context.shadowColor="black";
    context.shadowBlur=2;
    context.lineWidth=5;
    context.strokeText(line, x, y);
    context.shadowBlur=0;
    context.fillStyle="white";
    context.fillText(line, x, y);
}


function renderRecord(dummy=false) {
    context.font = "32px 'Jua'";
    context.fillStyle = 'white';
    context.textBaseline = 'top';
    canvas.style.letterSpacing = 3 + 'px';

    const input = document.getElementById("text").value
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .replace(/(.{88})..+/, "$1...");
    let pos = 1;

    if(!dummy)
        startRecording();
    let tick = function () {
        makeBase(function () {
            // name
            context.textAlign = "center";
            niceText(document.getElementById("name").value, 140, 35);

            // text, 22 max each line
            context.textAlign = "left";

            let lines = input
                .substring(0, pos)
                .match(/.{1,24}/g); // chunk

            let x = 110,
                y = 105;
            lines.forEach((line, i) => {
                niceText(line, x, y + (i * 39), i);
            });

            if (pos >= input.length) {
                if(!dummy){
                    document.getElementById("download").disabled = true;
                    document.getElementById("download").textContent = 'Gimme a sec..';
                }
            }

            if (pos <= input.length + 50) {
                pos++;
                setTimeout(tick, Math.random() * 120);
            } else {
                document.getElementById("preview").disabled = false;
                if(!dummy)
                    setTimeout(stopRecording, 500);
            }
        })
    };
    tick();
}

function preview(dummy=false) {
    document.getElementById("preview").disabled = true;
    if(dummy) {
        renderRecord(true);  
    } else {
        document.getElementById("download").textContent = 'Recording..';
        let audioURL = 
        synth.Animalese(document.getElementById("text").value.substring(0, 88),
            document.getElementById("shorten").checked).dataURI;
        audio = new Audio(audioURL);
        audioStream = audio.captureStream();
        audio.play().then( _ => {
            stream = new MediaStream([...canvasStream.getTracks(), ...audioStream.getTracks()]);
            renderRecord();
        });
    }
}

function download() {
    var wave = synth.Animalese(document.getElementById("text").value).dataURI;
    saveAs(dataURItoBlob(wave), "animalese.wav");
}

// canvas recording stuff lifted from 
// https://github.com/webrtc/samples/blob/gh-pages/src/content/capture/canvas-record/js/main.js
// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
    let options = {
        mimeType: 'video/webm'
    };
    recordedBlobs = [];
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (e0) {
        console.log('Unable to create MediaRecorder with options Object: ', e0);
        try {
            options = {
                mimeType: 'video/webm,codecs=vp9'
            };
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e1) {
            console.log('Unable to create MediaRecorder with options Object: ', e1);
            try {
                options = 'video/vp8'; // Chrome 47
                mediaRecorder = new MediaRecorder(stream, options);
            } catch (e2) {
                alert('MediaRecorder is not supported by this browser.\n\n' +
                    'Try Firefox 29 or later, or Chrome 47 or later, ' +
                    'with Enable experimental Web Platform features enabled from chrome://flags.');
                console.error('Exception while creating MediaRecorder:', e2);
                return;
            }
        }
    }
    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
    mediaRecorder.onstop = handleStop;
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(20000); // collect ms of data
    console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
    mediaRecorder.stop();
    document.getElementById("download").disabled = false;
    document.getElementById("download").textContent = 'Download!';
}


function handleDataAvailable(event) {
    if (event.data && event.data.size > 0) {
      recordedBlobs.push(event.data);
    }
}  

function handleStop(event) {
    console.log('Recorder stopped: ', event);
    const superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
    let videoSrc = window.URL.createObjectURL(superBuffer);
}


function downloadRecording() {
    const blob = new Blob(recordedBlobs, {type: 'video/webm'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'animal-bubble.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
}

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {
        type: mimeString
    });
}
