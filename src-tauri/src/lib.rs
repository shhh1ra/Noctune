use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            storage_info,
            storage_read_text,
            storage_write_text,
            storage_remove_text,
            storage_read_lyrics_file,
            storage_write_lyrics_file,
        ])
        .setup(|_| {
            start_spotify_callback_server();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Noctune");
}

#[derive(serde::Serialize)]
struct StorageInfo {
    root: String,
    portable: bool,
}

fn sanitize_file_name(value: &str) -> String {
    let sanitized: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
                character
            } else {
                '_'
            }
        })
        .collect();

    if sanitized.trim_matches('_').is_empty() {
        "entry".to_string()
    } else {
        sanitized
    }
}

fn ensure_writable_dir(path: &std::path::Path) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|error| error.to_string())?;

    let probe = path.join(".write-test");
    std::fs::write(&probe, b"ok").map_err(|error| error.to_string())?;
    let _ = std::fs::remove_file(probe);
    Ok(())
}

fn storage_root(app: &tauri::AppHandle) -> Result<(std::path::PathBuf, bool), String> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let portable_root = exe_dir.join("NoctuneData");
            if ensure_writable_dir(&portable_root).is_ok() {
                return Ok((portable_root, true));
            }
        }
    }

    let fallback_root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("NoctuneData");
    ensure_writable_dir(&fallback_root)?;
    Ok((fallback_root, false))
}

fn storage_file(app: &tauri::AppHandle, folder: &str, key: &str) -> Result<std::path::PathBuf, String> {
    let (root, _) = storage_root(app)?;
    let directory = root.join(folder);
    std::fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join(sanitize_file_name(key)))
}

#[tauri::command]
fn storage_info(app: tauri::AppHandle) -> Result<StorageInfo, String> {
    let (root, portable) = storage_root(&app)?;
    Ok(StorageInfo {
        root: root.to_string_lossy().to_string(),
        portable,
    })
}

#[tauri::command]
fn storage_read_text(app: tauri::AppHandle, folder: String, key: String) -> Result<Option<String>, String> {
    let path = storage_file(&app, &folder, &key)?;
    match std::fs::read_to_string(path) {
        Ok(content) => Ok(Some(content)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn storage_write_text(
    app: tauri::AppHandle,
    folder: String,
    key: String,
    content: String,
) -> Result<(), String> {
    let path = storage_file(&app, &folder, &key)?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn storage_remove_text(app: tauri::AppHandle, folder: String, key: String) -> Result<(), String> {
    let path = storage_file(&app, &folder, &key)?;
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn storage_read_lyrics_file(
    app: tauri::AppHandle,
    track_key: String,
) -> Result<Option<(String, String, String)>, String> {
    let (root, _) = storage_root(&app)?;
    let directory = root.join("lyrics");
    let base_name = sanitize_file_name(&track_key);

    for extension in ["lrc", "txt"] {
        let file_name = format!("{base_name}.{extension}");
        let path = directory.join(&file_name);

        match std::fs::read_to_string(&path) {
            Ok(content) => return Ok(Some((file_name, path.to_string_lossy().to_string(), content))),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error.to_string()),
        }
    }

    Ok(None)
}

#[tauri::command]
fn storage_write_lyrics_file(
    app: tauri::AppHandle,
    track_key: String,
    file_name: String,
    content: String,
) -> Result<String, String> {
    let extension = std::path::Path::new(&file_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("lrc");
    let key = format!("{}.{}", sanitize_file_name(&track_key), sanitize_file_name(extension));
    let path = storage_file(&app, "lyrics", &key)?;
    std::fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn start_spotify_callback_server() {
    std::thread::spawn(|| {
        let listener = match std::net::TcpListener::bind("127.0.0.1:43872") {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("Spotify callback server failed to start: {error}");
                return;
            }
        };

        for stream in listener.incoming() {
            let Ok(mut stream) = stream else {
                continue;
            };

            let mut buffer = [0; 2048];
            let Ok(bytes_read) = std::io::Read::read(&mut stream, &mut buffer) else {
                continue;
            };

            let request = String::from_utf8_lossy(&buffer[..bytes_read]);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("/");

            if path.starts_with("/callback") {
                let location = format!("http://tauri.localhost{path}");
                let body = "Spotify login complete. You can return to Noctune.";
                let response = format!(
                    "HTTP/1.1 302 Found\r\nLocation: {location}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = std::io::Write::write_all(&mut stream, response.as_bytes());
            } else {
                let body = "Noctune Spotify callback server is running.";
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                    body.len()
                );
                let _ = std::io::Write::write_all(&mut stream, response.as_bytes());
            }
        }
    });
}
