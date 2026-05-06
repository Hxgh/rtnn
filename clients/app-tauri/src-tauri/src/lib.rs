use tauri_plugin_opener::OpenerExt;

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

fn build_map_url(
    app_type: &str,
    lat: Option<f64>,
    lng: Option<f64>,
    name: Option<&str>,
    scheme: bool,
) -> Result<String, String> {
    let has_coords = lat.is_some() && lng.is_some();
    let has_name = name.map(|value| !value.trim().is_empty()).unwrap_or(false);

    if !has_coords && !has_name {
        return Err("missing-map-target".to_string());
    }

    let lat_value = lat.unwrap_or_default();
    let lng_value = lng.unwrap_or_default();
    let name_value = name.unwrap_or("destination");
    let encoded_name = name_value.replace(' ', "%20");

    if scheme {
        return match app_type {
            "amap" => {
                #[cfg(target_os = "ios")]
                let prefix = "iosamap";
                #[cfg(not(target_os = "ios"))]
                let prefix = "androidamap";

                if has_coords {
                    Ok(format!(
                        "{}://navi?sourceApplication=rtnn&lat={}&lon={}&poiname={}&dev=0&style=2",
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
        features: vec!["external.open", "map.navigation"],
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
) -> Result<CommandResult, String> {
    let _ = direct_nav;
    let app_type = app_type.unwrap_or_else(|| "amap".to_string());

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        let scheme_url = build_map_url(&app_type, lat, lng, name.as_deref(), true)?;

        if app.opener().open_url(&scheme_url, None::<&str>).is_ok() {
            return Ok(CommandResult {
                ok: true,
                message: Some("opened-native-map".to_string()),
                reason: None,
            });
        }
    }

    let web_url = build_map_url(&app_type, lat, lng, name.as_deref(), false)?;

    app.opener()
        .open_url(&web_url, None::<&str>)
        .map_err(|error| error.to_string())?;

    Ok(CommandResult {
        ok: true,
        message: Some("opened-web-map".to_string()),
        reason: None,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_client_info,
            open_external,
            open_map_navigation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running rtnn app tauri shell");
}
