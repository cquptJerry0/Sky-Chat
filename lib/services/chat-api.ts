export class ChatAPI {
  static async sendMessage(
    message: string,
    signal?: AbortSignal
  ) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
      signal,
    })

    if (!response.ok) throw new Error('API request failed')
    return response
  }

  static async textToSpeech(text: string, signal?: AbortSignal) {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voice: 'fnlp/MOSS-TTSD-v0.5:anna',
        speed: 1.0,
        format: 'mp3',
      }),
      signal,
    })

    if (!response.ok) throw new Error('TTS request failed')
    return await response.blob()
  }

  static async speechToText(audio: File, signal?: AbortSignal) {
    const formData = new FormData()
    formData.append('audio', audio)

    const response = await fetch('/api/speech', {
      method: 'POST',
      body: formData,
      signal,
    })

    if (!response.ok) throw new Error('STT request failed')
    return await response.json()
  }
}
