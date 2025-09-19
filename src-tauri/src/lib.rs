//! Punto d'ingresso dell'app Tauri (condiviso anche con target mobile).
//! Qui configuriamo finestre, comandi, plugin, ecc.


// Macro: se stai compilando per mobile, questa funzione diventa l'entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
// Costruiamo il builder Tauri.
// .default() crea una finestra principale "main" secondo la configurazione
// in tauri.conf.json (titolo, dimensioni, ecc.).
tauri::Builder::default()
// Espone al frontend i comandi Rust (IPC) definiti più sotto.
// Puoi aggiungere altri comandi separandoli da virgole.
.invoke_handler(tauri::generate_handler![hello_world])
// .plugin(...): qui potrai installare plugin ufficiali (dialog, fs, http, sql, ecc.)
// Esempio futuro: .plugin(tauri_plugin_dialog::init())


// Avvia il runtime leggendo la configurazione da tauri.conf.json
.run(tauri::generate_context!())
.expect("error while running tauri application");
}


/// Esempio di comando IPC chiamabile dal frontend Angular via `invoke('hello_world', { name })`.
#[tauri::command]
fn hello_world(name: Option<String>) -> String {
// Nota: gli argomenti arrivano in camelCase dal frontend e vengono deserializzati con serde.
// "Option<String>" => il nome è facoltativo.
let user = name.unwrap_or_else(|| "straniero".to_string());
format!("Ciao, {}! 👋 (da Rust)", user)
}