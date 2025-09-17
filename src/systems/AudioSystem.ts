import { Audio } from 'expo-av';
import { useRef, useState, useEffect } from 'react';

export interface AudioSystem {
  // State
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  audioLoaded: boolean;

  // Controls
  toggleMusic: () => void;
  toggleSfx: () => void;

  // Music functions
  playTitleMusic: () => Promise<void>;
  playGameplayMusic: () => Promise<void>;
  playMissionFailedMusic: () => Promise<void>;
  playEarthReachedMusic: () => Promise<void>;
  stopAllMusic: () => Promise<void>;

  // SFX functions
  playSpaceBubblesSound: () => Promise<void>;
  playGetItemSound: () => Promise<void>;
  playButtonPressSound: () => Promise<void>;
  playAsteroidBreakingSound: () => Promise<void>;
  playGunCockingSound: () => Promise<void>;
  playRespawnSound: () => Promise<void>;
  playWeaponFireSound: () => Promise<void>;
  playUseItemSound: () => Promise<void>;
  playLaserGunSound: () => Promise<void>;
  playHumanShipExplodeSound: () => Promise<void>;
  playClearLevelSound: () => Promise<void>;
  playMultiGunSound: () => Promise<void>;
  playHomingMissilesGunSound: () => Promise<void>;
  playFireGunSound: () => Promise<void>;
  playSpreadGunSound: () => Promise<void>;
}

export const useAudioSystem = (): AudioSystem => {
  // Music refs
  const titleMusic = useRef<Audio.Sound | null>(null);
  const gameplayMusic = useRef<Audio.Sound | null>(null);
  const missionFailedMusic = useRef<Audio.Sound | null>(null);
  const earthReachedMusic = useRef<Audio.Sound | null>(null);

  // SFX refs
  const spaceBubblesSound = useRef<Audio.Sound | null>(null);
  const getItemSound = useRef<Audio.Sound | null>(null);
  const clearLevelSound = useRef<Audio.Sound | null>(null);
  const buttonPressSound = useRef<Audio.Sound | null>(null);
  const asteroidBreakingSound = useRef<Audio.Sound | null>(null);
  const gunCockingSound = useRef<Audio.Sound | null>(null);
  const respawnSound = useRef<Audio.Sound | null>(null);
  const weaponFireSound = useRef<Audio.Sound | null>(null);
  const useItemSound = useRef<Audio.Sound | null>(null);
  const laserGunSound = useRef<Audio.Sound | null>(null);
  const humanShipExplodeSound = useRef<Audio.Sound | null>(null);
  const multiGunSound = useRef<Audio.Sound | null>(null);
  const homingMissilesGunSound = useRef<Audio.Sound | null>(null);
  const fireGunSound = useRef<Audio.Sound | null>(null);
  const spreadGunSound = useRef<Audio.Sound | null>(null);

  // State
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pupilz_sfx_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [audioLoaded, setAudioLoaded] = useState(false);

  // Load sound effects
  const loadSoundEffects = async () => {
    try {
      console.log('🔊 Loading sound effects...');

      // Load music tracks
      const { sound: titleMusicSound } = await Audio.Sound.createAsync(
        require('../../assets/audio/Title-Track.wav'),
        { shouldPlay: false, isLooping: true, volume: musicVolume }
      );
      titleMusic.current = titleMusicSound;
      console.log('🎵 Title music loaded');

      const { sound: gameplayMusicSound } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz_gameplay_Loopedx4.mp3'),
        { shouldPlay: false, isLooping: true, volume: musicVolume }
      );
      gameplayMusic.current = gameplayMusicSound;
      console.log('🎵 Gameplay music loaded');

      const { sound: missionFailedMusicSound } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz_mission_failed.mp3'),
        { shouldPlay: false, isLooping: true, volume: musicVolume }
      );
      missionFailedMusic.current = missionFailedMusicSound;
      console.log('🎵 Mission failed music loaded');

      const { sound: earthReachedMusicSound } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz_earth_reached.mp3'),
        { shouldPlay: false, isLooping: false, volume: musicVolume }
      );
      earthReachedMusic.current = earthReachedMusicSound;
      console.log('🎵 Earth reached music loaded');

      // Load SFX
      const { sound: spaceBubblesSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/space-bubbles.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      spaceBubblesSound.current = spaceBubblesSoundLoaded;

      const { sound: getItemSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-get-item.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      getItemSound.current = getItemSoundLoaded;

      const { sound: clearLevelSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-clear-level.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      clearLevelSound.current = clearLevelSoundLoaded;

      const { sound: buttonPressSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-Button-Press.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      buttonPressSound.current = buttonPressSoundLoaded;

      const { sound: asteroidBreakingSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-astroid-breaking.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      asteroidBreakingSound.current = asteroidBreakingSoundLoaded;

      const { sound: gunCockingSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-gun-cocking.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      gunCockingSound.current = gunCockingSoundLoaded;

      const { sound: respawnSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz_respawn.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      respawnSound.current = respawnSoundLoaded;

      const { sound: weaponFireSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/weapon-fire.wav'),
        { shouldPlay: false, volume: musicVolume }
      );
      weaponFireSound.current = weaponFireSoundLoaded;

      const { sound: useItemSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-use-item.mp3'),
        { shouldPlay: false, volume: musicVolume }
      );
      useItemSound.current = useItemSoundLoaded;

      const { sound: laserGunSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-laser-gun.wav'),
        { shouldPlay: false, volume: musicVolume }
      );
      laserGunSound.current = laserGunSoundLoaded;

      const { sound: humanShipExplodeSoundLoaded } = await Audio.Sound.createAsync(
        require('../../assets/audio/Pupilz-human-ship-explode.wav'),
        { shouldPlay: false, volume: musicVolume }
      );
      humanShipExplodeSound.current = humanShipExplodeSoundLoaded;

      console.log('✅ All sound effects loaded successfully');
      setAudioLoaded(true);
    } catch (error) {
      console.error('❌ Failed to load sound effects:', error);
    }
  };

  // Music functions
  const stopAllMusic = async () => {
    const musicRefs = [titleMusic, gameplayMusic, missionFailedMusic, earthReachedMusic];

    for (const musicRef of musicRefs) {
      try {
        if (musicRef.current) {
          await musicRef.current.stopAsync();
        }
      } catch (error) {
        console.log('❌ Error stopping music:', error);
      }
    }
  };

  const playTitleMusic = async () => {
    try {
      if (titleMusic.current && musicEnabled) {
        await stopAllMusic();
        await titleMusic.current.setPositionAsync(0);
        await titleMusic.current.setVolumeAsync(musicVolume);
        await titleMusic.current.playAsync();
        console.log('🎵 Title music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play title music:', error);
    }
  };

  const playGameplayMusic = async () => {
    try {
      if (gameplayMusic.current && musicEnabled) {
        await stopAllMusic();
        await gameplayMusic.current.setPositionAsync(0);
        await gameplayMusic.current.setVolumeAsync(musicVolume);
        await gameplayMusic.current.playAsync();
        console.log('🎵 Gameplay music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play gameplay music:', error);
    }
  };

  const playMissionFailedMusic = async () => {
    try {
      if (missionFailedMusic.current && musicEnabled) {
        await stopAllMusic();
        await missionFailedMusic.current.setPositionAsync(0);
        await missionFailedMusic.current.setVolumeAsync(musicVolume);
        await missionFailedMusic.current.playAsync();
        console.log('🎵 Mission failed music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play mission failed music:', error);
    }
  };

  const playEarthReachedMusic = async () => {
    try {
      if (earthReachedMusic.current && musicEnabled) {
        await stopAllMusic();
        await earthReachedMusic.current.setPositionAsync(0);
        await earthReachedMusic.current.setVolumeAsync(musicVolume);
        await earthReachedMusic.current.playAsync();
        console.log('🎵 Earth reached music playing');
      }
    } catch (error) {
      console.log('❌ Failed to play earth reached music:', error);
    }
  };

  // SFX functions
  const playSpaceBubblesSound = async () => {
    try {
      if (spaceBubblesSound.current && sfxEnabled) {
        await spaceBubblesSound.current.setPositionAsync(0);
        await spaceBubblesSound.current.setVolumeAsync(musicVolume);
        await spaceBubblesSound.current.playAsync();
        console.log('🔊 Space bubbles sound playing for mothership beam-up');
      }
    } catch (error) {
      console.log('❌ Failed to play space bubbles sound:', error);
    }
  };

  const playGetItemSound = async () => {
    try {
      if (getItemSound.current && sfxEnabled) {
        await getItemSound.current.setPositionAsync(0);
        await getItemSound.current.setVolumeAsync(musicVolume);
        await getItemSound.current.playAsync();
        console.log('🔊 Get item sound playing for inventory pickup');
      }
    } catch (error) {
      console.log('❌ Failed to play get item sound:', error);
    }
  };

  const playClearLevelSound = async () => {
    try {
      if (clearLevelSound.current && sfxEnabled) {
        await clearLevelSound.current.setPositionAsync(0);
        await clearLevelSound.current.setVolumeAsync(musicVolume);
        await clearLevelSound.current.playAsync();
        console.log('🔊 Clear level sound playing for level ring pop');
      }
    } catch (error) {
      console.log('❌ Failed to play clear level sound:', error);
    }
  };

  const playButtonPressSound = async () => {
    try {
      if (buttonPressSound.current && sfxEnabled) {
        await buttonPressSound.current.setPositionAsync(0);
        await buttonPressSound.current.setVolumeAsync(musicVolume);
        await buttonPressSound.current.playAsync();
        console.log('🔊 Button press sound playing for UI interaction');
      }
    } catch (error) {
      console.log('❌ Failed to play button press sound:', error);
    }
  };

  const playAsteroidBreakingSound = async () => {
    try {
      if (asteroidBreakingSound.current && sfxEnabled) {
        await asteroidBreakingSound.current.setPositionAsync(0);
        await asteroidBreakingSound.current.setVolumeAsync(musicVolume);
        await asteroidBreakingSound.current.playAsync();
        console.log('🔊 Asteroid breaking sound playing for debris explosion');
      }
    } catch (error) {
      console.log('❌ Failed to play asteroid breaking sound:', error);
    }
  };

  const playGunCockingSound = async () => {
    try {
      if (gunCockingSound.current && sfxEnabled) {
        await gunCockingSound.current.setPositionAsync(0);
        await gunCockingSound.current.setVolumeAsync(musicVolume);
        await gunCockingSound.current.playAsync();
        console.log('🔊 Gun cocking sound playing for weapon upgrade pickup');
      }
    } catch (error) {
      console.log('❌ Failed to play gun cocking sound:', error);
    }
  };

  const playRespawnSound = async () => {
    try {
      if (respawnSound.current && sfxEnabled) {
        await respawnSound.current.setPositionAsync(0);
        await respawnSound.current.setVolumeAsync(musicVolume);
        await respawnSound.current.playAsync();
        console.log('🔊 Respawn sound playing for pod respawn');
      }
    } catch (error) {
      console.log('❌ Failed to play respawn sound:', error);
    }
  };

  const playWeaponFireSound = async () => {
    try {
      if (weaponFireSound.current && sfxEnabled) {
        await weaponFireSound.current.setPositionAsync(0);
        await weaponFireSound.current.setVolumeAsync(musicVolume);
        await weaponFireSound.current.playAsync();
        console.log('🔊 Weapon fire sound playing for basic weapon');
      }
    } catch (error) {
      console.log('❌ Failed to play weapon fire sound:', error);
    }
  };

  const playUseItemSound = async () => {
    try {
      if (useItemSound.current && sfxEnabled) {
        await useItemSound.current.setPositionAsync(0);
        await useItemSound.current.setVolumeAsync(musicVolume);
        await useItemSound.current.playAsync();
        console.log('🔊 Use item sound playing for inventory item usage');
      }
    } catch (error) {
      console.log('❌ Failed to play use item sound:', error);
    }
  };

  const playLaserGunSound = async () => {
    try {
      if (laserGunSound.current && sfxEnabled) {
        await laserGunSound.current.setPositionAsync(0);
        await laserGunSound.current.setVolumeAsync(musicVolume);
        await laserGunSound.current.playAsync();
        console.log('🔊 Laser gun sound playing for laser weapon fire');
      }
    } catch (error) {
      console.log('❌ Failed to play laser gun sound:', error);
    }
  };

  const playHumanShipExplodeSound = async () => {
    try {
      if (humanShipExplodeSound.current && sfxEnabled) {
        await humanShipExplodeSound.current.setPositionAsync(0);
        await humanShipExplodeSound.current.setVolumeAsync(musicVolume);
        await humanShipExplodeSound.current.playAsync();
        console.log('🔊 Human ship explode sound playing for ship/pod explosion');
      }
    } catch (error) {
      console.log('❌ Failed to play human ship explode sound:', error);
    }
  };

  const playMultiGunSound = async () => {
    try {
      if (multiGunSound.current && sfxEnabled) {
        await multiGunSound.current.setPositionAsync(0);
        await multiGunSound.current.setVolumeAsync(musicVolume);
        await multiGunSound.current.playAsync();
        console.log('🔊 Multi gun sound playing');
      }
    } catch (error) {
      console.log('❌ Failed to play multi gun sound:', error);
    }
  };

  const playHomingMissilesGunSound = async () => {
    try {
      if (homingMissilesGunSound.current && sfxEnabled) {
        await homingMissilesGunSound.current.setPositionAsync(0);
        await homingMissilesGunSound.current.setVolumeAsync(musicVolume);
        await homingMissilesGunSound.current.playAsync();
        console.log('🔊 Homing missiles gun sound playing');
      }
    } catch (error) {
      console.log('❌ Failed to play homing missiles gun sound:', error);
    }
  };

  const playFireGunSound = async () => {
    try {
      if (fireGunSound.current && sfxEnabled) {
        await fireGunSound.current.setPositionAsync(0);
        await fireGunSound.current.setVolumeAsync(musicVolume);
        await fireGunSound.current.playAsync();
        console.log('🔊 Fire gun sound playing');
      }
    } catch (error) {
      console.log('❌ Failed to play fire gun sound:', error);
    }
  };

  const playSpreadGunSound = async () => {
    try {
      if (spreadGunSound.current && sfxEnabled) {
        await spreadGunSound.current.setPositionAsync(0);
        await spreadGunSound.current.setVolumeAsync(musicVolume);
        await spreadGunSound.current.playAsync();
        console.log('🔊 Spread gun sound playing');
      }
    } catch (error) {
      console.log('❌ Failed to play spread gun sound:', error);
    }
  };

  // Toggle functions
  const toggleMusic = () => {
    const newMusicEnabled = !musicEnabled;
    setMusicEnabled(newMusicEnabled);
    console.log(`Music toggled to: ${newMusicEnabled ? 'on' : 'off'}`);

    if (!newMusicEnabled) {
      stopAllMusic();
    }
  };

  const toggleSfx = () => {
    const newSfxEnabled = !sfxEnabled;
    setSfxEnabled(newSfxEnabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pupilz_sfx_enabled', JSON.stringify(newSfxEnabled));
    }
    console.log(`Sound effects toggled to: ${newSfxEnabled ? 'on' : 'off'}`);
  };

  // Initialize audio on mount
  useEffect(() => {
    loadSoundEffects();

    return () => {
      // Cleanup on unmount
      const allSounds = [
        titleMusic, gameplayMusic, missionFailedMusic, earthReachedMusic,
        spaceBubblesSound, getItemSound, clearLevelSound, buttonPressSound,
        asteroidBreakingSound, gunCockingSound, respawnSound, weaponFireSound,
        useItemSound, laserGunSound, humanShipExplodeSound, multiGunSound,
        homingMissilesGunSound, fireGunSound, spreadGunSound
      ];

      allSounds.forEach(soundRef => {
        if (soundRef.current) {
          soundRef.current.unloadAsync();
        }
      });
    };
  }, []);

  return {
    // State
    musicEnabled,
    sfxEnabled,
    musicVolume,
    audioLoaded,

    // Controls
    toggleMusic,
    toggleSfx,

    // Music functions
    playTitleMusic,
    playGameplayMusic,
    playMissionFailedMusic,
    playEarthReachedMusic,
    stopAllMusic,

    // SFX functions
    playSpaceBubblesSound,
    playGetItemSound,
    playButtonPressSound,
    playAsteroidBreakingSound,
    playGunCockingSound,
    playRespawnSound,
    playWeaponFireSound,
    playUseItemSound,
    playLaserGunSound,
    playHumanShipExplodeSound,
    playClearLevelSound,
    playMultiGunSound,
    playHomingMissilesGunSound,
    playFireGunSound,
    playSpreadGunSound,
  };
};