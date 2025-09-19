import { Injectable } from '@angular/core';
// In Tauri v2 l'API 'invoke' risiede nel namespace 'core'
import { invoke } from '@tauri-apps/api/core';


@Injectable({ providedIn: 'root' })
export class TauriService {

    /**
    * Wrapper typesafe di invoke: centralizziamo le chiamate Rust qui.
    * - Vantaggi: logging, gestione errori, tipi condivisi più facili da mantenere.
    */
    async call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
        try {
            return await invoke<T>(command, args);
        } catch (err) {
            // Qui puoi agganciare telemetry o pattern di retry.
            console.error(`[TauriService] invoke failed for ${command}`, err);
            throw err;
        }
    }
}