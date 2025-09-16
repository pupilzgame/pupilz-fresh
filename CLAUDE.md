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
- Full audio system with 4 music tracks + sound effects
- AAA scoring system with floating point popups
- Epic victory celebration with confetti and fireworks
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
- **Victory Sequence**: Boss defeat → dramatic pause → EARTH ring → celebration → win
- **Audio System**: 4 music tracks (title, gameplay, mission failed, earth reached) + SFX
- **Scoring System**: Complete AAA scoring with floating popups for all kills
- **Victory Celebration**: Confetti rain + firework bursts with victory music
- **Touch Controls**: Full screen coverage, handedness support
- **Balance Systems**: Skill-first progression, drone escort rewards

### 📱 User Interface
- **Main Menu**: Play, handedness toggle, music/SFX controls
- **HUD**: Level display, ship progress (levels 1-4), lives counter, current score
- **Respawn Screen**: Countdown, handedness toggle, contextual tips
- **Victory/Game Over**: Final score display with restart option
- **Score Popups**: Floating point notifications for all enemy kills

### 🎵 Audio Integration
- **Music Tracks**: 4 complete tracks with smart exclusivity
  - `Title-Track.wav` - Main menu background music (loops)
  - `Pupilz_gameplay_Loopedx4.mp3` - In-game background music (loops)
  - `Pupilz_mission_failed.mp3` - Game over music (loops)
  - `Pupilz_earth_reached.mp3` - Victory celebration music (single play)
- **Sound Effects**: 10+ SFX files covering all game events
  - `space-bubbles.mp3` - Mothership beam-up sequence
  - `Pupilz-get-item.mp3` - Inventory item pickups
  - `Pupilz-clear-level.mp3` - Level ring progression
  - `Pupilz-Button-Press.mp3` - UI button interactions
  - `Pupilz-astroid-breaking.mp3` - Debris explosions
  - `Pupilz-gun-cocking.mp3` - Weapon upgrade pickups
  - `Pupilz_respawn.mp3` - Pod respawn
  - `weapon-fire.wav` - Basic weapon firing
  - `Pupilz-use-item.mp3` - Inventory item usage
  - `Pupilz-laser-gun.wav` - Laser weapon firing
  - `Pupilz-human-ship-explode.wav` - Ship/pod explosions
- **Controls**: Independent music (🎵/🔇) and SFX (🔊/🔇) toggles
- **Implementation**: expo-av with professional audio management and browser autoplay compliance
- **Smart Audio**: Phase-based music switching, comprehensive SFX coverage

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

### 🎯 AAA Scoring System
- **Scalable Architecture**: Base points × type multiplier × size multiplier × level multiplier
- **Enemy Values**: Asteroids (10), Barriers (20), Ships (100), Boss (1000)
- **Level Scaling**: Multipliers increase with progression (1.0x → 3.0x+)
- **Bonus Points**: Level completion, survival time, life bonus, victory bonus
- **Visual Feedback**: Floating "+XXX" popups appear at destruction sites
- **Complete Coverage**: All kill methods award points (player, drones, kamikaze)
- **Final Score**: Comprehensive calculation displayed on victory/defeat screens

### 🎉 Victory Celebration System
- **Epic Confetti**: 50 colorful particles per wave, 8 waves over 8 seconds
- **Firework Bursts**: 7 timed explosions with 25 particles each across the screen
- **Rainbow Colors**: Gold, red, green, blue, orange, pink, purple, turquoise
- **Perfect Timing**: Synced with Earth reached music and victory message
- **Meme Potential**: 8-second duration ideal for screenshots and recordings

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

## Latest Build Notes (September 2024)

### 🎯 New AAA Scoring System
- **Complete Implementation**: Professional scoring with floating popups for all enemy kills
- **Scalable Design**: Base points × type × size × level multipliers for infinite expansion
- **Universal Coverage**: All kill methods (player weapons, drone sacrifices, kamikaze attacks)
- **Visual Polish**: Floating "+XXX" score popups appear exactly at destruction sites
- **Final Score**: Victory/defeat screens show comprehensive final scores

### 🎉 Epic Victory Celebration
- **Confetti System**: Continuous colorful particle rain from screen top
- **Firework Bursts**: 7 timed radial explosions across the screen
- **Victory Music**: New Pupilz_earth_reached.mp3 track for celebration
- **Perfect Integration**: Synced with Earth reached victory sequence
- **Meme-Worthy**: 8-second celebration perfect for social sharing

### 🎵 Complete Audio System Overhaul
- **4 Music Tracks**: Title, gameplay, mission failed (looped), Earth reached
- **10+ Sound Effects**: Comprehensive SFX covering all game events
  - Mothership beam-up sequence audio
  - Item pickup and inventory usage sounds
  - Level progression and UI interaction feedback
  - Weapon firing (basic and laser variants)
  - Destruction audio for debris, ships, and player pod
  - Pod respawn and weapon upgrade sounds
- **Smart Exclusivity**: No simultaneous music conflicts, phase-based switching
- **Professional Implementation**: expo-av with proper volume controls and cleanup
- **Browser Compliance**: User interaction requirement for autoplay policies

### Previous Updates (December 2024)

### 🌐 Web & PWA Implementation
- **PWA Configuration**: Complete standalone app with no browser UI
  - `app.json` configured with `display: "standalone"`
  - `public/manifest.json` with proper icons (192px, 512px)
  - `public/sw.js` service worker for offline capability
  - `public/index.html` with PWA meta tags and safe-area-insets

### 📱 Telegram Mini App Integration
- **Anti-Minimization System**: Official Telegram WebApp API implementation
  - `useFullScreenPWA.ts` hook with multiple compatibility methods
  - `tg.disableVerticalSwipes = true` (Bot API 7.7+)
  - `tg.disableVerticalSwipes()` function call method
  - CSS fallback for older Telegram versions (pre-7.7)
  - Console logging for debugging version compatibility

### 🎮 Touch & Gesture Control  
- **iOS Touch Prevention**: Complete blue highlight and magnification blocking
  - CSS `user-select: none` and `touch-action: manipulation`
  - JavaScript double-tap zoom prevention
  - Text selection blocking with `::selection { background: transparent }`
  - Game controls fully preserved while blocking unwanted gestures

### 🏗️ Project Structure Updates
- `global.css` - PWA full-bleed styles with safe-area support
- `useFullScreenPWA.ts` - Telegram & PWA integration hook
- `public/` - PWA manifest, service worker, icons
- All touch fixes integrated into main App.tsx

### 🚀 Deployment Status
- **Vercel**: Auto-deployment on `git push origin master`
- **PWA**: Works on iOS/Android home screen without browser UI
- **Telegram Mini App**: Minimize control via official API
- **Browser**: Touch fixes prevent iOS magnification issues

### 🏆 Global Leaderboard System (September 2024)
- **Production Ready**: Fully functional global leaderboard with Supabase backend
- **Persistent Rankings**: Scores save across Telegram sessions using localStorage + database
- **Vercel Serverless**: API endpoint at `/api/leaderboard` using Vercel functions
- **Supabase Database**:
  - Table: `leaderboard` with player_name, score, level, victory, achievements
  - RLS disabled for testing (can be re-enabled for production security)
  - Sample data and proper indexing for performance
- **Environment Variables**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured in Vercel
- **Automatic Integration**: Works seamlessly with existing Telegram username detection
- **Debug Logging**: Comprehensive API logging for troubleshooting

**Setup Commands:**
```sql
-- Run this in Supabase SQL Editor for working leaderboard:
-- DEBUGGING SUPABASE LEADERBOARD SETUP
-- This script temporarily disables RLS for testing

-- Step 1: Clean slate (remove any broken table)
DROP TABLE IF EXISTS leaderboard CASCADE;

-- Step 2: Create the table with all required columns
CREATE TABLE leaderboard (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name text NOT NULL,
  score integer NOT NULL,
  level integer NOT NULL,
  victory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  achievements text[] DEFAULT ARRAY[]::text[]
);

-- Step 3: Add sample data
INSERT INTO leaderboard (player_name, score, level, victory, achievements) VALUES
('ACE', 125000, 5, true, ARRAY['EARTH_REACHED', 'CENTURION']),
('TOP', 89500, 4, false, ARRAY['BOSS_FIGHTER']),
('PRO', 67200, 3, false, ARRAY[]::text[]),
('FLY', 45800, 2, false, ARRAY[]::text[]),
('NEW', 12300, 1, false, ARRAY[]::text[]);

-- Step 4: DISABLE RLS for testing (temporarily)
-- This removes all security restrictions for debugging
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;

-- Step 5: Create indexes for better performance
CREATE INDEX ON leaderboard (score DESC);
CREATE INDEX ON leaderboard (created_at DESC);

-- Step 6: Test that we can read and write
SELECT 'SUCCESS! Table created with ' || COUNT(*) || ' sample entries' as result FROM leaderboard;

-- Step 7: Test insert (this should work without RLS)
INSERT INTO leaderboard (player_name, score, level, victory, achievements)
VALUES ('TST', 999, 1, false, ARRAY[]::text[]);

SELECT 'INSERT TEST: Now has ' || COUNT(*) || ' entries' as insert_test FROM leaderboard;
```

## Notes
The game is currently in a production-ready state with all major systems working reliably. Latest updates include a complete AAA scoring system with floating popups, epic victory celebration with confetti and fireworks, and professional 4-track audio system. The game now provides comprehensive visual feedback for all player actions and a memorable victory experience perfect for social sharing. Previous updates include complete PWA support and professional Telegram Mini App integration. Historical bug fixes and detailed implementation notes are archived in CLAUDE_ARCHIVE.md to reduce context size while preserving development knowledge.