//! Punto d'ingresso dell'app Tauri (condiviso anche con target mobile).
//! Qui configuriamo finestre, comandi, plugin, ecc.

use std::fs;
use std::path::Path;


// Macro: se stai compilando per mobile, questa funzione diventa l'entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
// Costruiamo il builder Tauri.
// .default() crea una finestra principale "main" secondo la configurazione
// in tauri.conf.json (titolo, dimensioni, ecc.).
tauri::Builder::default()
// Espone al frontend i comandi Rust (IPC) definiti più sotto.
// Puoi aggiungere altri comandi separandoli da virgole.
.invoke_handler(tauri::generate_handler![hello_world, read_directory_tree, open_folder_dialog])
// Plugin per dialog di sistema (apertura file/cartelle)
.plugin(tauri_plugin_dialog::init())


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

/// Comando per leggere la struttura delle directory e generare una rappresentazione testuale
#[tauri::command]
fn read_directory_tree(path: String, include_files: bool) -> Result<String, String> {
    // Rimuovi i doppi apici se presenti
    let clean_path = path.trim_matches('"');
    let target_path = Path::new(clean_path);

    if !target_path.exists() {
        return Err(format!("Percorso non esistente: {}", path));
    }

    if !target_path.is_dir() {
        return Err(format!("Il percorso non è una directory: {}", path));
    }

    let mut result = String::new();

    // Aggiungi il nome della directory radice
    if let Some(dir_name) = target_path.file_name() {
        result.push_str(&format!("{}\n", dir_name.to_string_lossy()));
    }

    match build_tree_recursive(target_path, "", true, include_files) {
        Ok(tree) => {
            result.push_str(&tree);
            Ok(result)
        }
        Err(e) => Err(format!("Errore nella lettura della directory: {}", e))
    }
}

fn build_tree_recursive(
    dir: &Path,
    prefix: &str,
    _is_last: bool,
    include_files: bool
) -> Result<String, std::io::Error> {
    let mut result = String::new();
    let mut entries: Vec<_> = fs::read_dir(dir)?.collect::<Result<Vec<_>, _>>()?;

    // Ordina le entry: prima le directory, poi i file (se inclusi)
    entries.sort_by(|a, b| {
        let a_is_dir = a.path().is_dir();
        let b_is_dir = b.path().is_dir();

        match (a_is_dir, b_is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name())
        }
    });

    // Filtra i file se non devono essere inclusi
    if !include_files {
        entries.retain(|entry| entry.path().is_dir());
    }

    let total_entries = entries.len();

    for (index, entry) in entries.iter().enumerate() {
        let is_last_entry = index == total_entries - 1;
        let path = entry.path();
        let file_name = entry.file_name();

        // Simboli per la struttura ad albero
        let connector = if is_last_entry { "└── " } else { "├── " };

        result.push_str(&format!("{}{}{}\n",
            prefix,
            connector,
            file_name.to_string_lossy()
        ));

        // Se è una directory, continua ricorsivamente
        if path.is_dir() {
            let new_prefix = format!("{}{}",
                prefix,
                if is_last_entry { "    " } else { "│   " }
            );

            result.push_str(&build_tree_recursive(&path, &new_prefix, false, include_files)?);
        }
    }

    Ok(result)
}

/// Comando per aprire un dialog di selezione cartelle
#[tauri::command]
fn open_folder_dialog(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();

    app_handle
        .dialog()
        .file()
        .set_title("Seleziona una cartella")
        .pick_folder(move |folder_path| {
            let _ = tx.send(folder_path);
        });

    match rx.recv() {
        Ok(Some(path)) => Ok(path.to_string()),
        Ok(None) => Err("Nessuna cartella selezionata".to_string()),
        Err(_) => Err("Errore nel ricevere la risposta del dialog".to_string()),
    }
}