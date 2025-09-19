import { Component } from '@angular/core';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';


@Component({
selector: 'app-root',
standalone: true,
imports: [SidebarComponent, RouterOutlet],
templateUrl: './app.component.html',
styleUrls: ['./app.component.scss']
})
export class AppComponent { }