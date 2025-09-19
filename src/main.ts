import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withHashLocation } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Bootstrap con routing hash-based (#/...) per evitare problemi di deep-linking
// quando l'app è servita come asset embedded in Tauri (production build).
bootstrapApplication(AppComponent, {
providers: [
provideRouter(routes, withHashLocation()),
],
}).catch(err => console.error(err));