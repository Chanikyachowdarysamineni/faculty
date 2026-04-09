import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Text as SvgText, Rect } from 'react-native-svg';

interface CSELogoBrandProps {
  size?: number;
  showText?: boolean;
}

/**
 * SVG-based CSE Logo Component
 * This is a fallback that works without image files
 * Shows the CSE logo with shield design
 */
const CSELogoBrand: React.FC<CSELogoBrandProps> = ({ 
  size = 120, 
  showText = false 
}) => {
  const viewSize = 200;
  const scale = size / viewSize;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        style={styles.svg}
      >
        {/* Shield background */}
        <Path
          d="M 50 20 L 150 20 L 150 80 Q 150 140 100 160 Q 50 140 50 80 Z"
          fill="#5B5BA3"
          stroke="#fff"
          strokeWidth="3"
        />

        {/* CSE Text at top */}
        <SvgText
          x={viewSize / 2}
          y="40"
          fontSize="28"
          fontWeight="bold"
          fill="#EF0000"
          textAnchor="middle"
        >
          CSE
        </SvgText>

        {/* Center circle */}
        <Circle
          cx={viewSize / 2}
          cy={viewSize / 2}
          r="30"
          fill="#fff"
          stroke="#0066CC"
          strokeWidth="2"
        />

        {/* Center star in circle */}
        <SvgText
          x={viewSize / 2}
          y={viewSize / 2 + 12}
          fontSize="36"
          fill="#0066CC"
          textAnchor="middle"
        >
          ★
        </SvgText>

        {/* Decorative segments around center */}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = viewSize / 2 + 30 * Math.cos(rad);
          const y1 = viewSize / 2 + 30 * Math.sin(rad);
          const x2 = viewSize / 2 + 50 * Math.cos(rad);
          const y2 = viewSize / 2 + 50 * Math.sin(rad);

          return (
            <Path
              key={`segment-${angle}`}
              d={`M ${x1} ${y1} L ${x2} ${y2}`}
              stroke="#5B5BA3"
              strokeWidth="8"
              strokeLinecap="round"
            />
          );
        })}
      </Svg>

      {showText && (
        <View style={styles.textContainer}>
          <SvgText
            fontSize="14"
            fontWeight="600"
            fill="#1e293b"
            textAnchor="middle"
            style={styles.brandText}
          >
            CSE
          </SvgText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  svg: {
    marginBottom: 4,
  },
  textContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CSELogoBrand;
