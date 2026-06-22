#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn safe_name(value: &str) -> String {
    let clean: String = value
        .chars()
        .filter(|character| !matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') && !character.is_control())
        .collect();
    let clean = clean.trim().trim_end_matches(['.', ' ']);
    if clean.is_empty() { "lyrics".into() } else { clean.into() }
}

#[cfg(target_os = "windows")]
#[repr(C)]
struct OpenFileNameW {
    struct_size: u32,
    owner: *mut std::ffi::c_void,
    instance: *mut std::ffi::c_void,
    filter: *const u16,
    custom_filter: *mut u16,
    max_custom_filter: u32,
    filter_index: u32,
    file: *mut u16,
    max_file: u32,
    file_title: *mut u16,
    max_file_title: u32,
    initial_dir: *const u16,
    title: *const u16,
    flags: u32,
    file_offset: u16,
    file_extension: u16,
    default_extension: *const u16,
    custom_data: isize,
    hook: *mut std::ffi::c_void,
    template_name: *const u16,
    reserved: *mut std::ffi::c_void,
    reserved_dword: u32,
    flags_ex: u32,
}

#[cfg(target_os = "windows")]
#[link(name = "comdlg32")]
extern "system" {
    fn GetSaveFileNameW(dialog: *mut OpenFileNameW) -> i32;
}

#[cfg(target_os = "windows")]
fn choose_save_path(suggested_name: &str, synced: bool) -> Option<std::path::PathBuf> {
    use std::os::windows::ffi::OsStringExt;

    let mut file_buffer = suggested_name.encode_utf16().chain(std::iter::once(0)).collect::<Vec<_>>();
    file_buffer.resize(32_768, 0);
    let filter: Vec<u16> = "Lyrics (*.lrc;*.txt)\0*.lrc;*.txt\0All files (*.*)\0*.*\0\0".encode_utf16().collect();
    let title: Vec<u16> = "Сохранить текст песни\0".encode_utf16().collect();
    let default_extension: Vec<u16> = if synced { "lrc\0" } else { "txt\0" }.encode_utf16().collect();
    let mut dialog = OpenFileNameW {
        struct_size: std::mem::size_of::<OpenFileNameW>() as u32,
        owner: std::ptr::null_mut(), instance: std::ptr::null_mut(), filter: filter.as_ptr(),
        custom_filter: std::ptr::null_mut(), max_custom_filter: 0, filter_index: 1,
        file: file_buffer.as_mut_ptr(), max_file: file_buffer.len() as u32,
        file_title: std::ptr::null_mut(), max_file_title: 0, initial_dir: std::ptr::null(),
        title: title.as_ptr(), flags: 0x0000_0002 | 0x0000_0008 | 0x0000_0800,
        file_offset: 0, file_extension: 0, default_extension: default_extension.as_ptr(),
        custom_data: 0, hook: std::ptr::null_mut(), template_name: std::ptr::null(),
        reserved: std::ptr::null_mut(), reserved_dword: 0, flags_ex: 0,
    };

    if unsafe { GetSaveFileNameW(&mut dialog) } == 0 { return None; }
    let length = file_buffer.iter().position(|value| *value == 0).unwrap_or(file_buffer.len());
    Some(std::ffi::OsString::from_wide(&file_buffer[..length]).into())
}

#[tauri::command]
fn save_lyrics(artist: String, track: String, synced: bool, content: String) -> Result<Option<String>, String> {
    let extension = if synced { "lrc" } else { "txt" };
    let suggested_name = format!("{} - {}.{extension}", safe_name(&artist), safe_name(&track));
    #[cfg(target_os = "windows")]
    let Some(path) = choose_save_path(&suggested_name, synced) else { return Ok(None); };
    #[cfg(not(target_os = "windows"))]
    let path = std::env::current_dir().map_err(|error| error.to_string())?.join(suggested_name);
    std::fs::write(&path, content).map_err(|error| format!("Не удалось сохранить файл: {error}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_lyrics])
        .run(tauri::generate_context!())
        .expect("error while running LRCGet");
}
