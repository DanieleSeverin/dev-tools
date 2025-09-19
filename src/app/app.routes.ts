import { Routes } from '@angular/router';
import { HelloWorldComponent } from './tools/hello-world/hello-world.component';
import { DirectoryTreeComponent } from './tools/directory-tree/directory-tree.component';
import { CsvAnalyzerComponent } from './tools/csv-analyzer/csv-analyzer.component';


export const routes: Routes = [
{ path: '', pathMatch: 'full', redirectTo: 'hello' },
{ path: 'hello', component: HelloWorldComponent, title: 'Hello World' },
{ path: 'directory-tree', component: DirectoryTreeComponent, title: 'Directory Tree Generator' },
{ path: 'csv-analyzer', component: CsvAnalyzerComponent, title: 'CSV Analyzer' },
// Futuri tool: aggiungi nuove route qui es. { path: 'json-tools', loadComponent: ... }
{ path: '**', redirectTo: 'hello' },
];