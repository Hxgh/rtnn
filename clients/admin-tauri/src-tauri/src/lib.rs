use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

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
struct UpdateInfo {
    available: bool,
    version: Option<String>,
    current_version: Option<String>,
    notes: Option<String>,
    date: Option<String>,
    target: Option<String>,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateCheckResult {
    ok: bool,
    message: Option<String>,
    reason: Option<String>,
    update: Option<UpdateInfo>,
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

fn build_web_map_url(
    lat: Option<f64>,
    lng: Option<f64>,
    name: Option<&str>,
) -> Result<String, String> {
    let has_coords = lat.is_some() && lng.is_some();
    let has_name = name.map(|value| !value.trim().is_empty()).unwrap_or(false);

    if !has_coords && !has_name {
        return Err("missing-map-target".to_string());
    }

    let name_value = name.unwrap_or("destination");

    if has_coords {
        Ok(format!(
            "https://uri.amap.com/navigation?to={},{},{}&mode=car",
            lng.unwrap_or_default(),
            lat.unwrap_or_default(),
            name_value,
        ))
    } else {
        Ok(format!(
            "https://uri.amap.com/navigation?to={}&mode=car",
            name_value,
        ))
    }
}

#[tauri::command]
fn get_client_info() -> NativeClientInfo {
    NativeClientInfo {
        runtime: "tauri",
        shell: "admin-desktop",
        platform: current_platform(),
        app_version: env!("CARGO_PKG_VERSION"),
        bridge_version: "0.1.0",
        channel: std::env::var("RTNN_CLIENT_CHANNEL").unwrap_or_else(|_| "dev".to_string()),
        source_sha: std::env::var("RTNN_CLIENT_SOURCE_SHA").ok(),
        features: vec!["external.open", "map.navigation", "updater"],
    }
}

#[tauri::command]
fn open_external(app: tauri::AppHandle, url: String) -> Result<CommandResult, String> {
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
) -> Result<CommandResult, String> {
    let url = build_web_map_url(lat, lng, name.as_deref())?;

    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|error| error.to_string())?;

    Ok(CommandResult {
        ok: true,
        message: Some("opened-web-map".to_string()),
        reason: None,
    })
}

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(error) => {
            return Ok(UpdateCheckResult {
                ok: false,
                message: None,
                reason: Some(error.to_string()),
                update: Some(UpdateInfo {
                    available: false,
                    version: None,
                    current_version: None,
                    notes: None,
                    date: None,
                    target: None,
                }),
            });
        }
    };

    let update = match updater.check().await {
        Ok(update) => update,
        Err(error) => {
            return Ok(UpdateCheckResult {
                ok: false,
                message: None,
                reason: Some(error.to_string()),
                update: Some(UpdateInfo {
                    available: false,
                    version: None,
                    current_version: None,
                    notes: None,
                    date: None,
                    target: None,
                }),
            });
        }
    };

    if let Some(update) = update {
        return Ok(UpdateCheckResult {
            ok: true,
            message: Some("update-available".to_string()),
            reason: None,
            update: Some(UpdateInfo {
                available: true,
                version: Some(update.version),
                current_version: Some(update.current_version),
                notes: update.body,
                date: update.date.map(|value| value.to_string()),
                target: Some(update.target),
            }),
        });
    }

    Ok(UpdateCheckResult {
        ok: true,
        message: Some("no-update".to_string()),
        reason: None,
        update: Some(UpdateInfo {
            available: false,
            version: None,
            current_version: None,
            notes: None,
            date: None,
            target: None,
        }),
    })
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<CommandResult, String> {
    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater.check().await.map_err(|error| error.to_string())?;

    let Some(update) = update else {
        return Ok(CommandResult {
            ok: false,
            message: None,
            reason: Some("no-update".to_string()),
        });
    };

    update
        .download_and_install(|_chunk_length, _content_length| {}, || {})
        .await
        .map_err(|error| error.to_string())?;

    Ok(CommandResult {
        ok: true,
        message: Some("update-installed".to_string()),
        reason: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_client_info,
            open_external,
            open_map_navigation,
            check_update,
            install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running rtnn admin tauri shell");
}
