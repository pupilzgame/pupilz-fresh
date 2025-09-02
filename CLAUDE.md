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

## Commands
- `npm start` - Start development server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start web version

## Notes
- Game features multiple levels, bosses, and weapon systems
- Uses custom hexagon components for asteroids
- Implements gesture controls and auto-fire mechanics

## CRITICAL FIXES & CHANGES

### 1. Level Progression Bug Fixes (CRITICAL - Multiple Commits)
**Problem**: Multiple `levelUp()` calls were being triggered per ring interaction, causing players to jump from level 1 directly to level 5, skipping intermediate content.

**Root Cause**: 
- `levelUpProcessed.current` flag was not properly protecting against multiple calls
- Ring collision detection was triggering multiple level advances in rapid succession
- Float animation completion was also triggering level progression

**Solution Implemented** (Commit: 0240c53):
- Added `levelUpProcessed.current` protection flag that prevents multiple `levelUp()` calls per ring
- Flag is reset when new rings are spawned: `levelUpProcessed.current = false`
- Ring collision logic now checks: `if (!levelUpProcessed.current) { levelUpProcessed.current = true; levelUp(); }`
- Located in ring collision detection around line ~1800 in App.tsx

**Testing**: Verified that level progression now advances 1→2→3→4→5 correctly without skipping levels.

### 2. Ship Quota System Fix (CRITICAL)
**Problem**: Ship kill counter showed incorrect values like "12/2" and quota system was broken at game restart.

**Root Cause**: 
- `quotaJustMet.current` was not being reset at game start
- Ship count logic was accumulating incorrectly across game sessions

**Solution Implemented** (Commit: 0cfce3d):
- Added `quotaJustMet.current = false` reset in `startNewGame()` function
- Located around line ~500 in game initialization
- Ensures quota tracking starts fresh for each new game
- Fixed ship counter display logic to show accurate "killed/required" format

**Testing**: Ship counter now correctly displays "1/2", "2/3", etc. without carrying over previous session data.

### 3. Ring Spawning System Overhaul
**Problem**: Rings were spawning at incorrect times, appearing before quota was met, and float animation vs pod spawning logic was conflicted.

**Root Cause**: 
- Initial ring spawn at game start bypassed ship requirements
- `spawnRingAt()` was being called from multiple locations inconsistently
- Float animation and ring spawning weren't properly coordinated

**Solution Implemented** (Multiple commits: 87267ff, 28ccda5, 1ca6c78):
- **Bottom Float Animation**: Rings now spawn at bottom of screen and float up using `updateRingFloatAnimation()`
- **Ring Float Progress**: Uses `ringFloatProgress.current` (0-1) for smooth 2.5-second animation
- **Quota-Based Spawning**: Rings only spawn after `checkShipQuota()` confirms requirement is met
- **No Initial Ring**: Removed automatic ring spawn at game start (commit 4cb0922)
- Located in `startFloatRingAnimation()` and `updateRingFloatAnimation()` functions

**Testing**: Rings now properly appear only after killing required ships, floating up dramatically from screen bottom.

### 4. HUD Display Improvements
**Problem**: Level counter and ship progress weren't always visible or were showing confusing information.

**Root Cause**: 
- HUD visibility logic wasn't consistent
- Level notification text was unclear
- Ship progress counter wasn't properly hidden for boss level

**Solution Implemented** (Commits: be17a7f, 350f750):
- **Ship Progress Display**: `{level.current < 5 && shipsRequiredForLevel.current > 0 && (<Text style={styles.shipProgress}> • 🚀 {shipsKilledThisLevel.current}/{shipsRequiredForLevel.current}</Text>)}`
- **Level Notification**: Improved text clarity and timing
- **HUD Tap-to-Show**: Added functionality for HUD interaction (commit fd58e38)
- Located in HUD render section around line ~2800

**Testing**: HUD now shows clear "🚀 1/2" ship progress for levels 1-4, hidden during boss fight at level 5.

### 5. Boss Fight Trigger System
**Problem**: Boss was spawning prematurely or not spawning correctly when reaching level 5.

**Root Cause**: 
- Boss spawning logic was duplicated in multiple functions
- Ring spawning was interfering with boss activation
- Level 5 progression wasn't properly triggering boss fight

**Solution Implemented** (Commits: 4a28450, afbf991, 51307f0):
- **Centralized Boss Spawning**: Boss now only spawns in `levelUp()` function when `level.current === 5`
- **Boss Gate Logic**: Uses `bossGateCleared.current` to track boss defeat state
- **Ring Prevention**: `spawnRingAt()` explicitly prevents boss deactivation: `if (!isNewLevel || level.current < 5) { boss.current.active = false; }`
- **Level 5 Handling**: Special case logic for boss fight vs EARTH ring spawning
- Located in `levelUp()` function around line ~800

**Testing**: Boss now reliably spawns when reaching level 5, no premature or duplicate boss fights.

### 6. Victory Sequence (Boss Defeat → EARTH Ring → Win)
**Problem**: Victory condition wasn't properly triggered after boss defeat and EARTH ring interaction.

**Root Cause**: 
- `bossGateCleared.current` flag wasn't being set correctly on boss death
- EARTH ring spawning after boss defeat wasn't working
- Win condition logic was incomplete

**Solution Implemented** (Multiple commits):
- **Boss Defeat Detection**: Sets `bossGateCleared.current = true` when boss HP reaches 0
- **EARTH Ring Spawn**: Automatically spawns EARTH ring after boss defeat: `spawnRingAt(earthRingY, true)`
- **Victory Trigger**: Level 5 ring collision checks: `if (bossGateCleared.current) { setPhase("win"); return; }`
- **Dual Defeat Paths**: Handles both collision-based and projectile-based boss defeats
- Located in boss collision detection and projectile update loops

**Testing**: Complete victory sequence: Kill required ships (levels 1-4) → Boss fight (level 5) → Boss defeat → EARTH ring appears → Touch EARTH ring → Victory screen.

### 7. Respawn Positioning System
**Problem**: Players were respawning in dangerous locations with active threats nearby.

**Root Cause**: 
- Respawn position wasn't accounting for safe zones
- No temporary invulnerability or shield compensation

**Solution Implemented** (Commit: fd58e38):
- **Safe Positioning**: Respawn logic ensures placement in top area away from immediate threats
- **Emergency Messaging**: Added "⚡ EMERGENCY ⚡ RESPAWN ⚡ INITIATED ⚡" messaging system
- **Temporary Shields**: Respawn includes shield compensation and brief invulnerability
- **Position Tracking**: Uses mothership tracking concept for immersive respawn experience
- Located in death/respawn handling functions

**Testing**: Players now respawn safely with temporary protection and clear visual feedback.

### 8. Voice Input System Setup (PLANNED - Not Yet Implemented)
**Status**: No voice input integration found in current codebase. This appears to be planned future functionality.

**Intended Implementation**:
- Wispr Flow integration for voice commands
- Speech recognition for game controls
- Voice-activated power-ups or special abilities

**Notes**: No code currently exists for this feature. Future development should integrate voice input API and command parsing system.

## KNOWN ISSUES

### Current Limitations
1. **Boss Patterns**: Boss AI could benefit from more varied attack patterns
2. **Performance**: Large numbers of projectiles may cause frame drops on older devices
3. **Audio**: Sound effects and music system needs implementation
4. **Accessibility**: Voice input system not yet implemented
5. **UI Polish**: Menu transitions could be smoother

### Monitoring Required
- **Level Progression**: Continue monitoring for any edge cases in quota system
- **Boss Spawning**: Verify boss doesn't spawn in unexpected scenarios
- **Ring Animation**: Ensure float animation doesn't conflict with collision detection
- **Memory Usage**: Monitor performance with extended gameplay sessions

## DEVELOPMENT WORKFLOW

### Git Workflow
- Main development branch: `master`
- Critical fixes require immediate commits with descriptive messages
- Use format: "CRITICAL FIX: [description]" for breaking issues
- Test thoroughly before commits, especially level progression changes

### Debugging Process
1. **Level Issues**: Check console logs for quota and level progression
2. **Ring Problems**: Monitor `ringFloatProgress.current` and spawn timing
3. **Boss Fights**: Verify `bossGateCleared.current` state transitions
4. **Ship Counting**: Validate `shipsKilledThisLevel.current` vs `shipsRequiredForLevel.current`

### Testing Protocol
- Always test complete level progression (1→2→3→4→5→boss→victory)
- Verify ship quota counters display correctly
- Confirm ring animations complete properly
- Test boss spawning and defeat sequence
- Validate respawn positioning and safety

### Code Locations (Key Files)
- **Main Game Logic**: App.tsx (~47,000 lines)
- **Level Progression**: Lines ~800-900 (levelUp function)
- **Ship Quota**: Lines ~600-700 (checkShipQuota function)  
- **Ring System**: Lines ~1200-1400 (spawnRingAt, float animation)
- **Boss Logic**: Lines ~1600-1800 (boss spawning and defeat)
- **HUD Display**: Lines ~2800-3000 (render section)

### Agent Collaboration Notes
- Critical fixes have been extensively documented in git history
- Each major system has protection flags to prevent duplicate operations
- Console logging is extensive for debugging level progression issues
- Code comments explain complex state management decisions
- All major bugs identified and resolved in recent commit series

## RING SYSTEM COMPREHENSIVE UPDATE (Commit: 9114213)

### 8. Ring Respawn Mechanics (CRITICAL - Fully Implemented)
**Problem**: Level rings that were missed (fell off top of screen) would not respawn, blocking game progression.

**Root Cause Analysis**:
- Original system tried to detect rings shrinking too small, but `RING_MIN_FRACTION = 0.55` prevented rings from ever becoming small enough
- Ring base radius (~90px) * 0.55 = ~50px, but detection threshold was `POD_RADIUS * 1.5 = 27px`
- Rings stopped shrinking at 50px, never triggering the "too small" detection

**Solution Implemented** (Commit: 9114213):
- **Time-based detection**: Changed from size-based to screen position detection
- **Off-screen detection**: `ringScreenY = yToScreen(ringCenterY.current); ringOffScreen = ringScreenY < -100`
- **4-second respawn delay**: `setTimeout(() => startRingFloatAnimation(), 4000)`
- **Proper spawn method**: Uses `startRingFloatAnimation()` (not `startFloatRingAnimation()` - function name was critical!)
- **Phase independence**: Removed `phase === "playing"` check that blocked respawn when player died during delay
- **State management**: Added `ringRespawnPending.current` flag to prevent duplicate respawn scheduling

**Testing**: Ring respawn now works reliably - rings fall off screen → 4-second delay → new ring spawns from bottom with same level number.

### 9. Ring Text Persistence During Disintegration (CRITICAL)
**Problem**: When player touched a ring, the ring text would change from "LVL 2" to "LVL 3" during the disintegration animation because `level.current` was updated immediately.

**Root Cause**: Dynamic text calculation during disintegration:
```typescript
// WRONG - text changes during collision
const ringText = `LVL ${level.current + 1}`;
```

**Solution Implemented** (Commit: 9114213):
- **Original text storage**: `ringOriginalText.current` stores text when ring spawns
- **Text persistence**: Ring displays original text throughout its lifetime, including disintegration
- **Set on spawn**: Text is captured in `spawnRingAt()` based on current state
- **Display logic**: `const ringText = ringOriginalText.current || (fallback calculation)`

**Testing**: Rings now properly show "LVL 2" during entire disintegration, never change to "LVL 3" mid-animation.

### 10. Ring Immediate Hiding on Touch (UX Enhancement)
**Problem**: Ring visual remained on screen during disintegration particle effect, looking cluttered.

**Solution Implemented** (Commit: 9114213):
```typescript
// Ring collision detection - immediate hiding
if (!ringDisintegrated.current) {
  ringDisintegrate(ringCenterX.current, ringCenterY.current, rNow);
  ringDisintegrated.current = true;
  ringSpawnT.current = 0; // Hide ring immediately
}
```

**Result**: Ring disappears instantly when touched, showing only particle disintegration effect for clean visual feedback.

### 11. Dramatic EARTH Ring Entrance System (Cinematic Enhancement)
**Problem**: EARTH ring after boss defeat had distracting white screen flash and spawned at player's location causing instant collision.

**Issues Fixed**:
- **White flash removal**: Removed `flashTime.current = 1.0` that caused distracting screen flash
- **Instant collision**: EARTH ring was spawning at `scrollY.current + height * 0.4` (middle of screen)
- **No dramatic pause**: Victory felt rushed without proper buildup

**Solution Implemented** (Commit: 9114213):
```typescript
// Boss defeat - dramatic effects without distraction
hudFadeT.current = 8.0; // Longer HUD visibility
shakeT.current = 1.5;   // Longer dramatic shake  
shakeMag.current = 25;  // Stronger shake

// 2-second dramatic pause before EARTH ring
setTimeout(() => {
  if (level.current === 5 && bossGateCleared.current) {
    console.log('DRAMATIC EARTH RING ENTRANCE BEGINS');
    startRingFloatAnimation(); // Spawn from bottom, float up
  }
}, 2000);
```

**Cinematic Sequence**:
1. Boss dies → Big explosion + intense screen shake (no white flash)
2. **2-second dramatic silence** → builds suspense
3. EARTH ring majestically rises from bottom → with "EARTH" text
4. Player must fly through to achieve victory
5. Missing EARTH ring = game over (existing `checkEarthRingFailure()`)

### 12. Ring System State Management (Technical)
**Ring lifecycle management**:
- `ringSpawnT.current`: Controls ring visibility (0 = hidden, >0 = visible)
- `ringDisintegrated.current`: Prevents multiple disintegration effects per ring
- `ringOriginalText.current`: Preserves text during ring lifetime
- `ringRespawnPending.current`: Prevents duplicate respawn scheduling
- `bossGateCleared.current`: Controls EARTH ring spawning vs regular progression

**Reset on new game** (in `hardResetWorld()`):
```typescript
ringRespawnPending.current = false; // Reset respawn system
quotaJustMet.current = false;       // Reset quota state  
levelUpProcessed.current = false;   // Reset level up protection
```

### Ring System Testing Protocol
**Complete level progression test**:
1. **Level 1→2**: Kill 2 ships → green "LVL 2" ring spawns from bottom → fly through → level up
2. **Level 2→3**: Kill 3 ships → green "LVL 3" ring spawns from bottom → fly through → level up  
3. **Level 3→4**: Kill 4 ships → green "LVL 4" ring spawns from bottom → fly through → level up
4. **Level 4→5**: Kill 5 ships → green "LVL 5" ring spawns from bottom → fly through → boss spawns
5. **Boss fight**: Defeat boss → 2-second pause → EARTH ring floats up from bottom
6. **Victory**: Fly through EARTH ring → "EARTH REACHED!" victory screen

**Ring miss testing**:
- Let ring fall off top of screen → wait 4 seconds → new identical ring spawns from bottom
- Ring text stays consistent ("LVL 2" doesn't change to "LVL 3" during disintegration)
- EARTH ring miss = instant game over with "MISSION FAILED - EARTH RING MISSED!" message

**Edge case handling**:
- Player death during ring respawn delay → respawn still occurs if level < 5
- Game reset clears all ring respawn timers and state flags
- Boss defeat while ring respawn pending → EARTH ring system takes priority

### Ring System Performance Notes
- Ring animations use `requestAnimationFrame` through game loop for 60fps smoothness
- Particle effects for disintegration are cleaned up automatically when off-screen
- State management uses useRef to avoid React re-renders during gameplay
- Console logging provides extensive debugging for ring lifecycle events

This ring system is now production-ready with AAA-quality game feel, reliable mechanics, and cinematic presentation. The complexity was in managing the state transitions and ensuring proper timing coordination between different game systems.

## RECENT MAJOR UPDATES (Latest Session)

### 13. Handedness Toggle Enhancement (UI/UX Improvement)
**Problem**: Toggle switch direction was counterintuitive - left-handed mode showed right-positioned switch.

**Solution Implemented**:
- **Fixed toggle logic**: Right-handed mode (👉) = knob slides right, Left-handed mode (👈) = knob slides left
- **Visual consistency**: Toggle position now matches hand direction emoji
- **Code changes**: Inverted `leftHandedMode` boolean logic for switch positioning

**Testing**: Toggle switch now visually points in same direction as hand emoji for intuitive UX.

### 14. Touch Control Dead Zone Elimination (CRITICAL)
**Problem**: Old inventory system left 120px dead zone at bottom of screen where pod couldn't be controlled.

**Root Cause Analysis**:
- Previous inventory area had `bottom: insets.bottom + 120` restriction on touch controls
- Explicit touch blocking code prevented touches in old inventory zone
- Dead zones persisted even when no inventory items were present

**Solution Implemented**:
- **Removed style boundary**: Changed `bottom: 0` for full screen touch coverage
- **Eliminated touch blocking**: Removed old inventory zone detection logic
- **Dynamic inventory rendering**: Container only appears when `energyCells.current > 0 || nukesLeft.current > 0`
- **Updated comments**: Reflects "Full screen coverage" instead of "STRICT boundary exclusion"

**Result**: 
- ✅ Full screen touch control - Pod controllable from any screen area
- ✅ No dead zones - Bottom area now responds to touch
- ✅ Dynamic responsiveness - Dead zones only where buttons actually exist
- ✅ Works for both left/right-handed modes

### 15. Respawn Screen Handedness Toggle (UX Enhancement) 
**Feature Added**: Compact handedness toggle on respawn screens for mid-game preference changes.

**Implementation**:
- **Placement**: Between countdown and lives display for optimal hierarchy
- **Compact design**: 60% smaller than menu version with emergency theme
- **Styling**: Dark red background matching respawn screen aesthetic
- **Functionality**: Same toggle logic as main menu with 🎮 gamepad icon

**Benefits**:
- **Mid-game adjustment**: No need to quit to main menu to change handedness
- **Natural timing**: Respawn pause is perfect moment for settings
- **Non-intrusive**: Small enough to ignore if not needed
- **Clear feedback**: Immediate inventory repositioning

### 16. Comprehensive AAA-Quality Tip System Overhaul (MAJOR)
**Problem**: Only 2 tips cycling through respawn screens with poor randomization.

**Issues Fixed**:
- **Limited variety**: Expanded from ~20 to 40+ unique tips
- **Poor algorithm**: Replaced restrictive filtering with weighted priority system
- **Missing categories**: Added Controls, Power-ups, and Progression tip categories

**New Tip Database (6 Categories)**:
1. **Survival** (6 tips): Movement, shields, positioning, safety tactics
2. **Controls** (4 tips): Full-screen control, handedness, smooth movement, multi-touch
3. **Power-ups** (5 tips): Energy cells, drones, nukes, shield stacking, rapid-fire
4. **Weapons** (8 tips): All weapon types, upgrades, auto-fire mechanics, strategies
5. **Progression** (5 tips): Ship quotas, rings, boss prep, victory conditions, drone rewards
6. **Advanced** (6 tips): Threat prioritization, safe zones, boss patterns, inventory tips

**AAA-Quality Randomization Algorithm**:
- **Priority weighting**: Critical=4x chance, High=3x, Medium=2x, Low=1x
- **Contextual boosting**: Death-specific tips get 3x selection probability
- **Smart filtering**: Only avoids last 8 tips (not all shown tips)
- **Fallback protection**: Never gets stuck with empty tip pools
- **Memory management**: Caps tip tracking at 15 to prevent infinite growth

**Result**: Professional-quality tip variety with contextual relevance like AAA games.

### 17. "Skill Mastery First" Nuke System Redesign (CRITICAL BALANCE CHANGE)
**Philosophy Change**: From "start with power" to "earn through skill development" approach.

**Problem with Old System**:
- Starting with nukes created crutch dependency
- Even-level automatic rewards reduced challenge
- Too powerful for guaranteed progression rewards

**New Nuke Economy Implemented**:

**🎓 Level 1-2 (Pure Skill Training)**:
- **Start with**: 0 nukes (no safety net)
- **Forces mastery**: Movement, dodging, weapon collection fundamentals
- **"Git gud" phase**: No nuclear crutches allowed

**💎 Level 3+ (Rare Pickup System)**:
- **Spawn chance**: 8% chance for nuke pickups after Level 2
- **Visual design**: Bright red with distinctive "N" styling
- **Rarity value**: Finding nukes creates genuine excitement
- **Strategic depth**: Max 3 nukes - "Save for boss or use now?"

**🚨 Emergency Safety Net**:
- **Last life + no nukes** = automatic emergency nuke
- **Prevents rage quits**: Safety net without reducing challenge
- **Message**: "🚨 EMERGENCY NUKE: Last life safety net activated!"

**Implementation Changes**:
- `nukesLeft.current = 0` at game start
- Removed automatic even-level nuke rewards
- Added "N" to PUKind type with pickup handling
- Added emergency nuke logic in death system
- Updated menu description: "[N] Nuke — rare pickup"

**Benefits**:
- **Skill confidence**: Players know they can survive without nukes
- **Earned satisfaction**: Finding nukes feels like genuine rewards
- **Strategic decisions**: Limited nukes create meaningful choices
- **Balanced progression**: Emergency system prevents total failure

### 18. "Mothership Reinforcement" Level Reward System (MAJOR BALANCE IMPROVEMENT)
**Philosophy**: Replace overpowered nuke rewards with balanced defensive progression.

**Problem with Nukes as Level Rewards**:
- Too nuclear - completely trivialized encounters
- Reduced skill development - players saved nukes instead of learning
- Power creep - every level giving nukes made late game too easy

**New Drone Reinforcement System**:

**🤖 Guaranteed Drone Escorts (Levels 2-5)**:
- **3 drones per level completion** - evenly spaced orbital protection
- **Thematic message**: "🤖 MOTHERSHIP DISPATCH: Drone reinforcements deployed!"
- **5-second HUD visibility** for clear feedback
- **Strategic value**: Defensive progression without trivializing combat

**🎯 Why Drones are Perfect Level Rewards**:
- **Balanced power**: Protective, not destructive - adds defense without removing challenge
- **Consumable shields**: Drones sacrifice themselves, so they get used up naturally
- **Skill-based longevity**: Good positioning keeps drones alive longer
- **Thematic excellence**: Space combat narrative - "requesting backup!"
- **Visual progression**: Growing drone escort feels awesome and cinematic

**🚀 Complete Progression Flow**:
1. **Level 1**: Master basics solo (no safety net)
2. **Level 2**: Earn first drone escort (skill mastery reward)
3. **Level 3**: Fresh drones + increased difficulty scaling
4. **Level 4**: Another escort wave + pre-boss buildup
5. **Level 5**: Final reinforcements before boss fight
6. **Boss Fight**: Full drone escort vs. major threat (cinematic experience)

**Implementation**:
- Replaced nuke rewards in `levelUp()` function with drone spawning logic
- Added drone reinforcement messaging to tip system
- Enhanced HUD feedback with extended visibility
- Updated progression tips to reflect new reward system

**Strategic Benefits**:
- **Teaching tool**: Drones demonstrate protection value and positioning
- **Natural scaling**: More drones = ready for harder threats
- **Never overpowered**: Still requires skill and tactical positioning
- **Resource management**: Do I preserve drones or let them tank damage?
- **Boss preparation**: Arriving at Level 5 with full escort feels epic

**Result**: Perfect "earning your stripes" progression - start solo, prove skill, gradually earn mothership trust and support. Creates meaningful defensive progression without screen-clearing nuclear options.

## TECHNICAL IMPLEMENTATION NOTES

### Code Locations for Recent Changes:
- **Touch Control Fix**: Lines ~2986-2999 (removed inventory zone blocking)
- **Nuke System**: Lines ~1052-1067 (pickup generation), ~1256 (start with 0), ~1780-1783 (emergency system)
- **Drone Rewards**: Lines ~1691-1715 (mothership reinforcement system)
- **Tip System**: Lines ~559-700 (comprehensive overhaul with 6 categories)
- **Handedness**: Lines ~514-525 (menu toggle), ~3172-3189 (respawn toggle)

### Testing Protocol for Recent Changes:
1. **Touch Control**: Verify pod movement in all screen areas, especially bottom corners
2. **Nuke Progression**: Test 0 start → rare pickups → emergency safety net
3. **Drone Rewards**: Confirm 3 drones per level with proper thematic messaging
4. **Tip Variety**: Ensure diverse, contextual tips during respawn screens
5. **Handedness**: Test both menu and respawn toggles with proper visual feedback

### Balance Implications:
- **Early game harder**: No starting nukes forces skill development
- **Mid game balanced**: Drone protection scales with difficulty
- **Late game tactical**: Limited nukes create strategic resource management
- **Overall progression**: Defensive scaling instead of offensive power creep

This update represents a major evolution toward professional AAA game balance with thematic consistency, skill-based progression, and player education systems.