import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', style }) => {
  const sizeMap = {
    small: 60,
    medium: 120,
    large: 180,
  };

  const dimension = sizeMap[size];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('../assets/logo.png')}
        style={[styles.logo, { width: dimension, height: dimension }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    marginVertical: 16,
  },
});

export default Logo;
