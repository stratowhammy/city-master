// public/js/ui/SpeechHelper.js
// Kid-Friendly Text-to-Speech (TTS) Engine supporting custom Voice Models (e.g., "Fenn")

class SpeechHelper {
  static isSpeaking = false;

  // Active Voice Model Profile (Fenn v1.0)
  static voiceProfile = {
    version: '1.0',
    profile: {
      name: 'Fenn',
      description: 'Primary Voice Model for City Master narration',
      language: 'en'
    },
    has_avatar: false,
    settings: {
      rate: 0.95,   // Clear, accessible pace for 5th graders
      pitch: 1.05,  // Friendly and engaging tone
      volume: 1.0
    }
  };

  static cachedVoices = [];

  static init() {
    if ('speechSynthesis' in window) {
      SpeechHelper.cachedVoices = window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        SpeechHelper.cachedVoices = window.speechSynthesis.getVoices();
        console.log(`🎙️ Loaded ${SpeechHelper.cachedVoices.length} speech voices. Selected model profile: "${SpeechHelper.voiceProfile.profile.name}"`);
      };
    }
  }

  // Load custom voice model profile JSON
  static setVoiceModelProfile(profileJson) {
    if (typeof profileJson === 'string') {
      try {
        profileJson = JSON.parse(profileJson);
      } catch (e) {
        console.error('Invalid voice profile JSON:', e);
        return;
      }
    }
    if (profileJson && profileJson.profile) {
      SpeechHelper.voiceProfile = {
        ...SpeechHelper.voiceProfile,
        ...profileJson,
        profile: {
          ...SpeechHelper.voiceProfile.profile,
          ...profileJson.profile
        }
      };
      console.log(`🎙️ Updated TTS Voice Model to: ${SpeechHelper.voiceProfile.profile.name} (${SpeechHelper.voiceProfile.profile.language})`);
    }
  }

  static getBestVoice() {
    if (!SpeechHelper.cachedVoices || SpeechHelper.cachedVoices.length === 0) {
      if ('speechSynthesis' in window) {
        SpeechHelper.cachedVoices = window.speechSynthesis.getVoices();
      }
    }

    const targetName = (SpeechHelper.voiceProfile.profile.name || '').toLowerCase();
    const targetLang = (SpeechHelper.voiceProfile.profile.language || 'en').toLowerCase();

    // 1. Check for exact or partial match to "Fenn"
    const fennVoice = SpeechHelper.cachedVoices.find(v => 
      v.name.toLowerCase().includes(targetName) ||
      (v.voiceURI && v.voiceURI.toLowerCase().includes(targetName))
    );
    if (fennVoice) {
      return fennVoice;
    }

    // 2. High-quality natural English voice fallbacks configured with Fenn acoustic parameters
    const preferredEnglishVoices = [
      'Google US English',
      'Samantha',
      'Daniel',
      'Natural',
      'Karen',
      'Alex',
      'Victoria',
      'Fred'
    ];

    for (const name of preferredEnglishVoices) {
      const match = SpeechHelper.cachedVoices.find(v => 
        v.lang.toLowerCase().startsWith(targetLang) && v.name.includes(name)
      );
      if (match) return match;
    }

    // 3. Any English language voice
    return SpeechHelper.cachedVoices.find(v => v.lang.toLowerCase().startsWith(targetLang)) || SpeechHelper.cachedVoices[0] || null;
  }

  static speak(text) {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech Synthesis not supported in this browser.');
      return;
    }

    // Clean text: strip HTML tags & emojis for clear speech
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = SpeechHelper.voiceProfile.settings.rate || 0.95;
    utterance.pitch = SpeechHelper.voiceProfile.settings.pitch || 1.05;
    utterance.volume = SpeechHelper.voiceProfile.settings.volume || 1.0;

    const chosenVoice = SpeechHelper.getBestVoice();
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      SpeechHelper.isSpeaking = true;
      document.body.classList.add('tts-active');
    };

    utterance.onend = () => {
      SpeechHelper.isSpeaking = false;
      document.body.classList.remove('tts-active');
    };

    utterance.onerror = () => {
      SpeechHelper.isSpeaking = false;
      document.body.classList.remove('tts-active');
    };

    window.speechSynthesis.speak(utterance);
  }

  static stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      SpeechHelper.isSpeaking = false;
    }
  }

  static speakElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      SpeechHelper.speak(el.innerText);
    }
  }
}

// Initialize voice listener
SpeechHelper.init();

window.SpeechHelper = SpeechHelper;
