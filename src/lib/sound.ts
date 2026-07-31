// Som do +1. O arquivo NÃO está no repositório: coloque um MP3 curto em
// public/plus-one.mp3 e ele passa a tocar; sem o arquivo, nada toca e nada
// quebra (o play rejeita e é engolido — som é decoração, nunca erro).

let audio: HTMLAudioElement | null = null

export function playPlusOne() {
  try {
    if (!audio) {
      audio = new Audio('/plus-one.mp3')
      audio.volume = 0.6
    }
    // cliques rápidos reiniciam o som — efeito metralhadora é proposital
    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {
    // ambiente sem Audio (SSR/teste) ou autoplay bloqueado: segue o jogo
  }
}
