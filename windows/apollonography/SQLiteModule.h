#pragma once

#include "pch.h"
#include "NativeModules.h"
#include "JSValue.h"
#include "sqlite3.h"

#include <string>
#include <vector>
#include <mutex>
#include <thread>
#include <sstream>
#include <filesystem>
#include <shlobj.h>

namespace ApollonographyModules {

REACT_MODULE(SQLiteModule, L"SQLiteModule")
struct SQLiteModule {
private:
  static inline sqlite3 *s_db = nullptr;
  static inline std::mutex s_mutex;
  static inline std::wstring s_currentPath = L"";

  static std::string WideToUtf8(const std::wstring &wstr) {
    if (wstr.empty()) return std::string();
    int sizeNeeded = WideCharToMultiByte(CP_UTF8, 0, wstr.data(), (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string str(sizeNeeded, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.data(), (int)wstr.size(), str.data(), sizeNeeded, NULL, NULL);
    return str;
  }

  static std::wstring Utf8ToWide(const std::string &str) {
    if (str.empty()) return std::wstring();
    int sizeNeeded = MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), NULL, 0);
    std::wstring wstr(sizeNeeded, 0);
    MultiByteToWideChar(CP_UTF8, 0, str.data(), (int)str.size(), wstr.data(), sizeNeeded);
    return wstr;
  }

  static std::wstring EscapeJsonString(const std::wstring &input) {
    std::wstring out;
    out.reserve(input.size() + 16);
    for (wchar_t c : input) {
      switch (c) {
        case L'"':  out += L"\\\""; break;
        case L'\\': out += L"\\\\"; break;
        case L'\b': out += L"\\b";  break;
        case L'\f': out += L"\\f";  break;
        case L'\n': out += L"\\n";  break;
        case L'\r': out += L"\\r";  break;
        case L'\t': out += L"\\t";  break;
        default:
          if (c < 32) {
            wchar_t buf[8];
            swprintf_s(buf, L"\\u%04x", static_cast<unsigned int>(c));
            out += buf;
          } else {
            out += c;
          }
          break;
      }
    }
    return out;
  }

  static std::wstring EscapeJsonString(const std::string &input) {
    return EscapeJsonString(Utf8ToWide(input));
  }

  static std::wstring GetDefaultDatabasePath() {
    PWSTR localAppData = nullptr;
    std::wstring fullPath = L"apollonography.db";
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, NULL, &localAppData))) {
      std::filesystem::path dir(localAppData);
      CoTaskMemFree(localAppData);
      dir = dir / "Apollonography" / "Data";
      std::filesystem::create_directories(dir);
      fullPath = (dir / "apollonography.db").wstring();
    }
    return fullPath;
  }

  static bool EnsureDatabaseOpen(const std::wstring &preferredPath = L"") {
    if (s_db != nullptr) return true;

    std::wstring dbPath = preferredPath.empty() ? GetDefaultDatabasePath() : preferredPath;
    try {
      std::filesystem::path p(dbPath);
      if (p.has_parent_path()) {
        std::filesystem::create_directories(p.parent_path());
      }
    } catch (...) {}

    std::string utf8Path = WideToUtf8(dbPath);
    int rc = sqlite3_open_v2(
      utf8Path.c_str(),
      &s_db,
      SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX,
      NULL
    );

    if (rc != SQLITE_OK) {
      if (s_db) {
        sqlite3_close(s_db);
        s_db = nullptr;
      }
      return false;
    }

    s_currentPath = dbPath;
    char *errMsg = nullptr;
    sqlite3_exec(s_db, "PRAGMA journal_mode = WAL;", NULL, NULL, &errMsg);
    if (errMsg) sqlite3_free(errMsg);
    sqlite3_exec(s_db, "PRAGMA synchronous = NORMAL;", NULL, NULL, &errMsg);
    if (errMsg) sqlite3_free(errMsg);
    sqlite3_exec(s_db, "PRAGMA foreign_keys = ON;", NULL, NULL, &errMsg);
    if (errMsg) sqlite3_free(errMsg);
    sqlite3_busy_timeout(s_db, 5000);
    return true;
  }

public:
  REACT_METHOD(OpenDatabase, L"openDatabase")
  void OpenDatabase(
      std::wstring const &dbPath,
      winrt::Microsoft::ReactNative::ReactPromise<std::wstring> promise) noexcept {
    std::thread([dbPath, promise]() {
      std::lock_guard<std::mutex> lock(s_mutex);
      if (EnsureDatabaseOpen(dbPath)) {
        std::wstring res = L"{\"status\":\"ok\",\"path\":\"" + EscapeJsonString(WideToUtf8(s_currentPath)) + L"\"}";
        promise.Resolve(res);
      } else {
        std::wstring err = L"Failed to open database at: " + dbPath;
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{WideToUtf8(err)});
      }
    }).detach();
  }

  REACT_METHOD(CloseDatabase, L"closeDatabase")
  void CloseDatabase(winrt::Microsoft::ReactNative::ReactPromise<std::wstring> promise) noexcept {
    std::thread([promise]() {
      std::lock_guard<std::mutex> lock(s_mutex);
      if (s_db) {
        sqlite3_close(s_db);
        s_db = nullptr;
        s_currentPath = L"";
      }
      promise.Resolve(L"{\"status\":\"closed\"}");
    }).detach();
  }

  REACT_METHOD(ExecuteSql, L"executeSql")
  void ExecuteSql(
      std::wstring const &sql,
      winrt::Microsoft::ReactNative::JSValueArray const &params,
      winrt::Microsoft::ReactNative::ReactPromise<std::wstring> promise) noexcept {
    // Copy parameters to avoid lifetime issues across thread dispatch
    std::wstring querySql = sql;
    winrt::Microsoft::ReactNative::JSValueArray queryParams = params.Copy();

    std::thread([querySql, queryParams = std::move(queryParams), promise]() {
      try {
        std::lock_guard<std::mutex> lock(s_mutex);
        if (!EnsureDatabaseOpen()) {
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{"Database is not open and could not be initialized."});
        return;
      }

      std::string utf8Sql = WideToUtf8(querySql);
      sqlite3_stmt *stmt = nullptr;
      int rc = sqlite3_prepare_v2(s_db, utf8Sql.c_str(), -1, &stmt, NULL);
      if (rc != SQLITE_OK) {
        std::string err = sqlite3_errmsg(s_db);
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{"SQLite Prepare Error: " + err});
        return;
      }

      // Bind parameters
      for (size_t i = 0; i < queryParams.size(); ++i) {
        int idx = (int)i + 1;
        const auto &param = queryParams[i];
        switch (param.Type()) {
          case winrt::Microsoft::ReactNative::JSValueType::Null:
            sqlite3_bind_null(stmt, idx);
            break;
          case winrt::Microsoft::ReactNative::JSValueType::Boolean:
            sqlite3_bind_int(stmt, idx, param.AsBoolean() ? 1 : 0);
            break;
          case winrt::Microsoft::ReactNative::JSValueType::Int64:
            sqlite3_bind_int64(stmt, idx, param.AsInt64());
            break;
          case winrt::Microsoft::ReactNative::JSValueType::Double:
            sqlite3_bind_double(stmt, idx, param.AsDouble());
            break;
          case winrt::Microsoft::ReactNative::JSValueType::String: {
            std::string strVal = param.AsString();
            sqlite3_bind_text(stmt, idx, strVal.c_str(), (int)strVal.size(), SQLITE_TRANSIENT);
            break;
          }
          default: {
            sqlite3_bind_null(stmt, idx);
            break;
          }
        }
      }

      // Check if statement returns data (SELECT, PRAGMA)
      int colCount = sqlite3_column_count(stmt);
      if (colCount > 0) {
        // Read rows and serialize JSON array
        std::wstring json = L"[";
        bool firstRow = true;

        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
          if (!firstRow) json += L",";
          firstRow = false;
          json += L"{";

          for (int c = 0; c < colCount; ++c) {
            if (c > 0) json += L",";
            const char *rawColName = sqlite3_column_name(stmt, c);
            std::string colName = rawColName ? rawColName : "";
            json += L"\"" + EscapeJsonString(colName) + L"\":";

            int colType = sqlite3_column_type(stmt, c);
            switch (colType) {
              case SQLITE_INTEGER:
                json += std::to_wstring(sqlite3_column_int64(stmt, c));
                break;
              case SQLITE_FLOAT: {
                double d = sqlite3_column_double(stmt, c);
                json += std::to_wstring(d);
                break;
              }
              case SQLITE_TEXT: {
                const unsigned char *text = sqlite3_column_text(stmt, c);
                std::string s = text ? reinterpret_cast<const char*>(text) : "";
                json += L"\"" + EscapeJsonString(s) + L"\"";
                break;
              }
              case SQLITE_NULL:
                json += L"null";
                break;
              case SQLITE_BLOB:
              default:
                json += L"null";
                break;
            }
          }
          json += L"}";
        }
        json += L"]";
        sqlite3_finalize(stmt);
        promise.Resolve(json);
      } else {
        // Mutation or DDL
        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
          std::string err = sqlite3_errmsg(s_db);
          sqlite3_finalize(stmt);
          promise.Reject(winrt::Microsoft::ReactNative::ReactError{"SQLite Step Error: " + err});
          return;
        }

        int rowsAffected = sqlite3_changes(s_db);
        sqlite3_int64 insertId = sqlite3_last_insert_rowid(s_db);
        sqlite3_finalize(stmt);

        std::wstring json = L"{\"rowsAffected\":" + std::to_wstring(rowsAffected) +
                            L",\"insertId\":" + std::to_wstring(insertId) + L"}";
        promise.Resolve(json);
      }
      } catch (const std::exception &ex) {
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{ex.what()});
      } catch (...) {
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{"Unknown SQLite error"});
      }
    }).detach();
  }

  REACT_METHOD(ExecuteBatch, L"executeBatch")
  void ExecuteBatch(
      winrt::Microsoft::ReactNative::JSValueArray const &batch,
      winrt::Microsoft::ReactNative::ReactPromise<std::wstring> promise) noexcept {
    winrt::Microsoft::ReactNative::JSValueArray batchCopy = batch.Copy();

    std::thread([batchCopy = std::move(batchCopy), promise]() {
      std::lock_guard<std::mutex> lock(s_mutex);
      if (!EnsureDatabaseOpen()) {
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{"Database is not open."});
        return;
      }

      char *errMsg = nullptr;
      if (sqlite3_exec(s_db, "BEGIN TRANSACTION;", NULL, NULL, &errMsg) != SQLITE_OK) {
        std::string err = errMsg ? errMsg : "Failed to begin transaction";
        if (errMsg) sqlite3_free(errMsg);
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{err});
        return;
      }

      int executedCount = 0;
      for (size_t i = 0; i < batchCopy.size(); ++i) {
        const auto &item = batchCopy[i];
        if (item.Type() != winrt::Microsoft::ReactNative::JSValueType::Object) continue;

        const auto &obj = item.AsObject();
        auto sqlIt = obj.find("sql");
        if (sqlIt == obj.end()) continue;

        std::string utf8Sql = sqlIt->second.AsString();
        sqlite3_stmt *stmt = nullptr;
        if (sqlite3_prepare_v2(s_db, utf8Sql.c_str(), -1, &stmt, NULL) != SQLITE_OK) {
          std::string err = sqlite3_errmsg(s_db);
          sqlite3_exec(s_db, "ROLLBACK;", NULL, NULL, NULL);
          promise.Reject(winrt::Microsoft::ReactNative::ReactError{"Batch item prepare error: " + err});
          return;
        }

        auto paramsIt = obj.find("params");
        if (paramsIt != obj.end() && paramsIt->second.Type() == winrt::Microsoft::ReactNative::JSValueType::Array) {
          const auto &paramsArr = paramsIt->second.AsArray();
          for (size_t p = 0; p < paramsArr.size(); ++p) {
            int idx = (int)p + 1;
            const auto &param = paramsArr[p];
            switch (param.Type()) {
              case winrt::Microsoft::ReactNative::JSValueType::Null:
                sqlite3_bind_null(stmt, idx);
                break;
              case winrt::Microsoft::ReactNative::JSValueType::Boolean:
                sqlite3_bind_int(stmt, idx, param.AsBoolean() ? 1 : 0);
                break;
              case winrt::Microsoft::ReactNative::JSValueType::Int64:
                sqlite3_bind_int64(stmt, idx, param.AsInt64());
                break;
              case winrt::Microsoft::ReactNative::JSValueType::Double:
                sqlite3_bind_double(stmt, idx, param.AsDouble());
                break;
              case winrt::Microsoft::ReactNative::JSValueType::String: {
                std::string s = param.AsString();
                sqlite3_bind_text(stmt, idx, s.c_str(), (int)s.size(), SQLITE_TRANSIENT);
                break;
              }
              default: {
                std::string s = param.AsString();
                sqlite3_bind_text(stmt, idx, s.c_str(), (int)s.size(), SQLITE_TRANSIENT);
                break;
              }
            }
          }
        }

        if (sqlite3_step(stmt) != SQLITE_DONE) {
          std::string err = sqlite3_errmsg(s_db);
          sqlite3_finalize(stmt);
          sqlite3_exec(s_db, "ROLLBACK;", NULL, NULL, NULL);
          promise.Reject(winrt::Microsoft::ReactNative::ReactError{"Batch item step error: " + err});
          return;
        }

        sqlite3_finalize(stmt);
        executedCount++;
      }

      if (sqlite3_exec(s_db, "COMMIT;", NULL, NULL, &errMsg) != SQLITE_OK) {
        std::string err = errMsg ? errMsg : "Failed to commit transaction";
        if (errMsg) sqlite3_free(errMsg);
        sqlite3_exec(s_db, "ROLLBACK;", NULL, NULL, NULL);
        promise.Reject(winrt::Microsoft::ReactNative::ReactError{err});
        return;
      }

      std::wstring res = L"{\"status\":\"ok\",\"executedCount\":" + std::to_wstring(executedCount) + L"}";
      promise.Resolve(res);
    }).detach();
  }
};

} // namespace ApollonographyModules
