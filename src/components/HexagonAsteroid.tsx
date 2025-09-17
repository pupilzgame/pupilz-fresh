import React from 'react';
import { View } from 'react-native';

interface HexagonAsteroidProps {
  size: number;
  backgroundColor: string;
  borderColor: string;
  opacity: number;
  rotation: number;
  damageFlash: boolean;
}

export default function HexagonAsteroid({
  size,
  backgroundColor,
  borderColor,
  opacity,
  rotation,
  damageFlash
}: HexagonAsteroidProps) {
  const displayColor = damageFlash ? '#FFFFFF' : backgroundColor;

  return (
    <View style={{
      width: size * 2,
      height: size * 2,
      opacity,
      transform: [{ rotate: `${rotation}deg` }],
    }}>
      {/* Hexagon made from 3 rotated rectangles */}
      <View style={{
        position: 'absolute',
        width: size * 1.732, // sqrt(3) for proper hexagon
        height: size * 0.5,
        backgroundColor: displayColor,
        borderWidth: 1,
        borderColor: borderColor,
        top: size * 0.75,
        left: size * 0.134,
        transform: [{ rotate: '0deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: size * 1.732,
        height: size * 0.5,
        backgroundColor: displayColor,
        borderWidth: 1,
        borderColor: borderColor,
        top: size * 0.75,
        left: size * 0.134,
        transform: [{ rotate: '60deg' }],
      }} />
      <View style={{
        position: 'absolute',
        width: size * 1.732,
        height: size * 0.5,
        backgroundColor: displayColor,
        borderWidth: 1,
        borderColor: borderColor,
        top: size * 0.75,
        left: size * 0.134,
        transform: [{ rotate: '120deg' }],
      }} />
    </View>
  );
}