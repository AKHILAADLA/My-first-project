from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, send_from_directory
from werkzeug.utils import secure_filename
from google.cloud import speech, texttospeech
import os

app = Flask(__name__)

# Google Cloud client setup
speech_client = speech.SpeechClient()
tts_client = texttospeech.TextToSpeechClient()

# Configure upload and text-to-speech folders
UPLOAD_FOLDER = 'uploads'
TTS_FOLDER = 'tts'
ALLOWED_EXTENSIONS = {'wav', 'mp3'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TTS_FOLDER'] = TTS_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TTS_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    uploads = [f for f in os.listdir(UPLOAD_FOLDER) if allowed_file(f)]
    tts_files = [f for f in os.listdir(TTS_FOLDER) if allowed_file(f)]
    return render_template('index.html', uploads=uploads, tts_files=tts_files)

@app.route('/upload', methods=['POST'])
def upload_audio():
    file = request.files.get('audio_data')
    if file and allowed_file(file.filename):
        filename = datetime.now().strftime("%Y%m%d-%I%M%S%p") + '.wav'
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        return redirect(url_for('index'))
    return redirect(url_for('index'))

@app.route('/synthesize', methods=['POST'])
def synthesize_text():
    text = request.form.get('text')
    if text:
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
        filename = datetime.now().strftime("%Y%m%d-%I%M%S%p") + '.mp3'
        file_path = os.path.join(TTS_FOLDER, filename)
        with open(file_path, 'wb') as audio_file:
            audio_file.write(response.audio_content)
        return redirect(url_for('index'))
    return redirect(url_for('index'))

@app.route('/tts/<filename>')
def tts_file(filename):
    return send_from_directory(TTS_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True)
