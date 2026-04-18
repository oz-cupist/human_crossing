import { useRef, useCallback, useEffect } from 'react';
import {
  AnimaleseEngine,
  KoreanAnalyzer,
  WebSampler,
  PitchManager,
  WebPlayer,
} from 'animalese-tts';

const KOREAN_PHONEMES = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
  'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ',
  'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ',
  'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ',
  'ㅡ', 'ㅢ', 'ㅣ',
];

let sharedEngine: AnimaleseEngine | null = null;
let sharedPlayer: WebPlayer | null = null;
let loadPromise: Promise<void> | null = null;

function getEngine() {
  if (!sharedEngine) {
    sharedPlayer = new WebPlayer();
    sharedEngine = new AnimaleseEngine({
      analyzer: new KoreanAnalyzer(),
      sampler: new WebSampler('/sounds/korean-sprite.wav', KOREAN_PHONEMES),
      effect: new PitchManager({
        pitch: 1.5,
        speed: 2.0,
        randomness: 0.15,
      }),
    });
  }
  return { engine: sharedEngine, player: sharedPlayer! };
}

async function ensureLoaded() {
  if (!loadPromise) {
    const { engine } = getEngine();
    loadPromise = engine.load(engine.synthesize('')).catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export function useAnimalese() {
  const abortRef = useRef(false);

  useEffect(() => {
    ensureLoaded();
  }, []);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    abortRef.current = false;

    await ensureLoaded();
    const { engine, player } = getEngine();
    const speaker = engine.synthesize(text);

    for await (const output of speaker.speak()) {
      if (abortRef.current) break;
      await player.play(output.buffer as Float32Array);
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { speak, stop };
}
