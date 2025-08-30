import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, useWindowDimensions, Pressable, StyleSheet, Platform } from "react-native";

/** ---------- TouchMover (inline) ---------- */
function TouchMover({
  width, height, podX, podY, setPod,
  dt = 1/60, maxSpeed = 900, friction = 0.06, deadZone = 10, smooth = 0.20,
  lowerHalfOnly = true, bounds
}: {
  width: number; height: number; podX: number; podY: number;
  setPod: (x: number, y: number) => void;
  dt?: number; maxSpeed?: number; friction?: number; deadZone?: number; smooth?: number;
  lowerHalfOnly?: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
}) {
  const vel = useRef({ x: 0, y: 0 });
  const targetVel = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const lp = (a: number, b: number, t: number) => a + (b - a) * t;

  const onStart = (e: any) => {
    if (lowerHalfOnly && e.nativeEvent.pageY < height * 0.5) return;
    dragging.current = true;
    start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  };
  const onMove = (e: any) => {
    if (!dragging.current) return;
    const dx = e.nativeEvent.pageX - start.current.x;
    const dy = e.nativeEvent.pageY - start.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < deadZone) { targetVel.current = { x: 0, y: 0 }; return; }
    const ux = dx / dist, uy = dy / dist;
    const desired = Math.min(maxSpeed, dist * 10);
    targetVel.current = { x: ux * desired, y: uy * desired };
  };
  const onEnd = () => { dragging.current = false; };

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const tv = targetVel.current;
      const aimX = lp(vel.current.x, tv.x, smooth);
      const aimY = lp(vel.current.y, tv.y, smooth);
      const fx = dragging.current ? aimX : aimX * (1 - friction);
      const fy = dragging.current ? aimY : aimY * (1 - friction);
      const mag = Math.hypot(fx, fy);
      const cap = Math.min(mag, maxSpeed);
      const vx = mag > 0 ? (fx / mag) * cap : 0;
      const vy = mag > 0 ? (fy / mag) * cap : 0;
      vel.current = { x: vx, y: vy };
      let nx = podX + vx * dt;
      let ny = podY + vy * dt;
      nx = Math.max(bounds.left, Math.min(bounds.right, nx));
      ny = Math.max(bounds.top, Math.min(bounds.bottom, ny));
      if (nx !== podX || ny !== podY) setPod(nx, ny);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [podX, podY, setPod, dt, maxSpeed, friction, smooth, bounds]);

  return (
    <Pressable
      onPressIn={onStart}
      onPressOut={onEnd}
      onPress={() => {}}
      onLongPress={() => {}}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      style={{ position: "absolute", left: 0, top: 0, width, height }}
    />
  );
}

/** ---------- Types ---------- */
type Vec = { x: number; y: number };
type Bullet = { id: number; x: number; y: number; vx: number; vy: number; r: number };
type Asteroid = { id: number; x: number; y: number; vx: number; vy: number; r: number; hp: number; alive: boolean };

let NEXT_ID = 1;
const nid = () => NEXT_ID++;

export default function App() {
  const { width, height } = useWindowDimensions();
  const screen = { w: width, h: height };
  const [pod, setPod] = useState<Vec>({ x: width * 0.5, y: height * 0.75 });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [rocks, setRocks] = useState<Asteroid[]>([]);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(3);

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
      setBullets(bs => [...bs, { id: nid(), x: pod.x, y: pod.y - 24, vx: 0, vy: speed, r: 4 }]);
    }, 140);
    return () => clearInterval(fire);
  }, [pod.x, pod.y]);

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
          const dx = a.x - pod.x, dy = a.y - pod.y;
          if (dx*dx + dy*dy <= (a.r + 16)*(a.r + 16)) {
            // hit
            setShields(s => Math.max(0, s - 1));
            return false; // remove on hit
          }
          return true;
        });
        return updated;
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen.h, pod.x, pod.y]);

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

      {/* Touch layer */}
      <TouchMover width={width} height={height} podX={pod.x} podY={pod.y} setPod={(x,y)=>setPod({x,y})} bounds={bounds} />

      {/* Reset */}
      <Pressable onPress={() => { setBullets([]); setRocks([]); setScore(0); setShields(3); setPod({ x: width * 0.5, y: height * 0.75 }); }}
        style={{ position: "absolute", right: 12, bottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#222", borderRadius: 10 }}>
        <Text style={{ color: "white", fontWeight: "700" }}>RESET</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { color: "white", fontWeight: "800", letterSpacing: 1, fontSize: 14 }
});