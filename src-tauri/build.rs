fn main() {
  #[cfg(target_os = "macos")]
  {
    println!("cargo:rustc-link-lib=framework=LocalAuthentication");
    println!("cargo:rustc-link-lib=framework=Foundation");
  }
  tauri_build::build()
}
