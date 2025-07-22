use lsl::{resolve_streams, Pullable, StreamInlet};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::{env, sync::Arc, time::Instant};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{mpsc, Mutex};

#[derive(Clone, serde::Serialize)]
struct LSLDataPayload {
    timestamps: Vec<f64>,
    samples: Vec<Vec<f32>>,
    channel_names: Vec<String>,
}

struct StreamState {
    running: Arc<AtomicBool>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
    sender: Option<mpsc::UnboundedSender<LSLDataPayload>>,
}

impl StreamState {
    fn new() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            sender: None,
        }
    }

    fn stop(&mut self) {
        self.running.store(false, Ordering::Relaxed);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
        self.sender = None;
    }
}

#[tauri::command]
async fn connect_to_stream(
    app: AppHandle,
    stream_name: String,
    source_id: String,
) -> Result<(), String> {
    // Clear any existing connection first
    disconnect_stream(app.clone()).await?;

    // Resolve streams and extract needed information before any await points
    let (nominal_srate, channel_count, channel_names, hostname, source_id_clone) = {
        let streams = resolve_streams(2.0).map_err(|e| format!("Resolve failed: {}", e))?;
        let stream_info = streams
            .iter()
            .find(|info| {
                if let Ok(xml) = info.to_xml() {
                    if let Some(name) = extract_name_from_xml(&xml) {
                        return name == stream_name && info.source_id() == source_id;
                    }
                }
                false
            })
            .ok_or_else(|| {
                format!(
                    "Stream '{}' with source ID '{}' not found",
                    stream_name, source_id
                )
            })?;

        let nominal_srate = stream_info.nominal_srate();
        let channel_count = stream_info.channel_count();
          match StreamInlet::new(&stream_info, 360, 32, true) {
        Ok(inlet) => match inlet.info(1.0) {
            Ok(full_info) => {
                if let Ok(xml) = full_info.to_xml() {
                    emit_channel_resolutions(&xml, &app);
                } else {
                    eprintln!("Failed to convert full StreamInfo to XML.");
                }
            }
            Err(e) => {
                eprintln!("Failed to retrieve full StreamInfo: {}", e);
            }
        },
        Err(e) => {
            eprintln!("Failed to create StreamInlet: {}", e);
        }
    }
        let channel_names: Vec<String> = (0..channel_count).map(|i| format!("Ch{}", i)).collect();
        let hostname = stream_info.hostname().to_string();
        let source_id_clone = stream_info.source_id().to_string();

        (nominal_srate, channel_count, channel_names, hostname, source_id_clone)
    };

    // Emit information to frontend
    let window = app.get_webview_window("main").ok_or("Main window not found")?;
    window.emit("lsl_channel_count", &channel_count)
        .map_err(|e| format!("Failed to emit channel count: {}", e))?;
    window.emit("lsl_nominal_srate", &nominal_srate)
        .map_err(|e| format!("Failed to emit nominal sample rate: {}", e))?;

    // Create channel and state
    let (tx, mut rx) = mpsc::unbounded_channel::<LSLDataPayload>();
    let window_clone = app.get_webview_window("main").ok_or("Main window not found")?;
    let running = Arc::new(AtomicBool::new(true));

    // Store the state in the app
    let state = app.state::<Mutex<StreamState>>();
    let mut state_lock = state.lock().await;
    state_lock.running = running.clone();
    state_lock.sender = Some(tx.clone());

    // High-priority receiver
    tauri::async_runtime::spawn(async move {
        let mut _sample_count: usize = 0;

        while let Some(payload) = rx.recv().await {
            if payload.samples.is_empty() {
                continue;
            }
            
            _sample_count += payload.samples.len();
            if let Err(e) = window_clone.emit("lsl_data", &payload) {
                eprintln!("Emit error: {}", e);
                break;
            }
        }
    });

    // Spawn the blocking thread with the needed information
    let handle = thread::Builder::new()
        .name("lsl_stream_thread".to_string())
        .spawn(move || {
            let streams = match resolve_streams(2.0) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Re-resolve failed: {}", e);
                    return;
                }
            };

            let stream_info = match streams
                .iter()
                .find(|info| info.hostname() == hostname && info.source_id() == source_id_clone)
            {
                Some(info) => info,
                None => {
                    eprintln!("Stream not found in blocking thread");
                    return;
                }
            };

            let inlet = match StreamInlet::new(stream_info, 360, 0, true) {
                Ok(i) => i,
                Err(e) => {
                    eprintln!("Inlet creation failed: {}", e);
                    return;
                }
            };

            let timeout = 0.001;
            let mut sample_buffer: Vec<Vec<f32>> = Vec::new();
            let batch_size = 25;
            let mut last_sample: Option<Vec<f32>> = None;

            while running.load(Ordering::Relaxed) {
                if let Ok((data, _timestamp)) = inlet.pull_sample(timeout) {
                    let sample_f32: Vec<f32> = data.into_iter().map(|x: f64| x as f32).collect();
                    if !sample_f32.is_empty() && Some(&sample_f32) != last_sample.as_ref() {
                        sample_buffer.push(sample_f32.clone());
                        last_sample = Some(sample_f32);
                    }
                    
                    if sample_buffer.len() >= batch_size && !sample_buffer.is_empty() {
                        let payload = LSLDataPayload {
                            samples: sample_buffer.clone(),
                            timestamps: vec![],
                            channel_names: channel_names.clone(),
                        };

                        if tx.send(payload).is_err() {
                            break;
                        }
                        sample_buffer.clear();
                    }
                }
            }
            println!("LSL stream thread shut down cleanly");
        })
        .map_err(|e| format!("Failed to spawn thread: {}", e))?;

    state_lock.thread_handle = Some(handle);
    Ok(())
}

use std::io::Cursor;
use xmltree::Element;

fn emit_channel_resolutions(xml: &str, app_handle: &tauri::AppHandle) {
    let root = match Element::parse(Cursor::new(xml.as_bytes())) {
        Ok(e) => e,
        Err(e) => {
            println!("[ERROR] Failed to parse XML: {}", e);
            return;
        }
    };

    if let Some(desc) = root.get_child("desc") {
        if let Some(resinfo) = desc.get_child("resinfo") {
            if let Some(res_el) = resinfo.get_child("resolution") {
                let resolution = res_el.get_text().unwrap_or_default().to_string();
                println!("[RESOLUTION] resolution = {}", resolution);
                let _ = app_handle.emit("resolution", resolution);
            }
        }
    }
}


#[tauri::command]
async fn debug_streams(_app_handle: AppHandle) -> String {
    match lsl::resolve_streams(5.0) {
        Ok(streams) => {
            if streams.is_empty() {
                return "No streams found.".to_string();
            }

            let mut output = format!("Found {} streams:\n", streams.len());

            for stream_info in streams {
                let hostname = stream_info.hostname();
                let source_id = stream_info.source_id();
                let nominal_srate = stream_info.nominal_srate();
                let channel_count = stream_info.channel_count();

                // Get XML description and parse it
                let xml = stream_info.to_xml().unwrap_or_default();
                let stream_name =
                    extract_name_from_xml(&xml).unwrap_or_else(|| "unnamed".to_string());
                let stream_type =
                    extract_type_from_xml(&xml).unwrap_or_else(|| "unknown".to_string());

                output += &format!(
                    "- Name: {}\n  Host: {}\n  Source ID: {}\n  Type: {}\n  Rate: {} Hz\n  Channels: {}\n",
                    stream_name,
                    hostname,
                    source_id,
                    stream_type,
                    nominal_srate,
                    channel_count
                );
            }

            output
        }
        Err(e) => format!("LSL Error: {}", e),
    }
}
// Helper function to extract name from XML
fn extract_name_from_xml(xml: &str) -> Option<String> {
    use roxmltree::Document;
    let doc = Document::parse(xml).ok()?;
    let name_node = doc.descendants().find(|n| n.tag_name().name() == "name")?;
    Some(name_node.text()?.to_string())
}

// Helper function to extract type from XML
fn extract_type_from_xml(xml: &str) -> Option<String> {
    use roxmltree::Document;
    let doc = Document::parse(xml).ok()?;
    let type_node = doc.descendants().find(|n| n.tag_name().name() == "type")?;
    Some(type_node.text()?.to_string())
}

// Add a command to stop the stream
#[tauri::command]
async fn disconnect_stream(app: AppHandle) -> Result<(), String> {
    let mut state = app.state::<Mutex<StreamState>>();
    let mut state_lock = state.lock().await;

    // Stop the streaming thread and clean up
    state_lock.stop();

    // Reset the frontend state
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("stream_reset", ());
    }

    Ok(())
}
fn main() {
    env::set_var("LSLAPICFG", "ForceSingleThread");

    tauri::Builder::default()
        .manage(Mutex::new(StreamState::new()))
        .invoke_handler(tauri::generate_handler![
            debug_streams,
            connect_to_stream,
            disconnect_stream
        ])
        .setup(|app| {
            app.manage(Mutex::new(StreamState::new()));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
