fn main() {
    println!("cargo:rerun-if-changed=../../version.json");
    println!("cargo:rerun-if-changed=../../package.json");
    println!("cargo:rerun-if-changed=tauri.conf.json");
    tauri_build::build()
}