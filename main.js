const APP_ID = "674b49b3b7e449beabb1ee02a2068659";
const TOKEN = "007eJxTYLhnYx5tKZNosYVdKsk44q1/dXWJoiPrnVTv7Jut23Y+vqfAYGZukmRimWScZJ5qAqRTE5OSDFNTDYwSjQzMLMxMLbNPnk1rCGRksCqIZWRkgEAQn4UhNzEzj4EBAKSYHbE=";
const CHANNEL = "main";

const client = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'});

let localTracks = [];
let remoteUsers = {};
let speechRecognition;
let recognizing = false;

let joinAndDisplayLocalStream = async () => {
    try {
        client.on('user-published', handleUserJoined);
        client.on('user-left', handleUserLeft);

        let UID = await client.join(APP_ID, CHANNEL, TOKEN, null);

        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

        let player = `<div class="video-container" id="user-container-${UID}">
                            <div class="video-player" id="user-${UID}"></div>
                      </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        localTracks[1].play(`user-${UID}`);

        await client.publish([localTracks[0], localTracks[1]]);
        
        console.log("Stream joined successfully!");
    } catch (error) {
        console.error("Failed to join the stream:", error);
        alert("Failed to join the stream. Please check the console for details.");
    }
}

let joinStream = async () => {
    try {
        await joinAndDisplayLocalStream();
        document.getElementById('join-btn').style.display = 'none';
        document.getElementById('stream-controls').style.display = 'flex';
        document.getElementById('stream-wrapper').style.display = 'block';

        let selectedLanguage = document.getElementById('language').value;
        console.log("Selected language: ", selectedLanguage);
        setupSpeechRecognition(selectedLanguage);
    } catch (error) {
        console.error("Error joining stream:", error);
    }
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div>
                 </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
}

let leaveAndRemoveLocalStream = async () => {
    try {
        for(let i = 0; localTracks.length > i; i++){
            localTracks[i].stop();
            localTracks[i].close();
        }

        await client.leave();
        document.getElementById('join-btn').style.display = 'block';
        document.getElementById('stream-controls').style.display = 'none';
        document.getElementById('stream-wrapper').style.display = 'none';
        document.getElementById('video-streams').innerHTML = '';

        stopSubtitles();
    } catch (error) {
        console.error("Error leaving stream:", error);
    }
}

let toggleMic = async (e) => {
    try {
        if (localTracks[0].muted) {
            await localTracks[0].setMuted(false);
            e.target.innerHTML = '<i class="fas fa-microphone"></i> Mic On';
            e.target.classList.remove('off');
        } else {
            await localTracks[0].setMuted(true);
            e.target.innerHTML = '<i class="fas fa-microphone-slash"></i> Mic Off';
            e.target.classList.add('off');
        }
    } catch (error) {
        console.error("Error toggling mic:", error);
    }
}

let toggleCamera = async (e) => {
    try {
        if(localTracks[1].muted) {
            await localTracks[1].setMuted(false);
            e.target.innerHTML = '<i class="fas fa-video"></i> Camera On';
            e.target.classList.remove('off');
        } else {
            await localTracks[1].setMuted(true);
            e.target.innerHTML = '<i class="fas fa-video-slash"></i> Camera Off';
            e.target.classList.add('off');
        }
    } catch (error) {
        console.error("Error toggling camera:", error);
    }
}

const setupSpeechRecognition = (language) => {
    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition = new SpeechRecognition();
        speechRecognition.lang = language === "ar" ? "ar-SA" : "en-US";
        speechRecognition.continuous = true;
        speechRecognition.interimResults = false;

        speechRecognition.onresult = (event) => {
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript;
            displaySubtitles(transcript);
        };

        speechRecognition.onend = () => {
            if (recognizing) {
                speechRecognition.start(); // Restart recognition after stopping
            }
        };
    } catch (error) {
        console.error("Error setting up speech recognition:", error);
    }
}

const startSubtitles = () => {
    recognizing = true;
    document.getElementById('subtitles').style.display = 'block';
    speechRecognition.start();
}

const stopSubtitles = () => {
    recognizing = false;
    speechRecognition.stop();
    document.getElementById('subtitles').style.display = 'none';
}

const displaySubtitles = (text) => {
    const subtitlesElement = document.getElementById('subtitles');
    subtitlesElement.innerText = text;
}

document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
