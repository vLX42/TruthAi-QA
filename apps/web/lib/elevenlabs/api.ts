export async function playElevenlabsAudio(text: string): Promise<void> {
    const baseUrl = 'https://api.elevenlabs.io/v1/text-to-speech';
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
  
    if (typeof apiKey !== 'string') {
      console.error('API key is undefined');
      return;
    }
  
    const headers = new Headers({
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    });
  
    const requestBody = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0,
        similarity_boost: 0,
        style: 0,
        use_speaker_boost: true
      }
    };
  
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
  
      // Wrap the play method in a Promise to await its end
      await new Promise<void>((resolve, reject) => {
        audio.play();
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', () => reject(new Error('Playback failed')));
      });
    } catch (error) {
      console.error('playElevenlabsAudio error', error);
      throw error;
    }
  }
