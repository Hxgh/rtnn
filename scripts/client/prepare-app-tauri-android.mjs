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

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, "utf8") === content) {
    return false;
  }

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
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

  for (const permission of [...permissions].reverse()) {
    if (!source.includes(permission)) {
      source = source.replace(
        /<manifest[^>]*>\s*/,
        (match) => `${match}    ${permission}\n`,
      );
    }
  }

  if (!source.includes("com.autonavi.minimap")) {
    const queries = `

    <queries>
        <package android:name="com.autonavi.minimap" />
        <package android:name="com.baidu.BaiduMap" />
        <package android:name="com.tencent.map" />
    </queries>`;
    source = source.replace(/\s*<application/, `${queries}\n\n    <application`);
  }

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

function buildMainActivitySource(packageName) {
  return `package ${packageName}

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
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

class MainActivity : TauriActivity() {
  private var currentKeyboardHeight = 0
  private var filePathCallback: ValueCallback<Array<Uri>>? = null
  private var cameraPhotoUri: Uri? = null
  private var pendingFileChooser = false

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

    setupKeyboardListener()
    setupWebViewWithRetry()
  }

  private fun setupWebViewWithRetry(attempt: Int = 0) {
    runOnUiThread {
      val webView = findWebView()
      if (webView != null) {
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.addJavascriptInterface(MapBridge(), "AndroidMap")
        webView.webChromeClient = object : WebChromeClient() {
          override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?
          ): Boolean {
            this@MainActivity.filePathCallback?.onReceiveValue(null)
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
      return try {
        packageManager.getPackageInfo(packageName, 0)
        true
      } catch (error: Exception) {
        false
      }
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

  writeFileIfChanged(mainActivityPath, buildMainActivitySource(packageName));
  patchAndroidManifest(manifestPath);
  patchGradle(gradlePath);
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
