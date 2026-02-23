const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prefer "react-native" entry (source) over "main" (built commonjs) so
// react-native-draggable-flatlist uses src/ and avoids broken lib/commonjs resolution.
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Required so Metro resolves firebase/auth, firebase/app, firebase/firestore subpaths
// (package "exports" field).
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
