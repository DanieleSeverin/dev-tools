import { Routes } from '@angular/router';
import { HelloWorldComponent } from './tools/hello-world/hello-world.component';


export const routes: Routes = [
{ path: '', pathMatch: 'full', redirectTo: 'hello' },
{ path: 'hello', component: HelloWorldComponent, title: 'Hello World' },
// Futuri tool: aggiungi nuove route qui es. { path: 'json-tools', loadComponent: ... }
{ path: '**', redirectTo: 'hello' },
];