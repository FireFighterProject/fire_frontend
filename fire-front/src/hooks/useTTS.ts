// src/hooks/useTTS.ts

export default function useTTS() {
    return (text: string) => {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "ko-KR";
        speech.rate = 1.0;
        speech.pitch = 1;
        window.speechSynthesis.speak(speech);
    };
}
