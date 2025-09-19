// Nasconde la console in Windows nelle build di release (best practice UX).
// È innocuo su macOS/Linux. In debug lasciamo la console per i log.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


fn main() {
  // Rimandiamo alla funzione condivisa definita in lib.rs
  devtools_app_lib::run();
}