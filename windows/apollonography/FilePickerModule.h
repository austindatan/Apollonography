#pragma once

#include "pch.h"
#include "NativeModules.h"
#include <shobjidl.h>
#include <filesystem>
#include <chrono>
#include <string>
#include <thread>
#include <windows.h>
#include <fstream>
#include <vector>

namespace ApollonographyModules {

REACT_MODULE(FilePickerModule, L"FilePickerModule")
struct FilePickerModule {
  REACT_METHOD(PickAndCopyImage, L"pickAndCopyImage")
  void PickAndCopyImage(
      std::wstring const &projectImagesDir,
      winrt::Microsoft::ReactNative::ReactPromise<std::wstring> promise) noexcept {
    std::thread([projectImagesDir, promise]() {
      HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
      bool coInit = SUCCEEDED(hr);

      IFileOpenDialog *pFileOpen = nullptr;
      hr = CoCreateInstance(
          CLSID_FileOpenDialog,
          NULL,
          CLSCTX_ALL,
          IID_IFileOpenDialog,
          reinterpret_cast<void **>(&pFileOpen));

      if (SUCCEEDED(hr)) {
        // Filter to png, jpg, jpeg, webp
        COMDLG_FILTERSPEC fileTypes[] = {
            {L"Image Files (*.png;*.jpg;*.jpeg;*.webp)", L"*.png;*.jpg;*.jpeg;*.webp"},
            {L"PNG (*.png)", L"*.png"},
            {L"JPEG (*.jpg;*.jpeg)", L"*.jpg;*.jpeg"},
            {L"WebP (*.webp)", L"*.webp"},
        };
        pFileOpen->SetFileTypes(ARRAYSIZE(fileTypes), fileTypes);
        pFileOpen->SetTitle(L"Choose Image for Apollonography");

        hr = pFileOpen->Show(NULL);
        if (SUCCEEDED(hr)) {
          IShellItem *pItem = nullptr;
          hr = pFileOpen->GetResult(&pItem);
          if (SUCCEEDED(hr)) {
            PWSTR pszFilePath = nullptr;
            hr = pItem->GetDisplayName(SIGDN_FILESYSPATH, &pszFilePath);
            if (SUCCEEDED(hr)) {
              std::wstring srcPath(pszFilePath);
              CoTaskMemFree(pszFilePath);
              pItem->Release();
              pFileOpen->Release();

              try {
                std::filesystem::path src(srcPath);
                std::wstring ext = src.extension().wstring();

                auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
                               std::chrono::system_clock::now().time_since_epoch())
                               .count();
                int rnd = rand() % 10000;
                std::wstring filename = L"img_" + std::to_wstring(now) + L"_" + std::to_wstring(rnd) + ext;

                std::filesystem::path destDir;
                if (!projectImagesDir.empty()) {
                  destDir = std::filesystem::path(projectImagesDir);
                } else {
                  WCHAR localAppData[MAX_PATH];
                  if (GetEnvironmentVariableW(L"LOCALAPPDATA", localAppData, MAX_PATH) > 0) {
                    destDir = std::filesystem::path(localAppData) / L"Apollonography" / L"images" / L"pending";
                  } else {
                    destDir = std::filesystem::path(L".") / L"images" / L"pending";
                  }
                }

                std::filesystem::create_directories(destDir);
                std::filesystem::path destPath = destDir / filename;

                std::filesystem::copy_file(
                    src,
                    destPath,
                    std::filesystem::copy_options::overwrite_existing);

                std::string mime = "image/png";
                std::wstring lowerExt = ext;
                for (auto &c : lowerExt) c = towlower(c);
                if (lowerExt == L".jpg" || lowerExt == L".jpeg") mime = "image/jpeg";
                else if (lowerExt == L".webp") mime = "image/webp";
                else if (lowerExt == L".gif") mime = "image/gif";

                std::string base64Str = "";
                std::ifstream f(destPath, std::ios::binary);
                if (f) {
                  std::vector<unsigned char> buf(
                      (std::istreambuf_iterator<char>(f)),
                      std::istreambuf_iterator<char>());
                  
                  static const char* tbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                  base64Str.reserve(((buf.size() + 2) / 3) * 4);
                  for (size_t i = 0; i < buf.size(); i += 3) {
                    uint32_t b = (static_cast<uint32_t>(buf[i]) << 16) |
                                 (static_cast<uint32_t>(i + 1 < buf.size() ? buf[i + 1] : 0) << 8) |
                                 static_cast<uint32_t>(i + 2 < buf.size() ? buf[i + 2] : 0);
                    base64Str.push_back(tbl[(b >> 18) & 0x3F]);
                    base64Str.push_back(tbl[(b >> 12) & 0x3F]);
                    base64Str.push_back(i + 1 < buf.size() ? tbl[(b >> 6) & 0x3F] : '=');
                    base64Str.push_back(i + 2 < buf.size() ? tbl[b & 0x3F] : '=');
                  }
                  base64Str = "data:" + mime + ";base64," + base64Str;
                }

                std::wstring jsonResult = L"{\"destPath\":\"";
                for (wchar_t c : destPath.wstring()) {
                  if (c == L'\\') jsonResult += L"\\\\";
                  else if (c == L'"') jsonResult += L"\\\"";
                  else jsonResult += c;
                }
                jsonResult += L"\",\"base64\":\"";
                for (char c : base64Str) {
                  jsonResult += static_cast<wchar_t>(c);
                }
                jsonResult += L"\"}";

                if (coInit) CoUninitialize();
                promise.Resolve(jsonResult);
                return;
              } catch (...) {
                if (coInit) CoUninitialize();
                promise.Resolve(srcPath);
                return;
              }
            }
            pItem->Release();
          }
        }
        pFileOpen->Release();
      }

      if (coInit) CoUninitialize();
      promise.Resolve(L"");
    }).detach();
  }
};

} // namespace ApollonographyModules
