import {
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

function writeJsonIfChanged(filePath, value) {
  return writeFileIfChanged(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, "utf8") === content) {
    return false;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return true;
}

function writeBinaryFileIfChanged(filePath, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

  if (existsSync(filePath) && readFileSync(filePath).equals(buffer)) {
    return false;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
  return true;
}

function buildAdaptiveForegroundIcon(sourceIcon) {
  // The checked-in icon is already the centered RTNN adaptive foreground.
  // Keeping this seam makes generated Android resources explicit without
  // forcing CI to depend on image tooling.
  return sourceIcon;
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
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
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
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
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

  if (source.includes("</queries>") && !source.includes('android.intent.category.LAUNCHER')) {
    const launcherQuery = `
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>`;
    source = source.replace(/\s*<\/queries>/, `${launcherQuery}\n    </queries>`);
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
    'implementation("androidx.core:core:1.15.0")',
    'implementation("com.google.mlkit:barcode-scanning:17.3.0")',
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

function patchTauriAndroidVersionCode(configPath, tauriConfig) {
  const versionCode = resolveAndroidVersionCode();
  if (!versionCode) {
    return;
  }

  const nextConfig = {
    ...tauriConfig,
    bundle: {
      ...(tauriConfig.bundle ?? {}),
      android: {
        ...(tauriConfig.bundle?.android ?? {}),
        versionCode,
      },
    },
  };

  writeJsonIfChanged(configPath, nextConfig);
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

  const sourceIcon = readFileSync(iconPath);
  const foregroundIcon = buildAdaptiveForegroundIcon(sourceIcon);

  writeBinaryFileIfChanged(
    path.join(mainResDir, "drawable", "rtnn_launcher_icon.png"),
    sourceIcon,
  );
  writeBinaryFileIfChanged(
    path.join(
      mainResDir,
      "drawable",
      "rtnn_launcher_icon_foreground.png",
    ),
    foregroundIcon,
  );

  for (const mipmapDir of mipmapDirs) {
    writeBinaryFileIfChanged(
      path.join(mainResDir, mipmapDir, "rtnn_launcher_icon.png"),
      sourceIcon,
    );
    writeBinaryFileIfChanged(
      path.join(mainResDir, mipmapDir, "rtnn_launcher_icon_foreground.png"),
      foregroundIcon,
    );
  }

  writeFileIfChanged(
    path.join(mainResDir, "mipmap-anydpi-v26", "rtnn_launcher_icon.xml"),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">',
      '    <background android:drawable="@color/rtnn_launcher_icon_background" />',
      '    <foreground android:drawable="@drawable/rtnn_launcher_icon_foreground" />',
      "</adaptive-icon>",
      "",
    ].join("\n"),
  );
  writeFileIfChanged(
    path.join(mainResDir, "values", "rtnn_launcher_icon_colors.xml"),
    [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<resources>",
      '    <color name="rtnn_launcher_icon_background">#F6F6F6</color>',
      "</resources>",
      "",
    ].join("\n"),
  );
}

function buildMainActivitySource(packageName) {
  return `package ${packageName}

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.io.File
import java.io.InputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import org.json.JSONObject

class MainActivity : TauriActivity() {
  private var currentKeyboardHeight = 0
  private var filePathCallback: ValueCallback<Array<Uri>>? = null
  private var cameraPhotoUri: Uri? = null
  private var nativeMediaMode: String? = null
  private var nativeMediaReadAsDataUrl = true
  private var nativeMediaMaxFiles = 3
  @Volatile
  private var nativeMediaResultJson: String? = null
  private var pendingFileChooser = false
  private var pendingPermissionKind: String? = null
  private var pendingWebChromePermissionRequest: PermissionRequest? = null
  @Volatile
  private var nativePermissionResultJson: String? = null
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
    val mode = nativeMediaMode
    nativeMediaMode = null

    if (result.resultCode == Activity.RESULT_OK) {
      val clipData = result.data?.clipData
      val dataUri = result.data?.data
      val uris = when {
        clipData != null -> Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
        dataUri != null -> arrayOf(dataUri)
        cameraPhotoUri != null -> arrayOf(cameraPhotoUri!!)
        else -> null
      }
      completeNativeMediaResult(mode, uris, null)
      callback?.onReceiveValue(uris)
    } else {
      completeNativeMediaResult(mode, null, "file-picker-cancelled")
      callback?.onReceiveValue(null)
      notifyFilePickerClosed("cancelled")
    }

    cameraPhotoUri = null
  }

  private val nativePermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
  ) { granted ->
    val kind = pendingPermissionKind ?: "unknown"
    pendingPermissionKind = null
    nativePermissionResultJson = permissionResult(kind, granted, true, false).toString()
    completeWebChromePermissionRequest(kind, granted)
    notifyPermissionChanged(kind, granted)
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
        webView.addJavascriptInterface(PermissionBridge(), "AndroidPermission")
        webView.addJavascriptInterface(MediaBridge(), "AndroidMedia")
        webView.addJavascriptInterface(BarcodeBridge(), "AndroidBarcode")
        webView.addJavascriptInterface(NotificationBridge(), "AndroidNotification")
        webView.addJavascriptInterface(DiagnosticsBridge(), "AndroidDiagnostics")
        webView.webChromeClient = object : WebChromeClient() {
          override fun onPermissionRequest(request: PermissionRequest?) {
            val resources = request?.resources ?: emptyArray()
            val needsCamera = resources.any { it == PermissionRequest.RESOURCE_VIDEO_CAPTURE }

            if (!needsCamera) {
              request?.deny()
              return
            }

            if (isPermissionGranted("camera")) {
              request?.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
              return
            }

            pendingWebChromePermissionRequest?.deny()
            pendingWebChromePermissionRequest = request
            pendingPermissionKind = "camera"
            nativePermissionLauncher.launch(Manifest.permission.CAMERA)
          }

          override fun onPermissionRequestCanceled(request: PermissionRequest?) {
            if (pendingWebChromePermissionRequest == request) {
              pendingWebChromePermissionRequest = null
              pendingPermissionKind = null
            }
          }

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
      failNativeMedia("image-picker-failed")
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
      failNativeMedia("camera-capture-failed")
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

  private fun completeNativeMediaResult(mode: String?, uris: Array<Uri>?, reason: String?) {
    if (mode != null) {
      nativeMediaResultJson = buildMediaResult(uris, reason)
    }
  }

  private fun failNativeMedia(reason: String) {
    completeNativeMediaResult(nativeMediaMode, null, reason)
    nativeMediaMode = null
  }

  private fun parseMediaOptions(optionsJson: String?) {
    try {
      val options = if (optionsJson.isNullOrBlank()) JSONObject() else JSONObject(optionsJson)
      nativeMediaReadAsDataUrl = options.optBoolean("readAsDataUrl", true)
      nativeMediaMaxFiles = options.optInt("maxFiles", 3).coerceIn(1, 9)
    } catch (_: Exception) {
      nativeMediaReadAsDataUrl = true
      nativeMediaMaxFiles = 3
    }
  }

  private fun awaitNativeMediaResult(action: () -> Unit): String {
    nativeMediaResultJson = null
    action()

    val deadline = System.currentTimeMillis() + 60_000
    while (nativeMediaResultJson == null && System.currentTimeMillis() < deadline) {
      try {
        Thread.sleep(80)
      } catch (_: InterruptedException) {
        break
      }
    }

    val result = nativeMediaResultJson ?: buildMediaResult(null, "file-picker-timeout")
    nativeMediaResultJson = null
    return result
  }

  private fun awaitNativePermissionResult(kind: String, action: () -> Unit): String {
    nativePermissionResultJson = null
    action()

    val deadline = System.currentTimeMillis() + 30_000
    while (nativePermissionResultJson == null && System.currentTimeMillis() < deadline) {
      try {
        Thread.sleep(80)
      } catch (_: InterruptedException) {
        break
      }
    }

    val result = nativePermissionResultJson ?: permissionResult(
      kind,
      isPermissionGranted(kind),
      true,
      true,
      "permission-request-dispatched"
    ).toString()
    nativePermissionResultJson = null
    return result
  }

  private fun completeWebChromePermissionRequest(kind: String, granted: Boolean) {
    val request = pendingWebChromePermissionRequest ?: return
    pendingWebChromePermissionRequest = null

    runOnUiThread {
      if (kind == "camera" && granted) {
        request.grant(arrayOf(PermissionRequest.RESOURCE_VIDEO_CAPTURE))
      } else {
        request.deny()
      }
    }
  }

  private fun buildMediaResult(uris: Array<Uri>?, reason: String?): String {
    val result = JSONObject()
    val files = org.json.JSONArray()
    val limitedUris = uris?.take(nativeMediaMaxFiles) ?: emptyList()

    for ((index, uri) in limitedUris.withIndex()) {
      val file = JSONObject()
      file.put("name", queryDisplayName(uri) ?: "image-\${index + 1}.jpg")
      file.put("type", contentResolver.getType(uri) ?: "image/jpeg")
      file.put("size", querySize(uri) ?: 0)
      if (nativeMediaReadAsDataUrl) {
        file.put("dataUrl", uriToDataUrl(uri, file.optString("type", "image/jpeg")))
      }
      files.put(file)
    }

    result.put("ok", files.length() > 0)
    result.put("files", files)
    if (reason != null) result.put("reason", reason)
    return result.toString()
  }

  private fun queryDisplayName(uri: Uri): String? {
    return try {
      contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)
        ?.use { cursor ->
          if (cursor.moveToFirst()) cursor.getString(0) else null
        }
    } catch (_: Exception) {
      uri.lastPathSegment
    }
  }

  private fun querySize(uri: Uri): Long? {
    return try {
      contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.SIZE), null, null, null)
        ?.use { cursor ->
          if (cursor.moveToFirst()) cursor.getLong(0) else null
        }
    } catch (_: Exception) {
      null
    }
  }

  private fun uriToDataUrl(uri: Uri, mimeType: String): String? {
    return try {
      val stream: InputStream = contentResolver.openInputStream(uri) ?: return null
      val bytes = stream.use { it.readBytes() }
      "data:\${mimeType};base64,\${Base64.encodeToString(bytes, Base64.NO_WRAP)}"
    } catch (error: Exception) {
      android.util.Log.e("MainActivity", "Failed to read selected image", error)
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

    @JavascriptInterface
    fun openNavigation(appType: String, url: String): String {
      val result = JSONObject()
      result.put("appType", appType)

      if (url.isBlank()) {
        result.put("ok", false)
        result.put("reason", "missing-map-target")
        return result.toString()
      }

      return try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val preferredPackage = findInstalledMapPackage(appType)

        if (preferredPackage != null) {
          intent.setPackage(preferredPackage)
        }

        val canOpen = canResolveIntent(intent)
        if (!canOpen && preferredPackage != null) {
          intent.setPackage(null)
        }

        if (!canResolveIntent(intent)) {
          result.put("ok", false)
          result.put("reason", "native-map-no-handler")
          return result.toString()
        }

        startActivity(intent)
        result.put("ok", true)
        result.put("message", "opened-native-map")
        result.toString()
      } catch (error: Exception) {
        result.put("ok", false)
        result.put("reason", error.javaClass.simpleName)
        result.toString()
      }
    }

    private fun canResolveIntent(intent: Intent): Boolean {
      return try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          packageManager.queryIntentActivities(
            intent,
            PackageManager.ResolveInfoFlags.of(0)
          ).isNotEmpty()
        } else {
          @Suppress("DEPRECATION")
          packageManager.queryIntentActivities(intent, 0).isNotEmpty()
        }
      } catch (_: Exception) {
        false
      }
    }

    private fun findInstalledMapPackage(appType: String): String? {
      val packages = when (appType) {
        "amap" -> listOf("com.autonavi.minimap")
        "baidu" -> listOf("com.baidu.BaiduMap")
        "tencent" -> listOf("com.tencent.map", "com.tencent.maplite")
        else -> emptyList()
      }

      return packages.firstOrNull { detectAppInstalled(it).optBoolean("installed", false) }
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
          result.put("packageInfoError", error.javaClass.simpleName)
        }
      }

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

      result.put("ok", false)
      result.put("installed", false)
      result.put("status", "not-installed")
      result.put("reason", lastPackageVisibilityError ?: "map-app-not-installed")
      return result
    }
  }

  inner class PermissionBridge {
    @JavascriptInterface
    fun checkPermission(kind: String): String {
      return permissionResult(kind, isPermissionGranted(kind), false, false).toString()
    }

    @JavascriptInterface
    fun requestPermission(kind: String, purpose: String?): String {
      val normalizedKind = if (kind == "barcode") "camera" else kind
      if (isPermissionGranted(normalizedKind)) {
        return permissionResult(normalizedKind, true, false, false).toString()
      }

      val permission = permissionNameForKind(normalizedKind)
      if (permission == null) {
        return permissionResult(normalizedKind, false, true, false, "permission-unavailable").toString()
      }

      return awaitNativePermissionResult(normalizedKind) {
        runOnUiThread {
          pendingPermissionKind = normalizedKind
          nativePermissionLauncher.launch(permission)
        }
      }
    }
  }

  inner class MediaBridge {
    @JavascriptInterface
    fun pickImages(optionsJson: String?): String {
      parseMediaOptions(optionsJson)
      nativeMediaMode = "album"
      return awaitNativeMediaResult {
        runOnUiThread { launchImagePicker() }
      }
    }

    @JavascriptInterface
    fun captureImage(optionsJson: String?): String {
      parseMediaOptions(optionsJson)
      if (!isPermissionGranted("camera")) {
        val requested = PermissionBridge().requestPermission("camera", "capture-image")
        val permission = JSONObject(requested)
        if (!permission.optBoolean("ok", false) || permission.optString("status") != "granted") {
          return permissionDeniedMediaResult(permission.optString("reason", "camera-permission-denied"))
        }
      }

      nativeMediaMode = "camera"
      return awaitNativeMediaResult {
        runOnUiThread { launchCameraCapture() }
      }
    }

    private fun permissionDeniedMediaResult(reason: String): String {
      val result = JSONObject()
      result.put("ok", false)
      result.put("reason", reason)
      result.put("files", org.json.JSONArray())
      return result.toString()
    }
  }

  inner class BarcodeBridge {
    @JavascriptInterface
    fun scanBarcode(optionsJson: String?): String {
      parseMediaOptions(optionsJson)
      val options = try {
        if (optionsJson.isNullOrBlank()) JSONObject() else JSONObject(optionsJson)
      } catch (_: Exception) {
        JSONObject()
      }
      val source = options.optString("source", "camera")
      val fromImage = source == "image"

      if (!fromImage && !isPermissionGranted("camera")) {
        val requested = PermissionBridge().requestPermission("camera", "scan-barcode")
        val permission = JSONObject(requested)
        if (!permission.optBoolean("ok", false) || permission.optString("status") != "granted") {
          return barcodeError(permission.optString("reason", "camera-permission-denied"))
        }
      }

      nativeMediaMode = if (fromImage) "barcode-image" else "barcode-camera"
      val mediaResult = awaitNativeMediaResult {
        runOnUiThread {
          if (fromImage) {
            launchImagePicker()
          } else {
            launchCameraCapture()
          }
        }
      }

      val result = JSONObject(mediaResult)
      if (!result.optBoolean("ok", false)) {
        result.put("codes", org.json.JSONArray())
        return result.toString()
      }

      val files = result.optJSONArray("files")
      val dataUrl = files?.optJSONObject(0)?.optString("dataUrl", "") ?: ""
      val bitmap = dataUrlToBitmap(dataUrl)
      if (bitmap == null) {
        return barcodeError("barcode-image-decoder-unavailable")
      }

      val decoded = decodeBarcode(bitmap)
      bitmap.recycle()
      return decoded
    }

    private fun barcodeError(reason: String): String {
      val result = JSONObject()
      result.put("ok", false)
      result.put("reason", reason)
      result.put("codes", org.json.JSONArray())
      return result.toString()
    }

    private fun dataUrlToBitmap(dataUrl: String): Bitmap? {
      return try {
        val base64 = dataUrl.substringAfter(",", "")
        if (base64.isBlank()) return null
        val bytes = Base64.decode(base64, Base64.DEFAULT)
        android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      } catch (error: Exception) {
        android.util.Log.e("MainActivity", "Failed to decode barcode image", error)
        null
      }
    }

    private fun decodeBarcode(bitmap: Bitmap): String {
      val latch = CountDownLatch(1)
      val output = JSONObject()
      val inputImage = InputImage.fromBitmap(bitmap, 0)
      val scannerOptions = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_ALL_FORMATS)
        .build()

      BarcodeScanning.getClient(scannerOptions)
        .process(inputImage)
        .addOnSuccessListener { barcodes ->
          val codes = org.json.JSONArray()
          for (barcode in barcodes) {
            val rawValue = barcode.rawValue
            if (!rawValue.isNullOrBlank()) {
              val code = JSONObject()
              code.put("rawValue", rawValue)
              code.put("format", barcode.format.toString())
              codes.put(code)
            }
          }
          output.put("ok", codes.length() > 0)
          output.put("codes", codes)
          if (codes.length() == 0) {
            output.put("reason", "barcode-not-found")
          }
        }
        .addOnFailureListener { error ->
          output.put("ok", false)
          output.put("reason", error.javaClass.simpleName)
          output.put("codes", org.json.JSONArray())
        }
        .addOnCompleteListener {
          latch.countDown()
        }

      if (!latch.await(10, TimeUnit.SECONDS)) {
        output.put("ok", false)
        output.put("reason", "barcode-scan-timeout")
        output.put("codes", org.json.JSONArray())
      }

      return output.toString()
    }
  }

  inner class DiagnosticsBridge {
    @JavascriptInterface
    fun getBridgeStatus(): String {
      val result = JSONObject()
      result.put("ok", true)
      result.put("platform", "android")
      result.put("androidSdk", Build.VERSION.SDK_INT)
      result.put("media", true)
      result.put("barcode", true)
      result.put("permission", true)
      result.put("notification", true)
      result.put("map", true)
      result.put("amap", MapBridge().checkAppInstalled("com.autonavi.minimap"))
      result.put("baidu", MapBridge().checkAppInstalled("com.baidu.BaiduMap"))
      result.put("tencent", MapBridge().checkAppInstalled("com.tencent.map|com.tencent.maplite"))
      return result.toString()
    }
  }

  inner class NotificationBridge {
    @JavascriptInterface
    fun showNotification(title: String, body: String?, tag: String?): String {
      val result = JSONObject()

      if (!isPermissionGranted("notification")) {
        result.put("ok", false)
        result.put("reason", "notification-permission-denied")
        return result.toString()
      }

      return try {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "rtnn-default"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          val channel = NotificationChannel(
            channelId,
            "RTNN",
            NotificationManager.IMPORTANCE_DEFAULT
          )
          notificationManager.createNotificationChannel(channel)
        }

        val notification = androidx.core.app.NotificationCompat.Builder(this@MainActivity, channelId)
          .setSmallIcon(android.R.drawable.ic_dialog_info)
          .setContentTitle(title.ifBlank { "RTNN" })
          .setContentText(body ?: "")
          .setAutoCancel(true)
          .setPriority(androidx.core.app.NotificationCompat.PRIORITY_DEFAULT)
          .build()

        notificationManager.notify((tag ?: "rtnn-native").hashCode(), notification)
        result.put("ok", true)
        result.put("message", "notification-dispatched")
        result.toString()
      } catch (error: Exception) {
        result.put("ok", false)
        result.put("reason", error.javaClass.simpleName)
        result.toString()
      }
    }
  }

  private fun permissionNameForKind(kind: String): String? {
    return when (kind) {
      "camera", "barcode" -> Manifest.permission.CAMERA
      "notification" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        Manifest.permission.POST_NOTIFICATIONS
      } else {
        null
      }
      else -> null
    }
  }

  private fun isPermissionGranted(kind: String): Boolean {
    val permission = permissionNameForKind(kind) ?: return kind == "notification" && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
    return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED
  }

  private fun permissionResult(
    kind: String,
    granted: Boolean,
    requested: Boolean,
    dispatched: Boolean,
    reason: String? = null
  ): JSONObject {
    val result = JSONObject()
    result.put("ok", granted || dispatched)
    val normalizedKind = if (kind == "barcode") "camera" else kind
    result.put("kind", normalizedKind)
    result.put(
      "status",
      if (granted) "granted" else if (reason == "permission-unavailable") "unsupported" else if (requested) "denied" else "prompt"
    )
    result.put("requested", requested)
    result.put("canAskAgain", !granted)
    if (dispatched) result.put("dispatched", true)
    if (reason != null) result.put("reason", reason)
    return result
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
          window.dispatchEvent(new CustomEvent('rtnn:android-native-ready'));
        } catch (error) {
          var nativeEvent = document.createEvent('Event');
          nativeEvent.initEvent('rtnn:android-native-ready', false, false);
          window.dispatchEvent(nativeEvent);
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

  private fun notifyPermissionChanged(kind: String, granted: Boolean) {
    val webView = findWebView() ?: return
    webView.evaluateJavascript(
      """
      (function() {
        var detail = { kind: '\${kind}', granted: \${granted} };
        try {
          window.dispatchEvent(new CustomEvent('rtnn:android-permission-change', { detail: detail }));
        } catch (error) {
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('rtnn:android-permission-change', false, false, detail);
          window.dispatchEvent(event);
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

  const tauriConfigPath = path.join(srcTauriDir, "tauri.conf.json");
  const tauriConfig = readJson(tauriConfigPath);
  const packageName = normalizeString(tauriConfig.identifier);
  if (!packageName) {
    throw new Error("clients/app-tauri/src-tauri/tauri.conf.json 缺少 identifier");
  }

  const mainActivityPath = findMainActivity(androidDir, packageName);
  const manifestPath = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
  const gradlePath = path.join(androidDir, "app", "build.gradle.kts");
  const filePathsPath = path.join(androidDir, "app", "src", "main", "res", "xml", "file_paths.xml");
  const iconPath = path.join(srcTauriDir, "icons", "icon.png");

  patchTauriAndroidVersionCode(tauriConfigPath, tauriConfig);
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
