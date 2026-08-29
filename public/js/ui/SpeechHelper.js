// public/js/ui/SpeechHelper.js
// Kid-Friendly Text-to-Speech (TTS) Engine for 5th-Grade Accessibility

class SpeechHelper {
  static isSpeaking = false;

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
    utterance.rate = 0.95; // Slightly slower, very clear pace for 5th graders
    utterance.pitch = 1.05; // Friendly and engaging tone

    // Try to pick a clear English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
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

window.SpeechHelper = SpeechHelper;
