import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

function normalizeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function resolveExistingPath(...candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates.find(Boolean);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, "utf8") === content) {
    return false;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return true;
}

function copyFileIfChanged(fromPath, toPath) {
  if (
    existsSync(fromPath) &&
    existsSync(toPath) &&
    readFileSync(fromPath).equals(readFileSync(toPath))
  ) {
    return false;
  }

  mkdirSync(path.dirname(toPath), { recursive: true });
  copyFileSync(fromPath, toPath);
  return true;
}

function findMainActivity(androidDir, packageName) {
  const packagePath = packageName.replace(/\./g, "/");
  const expected = path.join(
    androidDir,
    "app",
    "src",
    "main",
    "java",
    packagePath,
    "MainActivity.kt",
  );

  if (existsSync(expected)) {
    return expected;
  }

  const javaRoot = path.join(androidDir, "app", "src", "main", "java");
  const matches = [];

  function walk(dir) {
    if (!existsSync(dir)) {
      return;
    }

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.name === "MainActivity.kt") {
        matches.push(entryPath);
      }
    }
  }

  walk(javaRoot);

  if (matches.length === 1) {
    return matches[0];
  }

  throw new Error(`无法定位 Android MainActivity.kt: ${javaRoot}`);
}

function patchAndroidManifest(manifestPath) {
  let source = readFileSync(manifestPath, "utf8");

  const permissions = [
    '<uses-permission android:name="android.permission.CAMERA" />',
    '<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
    '<uses-feature android:name="android.hardware.camera" android:required="false" />',
    '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
  ];

  for (const permission of permissions) {
    if (!source.includes(permission)) {
      source = source.replace(
        /\s*<application/,
        (match) => `\n    ${permission}\n${match}`,
      );
    }
  }

  if (!source.includes("com.autonavi.minimap")) {
    const queries = `

    <queries>
        <package android:name="com.autonavi.minimap" />
        <package android:name="com.baidu.BaiduMap" />
        <package android:name="com.tencent.map" />
        <package android:name="com.tencent.maplite" />
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="androidamap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="amapuri" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="baidumap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="qqmap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="geo" />
        </intent>
    </queries>`;
    source = source.replace(/\s*<application/, `${queries}\n\n    <application`);
  }

  if (source.includes("</queries>") && !source.includes('android:scheme="androidamap"')) {
    const mapSchemeQueries = `
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="androidamap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="amapuri" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="baidumap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="qqmap" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="geo" />
        </intent>`;
    source = source.replace(/\s*<\/queries>/, `${mapSchemeQueries}\n    </queries>`);
  }

  source = source.replace(
    /<application\b([^>]*)>/,
    (_match, attributes) => {
      let nextAttributes = attributes;
      if (/android:icon=/.test(nextAttributes)) {
        nextAttributes = nextAttributes.replace(
          /android:icon="[^"]*"/,
          'android:icon="@mipmap/rtnn_launcher_icon"',
        );
      } else {
        nextAttributes += ' android:icon="@mipmap/rtnn_launcher_icon"';
      }

      if (/android:roundIcon=/.test(nextAttributes)) {
        nextAttributes = nextAttributes.replace(
          /android:roundIcon="[^"]*"/,
          'android:roundIcon="@mipmap/rtnn_launcher_icon"',
        );
      } else {
        nextAttributes += ' android:roundIcon="@mipmap/rtnn_launcher_icon"';
      }

      return `<application${nextAttributes}>`;
    },
  );

  if (!source.includes("androidx.core.content.FileProvider")) {
    const provider = `

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>`;
    source = source.replace(/\s*<\/application>/, `${provider}\n    </application>`);
  }

  source = source.replace(
    /android:configChanges="([^"]*)"/,
    (_match, value) => {
      const parts = new Set(
        String(value)
          .split("|")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      parts.add("uiMode");
      return `android:configChanges="${[...parts].join("|")}"`;
    },
  );

  writeFileIfChanged(manifestPath, source);
}

function patchGradle(buildGradlePath) {
  let source = readFileSync(buildGradlePath, "utf8");
  const dependencies = [
    'implementation("androidx.activity:activity-ktx:1.10.1")',
    'implementation("androidx.core:core-ktx:1.15.0")',
  ];

  for (const dependency of dependencies) {
    if (!source.includes(dependency)) {
      source = source.replace(/\ndependencies\s*\{\s*/, (match) => `${match}    ${dependency}\n`);
    }
  }

  writeFileIfChanged(buildGradlePath, source);
}

function parsePositiveInt(value) {
  const normalized = normalizeString(value);
  if (!/^[0-9]+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function resolveAndroidVersionCode() {
  return (
    parsePositiveInt(process.env.CLIENT_ANDROID_VERSION_CODE) ??
    parsePositiveInt(process.env.GITHUB_RUN_NUMBER)
  );
}

function patchAndroidVersionCode(buildGradlePath) {
  const versionCode = resolveAndroidVersionCode();
  if (!versionCode || !existsSync(buildGradlePath)) {
    return;
  }

  const source = readFileSync(buildGradlePath, "utf8");
  const nextSource = source.replace(
    /versionCode\s*=\s*\d+/,
    `versionCode = ${versionCode}`,
  );

  if (nextSource !== source) {
    writeFileIfChanged(buildGradlePath, nextSource);
  }
}

function patchLauncherIcon(androidDir, iconPath) {
  if (!existsSync(iconPath)) {
    throw new Error(`缺少 Android launcher 图标源文件: ${iconPath}`);
  }

  const mainResDir = path.join(androidDir, "app", "src", "main", "res");
  const mipmapDirs = [
    "mipmap-mdpi",
    "mipmap-hdpi",
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi",
  ];

  copyFileIfChanged(
    iconPath,
    path.join(
      mainResDir,
      "drawable",
      "rtnn_launcher_icon.png",
    ),
  );

  for (const mipmapDir of mipmapDirs) {
    copyFileIfChanged(
      iconPath,
      path.join(mainResDir, mipmapDir, "rtnn_launcher_icon.png"),
    );
    copyFileIfChanged(
      iconPath,
      path.join(mainResDir, mipmapDir, "rtnn_launcher_icon_foreground.png"),
    );
  }

  writeFileIfChanged(
    path.join(mainResDir, "mipmap-anydpi-v26", "rtnn_launcher_icon.xml"),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
      '    <background android:drawable="@color/rtnn_launcher_icon_background" />',
      '    <foreground android:drawable="@mipmap/rtnn_launcher_icon_foreground" />',
      "</adaptive-icon>",
      "",
    ].join("\n"),
  );
  writeFileIfChanged(
    path.join(mainResDir, "values", "rtnn_launcher_icon_colors.xml"),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<resources>",
      '    <color name="rtnn_launcher_icon_background">#000000</color>',
      "</resources>",
      "",
    ].join("\n"),
  );
}

function buildMainActivitySource(packageName) {
  return `package ${packageName}

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import org.json.JSONObject

class MainActivity : TauriActivity() {
  private var currentKeyboardHeight = 0
  private var filePathCallback: ValueCallback<Array<Uri>>? = null
  private var cameraPhotoUri: Uri? = null
  private var pendingFileChooser = false
  private var currentTheme = "light"
  private var currentThemeMode = "system"

  private val cameraPermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
  ) { granted ->
    if (pendingFileChooser) {
      pendingFileChooser = false
      if (granted) {
        launchCameraCapture()
      } else {
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        notifyFilePickerClosed("camera-permission-denied")
      }
    }
  }

  private val fileChooserLauncher = registerForActivityResult(
    ActivityResultContracts.StartActivityForResult()
  ) { result ->
    val callback = filePathCallback
    filePathCallback = null

    if (result.resultCode == Activity.RESULT_OK) {
      val clipData = result.data?.clipData
      val dataUri = result.data?.data
      val uris = when {
        clipData != null -> Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
        dataUri != null -> arrayOf(dataUri)
        cameraPhotoUri != null -> arrayOf(cameraPhotoUri!!)
        else -> null
      }
      callback?.onReceiveValue(uris)
    } else {
      callback?.onReceiveValue(null)
      notifyFilePickerClosed("cancelled")
    }

    cameraPhotoUri = null
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
      window.isStatusBarContrastEnforced = false
    }

    currentTheme = resolveSystemTheme()
    applySystemBars(currentTheme)
    setupKeyboardListener()
    setupWebViewWithRetry()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    if (currentThemeMode == "system") {
      currentTheme = resolveSystemTheme()
      applySystemBars(currentTheme)
      notifyNativeThemeChanged()
    }
  }

  private fun setupWebViewWithRetry(attempt: Int = 0) {
    runOnUiThread {
      val webView = findWebView()
      if (webView != null) {
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.addJavascriptInterface(ThemeBridge(), "AndroidTheme")
        webView.addJavascriptInterface(MapBridge(), "AndroidMap")
        webView.webChromeClient = object : WebChromeClient() {
          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            if (this@MainActivity.filePathCallback != null) {
              this@MainActivity.filePathCallback?.onReceiveValue(null)
              notifyFilePickerClosed("file-picker-replaced")
            }
            this@MainActivity.filePathCallback = filePathCallback
            val wantsCamera = fileChooserParams?.isCaptureEnabled == true

            val hasCameraPermission = ContextCompat.checkSelfPermission(
              this@MainActivity,
              Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED

            if (!wantsCamera) {
              launchImagePicker()
            } else if (hasCameraPermission) {
              launchCameraCapture()
            } else {
              pendingFileChooser = true
              cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
            }

            return true
          }
        }
        notifyAndroidBridgeReady()
      } else if (attempt < 30) {
        window.decorView.postDelayed({ setupWebViewWithRetry(attempt + 1) }, 50)
      }
    }
  }

  private fun launchImagePicker() {
    try {
      val galleryIntent = Intent(Intent.ACTION_GET_CONTENT).apply {
        type = "image/*"
        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
      }
      val chooserIntent = Intent.createChooser(galleryIntent, "选择图片")

      fileChooserLauncher.launch(chooserIntent)
    } catch (error: Exception) {
      android.util.Log.e("MainActivity", "Image picker failed", error)
      filePathCallback?.onReceiveValue(null)
      filePathCallback = null
      notifyFilePickerClosed("image-picker-failed")
    }
  }

  private fun launchCameraCapture() {
    try {
      val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
      cameraPhotoUri = createImageUri()
      cameraPhotoUri?.let { cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, it) }
      fileChooserLauncher.launch(cameraIntent)
    } catch (error: Exception) {
      android.util.Log.e("MainActivity", "Camera capture failed", error)
      filePathCallback?.onReceiveValue(null)
      filePathCallback = null
      cameraPhotoUri = null
      notifyFilePickerClosed("camera-capture-failed")
    }
  }

  private fun createImageUri(): Uri? {
    return try {
      val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
      val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
      val imageFile = File.createTempFile("JPEG_\${timeStamp}_", ".jpg", storageDir)
      FileProvider.getUriForFile(this, "\${packageName}.fileprovider", imageFile)
    } catch (error: Exception) {
      android.util.Log.e("MainActivity", "Failed to create image Uri", error)
      null
    }
  }

  private fun findWebView(): WebView? {
    return findWebView(window.decorView)
  }

  inner class MapBridge {
    @JavascriptInterface
    fun isAppInstalled(packageName: String): Boolean {
      return detectAppInstalled(packageName).optBoolean("installed", false)
    }

    @JavascriptInterface
    fun checkAppInstalled(packageName: String): String {
      return detectAppInstalled(packageName).toString()
    }

    private fun detectAppInstalled(packageName: String): JSONObject {
      val result = JSONObject()
      result.put("packageName", packageName)

      if (packageName.isBlank()) {
        result.put("ok", true)
        result.put("installed", JSONObject.NULL)
        result.put("status", "unknown")
        result.put("reason", "missing-package-name")
        return result
      }

      val packageNames = packageName.split("|").map { it.trim() }.filter { it.isNotEmpty() }
      for (candidatePackageName in packageNames) {
        try {
          val launchIntent = packageManager.getLaunchIntentForPackage(candidatePackageName)
          if (launchIntent != null) {
            result.put("ok", true)
            result.put("installed", true)
            result.put("status", "installed")
            result.put("packageName", candidatePackageName)
            result.put("message", "installed-by-launch-intent")
            return result
          }
        } catch (error: Exception) {
          result.put("launchIntentError", error.javaClass.simpleName)
        }
      }

      var lastPackageVisibilityError: String? = null
      for (candidatePackageName in packageNames) {
        try {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            packageManager.getPackageInfo(
              candidatePackageName,
              PackageManager.PackageInfoFlags.of(0)
            )
          } else {
            @Suppress("DEPRECATION")
            packageManager.getPackageInfo(candidatePackageName, 0)
          }
          result.put("ok", true)
          result.put("installed", true)
          result.put("status", "installed")
          result.put("packageName", candidatePackageName)
          result.put("message", "installed-by-package-info")
          return result
        } catch (error: PackageManager.NameNotFoundException) {
          lastPackageVisibilityError = "map-app-not-installed-or-not-visible"
        } catch (error: Exception) {
          result.put("ok", true)
          result.put("installed", JSONObject.NULL)
          result.put("status", "unknown")
          result.put("reason", error.javaClass.simpleName)
          return result
        }
      }

      result.put("ok", false)
      result.put("installed", false)
      result.put("status", "not-installed")
      result.put("reason", lastPackageVisibilityError ?: "map-app-not-installed")
      return result
    }
  }

  inner class ThemeBridge {
    @JavascriptInterface
    fun setTheme(theme: String, mode: String) {
      val normalizedTheme = if (theme == "dark") "dark" else "light"
      val normalizedMode = if (mode == "light" || mode == "dark" || mode == "system") mode else "system"

      runOnUiThread {
        currentTheme = normalizedTheme
        currentThemeMode = normalizedMode
        applySystemBars(normalizedTheme)
      }
    }

    @JavascriptInterface
    fun getSystemTheme(): String {
      return resolveSystemTheme()
    }
  }

  private fun findWebView(view: View): WebView? {
    if (view is WebView) {
      return view
    }

    if (view is android.view.ViewGroup) {
      for (i in 0 until view.childCount) {
        val webView = findWebView(view.getChildAt(i))
        if (webView != null) return webView
      }
    }

    return null
  }

  private fun setupKeyboardListener() {
    ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { view, insets ->
      val imeInsets = insets.getInsets(WindowInsetsCompat.Type.ime())
      val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
      val keyboardHeight = if (imeInsets.bottom > navBarInsets.bottom) {
        imeInsets.bottom - navBarInsets.bottom
      } else {
        0
      }

      if (keyboardHeight != currentKeyboardHeight) {
        currentKeyboardHeight = keyboardHeight
        notifyKeyboardChange(keyboardHeight)
      }

      ViewCompat.onApplyWindowInsets(view, insets)
    }
  }

  private fun resolveSystemTheme(): String {
    val nightMode = resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
    return if (nightMode == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
  }

  private fun applySystemBars(theme: String) {
    val dark = theme == "dark"
    val background = if (dark) android.graphics.Color.rgb(23, 23, 23) else android.graphics.Color.WHITE

    window.statusBarColor = background
    window.navigationBarColor = background

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val controller = window.insetsController
      if (controller != null) {
        var appearance = 0
        if (!dark) {
          appearance = appearance or WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
          appearance = appearance or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        }
        controller.setSystemBarsAppearance(
          appearance,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
        )
      }
    } else {
      @Suppress("DEPRECATION")
      var flags = window.decorView.systemUiVisibility
      @Suppress("DEPRECATION")
      var lightFlags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        @Suppress("DEPRECATION")
        lightFlags = lightFlags or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
      }
      @Suppress("DEPRECATION")
      flags = if (!dark) {
        flags or lightFlags
      } else {
        flags and lightFlags.inv()
      }
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility = flags
    }
  }

  private fun notifyKeyboardChange(heightPx: Int) {
    val webView = findWebView() ?: return
    val density = resources.displayMetrics.density
    val heightDp = (heightPx / density).toInt()

    webView.evaluateJavascript(
      """
      (function() {
        document.documentElement.style.setProperty('--rtnn-keyboard-height', '\${heightDp}px');
        document.documentElement.style.setProperty('--skb', '\${heightDp}px');
        window.__RTNN_KEYBOARD_HEIGHT__ = \${heightDp};
        if (window.__RTNN_ON_KEYBOARD_CHANGE__) {
          window.__RTNN_ON_KEYBOARD_CHANGE__(\${heightDp});
        }
      })();
      """.trimIndent(),
      null
    )
  }

  private fun notifyFilePickerClosed(reason: String) {
    val webView = findWebView() ?: return
    webView.evaluateJavascript(
      """
      (function() {
        var detail = { reason: '\${reason}' };
        try {
          window.dispatchEvent(new CustomEvent('rtnn:native-file-picker-closed', { detail: detail }));
        } catch (error) {
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('rtnn:native-file-picker-closed', false, false, detail);
          window.dispatchEvent(event);
        }
      })();
      """.trimIndent(),
      null
    )
  }

  private fun notifyAndroidBridgeReady() {
    val webView = findWebView() ?: return
    webView.evaluateJavascript(
      """
      (function() {
        window.__RTNN_SYSTEM_THEME__ = '\${resolveSystemTheme()}';
        window.__ANDROID_SYSTEM_THEME__ = '\${resolveSystemTheme()}';
        try {
          window.dispatchEvent(new CustomEvent('rtnn:android-map-ready'));
        } catch (error) {
          var event = document.createEvent('Event');
          event.initEvent('rtnn:android-map-ready', false, false);
          window.dispatchEvent(event);
        }
        try {
          window.dispatchEvent(new CustomEvent('rtnn:native-theme-change'));
        } catch (error) {
          var themeEvent = document.createEvent('Event');
          themeEvent.initEvent('rtnn:native-theme-change', false, false);
          window.dispatchEvent(themeEvent);
        }
      })();
      """.trimIndent(),
      null
    )
  }

  private fun notifyNativeThemeChanged() {
    val webView = findWebView() ?: return
    webView.evaluateJavascript(
      """
      (function() {
        window.__RTNN_SYSTEM_THEME__ = '\${resolveSystemTheme()}';
        window.__ANDROID_SYSTEM_THEME__ = '\${resolveSystemTheme()}';
        try {
          window.dispatchEvent(new CustomEvent('rtnn:native-theme-change'));
        } catch (error) {
          var event = document.createEvent('Event');
          event.initEvent('rtnn:native-theme-change', false, false);
          window.dispatchEvent(event);
        }
      })();
      """.trimIndent(),
      null
    )
  }
}
`;
}

function main() {
  const rawClientDir = normalizeString(
    process.env.CLIENT_DIR,
    "",
  );
  const clientDir = resolveExistingPath(
    rawClientDir,
    rawClientDir ? path.resolve(process.cwd(), rawClientDir) : "",
    path.resolve(process.cwd(), "clients", "app-tauri"),
    process.cwd(),
  );
  const srcTauriDir = path.join(clientDir, "src-tauri");
  const rawAndroidDir = normalizeString(
    process.env.ANDROID_PROJECT_DIR,
    "",
  );
  const androidDir = resolveExistingPath(
    rawAndroidDir,
    rawAndroidDir ? path.resolve(process.cwd(), rawAndroidDir) : "",
    path.join(srcTauriDir, "gen", "android"),
  );

  if (!existsSync(androidDir)) {
    console.log(`[app-tauri-android] skip missing generated project: ${androidDir}`);
    return;
  }

  const tauriConfig = readJson(path.join(srcTauriDir, "tauri.conf.json"));
  const packageName = normalizeString(tauriConfig.identifier);
  if (!packageName) {
    throw new Error("clients/app-tauri/src-tauri/tauri.conf.json 缺少 identifier");
  }

  const mainActivityPath = findMainActivity(androidDir, packageName);
  const manifestPath = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
  const gradlePath = path.join(androidDir, "app", "build.gradle.kts");
  const filePathsPath = path.join(androidDir, "app", "src", "main", "res", "xml", "file_paths.xml");
  const iconPath = path.join(srcTauriDir, "icons", "icon.png");

  writeFileIfChanged(mainActivityPath, buildMainActivitySource(packageName));
  patchLauncherIcon(androidDir, iconPath);
  patchAndroidManifest(manifestPath);
  patchGradle(gradlePath);
  patchAndroidVersionCode(gradlePath);
  writeFileIfChanged(
    filePathsPath,
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<paths xmlns:android="http://schemas.android.com/apk/res/android">',
      '    <external-files-path name="rtnn_images" path="Pictures" />',
      '    <cache-path name="rtnn_cache" path="." />',
      "</paths>",
      "",
    ].join("\n"),
  );

  console.log(`[app-tauri-android] patched ${androidDir}`);
}

main();
