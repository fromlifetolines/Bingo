import useSound from 'use-sound';
import { useCallback } from 'react';

const SOUND_PATHS = {
    pop: '/sounds/pop.mp3',
    win: '/sounds/win.mp3', // Player success
    shuffle: '/sounds/shuffle.mp3',
    horn: '/sounds/horn.mp3', // Host horn
    ambient: '/sounds/ambient.mp3',
};

export const useSoundEffects = () => {
    const [playPop] = useSound(SOUND_PATHS.pop, { volume: 0.5 });
    const [playWin] = useSound(SOUND_PATHS.win, { volume: 0.6 });
    const [playHorn] = useSound(SOUND_PATHS.horn, { volume: 0.8 });
    const [playShuffle, { stop: stopShuffle }] = useSound(SOUND_PATHS.shuffle, {
        volume: 0.4,
        loop: true
    });

    // TTS for numbers
    const announceNumber = useCallback((number: number) => {
        if ('speechSynthesis' in window) {
            const msg = new SpeechSynthesisUtterance(String(number));
            msg.rate = 1.2;
            msg.pitch = 1.1;
            window.speechSynthesis.speak(msg);
        }
    }, []);

    return {
        playPop,
        playWin,
        playHorn,
        playShuffle,
        stopShuffle,
        announceNumber
    };
};
