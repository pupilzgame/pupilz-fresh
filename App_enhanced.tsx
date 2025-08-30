import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, useWindowDimensions, Pressable, StyleSheet, Platform } from "react-native";

/** ---------- Types ---------- */
type Vec = { x: number; y: number };
type Bullet = { id: number; x: number; y: number; vx: number; vy: number; r: number };
type Asteroid = { id: number; x: number; y: number; vx: number; vy: number; r: number; hp: number; alive: boolean };

let NEXT_ID = 1;
const nid = () => NEXT_ID++;

const POD_RADIUS = 16;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function App() {
  const { width, height } = useWindowDimensions();
  const screen = { w: width, h: height };
  const [pod, setPod] = useState<Vec>({ x: width * 0.5, y: height * 0.75 });
  const podX = useRef(width * 0.5);
  const podY = useRef(height * 0.75);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [rocks, setRocks] = useState<Asteroid[]>([]);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(3);

  // Touch control refs
  const touching = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const podStartX = useRef(0);
  const podStartY = useRef(0);

  // Spawn loop (asteroids); simple downward drift with slight x jitter
  useEffect(() => {
    const spawn = setInterval(() => {
      const r = 18 + Math.random() * 26;
      const x = 24 + Math.random() * (width - 48);
      const y = -r - 10;
      const vx = (Math.random() - 0.5) * 40;
      const vy = 60 + Math.random() * 120;
      setRocks(rs => [...rs, { id: nid(), x, y, vx, vy, r, hp: Math.round(r/6)+1, alive: true }]);
    }, 600);
    return () => clearInterval(spawn);
  }, [width]);

  // Autofire
  useEffect(() => {
    const fire = setInterval(() => {
      const speed = -520;
      setBullets(bs => [...bs, { id: nid(), x: podX.current, y: podY.current - 24, vx: 0, vy: speed, r: 4 }]);
    }, 140);
    return () => clearInterval(fire);
  }, []);

  // Game tick
  useEffect(() => {
    let raf = 0;
    const dt = 1/60;
    const tick = () => {
      // move bullets
      setBullets(bs => bs.map(b => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt })).filter(b => b.y > -20 && b.y < screen.h + 20));
      // move rocks
      setRocks(rs => rs.map(a => ({ ...a, x: a.x + a.vx * dt, y: a.y + a.vy * dt })).filter(a => a.y < screen.h + 50 && a.alive));

      // collisions
      setRocks(rs => {
        const updated = rs.map(a => ({...a}));
        setBullets(bs => {
          let changed = false;
          return bs.filter(b => {
            let alive = true;
            for (const a of updated) {
              if (!a.alive) continue;
              const dx = a.x - b.x, dy = a.y - b.y;
              if (dx*dx + dy*dy <= (a.r + b.r)*(a.r + b.r)) {
                a.hp -= 1;
                if (a.hp <= 0) { a.alive = false; }
                alive = false;
                changed = true;
                break;
              }
            }
            return alive;
          });
        });
        const survivors = updated.filter(a => a.alive);
        const destroyed = updated.length - survivors.length;
        if (destroyed > 0) setScore(s => s + destroyed * 10);
        return survivors;
      });

      // pod vs rocks
      setRocks(rs => {
        const updated = rs.filter(a => {
          const dx = a.x - podX.current, dy = a.y - podY.current;
          if (dx*dx + dy*dy <= (a.r + POD_RADIUS)*(a.r + POD_RADIUS)) {
            // hit
            setShields(s => Math.max(0, s - 1));
            return false; // remove on hit
          }
          return true;
        });
        return updated;
      });

      // Sync pod state with refs
      setPod({ x: podX.current, y: podY.current });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen.h]);

  const bounds = useMemo(() => ({ left: 20, top: 20, right: width - 20, bottom: height - 20 }), [width, height]);

  return (
    <View style={{ flex: 1, backgroundColor: "#05070d" }}>
      {/* HUD */}
      <View style={{ position: "absolute", top: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.hud}>SCORE: {score}</Text>
        <Text style={styles.hud}>SHIELDS: {shields}</Text>
      </View>

      {/* Stars background (cheap) */}
      <View style={{ position: "absolute", left: 0, top: 0, width, height }} pointerEvents="none">
        {Array.from({ length: 80 }).map((_, i) => {
          const sx = (i * 73) % width;
          const sy = (i * 131) % height;
          const sz = 1 + ((i * 19) % 2);
          const op = 0.3 + ((i % 5) * 0.1);
          return <View key={i} style={{ position: "absolute", left: sx, top: sy, width: sz, height: sz, backgroundColor: "white", opacity: op, borderRadius: sz/2 }} />;
        })}
      </View>

      {/* Asteroids */}
      {rocks.map(a => (
        <View key={a.id} style={{ position: "absolute", left: a.x - a.r, top: a.y - a.r, width: a.r*2, height: a.r*2, borderRadius: a.r, backgroundColor: "#444" }} />
      ))}

      {/* Bullets */}
      {bullets.map(b => (
        <View key={b.id} style={{ position: "absolute", left: b.x - b.r, top: b.y - b.r, width: b.r*2, height: b.r*2, borderRadius: b.r, backgroundColor: "#8cf" }} />
      ))}

      {/* Pod */}
      <View style={{ position: "absolute", left: pod.x - 16, top: pod.y - 16, width: 32, height: 32, borderRadius: 16, backgroundColor: "#6cf", borderWidth: 2, borderColor: "#cfe" }} />

      {/* Enhanced trackpad-style touch controls */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="auto"
        onStartShouldSetResponder={(e) => {
          const y = e.nativeEvent?.locationY || e.nativeEvent?.pageY || 0;
          return y >= height * 0.5; // only lower half
        }}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const touch = e.nativeEvent;
          const x = touch.locationX || touch.pageX || 0;
          const y = touch.locationY || touch.pageY || 0;
          
          if (y < height * 0.5) return;
          
          touching.current = true;
          touchStartX.current = x;
          touchStartY.current = y;
          podStartX.current = podX.current;
          podStartY.current = podY.current;
        }}
        onResponderMove={(e) => {
          if (!touching.current) return;
          
          const touch = e.nativeEvent;
          const currentX = touch.locationX || touch.pageX || touchStartX.current;
          const currentY = touch.locationY || touch.pageY || touchStartY.current;
          
          const deltaX = currentX - touchStartX.current;
          const deltaY = currentY - touchStartY.current;
          
          const newX = clamp(podStartX.current + deltaX, POD_RADIUS, width - POD_RADIUS);
          const newY = clamp(podStartY.current + deltaY, POD_RADIUS, height - POD_RADIUS);
          
          podX.current = newX;
          podY.current = newY;
        }}
        onResponderRelease={() => { 
          touching.current = false; 
        }}
        onResponderTerminate={() => { 
          touching.current = false;
        }}
        onTouchStart={(e) => {
          if (touching.current) return;
          
          const touch = e.nativeEvent.touches[0];
          if (!touch) return;
          
          const y = touch.locationY || touch.pageY || 0;
          if (y < height * 0.5) return;
          
          touching.current = true;
          touchStartX.current = touch.locationX || touch.pageX || 0;
          touchStartY.current = y;
          podStartX.current = podX.current;
          podStartY.current = podY.current;
        }}
        onTouchMove={(e) => {
          if (!touching.current) return;
          
          const touch = e.nativeEvent.touches[0];
          if (!touch) return;
          
          const currentX = touch.locationX || touch.pageX || touchStartX.current;
          const currentY = touch.locationY || touch.pageY || touchStartY.current;
          
          const deltaX = currentX - touchStartX.current;
          const deltaY = currentY - touchStartY.current;
          
          const newX = clamp(podStartX.current + deltaX, POD_RADIUS, width - POD_RADIUS);
          const newY = clamp(podStartY.current + deltaY, POD_RADIUS, height - POD_RADIUS);
          
          podX.current = newX;
          podY.current = newY;
        }}
        onTouchEnd={() => {
          touching.current = false;
        }}
      />

      {/* Reset */}
      <Pressable onPress={() => { 
        setBullets([]); 
        setRocks([]); 
        setScore(0); 
        setShields(3); 
        const newX = width * 0.5;
        const newY = height * 0.75;
        setPod({ x: newX, y: newY }); 
        podX.current = newX;
        podY.current = newY;
      }}
        style={{ position: "absolute", right: 12, bottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#222", borderRadius: 10 }}>
        <Text style={{ color: "white", fontWeight: "700" }}>RESET</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { color: "white", fontWeight: "800", letterSpacing: 1, fontSize: 14 }
});