import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TauriService } from '../../core/tauri.service';
import { CommonModule } from '@angular/common';


@Component({
  standalone: true,
  selector: 'app-hello-world',
  imports: [FormsModule, CommonModule],
  templateUrl: './hello-world.component.html',
  styleUrls: ['./hello-world.component.scss']
})
export class HelloWorldComponent {
  name = 'Daniele';
  result: string | null = null;
  loading = false;
  error: string | null = null;

  constructor(private readonly tauri: TauriService) {}

  async sayHello() {
    this.loading = true; this.error = null; this.result = null;
    try {
      // Chiama il comando Rust `hello_world` definito in src-tauri/src/lib.rs
      this.result = await this.tauri.call<string>('hello_world', { name: this.name });
    } catch (e: any) {
      this.error = e?.toString?.() ?? 'Unknown error';
    } finally {
      this.loading = false;
    }
  }
}