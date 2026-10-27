module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
    '^react-native-webview$': '<rootDir>/__mocks__/react-native-webview.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-css-interop|nativewind)/)',
  ],
};
