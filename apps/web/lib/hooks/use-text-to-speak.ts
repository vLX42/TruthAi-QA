import { useEffect, useRef, useState } from 'react'

type Message = {
  id: string
  content: string
  role: string
}

const useTextToSpeechOnNewSentence = (messages: Message[], isUpdating: boolean) => {
  const audioQueue = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const isFetchingRef = useRef(false)
  const audioQueueBlob = useRef<any>([])
  const audioQueueIndex = useRef<number>(0)
  const audioQueuePlayIndex = useRef<number>(0)
  const lastSpokenSentenceRef = useRef<string>('')

  useEffect(() => {
    // Combine messages into a single string with double newlines in between
    const allContents = messages.map(message => message.content).join('\n\n');
    // Split by double newlines to separate complete paragraphs
    const paragraphs = allContents.split('\n\n');
    console.log({ paragraphs })
    // Identify the last spoken paragraph index
    const lastSpokenIndex = paragraphs.findIndex(
      paragraph => paragraph === lastSpokenSentenceRef.current
    );
    // Obtain new paragraphs after the last spoken one
    const newParagraphs = paragraphs.slice(lastSpokenIndex + 1, -1) // Exclude the last paragraph

    newParagraphs.forEach(paragraph => {
      // Check if the paragraph is not just whitespace and ends with a period, question mark, or an exclamation mark

        console.log(paragraph);
        audioQueue.current.push(paragraph);
        lastSpokenSentenceRef.current = paragraph;
 
    });
  }, [messages]);

  useEffect(() => {
    // Separate intervals for processing the queue and playing audio
    const downloadInterval = setInterval(() => {
      processDownloadQueue();
    }, 1000);

    const playInterval = setInterval(() => {
      processPlayQueue();
    }, 1000);

    return () => {
      clearInterval(downloadInterval);
      clearInterval(playInterval);
    };
  }, []);

  const processDownloadQueue = async () => {
    if (isFetchingRef.current || audioQueueIndex.current >= audioQueue.current.length) {
      return;
    }
    isFetchingRef.current = true;

    try {
      const textToDownload = audioQueue.current[audioQueueIndex.current];
      const blob = await fetchTextToSpeechAudio(textToDownload);
      audioQueueBlob.current.push({ id: audioQueueIndex.current, blob });
      audioQueueIndex.current += 1;
    } catch (error) {
      console.error(error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  const processPlayQueue = () => {
    if (isPlayingRef.current || audioQueuePlayIndex.current >= audioQueueBlob.current.length) {
      return;
    }

    const { blob } = audioQueueBlob.current[audioQueuePlayIndex.current];
    playAudioBlob(blob);
    audioQueuePlayIndex.current += 1;
  };

  const fetchTextToSpeechAudio = async (text: any) => {
    const baseUrl = 'https://api.elevenlabs.io/v1/text-to-speech'
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY

    if (typeof apiKey !== 'string') {
      console.error('API key is undefined')
      return
    }

    const headers = new Headers({
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    })

    const requestBody = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0,
        similarity_boost: 0,
        style: 0,
        use_speaker_boost: true
      }
    }

    const response = await fetch(`${baseUrl}/${'MF3mGyEYCl7XYWbV9V6O'}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(
        `Error: Unable to stream audio. Status code: ${response.status}`
      )
    }

    const blob = await response.blob()
    return blob
  }

  const playAudioBlob = (blob: any) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.onplay = () => {
      isPlayingRef.current = true;
    };
    audio.onended = () => {
      isPlayingRef.current = false;
      // Instead of directly calling processQueue(), we allow the intervals to trigger it
    };
    audio.play();
  };


  // Cleanup function to reset refs when the component unmounts
  useEffect(() => {
    return () => {
      isPlayingRef.current = false
      isFetchingRef.current = false
    }
  }, [])
}

export default useTextToSpeechOnNewSentence
