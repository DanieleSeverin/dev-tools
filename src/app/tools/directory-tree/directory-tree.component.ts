import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TauriService } from '../../core/tauri.service';

interface TreeNode {
  id: string;
  name: string;
  level: number;
  isActive: boolean;
  isDirectory: boolean;
  prefix: string;
  connector: string;
  children: TreeNode[];
  parent?: TreeNode;
}

@Component({
  selector: 'app-directory-tree',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './directory-tree.component.html',
  styleUrl: './directory-tree.component.scss'
})
export class DirectoryTreeComponent {
  directoryPath = '';
  includeFiles = false;
  result: string | null = null;
  parsedTree: TreeNode[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private readonly tauri: TauriService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async generateTree() {
    if (!this.directoryPath.trim()) {
      this.error = 'Inserisci un percorso valido';
      return;
    }

    this.loading = true;
    this.error = null;
    this.result = null;

    try {
      this.result = await this.tauri.call<string>('read_directory_tree', {
        path: this.directoryPath.trim(),
        includeFiles: this.includeFiles
      });

      // Parse il risultato in una struttura ad albero interattiva
      this.parsedTree = this.parseTreeString(this.result);
      console.log('Parsed tree structure:', this.parsedTree);
    } catch (e: any) {
      this.error = e?.toString?.() ?? 'Errore sconosciuto';
    } finally {
      this.loading = false;
    }
  }

  async copyToClipboard() {
    if (!this.result) return;

    try {
      // Usa la versione filtrata che esclude i nodi inattivi
      const filteredContent = this.generateFilteredTreeString();
      await navigator.clipboard.writeText(filteredContent);
      // Feedback visivo temporaneo
      const button = document.querySelector('.copy-button') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copiato!';
        button.disabled = true;
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 2000);
      }
    } catch (e) {
      this.error = 'Impossibile copiare nella clipboard';
    }
  }

  async browseFolder() {
    try {
      const selectedPath = await this.tauri.call<string>('open_folder_dialog');
      this.directoryPath = selectedPath;
      this.error = null;
    } catch (e: any) {
      // Se l'utente annulla la selezione, non mostrare errore
      if (!e?.toString?.().includes('Nessuna cartella selezionata')) {
        this.error = 'Errore nell\'apertura del dialog: ' + (e?.toString?.() ?? 'Errore sconosciuto');
      }
    }
  }

  clearResult() {
    this.result = null;
    this.error = null;
    this.parsedTree = [];
  }

  parseTreeString(treeString: string): TreeNode[] {
    const lines = treeString.split('\n').filter(line => line.trim());
    const nodes: TreeNode[] = [];
    const nodeStack: TreeNode[] = [];

    console.log('Parsing tree with lines:', lines);

    lines.forEach((line, index) => {
      const depth = this.getDepth(line);
      const cleanName = this.extractName(line);
      const originalLine = line;

      console.log(`Line ${index}: "${line}" -> depth: ${depth}, name: "${cleanName}"`);

      const node: TreeNode = {
        id: `node-${index}`,
        name: cleanName,
        level: depth,
        isActive: true,
        isDirectory: this.isDirectoryByName(cleanName),
        prefix: this.extractPrefix(line),
        connector: this.extractConnector(line),
        children: [],
      };

      // Rimuovi tutti i nodi dal stack che sono allo stesso livello o più profondi
      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= depth) {
        nodeStack.pop();
      }

      // Se c'è un nodo nello stack, questo è il parent
      if (nodeStack.length > 0) {
        const parent = nodeStack[nodeStack.length - 1];
        parent.children.push(node);
        node.parent = parent;
        console.log(`Added "${cleanName}" as child of "${parent.name}" (parent depth: ${parent.level}, child depth: ${depth})`);
      } else {
        nodes.push(node);
        console.log(`Added "${cleanName}" as root node`);
      }

      nodeStack.push(node);
    });

    console.log('Final parsed tree:', nodes);
    return nodes;
  }

  getDepth(line: string): number {
    // Se la linea non ha connector (├── o └──), è root (depth 0)
    if (!line.includes('├──') && !line.includes('└──')) {
      return 0;
    }

    // Trova la posizione del connector
    const connectorIndex = Math.max(line.indexOf('├──'), line.indexOf('└──'));

    // Conta l'indentazione prima del connector
    let indentation = 0;
    for (let i = 0; i < connectorIndex; i++) {
      if (line[i] === ' ') {
        indentation++;
      } else if (line[i] === '│') {
        // Ogni │ rappresenta un livello di indentazione
        indentation += 4; // Tratta │ come 4 spazi
      }
    }

    // Ogni 4 caratteri di indentazione = 1 livello di profondità
    const depth = Math.floor(indentation / 4) + 1; // +1 perché il connector stesso indica un livello

    console.log(`Depth calculation for "${line}": connector at ${connectorIndex}, indentation: ${indentation}, depth: ${depth}`);
    return depth;
  }

  extractName(line: string): string {
    // Rimuovi tutti i caratteri di formattazione e estrai solo il nome
    return line
      .replace(/^[\s│]*/, '')           // Rimuovi spazi e │ iniziali
      .replace(/^[├└]──\s*/, '')        // Rimuovi connector
      .trim();
  }

  extractPrefix(line: string): string {
    const match = line.match(/^([\s│]*)/);
    return match ? match[1] : '';
  }

  extractConnector(line: string): string {
    const match = line.match(/([├└]──\s*)/);
    return match ? match[1] : '';
  }

  isDirectoryByName(name: string): boolean {
    // Euristica semplice: se non ha estensione è probabilmente una directory
    return !name.includes('.') || name.endsWith('/') || name.endsWith('\\');
  }

  toggleNode(node: TreeNode): void {
    console.log('Toggling node:', node.name, 'from', node.isActive, 'to', !node.isActive);
    node.isActive = !node.isActive;
    this.toggleNodeChildren(node, node.isActive);
    console.log('Children after toggle:', node.children.map(c => ({ name: c.name, isActive: c.isActive })));

    // Forza il change detection
    this.cdr.detectChanges();
  }

  private toggleNodeChildren(node: TreeNode, isActive: boolean): void {
    node.children.forEach(child => {
      console.log('Setting child', child.name, 'to', isActive);
      child.isActive = isActive;
      this.toggleNodeChildren(child, isActive);
    });
  }

  generateFilteredTreeString(): string {
    return this.buildTreeString(this.parsedTree);
  }

  private buildTreeString(nodes: TreeNode[], isRoot: boolean = true): string {
    let result = '';

    if (isRoot && nodes.length > 0 && nodes[0].level === 0) {
      // Aggiungi la radice
      result += `${nodes[0].name}\n`;
      result += this.buildTreeString(nodes[0].children, false);

      // Processa gli altri nodi root se esistono
      for (let i = 1; i < nodes.length; i++) {
        if (nodes[i].isActive) {
          result += `${nodes[i].prefix}${nodes[i].connector}${nodes[i].name}\n`;
          result += this.buildTreeString(nodes[i].children, false);
        }
      }
    } else {
      nodes.forEach(node => {
        if (node.isActive) {
          result += `${node.prefix}${node.connector}${node.name}\n`;
          result += this.buildTreeString(node.children, false);
        }
      });
    }

    return result;
  }
}
