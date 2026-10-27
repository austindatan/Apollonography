const fs = require('fs');
const path = require('path');

const vcxproj = path.resolve(__dirname, '../node_modules/react-native-webview/windows/ReactNativeWebView/ReactNativeWebView.vcxproj');
if (fs.existsSync(vcxproj)) {
  let content = fs.readFileSync(vcxproj, 'utf8');
  if (content.includes('<PlatformToolset>v143</PlatformToolset>')) {
    content = content.replace('<PlatformToolset>v143</PlatformToolset>', '<PlatformToolset>v145</PlatformToolset>');
    fs.writeFileSync(vcxproj, content, 'utf8');
    console.log('[patch-webview] Patched ReactNativeWebView.vcxproj PlatformToolset to v145');
  }
}
