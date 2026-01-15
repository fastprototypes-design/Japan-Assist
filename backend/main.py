from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from google.cloud import texttospeech
from google.oauth2.service_account import Credentials
import json
import os
import base64
from pathlib import Path

app = FastAPI()

# Middleware CORS (debe ir inmediatamente después de app = FastAPI())
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")

client = OpenAI(api_key=OPENAI_API_KEY)

# Cargar credenciales de Google TTS
tts_client = None
if GOOGLE_CREDS_JSON:
    try:
        creds = Credentials.from_service_account_info(json.loads(GOOGLE_CREDS_JSON))
        tts_client = texttospeech.TextToSpeechClient(credentials=creds)
    except Exception as e:
        print(f"Error initializing TTS: {e}")

# Cargar recomendaciones
BASE_DIR = Path(__file__).parent
RECOMMENDATIONS_PATH = BASE_DIR / "recommendations.json"

recommendations = {}
try:
    with open(RECOMMENDATIONS_PATH, "r", encoding="utf-8") as f:
        recommendations = json.load(f)
except Exception as e:
    print(f"Error loading recommendations.json: {e}")

# Ruta raíz (opcional, evita 404 en /)
@app.get("/")
async def root():
    return {"message": "Japan Assist API is live!"}

class ChatRequest(BaseModel):
    text: str
    lang: str = "en"

@app.post("/chat")
async def chat(req: ChatRequest):
    lang_prompts = {
        "ja": "japonés formal (keigo)",
        "en": "English",
        "es": "español"
    }
    lang_name = lang_prompts.get(req.lang, "English")
    
    prompt = f"""
    You are a tourism assistant in Monterrey, Mexico, for the FIFA World Cup 2026.
    Respond ONLY in {lang_name}.
    Be helpful, polite, and clear.
    Use the following local data: {json.dumps(recommendations, ensure_ascii=False)}
    User question: {req.text}
    """
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content

    audio_base64 = None
    if tts_client:
        voice_map = {
            "ja": "ja-JP-Neural2-B",
            "en": "en-US-Neural2-F",
            "es": "es-MX-Neural2-F"
        }
        voice_name = voice_map.get(req.lang, "en-US-Neural2-F")
        
        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=voice_name[:5],
            name=voice_name
        )
        audio_config = texttospeech.AudioConfig(audio_encoding=texttospeech.AudioEncoding.MP3)
        tts_response = tts_client.synthesize_speech(input=synthesis_input, voice=voice, audio_config=audio_config)
        audio_base64 = base64.b64encode(tts_response.audio_content).decode("utf-8")
    
    return {"text": text, "audio_base64": audio_base64}