// New modular Game function - to replace the 4,656-line monster
function Game() {
  // PWA and Telegram WebApp integration
  useFullScreenPWA();

  const { width, height } = useWindowDimensions();
  const rawInsets = useSafeAreaInsets();
  const insets = {
    top: rawInsets?.top || 0,
    bottom: rawInsets?.bottom || 0,
    left: rawInsets?.left || 0,
    right: rawInsets?.right || 0,
  };

  // Initialize modular systems
  const audio = useAudioSystem();
  const weaponSystem = useRef(new WeaponSystem()).current;
  const levelManager = useRef(new LevelManager()).current;
  const enemySpawner = useRef(new EnemySpawner()).current;
  const scoringSystem = useRef(new ScoringSystem()).current;
  const entityManager = useRef(new EntityManager()).current;
  const collisionSystem = useRef(new CollisionSystem()).current;

  // Game state
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [leftHandedMode, setLeftHandedMode] = useState(false);

  // Core game refs
  const gameLoopRef = useRef<number>();
  const lastUpdateTime = useRef(Date.now());
  const timeSec = useRef(0);

  // World state
  const scrollY = useRef(0);
  const worldV = useRef(95); // FREE_FALL
  const podX = useRef(width / 2);
  const podY = useRef(height * 0.75);

  // Player state
  const lives = useRef(3);
  const maxLives = 3;
  const currentScore = useRef(0);
  const shieldLives = useRef(0);
  const invulnTime = useRef(0);
  const energyCells = useRef(0);
  const nukesLeft = useRef(0);

  // Touch and input
  const touching = useRef(false);
  const touchX = useRef(0);
  const touchY = useRef(0);

  // Visual effects
  const particles = useRef<any[]>([]);
  const shakeT = useRef(0);
  const shakeMag = useRef(0);
  const flashTime = useRef(0);

  // Phase management with callbacks
  const phaseCallbacks = {
    onGameStart: () => {
      hardResetWorld();
      audio.playGameplayMusic();
    },
    onGameOver: () => {
      audio.playMissionFailedMusic();
    },
    onVictory: () => {
      audio.playEarthReachedMusic();
    },
    onRespawn: () => {
      respawnPlayer();
    },
    onPhaseChange: (newPhase: GamePhase, oldPhase: GamePhase) => {
      console.log(`🎮 Phase change: ${oldPhase} → ${newPhase}`);
    },
    playRespawnSound: () => audio.playRespawnSound(),
    playMissionFailedMusic: () => audio.playMissionFailedMusic(),
    playEarthReachedMusic: () => audio.playEarthReachedMusic(),
  };

  const phaseManager = usePhaseManager(phaseCallbacks);

  // Initialize game systems
  useEffect(() => {
    // Initialize spawn positions
    enemySpawner.initializeSpawnPositions({
      width,
      height,
      level: levelManager.getCurrentLevel(),
      scrollY: scrollY.current,
      bufferDistance: 1200,
    });

    // Start game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Core game functions
  const hardResetWorld = () => {
    scrollY.current = 0;
    worldV.current = 95;
    podX.current = width / 2;
    podY.current = height * 0.75;

    lives.current = maxLives;
    currentScore.current = 0;
    shieldLives.current = 0;
    invulnTime.current = 0;
    energyCells.current = 0;
    nukesLeft.current = 0;
    timeSec.current = 0;

    // Reset all systems
    levelManager.reset();
    weaponSystem.reset();
    enemySpawner.reset();
    scoringSystem.reset();
    entityManager.reset();

    particles.current = [];
    shakeT.current = 0;
    shakeMag.current = 0;
    flashTime.current = 0;

    // Initialize spawning
    enemySpawner.initializeSpawnPositions({
      width,
      height,
      level: levelManager.getCurrentLevel(),
      scrollY: scrollY.current,
      bufferDistance: 1200,
    });
  };

  const respawnPlayer = () => {
    podY.current = Math.round(height * 0.5);
    invulnTime.current = 2.5;
  };

  const gameLoop = () => {
    const now = Date.now();
    const deltaTime = Math.min((now - lastUpdateTime.current) / 1000, 1/30); // Cap at 30 FPS
    lastUpdateTime.current = now;

    if (phaseManager.canPlay()) {
      // Update game time
      timeSec.current += deltaTime;

      // Update world scroll
      scrollY.current += worldV.current * deltaTime;

      // Update weapon system
      weaponSystem.update(now / 1000);

      // Update level progression
      levelManager.updateRing(deltaTime, height);

      // Spawn new enemies
      const spawnConfig = {
        width,
        height,
        level: levelManager.getCurrentLevel(),
        scrollY: scrollY.current,
        bufferDistance: 1200,
      };

      const newEntities = enemySpawner.spawnAhead(spawnConfig, false);

      // Add new entities to entity manager
      newEntities.asteroids.forEach(asteroid => entityManager.addEntity('asteroids', asteroid));
      newEntities.barriers.forEach(barrier => entityManager.addEntity('barriers', barrier));
      newEntities.ships.forEach(ship => entityManager.addEntity('ships', ship));
      newEntities.powerups.forEach(powerup => entityManager.addEntity('powerups', powerup));

      // Update all entities
      entityManager.updateEntities('asteroids', deltaTime, { width, height });
      entityManager.updateEntities('barriers', deltaTime, { width, height });
      entityManager.updateEntities('ships', deltaTime, { width, height });
      entityManager.updateEntities('projectiles', deltaTime, { width, height });
      entityManager.updateEntities('powerups', deltaTime, { width, height });

      // Update scoring system
      scoringSystem.updateScorePopups(deltaTime);

      // Handle weapon firing
      if (weaponSystem.canFire(now / 1000)) {
        const projectiles = weaponSystem.fire(
          podX.current,
          podY.current - 20,
          now / 1000,
          entityManager
        );
        audio.playWeaponFireSound();
      }

      // Collision detection
      handleCollisions();

      // Update visual effects
      updateVisualEffects(deltaTime);

      // Check level progression
      checkLevelProgression();
    }

    // Update phase manager
    phaseManager.update(deltaTime, lives.current);

    // Continue game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  const handleCollisions = () => {
    // Player vs enemies collision detection
    if (invulnTime.current <= 0) {
      const playerCollisions = collisionSystem.checkPlayerCollisions(
        podX.current,
        podY.current,
        18, // POD_RADIUS
        entityManager.getAllEntities()
      );

      if (playerCollisions.length > 0) {
        onPlayerHit();
      }
    }

    // Projectile vs enemy collisions
    const projectileHits = collisionSystem.checkProjectileCollisions(
      entityManager.getEntities('projectiles'),
      entityManager.getAllEntities()
    );

    projectileHits.forEach(hit => {
      // Award score
      const points = scoringSystem.scoreAsteroidKill(hit.target, levelManager.getCurrentLevel());
      currentScore.current = scoringSystem.getScore();

      // Remove entities
      entityManager.removeEntity(hit.targetCategory, hit.target.id);
      entityManager.removeEntity('projectiles', hit.projectile.id);

      // Create particles
      createExplosionParticles(hit.target.x, hit.target.y);
    });
  };

  const onPlayerHit = () => {
    if (shieldLives.current > 0) {
      shieldLives.current--;
      invulnTime.current = 1.5;
    } else {
      lives.current--;
      invulnTime.current = 1.5;

      if (lives.current <= 0) {
        phaseManager.endGame(false);
      } else {
        phaseManager.startRespawn();
      }
    }

    audio.playHumanShipExplodeSound();
    createExplosionParticles(podX.current, podY.current);
  };

  const checkLevelProgression = () => {
    // Check if ship quota is met
    const shipsKilled = levelManager.getShipsKilled();
    const shipQuota = levelManager.getShipQuota();

    if (shipsKilled >= shipQuota && !levelManager.isLevelComplete()) {
      levelManager.onShipKilled();
      audio.playClearLevelSound();
    }

    // Check ring collision
    const ringCollision = levelManager.checkRingCollision(
      podX.current,
      podY.current,
      18 // POD_RADIUS
    );

    if (ringCollision) {
      if (levelManager.getCurrentLevel() >= 5) {
        phaseManager.endGame(true); // Victory!
      } else {
        // Advance to next level
        // This will be handled by the level manager
      }
    }

    // Check victory condition
    if (levelManager.isGameComplete()) {
      phaseManager.endGame(true);
    }
  };

  const createExplosionParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        r: 2 + Math.random() * 3,
        ttl: 0.5 + Math.random() * 0.5,
        color: '#FF6B35',
      });
    }
  };

  const updateVisualEffects = (deltaTime: number) => {
    // Update particles
    for (let i = particles.current.length - 1; i >= 0; i--) {
      const p = particles.current[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.ttl -= deltaTime;

      if (p.ttl <= 0) {
        particles.current.splice(i, 1);
      }
    }

    // Update screen shake
    if (shakeT.current > 0) {
      shakeT.current -= deltaTime;
    }

    // Update flash effects
    if (flashTime.current > 0) {
      flashTime.current -= deltaTime;
    }

    // Update invulnerability
    if (invulnTime.current > 0) {
      invulnTime.current -= deltaTime;
    }
  };

  // Touch handlers
  const handleTouchStart = (event: any) => {
    if (!phaseManager.canPlay()) return;

    touching.current = true;
    const touch = event.nativeEvent.touches[0];
    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchMove = (event: any) => {
    if (!touching.current || !phaseManager.canPlay()) return;

    const touch = event.nativeEvent.touches[0];
    const deltaX = touch.pageX - touchX.current;
    const deltaY = touch.pageY - touchY.current;

    podX.current = Math.max(20, Math.min(width - 20, podX.current + deltaX));
    podY.current = Math.max(100, Math.min(height - 100, podY.current + deltaY));

    touchX.current = touch.pageX;
    touchY.current = touch.pageY;
  };

  const handleTouchEnd = () => {
    touching.current = false;
  };

  // UI event handlers
  const startGame = () => {
    phaseManager.startGame();
  };

  const goMenu = () => {
    phaseManager.setPhase("menu");
  };

  const toggleHandedness = () => {
    setLeftHandedMode(!leftHandedMode);
  };

  const toggleMusic = () => {
    audio.toggleMusic();
  };

  const toggleSfx = () => {
    audio.toggleSfx();
  };

  // Render
  return (
    <View style={styles.container}>
      <View
        style={styles.gameContent}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background stars */}
        {/* Game entities */}
        {/* Player pod */}
        {/* Particles */}

        {/* HUD */}
        {phaseManager.canPlay() && (
          <GameHUD
            level={levelManager.getCurrentLevel()}
            score={currentScore.current}
            lives={lives.current}
            maxLives={maxLives}
            shipsKilled={levelManager.getShipsKilled()}
            shipQuota={levelManager.getShipQuota()}
            progressText={levelManager.getProgressText()}
            weaponInfo={weaponSystem.getWeaponInfo()}
            energyCells={energyCells.current}
            nukesLeft={nukesLeft.current}
          />
        )}

        {/* UI Overlays */}
        {phase === "menu" && (
          <MainMenu
            onStart={startGame}
            leftHandedMode={leftHandedMode}
            onToggleHandedness={toggleHandedness}
            musicEnabled={audio.musicEnabled}
            onToggleMusic={toggleMusic}
            sfxEnabled={audio.sfxEnabled}
            onToggleSfx={toggleSfx}
            onShowLeaderboard={() => setShowLeaderboard(true)}
          />
        )}

        {phase === "win" && (
          <VictoryScreen
            finalScore={currentScore.current}
            onBackToMenu={goMenu}
          />
        )}

        {phase === "dead" && (
          <GameOverScreen
            finalScore={currentScore.current}
            onNewGame={startGame}
            onBackToMenu={goMenu}
          />
        )}

        {phase === "respawning" && (
          <RespawnOverlay
            respawnMessage={{
              title: "LIFE LOST",
              message: "Prepare for respawn...",
              tip: "Use invulnerability wisely!"
            }}
            countdown={Math.ceil(5)} // TODO: Get from phase manager
            lives={lives.current}
            maxLives={maxLives}
            isLastLife={lives.current === 1}
            showFullMessage={true}
            quickRespawn={false}
            canSkipCountdown={true}
            leftHandedMode={leftHandedMode}
            showRespawnTips={true}
            livesLostThisSession={maxLives - lives.current}
            onSkipCountdown={() => phaseManager.skipRespawnCountdown()}
            onToggleHandedness={toggleHandedness}
            onToggleRespawnTips={() => {}}
            onToggleQuickRespawn={() => {}}
          />
        )}
      </View>

      {/* Modals */}
      {showLeaderboard && (
        <LeaderboardModal
          isVisible={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showNameEntry && (
        <NameEntryModal
          isVisible={showNameEntry}
          gameResultData={{ score: currentScore.current, level: levelManager.getCurrentLevel() }}
          playerName={playerName}
          onNameChange={setPlayerName}
          onSubmit={() => setShowNameEntry(false)}
        />
      )}
    </View>
  );
}