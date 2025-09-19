import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';


@Component({
selector: 'app-sidebar',
standalone: true,
imports: [RouterLink, RouterLinkActive, CommonModule],
templateUrl: './sidebar.component.html',
styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  items = [
    { label: 'Hello World', path: '/hello' },
    { label: 'Directory Tree', path: '/directory-tree' },
    { label: 'CSV Analyzer', path: '/csv-analyzer' },
    // Aggiungi qui i prossimi tool: es. { label: 'Regex Tester', path: '/regex' }
  ];
}