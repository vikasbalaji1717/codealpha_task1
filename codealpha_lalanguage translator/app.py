from flask import Flask, render_template, request, jsonify, send_file
import io
from gtts import gTTS
from deep_translator import GoogleTranslator
from datetime import datetime
import sqlite3
import os

app = Flask(__name__)

# Database configuration
DB_FILE = 'history.db'

def init_db():
    """Initialize the SQLite database and create the history table if it doesn't exist."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_lang TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            source_text TEXT NOT NULL,
            translated_text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize the database when the app starts
init_db()

@app.route('/')
def index():
    """Serve the main frontend page."""
    return render_template('index.html')

@app.route('/translate', methods=['POST'])
def translate():
    """API endpoint to translate text."""
    data = request.json
    
    # Input validation
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    source_text = data.get('text', '').strip()
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang')
    
    if not source_text:
        return jsonify({'error': 'Text is required'}), 400
        
    if not target_lang:
        return jsonify({'error': 'Target language is required'}), 400

    try:
        # Initialize the translator
        # 'auto' lets GoogleTranslator detect the language
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        
        # Perform translation
        translated_text = translator.translate(source_text)
        
        # Save to history
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO history (source_lang, target_lang, source_text, translated_text) VALUES (?, ?, ?, ?)',
            (source_lang, target_lang, source_text, translated_text)
        )
        conn.commit()
        conn.close()
        
        return jsonify({
            'source_text': source_text,
            'translated_text': translated_text,
            'source_lang': source_lang,
            'target_lang': target_lang
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_history():
    """API endpoint to fetch recent translation history."""
    try:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row # To return dict-like objects
        cursor = conn.cursor()
        
        # Fetch the 10 most recent translations
        cursor.execute('SELECT * FROM history ORDER BY timestamp DESC LIMIT 10')
        rows = cursor.fetchall()
        
        history_list = []
        for row in rows:
            history_list.append({
                'id': row['id'],
                'source_lang': row['source_lang'],
                'target_lang': row['target_lang'],
                'source_text': row['source_text'],
                'translated_text': row['translated_text'],
                'timestamp': row['timestamp']
            })
            
        conn.close()
        return jsonify(history_list)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@app.route('/history/clear', methods=['POST'])
def clear_history():
    """API endpoint to clear translation history."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM history')
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'History cleared'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak():
    """API endpoint to generate audio for text-to-speech."""
    data = request.json
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    text = data.get('text', '').strip()
    lang = data.get('lang', 'en')
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
        
    try:
        # Generate the audio using Google TTS
        tts = gTTS(text=text, lang=lang)
        
        # Save to a bytes buffer
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        
        return send_file(
            fp,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="speech.mp3"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run the app in debug mode
    app.run(debug=True, port=5000)
