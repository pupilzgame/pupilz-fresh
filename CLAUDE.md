# Claude Code Configuration

## Project Overview
Pupilz Pod Descent - A React Native Expo space shooter game with TypeScript support.

## Development Standards

### Code Quality
- Use TypeScript for type safety
- Follow React Native best practices
- Optimize for mobile performance
- Use functional components with hooks

### Testing
- Run `npm start` to test with Expo Go
- Ensure compatibility with Expo SDK 53
- Test on both iOS and Android when possible

### Build Process
- Use `npm run android` for Android builds
- Use `npm run ios` for iOS builds  
- Use `npm run web` for web builds

### Dependencies
- React Native 0.79.5 (locked for Expo compatibility)
- Expo ~53.0.22
- TypeScript ~5.8.3
- expo-av ^15.1.7 (Audio system)

## Commands
- `npm start` - Start development server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start web version

## Current Game Features
- Multiple levels with ship quotas (2, 3, 4, 5 ships per level)
- Level progression through floating rings (spawn from bottom, float up)
- Boss fight at level 5 with EARTH ring victory sequence
- Full audio system with title music and sound effects
- Touch controls with handedness toggle
- Skill-based progression system (no starting nukes, drone rewards)
- Professional UX with acquisition messages and subtle notifications

## Current Game State & Status

### ✅ WORKING SYSTEMS (All Production Ready)
- **Level Progression**: 1→2→3→4→5 reliable progression via ring interactions
- **Ship Quotas**: Accurate kill tracking with "🚀 1/2" progress display
- **Ring System**: Bottom spawn → float up → collision → level up
- **Ring Respawn**: 4-second delay if ring missed (falls off screen)
- **Boss Fight**: Reliable spawn at level 5, defeat triggers EARTH ring
- **Victory Sequence**: Boss defeat → dramatic pause → EARTH ring → win
- **Audio System**: Title music + 4 SFX files, independent toggles
- **Touch Controls**: Full screen coverage, handedness support
- **Balance Systems**: Skill-first progression, drone escort rewards

### 📱 User Interface
- **Main Menu**: Play, handedness toggle, music/SFX controls
- **HUD**: Level display, ship progress (levels 1-4), lives counter
- **Respawn Screen**: Countdown, handedness toggle, contextual tips
- **Victory/Game Over**: Results with restart option

### 🎵 Audio Integration
- **Files**: `assets/audio/` - Title-Track.wav (38MB), 4 SFX files
- **Controls**: Independent music (🎵/🔇) and SFX (🔊/🔇) toggles
- **Implementation**: expo-av with professional audio management
- **Triggers**: Weapon fire, explosions, level up, game over

## Key Game Mechanics

### Level Progression Flow
1. **Level 1**: Kill 2 ships → green "LVL 2" ring spawns → fly through
2. **Level 2-4**: Same pattern with 3, 4, 5 ships respectively  
3. **Level 5**: Kill 5 ships → green "LVL 5" ring → boss spawns
4. **Boss Fight**: Defeat boss → dramatic pause → EARTH ring → victory

### Balance & Rewards
- **Start**: 0 nukes, 0 energy cells (pure skill focus)
- **Level Rewards**: 3 drone escorts per level (defensive progression)
- **Pickups**: 8% chance for nukes after Level 2, energy cells
- **Emergency Safety**: Last life + no nukes = automatic nuke

### Important State Flags
- `levelUpProcessed.current` - Prevents duplicate level advances
- `quotaJustMet.current` - Reset at game start for quota tracking
- `bossGateCleared.current` - Controls boss defeat → EARTH ring flow
- `ringRespawnPending.current` - Prevents duplicate ring respawn scheduling

## Critical Code Locations (App.tsx ~47k lines)

### Core Functions
- **Level System**: `levelUp()` ~line 800, `checkShipQuota()` ~line 600
- **Ring System**: `spawnRingAt()` ~line 1200, `startRingFloatAnimation()` ~line 1300
- **Boss System**: Boss spawning in `levelUp()`, defeat detection in collision loops
- **Audio System**: `loadSoundEffects()` ~line 964, `playSound()` ~line 993

### UI Sections  
- **HUD Display**: ~lines 2800-3000 (level, progress, lives)
- **Menu Integration**: ~lines 530-568 (toggles and controls)
- **Touch Controls**: ~lines 2986-2999 (full screen coverage)

## Development Workflow

### Git Workflow
- Main branch: `master`
- Current status: App.tsx modified (latest audio system)
- Commit format: "MAJOR:", "POLISH:", "CRITICAL:" prefixes

### Testing Protocol
1. Complete level progression test (1→2→3→4→5→boss→victory)
2. Ring respawn test (let ring fall off screen)
3. Audio test (music/SFX toggles in menu)
4. Touch control test (full screen movement)
5. Boss fight test (defeat via projectiles and nukes)

### Known Working Features
- All critical bugs resolved (see CLAUDE_ARCHIVE.md for history)
- Professional audio system fully integrated
- Balanced progression without power creep
- AAA-quality UX polish and feedback systems
- Full accessibility with handedness support

## Future Development
- Voice input system (planned, not implemented)
- Additional boss patterns and variety
- More sound effects and gameplay music
- Performance optimization for older devices

## Notes
The game is currently in a production-ready state with all major systems working reliably. Historical bug fixes and detailed implementation notes are archived in CLAUDE_ARCHIVE.md to reduce context size while preserving development knowledge.