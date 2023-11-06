import { useEffect, useRef, useState } from 'react';
import { playElevenlabsAudio } from '../elevenlabs/api';

type Message = {
  id: string;
  content: string;
  role: string;
};

const useTextToSpeechOnNewSentence = (messages: Message[]) => {
  const lastSpokenSentenceRef = useRef<string>('');
  const [lines, setLines] = useState<string[]>([]);
  const [lastPlayed, setLastPlayed] = useState(0);
  const isPlayingRef = useRef(false); // Reference to track if audio is currently playing

  useEffect(() => {
    const allContents = messages.map((message) => message.content).join('\n');
    const sentences = allContents.match(/[^.?\n]+[.?\n]/g) || [];
    const lastSpokenIndex = sentences.findIndex((sentence) => sentence === lastSpokenSentenceRef.current);

    sentences.slice(lastSpokenIndex + 1).forEach((sentence) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence && /[.?\n]$/.test(trimmedSentence)) {
        setLines((prevLines) => [...prevLines, trimmedSentence]);
        lastSpokenSentenceRef.current = trimmedSentence;
      }
    });
  }, [messages]);

  useEffect(() => {
    const playAudio = async () => {
      if (lines.length > lastPlayed && !isPlayingRef.current) {
        isPlayingRef.current = true;
        await playElevenlabsAudio(lines[lastPlayed]);
        setLastPlayed((prevLastPlayed) => prevLastPlayed + 1);
        isPlayingRef.current = false;
      }
    };

    playAudio().catch(console.error);
  }, [lines, lastPlayed]);

  // Cleanup function to reset isPlayingRef when the component unmounts
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
    };
  }, []);

};

export default useTextToSpeechOnNewSentence;
