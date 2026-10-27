# WindowsCompat.md
# React Native for Windows — Rendering Notes

This document records everything that was tested, changed, or substituted
during the Apollonography UI build to work correctly with
**react-native-windows (C++ template, RN 0.84)**.

---

## ✅ What Works Natively on RNW

| Feature | Status |
|---------|--------|
| `StyleSheet` shadows (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`) | ✅ Works via `elevation` fallback |
| `TouchableOpacity` / `Pressable` | ✅ Works |
| `ScrollView` horizontal & vertical | ✅ Works |
| `TextInput` | ✅ Works |
| `Switch` | ✅ Works |
| `Image` with local `require()` assets | ✅ Works |
| `StatusBar` | ✅ Works |
| NativeWind v4 `className` on core RN components | ✅ Works (CSS compiled at Metro build time) |
| Custom font families declared in `StyleSheet.create` | ✅ Works once fonts are registered (see below) |

---

## ⚠️ What Was Substituted

### 1. Rainbow Gradient Search Button → Solid Accent Color
**Original inspiration:** The search button in the inspiration screenshot had a rainbow/holographic gradient fill.

**Problem:** `LinearGradient` requires `react-native-linear-gradient`, which has no Windows native module. NativeWind's `bg-gradient-to-r` CSS class is also not supported on RNW because RNW renders XAML, not a browser DOM.

**Substitution:** Solid `#B59CDD` (lavender) button in [`SearchBar.tsx`](src/components/SearchBar.tsx). For per-project themes the color updates to match the project accent.

---

### 2. Backdrop Blur / Glassmorphism → Opaque Cards
**Problem:** `blurRadius` on `<Image>` works, but CSS `backdrop-filter: blur()` (used by many glassmorphism effects) is not available in RNW's XAML renderer.

**Substitution:** All "glass" panels use a solid semi-transparent background color (`#ffffff60`) instead. The visual softness is maintained through careful opacity values.

---

### 3. DM Sans Font → System Font Fallback
**Status:** Currently falling back to Segoe UI / System.

**To enable DM Sans properly on Windows:**
1. Download DM Sans OTF files from https://fonts.google.com/specimen/DM+Sans
   - `DMSans-Regular.otf`
   - `DMSans-Medium.otf`
   - `DMSans-Bold.otf`
   - `DMSans-Italic.otf`
2. Place them in `windows/apollonography/Assets/Fonts/`
3. In `windows/apollonography/apollonography.vcxproj`, add:
   ```xml
   <None Include="Assets\Fonts\DMSans-Regular.otf">
     <DeploymentContent>true</DeploymentContent>
   </None>
   <!-- repeat for each weight -->
   ```
4. In `windows/apollonography.Package/Package.appxmanifest`, add inside `<Resources>`:
   ```xml
   <Resource Language="x-generate"/>
   ```
   and the font assets are automatically picked up by MSIX packaging.

The font family names used in code (`DMSans_400Regular`, `DMSans_700Bold`, etc.)
follow the React Native font naming convention and will resolve once the fonts
are registered.

---

### 4. Box Shadow on `View` → `elevation` + `shadowColor`
**Problem:** NativeWind utility classes like `shadow-lg` don't translate to
XAML DropShadow effects on RNW.

**Substitution:** All shadow effects use `StyleSheet` `shadowColor / shadowOffset / shadowOpacity / shadowRadius / elevation` — these map to RNW's XAML `Shadow` effect where supported, and are ignored gracefully where not.

---

### 5. `@react-navigation` — Not Used
Navigation is a simple React `useState` state machine in `App.tsx`. This avoids
the complexity of installing and linking `react-native-screens` native modules
on the Windows platform, while still providing stubbed navigation between all
screens.

---

### 6. File Picker Library → Custom C++ `FilePickerModule`
**Problem:** `react-native-document-picker` and other npm file pickers do not support React Native Windows with the C++ Win32 desktop template.

**Substitution:** Created native C++ module `FilePickerModule` (`windows/apollonography/FilePickerModule.h`) using Windows COM `IFileOpenDialog` filtered to `*.png;*.jpg;*.jpeg;*.webp`. It opens the native Windows Explorer dialog on a background STA thread, generates a unique filename, and copies the chosen image into the app's local `images/` folder (`c:\Users\...\Apollonography\images\`), returning the copied file URI without exposing the original system path.

---

### 7. Gesture Handler → Core `PanResponder`
**Problem:** `react-native-gesture-handler` lacks complete native C++ Win32 composition backend support on RNW 0.84.

**Substitution:** Implemented direct manipulation using React Native's core `PanResponder` for both moving the crop frame body and resizing via the four corner handles while preserving locked aspect ratios (1:1 for Panel, 1:2 for Gallery). Mouse drag and touch pointer events translate reliably across Windows desktop. Stepper buttons `[-]` / `[+]` and `onWheel` provide zoom control.

### 8. Web View / HTML WYSIWYG → Native Rich Text Editor
**Problem:** `react-native-webview` on Windows is a legacy UWP-only native project (`Microsoft.ReactNative.Uwp.CppLib.targets`) that attempts to compile `Microsoft.ReactNative.vcxproj` from raw source without the RNW monorepo toolchain. On the modern RNW 0.84 C++ Win32 Composition template, this caused 50+ minute compiles and fatal linker failures (`LNK1181: Microsoft.WindowsAppRuntime.Bootstrap.lib`).
**Substitution:** Implemented a pure, high-performance native rich text editor in [`WysiwygEditor.tsx`](src/components/WysiwygEditor/WysiwygEditor.tsx) utilizing React Native multiline text input, active brutalist formatting toolbar (bold, italic, strike, underline, headings, blockquotes, lists, rules), real-time word/character count, image insertion via COM `FilePickerModule`, and transparent TipTap JSON document synchronization.

---

## 📦 Installed Packages (added during UI build)

```
nativewind@4.2.7
react-native-reanimated@~3.16.7
react-native-safe-area-context
tailwindcss@^3.4.19
@react-navigation/native
@react-navigation/native-stack
react-native-screens
```

> **Note:** `@react-navigation` and `react-native-screens` are installed but not
> used in this UI-only build. They are available for when real navigation is implemented.
