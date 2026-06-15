#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_| {
            start_spotify_callback_server();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Noctune");
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
