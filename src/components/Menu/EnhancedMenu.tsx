import React, { useRef, useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

/* ---------- Enhanced Menu Component - EXACT ORIGINAL RESTORATION ---------- */
type MenuSection = {
  id: string;
  icon: string;
  title: string;
  bullets?: string[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    id: "gameplay",
    icon: "🎮",
    title: "HOW TO PLAY",
    bullets: [
      "Drag anywhere to move pod",
      "Auto-fire weapons continuously",
      "Kill required ships each level",
      "Fly through rings to advance levels",
      "Defeat boss at Level 5 → fly through EARTH ring to win",
    ],
  },
  {
    id: "items",
    icon: "📦",
    title: "ITEMS & WEAPONS",
    bullets: [
      "🔫 Multi/Spread/Laser/Flame/Homing — collect to upgrade firepower",
      "⚡ Shield/Drone/Rapid/Time-slow — instant effects",
      "🎒 Energy/Nuke — tap bottom icons to use stored items",
    ],
  },
];

type AccordionItemProps = {
  section: MenuSection;
  isOpen: boolean;
  onToggle: () => void;
};

const AccordionItem: React.FC<AccordionItemProps> = ({ section, isOpen, onToggle }) => {
  const contentAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const maxHeight = (section.bullets?.length || 0) * 50 + 32;
  const height = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });

  const opacity = contentAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.menuCard}>
      <Pressable onPress={onToggle} style={styles.menuHeader}>
        <View style={styles.menuHeaderContent}>
          <Text style={styles.menuIcon}>{section.icon}</Text>
          <Text style={styles.menuTitle}>{section.title}</Text>
        </View>
        <Text style={[styles.menuChevron, { transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }]}>
          ▶
        </Text>
      </Pressable>

      <Animated.View style={[styles.menuContent, { height, opacity }]}>
        <View style={styles.menuBullets}>
          {section.bullets?.map((bullet, idx) => (
            <View key={idx} style={styles.menuBullet}>
              <Text style={styles.menuBulletDot}>•</Text>
              <Text style={styles.menuBulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

type SettingsAccordionProps = {
  section: MenuSection;
  isOpen: boolean;
  onToggle: () => void;
  leftHandedMode: boolean;
  onToggleHandedness: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
};

const SettingsAccordion: React.FC<SettingsAccordionProps> = ({
  section, isOpen, onToggle, leftHandedMode, onToggleHandedness,
  musicEnabled, onToggleMusic, sfxEnabled, onToggleSfx
}) => {
  const contentAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const maxHeight = 200; // Fixed height for settings toggles
  const height = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, maxHeight],
  });
  const opacity = contentAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.accordionItem}>
      <Pressable onPress={onToggle} style={styles.accordionHeader}>
        <Text style={styles.accordionIcon}>{section.icon}</Text>
        <Text style={styles.accordionTitle}>{section.title}</Text>
        <Text style={[styles.accordionChevron, { transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }]}>
          ▶
        </Text>
      </Pressable>

      <Animated.View style={[styles.accordionContent, { height, opacity }]}>
        <View style={styles.settingsContainer}>
          {/* Handedness Toggle */}
          <Pressable onPress={onToggleHandedness} style={styles.settingItem}>
            <Text style={styles.settingText}>
              {leftHandedMode ? '👈 Left-Handed Mode' : '👉 Right-Handed Mode'}
            </Text>
            <View style={[
              styles.settingToggle,
              !leftHandedMode && styles.settingToggleActive
            ]}>
              <View style={[
                styles.settingToggleKnob,
                !leftHandedMode && styles.settingToggleKnobActive
              ]} />
            </View>
          </Pressable>

          {/* Music Toggle */}
          <Pressable onPress={onToggleMusic} style={styles.settingItem}>
            <Text style={styles.settingText}>
              {musicEnabled ? '🎵 Music' : '🔇 Music'}
            </Text>
            <View style={[
              styles.settingToggle,
              musicEnabled && styles.settingToggleActive
            ]}>
              <View style={[
                styles.settingToggleKnob,
                musicEnabled && styles.settingToggleKnobActive
              ]} />
            </View>
          </Pressable>

          {/* SFX Toggle */}
          <Pressable onPress={onToggleSfx} style={styles.settingItem}>
            <Text style={styles.settingText}>
              {sfxEnabled ? '🔊 Sound Effects' : '🔇 Sound Effects'}
            </Text>
            <View style={[
              styles.settingToggle,
              sfxEnabled && styles.settingToggleActive
            ]}>
              <View style={[
                styles.settingToggleKnob,
                sfxEnabled && styles.settingToggleKnobActive
              ]} />
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
};

type EnhancedMenuProps = {
  onStart: () => void;
  leftHandedMode: boolean;
  onToggleHandedness: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  onShowLeaderboard: () => void;
};

const EnhancedMenu: React.FC<EnhancedMenuProps> = ({
  onStart, leftHandedMode, onToggleHandedness, musicEnabled, onToggleMusic,
  sfxEnabled, onToggleSfx, onShowLeaderboard
}) => {
  const [openId, setOpenId] = useState<string>("");
  const [animPhase, setAnimPhase] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const settingsAnimValue = useRef(new Animated.Value(0)).current;
  const menuStarsRef = useRef<Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}>>([]);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    // Initialize menu stars
    const stars: Array<{id: string, x: number, y: number, size: number, parallax: number, opacity: number}> = [];
    const layers = [
      { count: 15, parallax: 0.3, size: 2, opacity: 0.4 },
      { count: 10, parallax: 0.6, size: 3, opacity: 0.6 },
      { count: 8, parallax: 0.9, size: 4, opacity: 0.8 },
    ];

    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        stars.push({
          id: `menu-L${li}-${i}`,
          x: Math.random() * width,
          y: Math.random() * height,
          size: layer.size,
          parallax: layer.parallax,
          opacity: layer.opacity
        });
      }
    });
    menuStarsRef.current = stars;

    const interval = setInterval(() => {
      setAnimPhase(p => (p + 1) % 100);

      // Update star positions smoothly
      menuStarsRef.current.forEach(star => {
        star.y += star.parallax * 1.2; // Slightly faster movement to compensate for lower framerate
        if (star.y > height + 10) {
          star.y = -10;
          star.x = Math.random() * width;
        }
      });
    }, 50); // 20fps for all devices

    return () => clearInterval(interval);
  }, [width, height]);

  const handleToggle = (id: string) => {
    setOpenId(current => current === id ? "" : id);
  };

  const toggleSettings = () => {
    if (showSettings) {
      // Hide animation
      Animated.timing(settingsAnimValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start(() => setShowSettings(false));
    } else {
      // Show animation
      setShowSettings(true);
      Animated.timing(settingsAnimValue, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }).start();
    }
  };

  const logoGlow = {
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8 + Math.sin(animPhase * 0.15) * 2,
  };

  const subtleFade = 0.85 + Math.sin(animPhase * 0.06) * 0.15;

  return (
    <View style={styles.menuContainer}>
      {/* Smooth background stars */}
      <View style={styles.menuParticles} pointerEvents="none">
        {menuStarsRef.current.map((star) => (
          <View
            key={star.id}
            style={{
              position: 'absolute',
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: '#8FB7FF', // Same blue as game stars
              opacity: star.opacity,
            }}
          />
        ))}
      </View>

      {/* Settings Gear Icon */}
      <Pressable
        onPress={toggleSettings}
        style={[styles.settingsGear, { opacity: subtleFade }]}
      >
        <Text style={styles.settingsGearText}>⚙️</Text>
      </Pressable>

      {/* Logo treatment */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/pupilz-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.logoSub}>
          ── POD DESCENT ──
        </Text>
      </View>

      {/* Fixed Subtitle */}
      <Text style={styles.menuSubtitle}>
        • INFILTRATE EARTH'S ATMOSPHERE •{'\n'}• ESTABLISH DOMINANCE •
      </Text>

      <ScrollView style={styles.menuScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.menuSections}>
          {MENU_SECTIONS.map((section) => (
            <AccordionItem
              key={section.id}
              section={section}
              isOpen={openId === section.id}
              onToggle={() => handleToggle(section.id)}
            />
          ))}
        </View>

        <View style={styles.socialButtonContainer}>
          <Pressable
            onPress={onShowLeaderboard}
            style={({ pressed }) => [
              styles.smallButton,
              styles.leaderboardButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🏆 TOP PILOTS</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open('https://pupilz.io/', '_blank');
              }
            }}
            style={({ pressed }) => [
              styles.smallButton,
              styles.websiteButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🌐 PUPILZ.IO</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.open('https://x.com/ThePupilz', '_blank');
              }
            }}
            style={({ pressed }) => [
              styles.smallButton,
              styles.xButtonSmall,
              pressed && styles.smallButtonPressed,
              { opacity: subtleFade }
            ]}
          >
            <Text style={styles.smallButtonText}>🐦 FOLLOW X</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onStart}
          style={({ pressed }) => [
            styles.menuCTA,
            pressed && styles.menuCTAPressed,
            { opacity: subtleFade }
          ]}
        >
          <View style={styles.menuCTAGlow} />
          <Text style={styles.menuCTAText}>DESCEND TO EARTH!</Text>
        </Pressable>
      </ScrollView>

      {/* Animated Settings Popup */}
      {showSettings && (
        <Animated.View style={[
          styles.settingsPopup,
          {
            opacity: settingsAnimValue,
            transform: [{
              scale: settingsAnimValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              })
            }]
          }
        ]}>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsTitle}>SETTINGS</Text>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>CONTROLS</Text>
              <Pressable
                onPress={onToggleHandedness}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {leftHandedMode ? '👈 Left-Handed Mode' : '👉 Right-Handed Mode'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  !leftHandedMode && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    !leftHandedMode && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>AUDIO</Text>
              <Pressable
                onPress={onToggleMusic}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {musicEnabled ? '🎵 Music' : '🔇 Music'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  musicEnabled && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    musicEnabled && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>

              <Pressable
                onPress={onToggleSfx}
                style={styles.settingItem}
              >
                <Text style={styles.settingText}>
                  {sfxEnabled ? '🔊 Sound Effects' : '🔇 Sound Effects'}
                </Text>
                <View style={[
                  styles.settingToggle,
                  sfxEnabled && styles.settingToggleActive
                ]}>
                  <View style={[
                    styles.settingToggleKnob,
                    sfxEnabled && styles.settingToggleKnobActive
                  ]} />
                </View>
              </Pressable>
            </View>

            <Pressable
              onPress={toggleSettings}
              style={styles.settingsCloseButton}
            >
              <Text style={styles.settingsCloseText}>CLOSE</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-start', // Allow proper scrolling
    paddingHorizontal: 20,
    paddingTop: 40, // Reduced from 80 for better centering
    paddingBottom: 40, // Match top padding for equal margins
  },
  menuParticles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 20, // Reduced since container now has more top padding
    zIndex: 2,
  },
  logoMain: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 5,
    textAlign: 'center',
  },
  logoImage: {
    width: 330, // 1.5x bigger for better prominence
    height: 105,  // 1.5x bigger for better prominence
    marginBottom: 4,
    alignSelf: 'center',
  },
  logoSub: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00FFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  logoUnderline: {
    width: 120,
    height: 3,
    backgroundColor: '#00FFFF',
    borderRadius: 2,
    marginTop: 3,
  },
  menuScrollView: {
    flex: 1,
    paddingBottom: 20,
    zIndex: 2,
  },
  menuSubtitle: {
    color: "#E6F3FF",
    fontSize: 14, // Reduced from 16 to 14 to prevent wrapping
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20, // Reduced from 22 to 20
    paddingHorizontal: 20,
  },
  menuSections: {
    gap: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  menuCard: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  menuHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuTitle: {
    color: "#CFFFD1",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    flex: 1,
  },
  menuChevron: {
    color: "#CFFFD1",
    fontSize: 12,
    fontWeight: "900",
  },
  menuContent: {
    overflow: "hidden",
  },
  menuBullets: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingRight: 24, // Extra padding on right to prevent cutoff
  },
  menuBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingRight: 16, // Increased from 8 to 16 for more breathing room
  },
  menuBulletDot: {
    color: "#FFD79A",
    fontSize: 14,
    marginRight: 10,
    marginTop: 2,
  },
  menuBulletText: {
    color: "#E5E7EB",
    fontSize: 14,
    flex: 1,
    lineHeight: 20, // Reduced from 22 to 20 for better text fitting
    flexWrap: "wrap",
    textAlign: "left", // Ensure left alignment
  },
  menuCTA: {
    marginTop: 20,
    marginHorizontal: 30,
    marginBottom: 15,
    backgroundColor: "#FF3366",
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: "#FF6699",
    position: 'relative',
    overflow: 'hidden',
  },
  menuCTAPressed: {
    backgroundColor: "#CC1144",
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.8,
  },
  menuCTAGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    backgroundColor: 'rgba(255,51,102,0.3)',
    borderRadius: 27,
    zIndex: -1,
  },
  menuCTAText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },

  socialButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  leaderboardButtonSmall: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
  },
  websiteButtonSmall: {
    backgroundColor: "rgba(46, 125, 50, 0.15)",
    borderWidth: 2,
    borderColor: "#2E7D32",
    shadowColor: "#2E7D32",
  },
  xButtonSmall: {
    backgroundColor: "rgba(29, 161, 242, 0.15)",
    borderWidth: 2,
    borderColor: "#1DA1F2",
    shadowColor: "#1DA1F2",
  },
  smallButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: "center",
  },

  // Settings Gear Icon Styles
  settingsGear: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  settingsGearText: {
    fontSize: 18,
    textAlign: "center",
  },

  // Settings Popup Styles
  settingsPopup: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  settingsContent: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 300,
    borderWidth: 2,
    borderColor: "#00FFFF",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00FFFF",
    textAlign: "center",
    marginBottom: 20,
    textShadowColor: "rgba(0, 255, 255, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  settingsSection: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  settingText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  settingToggle: {
    width: 50,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  settingToggleActive: {
    backgroundColor: "#00FFFF",
  },
  settingToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  settingToggleKnobActive: {
    alignSelf: "flex-end",
  },
  settingsCloseButton: {
    backgroundColor: "#FF3366",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: 8,
    shadowColor: "#FF3366",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsCloseText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },

  // Additional styles for accordion features
  accordionItem: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 48,
  },
  accordionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  accordionTitle: {
    color: "#CFFFD1",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.8,
    flex: 1,
  },
  accordionChevron: {
    color: "#CFFFD1",
    fontSize: 12,
    fontWeight: "900",
  },
  accordionContent: {
    overflow: "hidden",
  },
  settingsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});

export default EnhancedMenu;