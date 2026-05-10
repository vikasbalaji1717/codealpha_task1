document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-btn');
    const copyBtn = document.getElementById('copy-btn');
    const speakerBtn = document.getElementById('speaker-btn');
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const charCount = document.getElementById('count');
    const themeToggle = document.getElementById('theme-toggle');
    const loader = document.getElementById('loader');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // Theme Management
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    };
    initTheme();

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.replace('light-theme', 'dark-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.replace('dark-theme', 'light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        }
    });

    // Character Count
    sourceText.addEventListener('input', () => {
        const count = sourceText.value.length;
        if (count > 5000) {
            sourceText.value = sourceText.value.substring(0, 5000);
        }
        charCount.innerText = sourceText.value.length;
    });

    // Swap Languages
    swapBtn.addEventListener('click', () => {
        if (sourceLang.value === 'auto') return;

        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;

        const tempText = sourceText.value;
        sourceText.value = targetText.value;
        targetText.value = tempText;

        charCount.innerText = sourceText.value.length;
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        if (!targetText.value) return;
        navigator.clipboard.writeText(targetText.value)
            .then(() => {
                const icon = copyBtn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                setTimeout(() => {
                    icon.className = 'fa-regular fa-copy';
                }, 2000);
            })
            .catch(err => {
                console.error("Copy failed", err);
                alert("Failed to copy text.");
            });
    });

    // Text to Speech (using backend gTTS)
    let currentAudio = null;

    speakerBtn.addEventListener('click', async () => {
        if (!targetText.value) return;
        
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            speakerBtn.querySelector('i').classList.remove('fa-volume-low');
            speakerBtn.querySelector('i').classList.add('fa-volume-high');
            speakerBtn.style.color = '';
            return; // Act as a toggle to stop if already playing
        }

        // UI change during speech loading
        const originalHtml = speakerBtn.innerHTML;
        speakerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        speakerBtn.style.color = 'var(--primary-color)';

        try {
            const response = await fetch('/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: targetText.value,
                    lang: targetLang.value
                })
            });

            if (!response.ok) throw new Error("Audio generation failed");

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            currentAudio = new Audio(audioUrl);
            
            currentAudio.onplay = () => {
                speakerBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
            };

            currentAudio.onended = () => {
                currentAudio = null;
                speakerBtn.innerHTML = originalHtml;
                speakerBtn.style.color = '';
                URL.revokeObjectURL(audioUrl);
            };

            currentAudio.onerror = () => {
                console.error("Audio playback error");
                alert("Could not play the generated audio.");
                currentAudio = null;
                speakerBtn.innerHTML = originalHtml;
                speakerBtn.style.color = '';
                URL.revokeObjectURL(audioUrl);
            };

            await currentAudio.play();

        } catch (error) {
            console.error('Text to Speech Error:', error);
            alert("Error generating audio for this language.");
            speakerBtn.innerHTML = originalHtml;
            speakerBtn.style.color = '';
        }
    });

    // Web Speech API: Speech to Text
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            micBtn.classList.add('active');
            micStatus.classList.remove('hidden');
            micStatus.innerText = "Listening...";
        };

        recognition.onresult = (event) => {
            let final_transcript = "";
            let interim_transcript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            if (final_transcript !== '') {
                sourceText.value += (sourceText.value && !sourceText.value.endsWith(' ') ? ' ' : '') + final_transcript;
                charCount.innerText = sourceText.value.length;
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            if (event.error === 'not-allowed') {
                alert("Microphone access was denied. Please allow microphone access in your browser settings.");
            } else if (event.error === 'network') {
                alert("Network error occurred during speech recognition.");
            } else {
                micStatus.innerText = "Error: " + event.error;
                setTimeout(() => { micStatus.classList.add('hidden'); }, 3000);
            }
            stopRecording();
        };

        recognition.onend = () => {
            stopRecording();
        };
    } else {
        micBtn.style.display = 'none'; // Hide if not supported
    }

    const stopRecording = () => {
        if(recognition) recognition.stop();
        micBtn.classList.remove('active');
        micStatus.classList.add('hidden');
    }

    micBtn.addEventListener('click', () => {
        if (!recognition) {
            alert('Speech Recognition is not supported in this browser. Please try using Google Chrome.');
            return;
        }

        if (micBtn.classList.contains('active')) {
            stopRecording();
        } else {
            const langMap = {
                'auto': 'en-US', // Can't easily auto-detect speech language, default to English
                'en': 'en-IN',
                'hi': 'hi-IN',
                'ta': 'ta-IN',
                'te': 'te-IN',
                'kn': 'kn-IN',
                'ml': 'ml-IN'
            };
            recognition.lang = langMap[sourceLang.value] || 'en-IN';
            try {
                recognition.start();
            } catch (e) {
                console.error("Error starting recognition", e);
                stopRecording();
            }
        }
    });

    // Translation API Call
    translateBtn.addEventListener('click', async () => {
        const text = sourceText.value.trim();
        if (!text) {
            alert("Please enter some text to translate.");
            return;
        }

        loader.classList.remove('hidden');
        targetText.value = '';

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    source_lang: sourceLang.value,
                    target_lang: targetLang.value
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                targetText.value = data.translated_text;
                loadHistory();
            } else {
                targetText.value = `Translation Error: ${data.error}`;
                console.error("Backend Error:", data.error);
            }
        } catch (error) {
            targetText.value = `Network Error: Could not connect to the server.`;
            console.error("Network Error:", error);
        } finally {
            loader.classList.add('hidden');
        }
    });

    // History API Calls
    const getLangName = (code) => {
        if(code === 'auto') return 'Auto Detect';
        const select = document.getElementById('target-lang');
        const option = Array.from(select.options).find(opt => opt.value === code);
        return option ? option.innerText : code;
    }

    const loadHistory = async () => {
        try {
            const response = await fetch('/history');
            const data = await response.json();
            
            historyList.innerHTML = '';
            
            if (!data || data.length === 0) {
                historyList.innerHTML = '<div class="empty-state">No recent translations.</div>';
                return;
            }

            data.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                el.style.cursor = 'pointer';
                el.title = 'Click to restore this translation';
                el.innerHTML = `
                    <div class="history-lang">${getLangName(item.source_lang)} → ${getLangName(item.target_lang)}</div>
                    <div class="history-content">
                        <div class="history-text">
                            <p>${item.source_text}</p>
                        </div>
                        <div class="history-text target">
                            <p>${item.translated_text}</p>
                        </div>
                    </div>
                `;
                
                el.addEventListener('click', () => {
                    // Update dropdowns if options exist
                    if(Array.from(sourceLang.options).some(o => o.value === item.source_lang)) {
                        sourceLang.value = item.source_lang;
                    }
                    if(Array.from(targetLang.options).some(o => o.value === item.target_lang)) {
                        targetLang.value = item.target_lang;
                    }
                    sourceText.value = item.source_text;
                    targetText.value = item.translated_text;
                    charCount.innerText = sourceText.value.length;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });

                historyList.appendChild(el);
            });
        } catch (error) {
            console.error("Failed to load history", error);
        }
    };

    clearHistoryBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/history/clear', { method: 'POST' });
            if (response.ok) {
                loadHistory();
            }
        } catch (error) {
            console.error("Failed to clear history", error);
        }
    });

    // Load history on page load
    loadHistory();
});
