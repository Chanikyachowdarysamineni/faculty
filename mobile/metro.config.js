const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Configure resolver
config.resolver.extraNodeModules = {
  'react-native-svg': path.resolve(__dirname, 'node_modules/react-native-svg'),
};

module.exports = config;
