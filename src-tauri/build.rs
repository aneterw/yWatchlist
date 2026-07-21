fn main() {
    tauri_build::build();

    // Hide console window on Windows
    #[cfg(windows)]
    println!("cargo:rustc-link-arg=-Wl,/SUBSYSTEM:WINDOWS");
}
