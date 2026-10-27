Object.defineProperty(exports, "__esModule", { value: true });
exports.RCTWebView2 = exports.RCTWebView = void 0;
var _reactNative = require("react-native");

var NativeComponentRegistry;
try {
  NativeComponentRegistry = require('react-native/Libraries/NativeComponent/NativeComponentRegistry');
} catch (e) {
  try {
    NativeComponentRegistry = require('react-native-windows/Libraries/NativeComponent/NativeComponentRegistry');
  } catch (e2) {}
}

var RCTWebView2ViewConfig = {
  uiViewClassName: 'RCTWebView2',
  bubblingEventTypes: {},
  directEventTypes: {
    topLoadingStart: { registrationName: 'onLoadingStart' },
    topLoadingFinish: { registrationName: 'onLoadingFinish' },
    topLoadingError: { registrationName: 'onLoadingError' },
    topLoadingProgress: { registrationName: 'onLoadingProgress' },
    topMessage: { registrationName: 'onMessage' },
    topShouldStartLoadWithRequest: { registrationName: 'onShouldStartLoadWithRequest' },
    topOpenWindow: { registrationName: 'onOpenWindow' },
    topSourceChanged: { registrationName: 'onSourceChanged' },
    topHttpError: { registrationName: 'onHttpError' },
  },
  validAttributes: {
    source: true,
    cacheEnabled: true,
    messagingEnabled: true,
    linkHandlingEnabled: true,
    useWebView2: true,
    style: true,
    containerStyle: true,
  },
};

var RCTWebViewViewConfig = Object.assign({}, RCTWebView2ViewConfig, {
  uiViewClassName: 'RCTWebView',
});

var RCTWebView;
var RCTWebView2;

if (NativeComponentRegistry && typeof NativeComponentRegistry.get === 'function') {
  RCTWebView = NativeComponentRegistry.get('RCTWebView', function() {
    return RCTWebViewViewConfig;
  });
  RCTWebView2 = NativeComponentRegistry.get('RCTWebView2', function() {
    return RCTWebView2ViewConfig;
  });
} else {
  RCTWebView = (0, _reactNative.requireNativeComponent)('RCTWebView');
  RCTWebView2 = (0, _reactNative.requireNativeComponent)('RCTWebView2');
}

exports.RCTWebView = RCTWebView;
exports.RCTWebView2 = RCTWebView2;
