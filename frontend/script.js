// Elementos del DOM
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const responseArea = document.getElementById('response');
const responseBox = document.getElementById('responseBox');
const langSelector = document.getElementById('langSelector');
const loadingIndicator = document.getElementById('loadingIndicator');
const themeToggle = document.getElementById('themeToggle');
const lineBtn = document.getElementById('lineBtn');
const audioPlayer = document.getElementById('audioPlayer');
const copyBtn = document.getElementById('copyBtn');
const speakBtn = document.getElementById('speakBtn');

// Mapear dirección a idioma para el backend
function getLangFromDirection(direction) {
    const map = {
        'es-ja': 'ja',
        'ja-es': 'es',
        'es-ja-hiragana': 'ja',
        'es-ja-katakana': 'ja'
    };
    return map[direction] || 'en';
}

// Función para manejar la traducción con backend real
async function handleTranslation() {
    const text = userInput.value.trim();
    const direction = langSelector.value;
    const lang = getLangFromDirection(direction);

    if (!text) {
        responseArea.textContent = 'Por favor, escribe algo para traducir.';
        responseArea.style.color = '#ef4444';
        audioPlayer.style.display = 'none';
        return;
    }

    responseArea.style.color = '';
    loadingIndicator.style.display = 'block';
    sendBtn.disabled = true;
    responseArea.textContent = '';

    try {
        // 🔍 Depuración: muestra la solicitud en la consola
        console.log("Enviando solicitud a:", 'https://japan-assist.onrender.com/chat');
        console.log("Datos:", { text, lang });

        const response = await fetch('https://japan-assist.onrender.com/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text, lang })
        });

        // 🔍 Depuración: muestra el estado de la respuesta
        console.log("Respuesta recibida:", response.status, response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Datos recibidos:", data); // 🔍 Depuración

        responseArea.textContent = data.text;

        // Reproducir audio si existe
        if (data.audio_base64) {
            const audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
            audioPlayer.src = audioUrl;
            audioPlayer.style.display = 'block';
            audioPlayer.play().catch(e => console.warn("Audio play failed:", e));
        } else {
            audioPlayer.style.display = 'none';
        }
    } catch (error) {
        console.error("Error en la traducción:", error);
        responseArea.textContent = 'Lo siento, no pude procesar tu solicitud. Inténtalo de nuevo.';
        responseArea.style.color = '#ef4444';
        audioPlayer.style.display = 'none';
    }

    loadingIndicator.style.display = 'none';
    sendBtn.disabled = false;
}

// Función para copiar al portapapeles
function copyToClipboard() {
    const text = responseArea.textContent;
    if (!text || text.includes('Por favor, escribe')) return;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="icon">✓</span>';
            copyBtn.style.color = '#10b981';

            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
                copyBtn.style.color = '';
            }, 2000);
        }).catch(() => {
            console.warn('No se pudo copiar al portapapeles');
        });
    }
}

// Función para leer en voz alta (fallback si no hay audio del backend)
function speakText() {
    const text = responseArea.textContent;
    if (!text || text.includes('Por favor, escribe')) return;

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        const lang = getLangFromDirection(langSelector.value);
        utterance.lang = lang === 'ja' ? 'ja-JP' : 'es-ES';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    } else {
        alert('Tu navegador no soporta la función de texto a voz.');
    }
}

// Función para compartir en LINE
function shareToLINE() {
    const text = responseArea.textContent;
    if (!text || text.includes('Por favor, escribe')) return;

    const shareText = encodeURIComponent(`Traducción: ${text}\n\nTraducido con Japan Assist – Asistente Japonés`);
    const lineUrl = `https://line.me/R/msg/text/?${shareText}`; // ✅ Sin espacios
    window.open(lineUrl, '_blank');
}

// Event Listeners
sendBtn.addEventListener('click', handleTranslation);

userInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        handleTranslation();
    }
});

copyBtn.addEventListener('click', copyToClipboard);
speakBtn.addEventListener('click', speakText);
lineBtn.addEventListener('click', shareToLINE);

// Alternar tema claro/oscuro
themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<span class="icon">🌙</span>';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<span class="icon">☀️</span>';
    }
    
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '<span class="icon">☀️</span>';
}

// Inicializar con un texto de ejemplo
window.addEventListener('DOMContentLoaded', () => {
    userInput.value = 'Hola, me encanta la cultura japonesa.';
    audioPlayer.style.display = 'none';
});
