use tauri_plugin_opener::OpenerExt;

#[cfg(target_os = "android")]
use jni::objects::{JObject, JValue};

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeClientInfo {
    runtime: &'static str,
    shell: &'static str,
    platform: &'static str,
    app_version: &'static str,
    bridge_version: &'static str,
    channel: String,
    source_sha: Option<String>,
    features: Vec<&'static str>,
}

#[derive(Debug, serde::Serialize)]
struct CommandResult {
    ok: bool,
    message: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PermissionResult {
    ok: bool,
    kind: String,
    status: &'static str,
    requested: bool,
    can_ask_again: Option<bool>,
    message: Option<String>,
    reason: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MapInstallResult {
    ok: bool,
    app_type: String,
    installed: Option<bool>,
    status: &'static str,
    message: Option<String>,
    reason: Option<String>,
    diagnostic: Option<String>,
}

#[cfg(target_os = "android")]
#[derive(Debug, Clone, Copy)]
struct MapPackageDetection {
    installed: bool,
    launch_visible: bool,
    package_visible: bool,
}

fn current_platform() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        return "macos";
    }

    #[cfg(target_os = "windows")]
    {
        return "windows";
    }

    #[cfg(target_os = "android")]
    {
        return "android";
    }

    #[cfg(target_os = "ios")]
    {
        return "ios";
    }

    #[allow(unreachable_code)]
    "web"
}

fn picker_managed_permission(kind: &str) -> bool {
    matches!(kind, "camera" | "photo-library" | "file-picker" | "barcode")
}

fn permission_result(
    kind: String,
    status: &'static str,
    requested: bool,
    reason: Option<String>,
) -> PermissionResult {
    let ok = matches!(status, "granted")
        || (matches!(status, "prompt" | "unknown") && picker_managed_permission(&kind));

    PermissionResult {
        ok,
        kind,
        status,
        requested,
        can_ask_again: Some(matches!(status, "prompt" | "unknown")),
        message: None,
        reason,
    }
}

fn build_map_url(
    app_type: &str,
    lat: Option<f64>,
    lng: Option<f64>,
    name: Option<&str>,
    scheme: bool,
    direct_nav: bool,
) -> Result<String, String> {
    let has_coords = lat.is_some() && lng.is_some();
    let has_name = name.map(|value| !value.trim().is_empty()).unwrap_or(false);

    if !has_coords && !has_name {
        return Err("missing-map-target".to_string());
    }

    let lat_value = lat.unwrap_or_default();
    let lng_value = lng.unwrap_or_default();
    let name_value = name.unwrap_or("destination");
    let encoded_name = encode_url_component(name_value);

    if scheme {
        return match app_type {
            "amap" => {
                #[cfg(target_os = "ios")]
                let prefix = "iosamap";
                #[cfg(not(target_os = "ios"))]
                let prefix = "androidamap";

                if direct_nav && has_coords {
                    Ok(format!(
                        "{}://navi?sourceApplication=rtnn&lat={}&lon={}&poiname={}&dev=0&style=2",
                        prefix, lat_value, lng_value, encoded_name,
                    ))
                } else if has_coords {
                    Ok(format!(
                        "{}://route/plan?sourceApplication=rtnn&dlat={}&dlon={}&dname={}&dev=0&t=0",
                        prefix, lat_value, lng_value, encoded_name,
                    ))
                } else {
                    Ok(format!(
                        "{}://route/plan?sourceApplication=rtnn&dname={}&dev=0&t=0",
                        prefix, encoded_name,
                    ))
                }
            }
            "baidu" => {
                if has_coords {
                    Ok(format!(
                        "baidumap://map/direction?destination=latlng:{},{}|name:{}&coord_type=gcj02&mode=driving",
                        lat_value, lng_value, encoded_name,
                    ))
                } else {
                    Ok(format!(
                        "baidumap://map/direction?destination={}&mode=driving",
                        encoded_name,
                    ))
                }
            }
            "tencent" => {
                if has_coords {
                    Ok(format!(
                        "qqmap://map/routeplan?type=drive&tocoord={},{}&to={}",
                        lat_value, lng_value, encoded_name,
                    ))
                } else {
                    Ok(format!(
                        "qqmap://map/routeplan?type=drive&to={}",
                        encoded_name,
                    ))
                }
            }
            _ => Err("unsupported-map-app".to_string()),
        };
    }

    if has_coords {
        Ok(format!(
            "https://uri.amap.com/navigation?to={},{},{}&mode=car",
            lng_value, lat_value, encoded_name,
        ))
    } else {
        Ok(format!(
            "https://uri.amap.com/navigation?to={}&mode=car",
            encoded_name,
        ))
    }
}

fn encode_url_component(value: &str) -> String {
    let mut output = String::new();

    for byte in value.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                output.push(*byte as char)
            }
            _ => output.push_str(&format!("%{:02X}", byte)),
        }
    }

    output
}

#[cfg(target_os = "android")]
fn map_android_packages(app_type: &str) -> Vec<&'static str> {
    match app_type {
        "amap" => vec!["com.autonavi.minimap"],
        "baidu" => vec!["com.baidu.BaiduMap"],
        "tencent" => vec!["com.tencent.map", "com.tencent.maplite"],
        _ => Vec::new(),
    }
}

#[cfg(target_os = "android")]
fn detect_android_package(package_name: &str) -> Result<MapPackageDetection, String> {
    let context = ndk_context::android_context();
    let vm =
        unsafe { jni::JavaVM::from_raw(context.vm().cast()) }.map_err(|error| error.to_string())?;
    let mut env = vm
        .attach_current_thread()
        .map_err(|error| error.to_string())?;
    let context_object = unsafe { JObject::from_raw(context.context().cast()) };
    let package_manager = env
        .call_method(
            &context_object,
            "getPackageManager",
            "()Landroid/content/pm/PackageManager;",
            &[],
        )
        .map_err(|error| error.to_string())?
        .l()
        .map_err(|error| error.to_string())?;
    let package_name = env
        .new_string(package_name)
        .map_err(|error| error.to_string())?;
    let package_name_object = JObject::from(package_name);
    let launch_intent = env
        .call_method(
            &package_manager,
            "getLaunchIntentForPackage",
            "(Ljava/lang/String;)Landroid/content/Intent;",
            &[JValue::Object(&package_name_object)],
        )
        .map_err(|error| error.to_string())?
        .l()
        .map_err(|error| error.to_string())?;

    let launch_visible = !launch_intent.as_raw().is_null();
    let package_visible = match env.call_method(
        &package_manager,
        "getPackageInfo",
        "(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;",
        &[JValue::Object(&package_name_object), JValue::Int(0)],
    ) {
        Ok(_) => true,
        Err(error) => {
            let reason = error.to_string();
            let _ = env.exception_clear();
            if reason.contains("NameNotFoundException") {
                false
            } else {
                return Err(reason);
            }
        }
    };

    Ok(MapPackageDetection {
        installed: launch_visible || package_visible,
        launch_visible,
        package_visible,
    })
}

#[cfg(target_os = "android")]
fn detect_android_map_installed(app_type: &str) -> MapInstallResult {
    let packages = map_android_packages(app_type);

    if packages.is_empty() {
        return MapInstallResult {
            ok: false,
            app_type: app_type.to_string(),
            installed: None,
            status: "unsupported",
            message: None,
            reason: Some("unsupported-map-app".to_string()),
            diagnostic: None,
        };
    }

    let mut last_error = None;
    for package_name in &packages {
        match detect_android_package(package_name) {
            Ok(detection) if detection.installed => {
                return MapInstallResult {
                    ok: true,
                    app_type: app_type.to_string(),
                    installed: Some(true),
                    status: "installed",
                    message: Some(if detection.launch_visible {
                        format!("installed-by-launch-intent:{}", package_name)
                    } else {
                        format!("installed-by-package-info:{}", package_name)
                    }),
                    reason: None,
                    diagnostic: Some(package_name.to_string()),
                };
            }
            Ok(detection) => {
                let visibility = format!(
                    "{}:launch={},package={}",
                    package_name, detection.launch_visible, detection.package_visible
                );
                last_error = Some("map-app-not-installed-or-not-visible".to_string());
                if packages.len() == 1 {
                    return MapInstallResult {
                        ok: false,
                        app_type: app_type.to_string(),
                        installed: Some(false),
                        status: "not-installed",
                        message: None,
                        reason: last_error,
                        diagnostic: Some(visibility),
                    };
                }
            }
            Err(error) => {
                last_error = Some(error);
            }
        }
    }

    MapInstallResult {
        ok: false,
        app_type: app_type.to_string(),
        installed: Some(false),
        status: "not-installed",
        message: None,
        reason: last_error.or_else(|| Some("map-app-not-installed".to_string())),
        diagnostic: Some(packages.join("|")),
    }
}

#[tauri::command]
fn get_client_info() -> NativeClientInfo {
    NativeClientInfo {
        runtime: "tauri",
        shell: "app-mobile",
        platform: current_platform(),
        app_version: env!("CARGO_PKG_VERSION"),
        bridge_version: "0.1.0",
        channel: std::env::var("RTNN_CLIENT_CHANNEL").unwrap_or_else(|_| "dev".to_string()),
        source_sha: std::env::var("RTNN_CLIENT_SOURCE_SHA").ok(),
        features: vec![
            "external.open",
            "map.navigation",
            "file.pick",
            "notification",
            "barcode.scan",
            "permission",
            "safe-area",
            "keyboard",
        ],
    }
}

#[tauri::command]
fn open_external(
    app: tauri::AppHandle,
    url: String,
    target: Option<String>,
) -> Result<CommandResult, String> {
    let _ = target;

    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|error| error.to_string())?;

    Ok(CommandResult {
        ok: true,
        message: None,
        reason: None,
    })
}

#[tauri::command]
fn open_map_navigation(
    app: tauri::AppHandle,
    lat: Option<f64>,
    lng: Option<f64>,
    name: Option<String>,
    app_type: Option<String>,
    direct_nav: Option<bool>,
    _allow_web_fallback: Option<bool>,
) -> Result<CommandResult, String> {
    let app_type = app_type.unwrap_or_else(|| "amap".to_string());
    let direct_nav = direct_nav.unwrap_or_else(|| lat.is_some() && lng.is_some());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let allow_web_fallback = _allow_web_fallback.unwrap_or(true);
        let scheme_url = build_map_url(&app_type, lat, lng, name.as_deref(), true, direct_nav)?;

        if app.opener().open_url(&scheme_url, None::<&str>).is_ok() {
            return Ok(CommandResult {
                ok: true,
                message: Some("opened-native-map".to_string()),
                reason: None,
            });
        }

        if !allow_web_fallback {
            return Ok(CommandResult {
                ok: false,
                message: None,
                reason: Some("native-map-open-failed".to_string()),
            });
        }
    }

    let web_url = build_map_url(&app_type, lat, lng, name.as_deref(), false, direct_nav)?;

    app.opener()
        .open_url(&web_url, None::<&str>)
        .map_err(|error| error.to_string())?;

    Ok(CommandResult {
        ok: true,
        message: Some("opened-web-map".to_string()),
        reason: None,
    })
}

#[tauri::command]
fn check_map_installed(app_type: String) -> MapInstallResult {
    #[cfg(target_os = "android")]
    {
        detect_android_map_installed(&app_type)
    }

    #[cfg(not(target_os = "android"))]
    {
        MapInstallResult {
            ok: true,
            app_type,
            installed: None,
            status: "unknown",
            message: None,
            reason: Some("map-install-check-unavailable".to_string()),
            diagnostic: None,
        }
    }
}

#[tauri::command]
fn check_permission(kind: String) -> PermissionResult {
    if picker_managed_permission(&kind) {
        return permission_result(
            kind,
            "prompt",
            false,
            Some("permission-managed-by-file-picker".to_string()),
        );
    }

    permission_result(
        kind,
        "unsupported",
        false,
        Some("permission-unavailable".to_string()),
    )
}

#[tauri::command]
fn request_permission(
    kind: String,
    trigger: Option<String>,
    purpose: Option<String>,
) -> PermissionResult {
    let _ = trigger;
    let _ = purpose;

    if picker_managed_permission(&kind) {
        return permission_result(
            kind,
            "prompt",
            true,
            Some("permission-managed-by-file-picker".to_string()),
        );
    }

    permission_result(
        kind,
        "unsupported",
        true,
        Some("permission-unavailable".to_string()),
    )
}

#[tauri::command]
fn scan_barcode() -> CommandResult {
    CommandResult {
        ok: false,
        message: None,
        reason: Some("barcode-scan-native-unavailable".to_string()),
    }
}

#[tauri::command]
fn show_notification(title: String, body: Option<String>, tag: Option<String>) -> CommandResult {
    let _ = (title, body, tag);

    CommandResult {
        ok: false,
        message: None,
        reason: Some("notification-native-unavailable".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_client_info,
            open_external,
            open_map_navigation,
            check_map_installed,
            check_permission,
            request_permission,
            scan_barcode,
            show_notification,
        ])
        .run(tauri::generate_context!())
        .expect("error while running rtnn app tauri shell");
}
