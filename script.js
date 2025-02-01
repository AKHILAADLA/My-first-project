const recordButton = document.getElementById('record');
const stopButton = document.getElementById('stop');
const timerDisplay = document.getElementById('timer');
const recordingsList = document.getElementById('recordingsList');
const textSubmitButton = document.getElementById('textSubmit');

let mediaRecorder;
let audioChunks = [];
let startTime;
let timerInterval;

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

recordButton.addEventListener('click', function() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            audioChunks = [];
            startTime = Date.now();

            timerInterval = setInterval(() => {
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                timerDisplay.textContent = formatTime(elapsedTime);
            }, 1000);

            mediaRecorder.ondataavailable = function(event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function() {
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audioElement = new Audio(audioUrl);
                audioElement.controls = true;

                const listItem = document.createElement('li');
                listItem.appendChild(audioElement);
                recordingsList.appendChild(listItem);

                const formData = new FormData();
                formData.append('audio_data', audioBlob, 'recorded_audio.wav');

                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text();
                })
                .then(data => {
                    console.log('Audio uploaded successfully:', data);
                })
                .catch(error => {
                    console.error('Error uploading audio:', error);
                });
            };
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
        });

    recordButton.disabled = true;
    stopButton.disabled = false;
});

stopButton.addEventListener('click', function() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }

    recordButton.disabled = false;
    stopButton.disabled = true;
});

// Text-to-Speech Submission
textSubmitButton.addEventListener('click', function() {
    const textInput = document.getElementById('textToSpeak');
    const text = textInput.value;

    fetch('/synthesize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'text=' + encodeURIComponent(text)
    })
    .then(response => response.text())
    .then(data => {
        console.log('Text-to-Speech processing complete:', data);
        window.location.reload(); // Reload the page to update the list of tts files
    })
    .catch(error => {
        console.error('Error processing text-to-speech:', error);
    });
});
