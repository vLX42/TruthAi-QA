export async function playElevenlabsAudio(text: string, isPlayingRef: React.MutableRefObject<boolean>, onFinishedPlaying: () => void): Promise<void> {

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
  try {
    const response = await fetch(`${baseUrl}/${'MF3mGyEYCl7XYWbV9V6O'}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Error: Unable to stream audio. Status code: ${response.status}`);
    }

    const blob = await response.blob();
    const audio = new Audio(URL.createObjectURL(blob));

    // Listen to the audio events to manage isPlayingRef state
    audio.onplay = () => isPlayingRef.current = true;
    audio.onended = () => {
      console.log("set to false")
      isPlayingRef.current = false;
      // Free up object URL
      URL.revokeObjectURL(audio.src);
      onFinishedPlaying(); // This is called when the audio ends
    };
    audio.onerror = () => {
        isPlayingRef.current = false;
        // Error handling here
        onFinishedPlaying(); // This is called if playback fails
      };
    // Now play the audio
    await audio.play();

    // Wait for the audio to finish playing
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        isPlayingRef.current = false;
        // Error handling here
        onFinishedPlaying(); // This is called if playback fails
        resolve();
      };
      audio.onerror = (e) => {
        console.error('Error playing audio', e);
        isPlayingRef.current = false;
        // Error handling here
        onFinishedPlaying(); // This is called if playback fails
        reject(new Error('Playback failed'));
      };
    });
  } catch (error) {
    console.error('playElevenlabsAudio error', error);
    throw error;
  }
}