const path = require('path');

module.exports = {
  dependencies: {
    'react-native-webview': {
      root: path.resolve(__dirname, 'node_modules/react-native-webview'),
      platforms: {
        windows: {
          folder: path.resolve(__dirname, 'node_modules/react-native-webview'),
          sourceDir: 'windows',
          solutionFile: 'ReactNativeWebView.sln',
          projects: [
            {
              projectFile: 'ReactNativeWebView/ReactNativeWebView.vcxproj',
              projectName: 'ReactNativeWebView',
              projectGuid: '{30CADFC7-80EF-4296-A405-47E4B97C0C71}',
              projectLang: 'cpp',
              directDependency: true,
              cppHeaders: ['winrt/ReactNativeWebView.h'],
              cppPackageProviders: ['ReactNativeWebView::ReactPackageProvider'],
              csNamespaces: [],
              csPackageProviders: [],
            },
          ],
        },
      },
    },
  },
};
