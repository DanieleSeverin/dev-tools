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
  ignorePatterns = '';
  hoveredNode: TreeNode | null = null;

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

      // Applica i pattern di ignore
      this.applyIgnorePatterns();
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

  addNodeToIgnoreList(node: TreeNode): void {
    const patterns = this.getIgnorePatternsArray();
    if (!patterns.includes(node.name)) {
      patterns.push(node.name);
      this.ignorePatterns = patterns.join('\n');
      this.applyIgnorePatterns();
    }
  }

  removeNodeFromIgnoreList(node: TreeNode): void {
    const patterns = this.getIgnorePatternsArray();
    const index = patterns.indexOf(node.name);
    if (index > -1) {
      patterns.splice(index, 1);
      this.ignorePatterns = patterns.join('\n');

      // Riattiva il nodo e tutti i suoi figli quando viene rimosso dall'ignore
      this.reactivateNodeAndChildren(node);

      // Riapplica i pattern per assicurarsi che tutto sia consistente
      this.applyIgnorePatterns();
    }
  }

  onIgnorePatternsChange(): void {
    this.applyIgnorePatterns();
  }

  isNodeInIgnoreList(node: TreeNode): boolean {
    return this.getIgnorePatternsArray().includes(node.name);
  }

  isNodeOrParentIgnored(node: TreeNode): boolean {
    // Controlla se il nodo stesso è ignorato
    if (this.isNodeInIgnoreList(node)) {
      return true;
    }

    // Controlla se qualche parent è ignorato
    let currentParent = node.parent;
    while (currentParent) {
      if (this.isNodeInIgnoreList(currentParent)) {
        return true;
      }
      currentParent = currentParent.parent;
    }

    return false;
  }

  private getIgnorePatternsArray(): string[] {
    return this.ignorePatterns
      .split('\n')
      .map(pattern => pattern.trim())
      .filter(pattern => pattern.length > 0);
  }

  private applyIgnorePatterns(): void {
    if (!this.parsedTree.length) return;

    // Prima riattiva tutti i nodi che non sono disattivati manualmente
    this.resetNodesToDefaultState(this.parsedTree);

    const patterns = this.getIgnorePatternsArray();
    if (patterns.length > 0) {
      this.applyIgnorePatternsToNodes(this.parsedTree, patterns);
    }
  }

  private reactivateNodeAndChildren(node: TreeNode): void {
    // Riattiva il nodo solo se non è figlio di un parent ignorato
    if (!this.hasIgnoredParent(node)) {
      node.isActive = true;
      // Riattiva ricorsivamente tutti i figli
      this.toggleNodeChildren(node, true);
    }
  }

  private hasIgnoredParent(node: TreeNode): boolean {
    let currentParent = node.parent;
    while (currentParent) {
      if (this.isNodeInIgnoreList(currentParent)) {
        return true;
      }
      currentParent = currentParent.parent;
    }
    return false;
  }

  private resetNodesToDefaultState(nodes: TreeNode[]): void {
    nodes.forEach(node => {
      // Riattiva tutti i nodi per default
      node.isActive = true;
      this.resetNodesToDefaultState(node.children);
    });
  }

  private applyIgnorePatternsToNodes(nodes: TreeNode[], patterns: string[]): void {
    nodes.forEach(node => {
      const shouldIgnore = patterns.some(pattern => {
        // Evita pattern vuoti o solo asterisco
        if (!pattern || pattern.trim() === '*') {
          return false;
        }

        // Debug: stampa il confronto
        console.log(`Testing pattern "${pattern}" against node "${node.name}"`);

        // Pattern matching: può essere nome esatto o wildcard
        if (pattern.includes('*')) {
          try {
            // Sostituisci * con un placeholder temporaneo, esegui escape, poi rimetti .*
            const placeholder = '__ASTERISK_PLACEHOLDER__';
            const escapedPattern = pattern
              .replace(/\*/g, placeholder)  // Sostituisci * con placeholder
              .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape caratteri speciali
              .replace(new RegExp(placeholder, 'g'), '.*');  // Rimetti .* per *

            const regex = new RegExp('^' + escapedPattern + '$', 'i');
            const matches = regex.test(node.name);
            console.log(`  Wildcard pattern "${pattern}" -> regex "^${escapedPattern}$" -> matches: ${matches}`);
            return matches;
          } catch (e) {
            console.log(`  Regex error for pattern "${pattern}":`, e);
            // Se la regex non è valida, usa matching esatto
            return node.name === pattern;
          }
        }
        const exactMatch = node.name === pattern;
        console.log(`  Exact match "${pattern}" -> matches: ${exactMatch}`);
        return exactMatch;
      });

      if (shouldIgnore) {
        console.log(`  -> Disabling node "${node.name}"`);
        node.isActive = false;
        // Se il nodo è ignorato, ignora anche tutti i suoi figli
        this.toggleNodeChildren(node, false);
      }

      // Applica ricorsivamente ai figli
      this.applyIgnorePatternsToNodes(node.children, patterns);
    });
  }

  parseTreeString(treeString: string): TreeNode[] {
    const lines = treeString.split('\n').filter(line => line.trim());
    const nodes: TreeNode[] = [];
    const nodeStack: TreeNode[] = [];

    lines.forEach((line, index) => {
      const depth = this.getDepth(line);
      const cleanName = this.extractName(line);

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
      } else {
        nodes.push(node);
      }

      nodeStack.push(node);
    });

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
    // Non permettere di riattivare un nodo se lui o un parent è nella lista di ignore
    if (!node.isActive && this.isNodeOrParentIgnored(node)) {
      return;
    }

    node.isActive = !node.isActive;
    this.toggleNodeChildren(node, node.isActive);

    // Forza il change detection
    this.cdr.detectChanges();
  }

  private toggleNodeChildren(node: TreeNode, isActive: boolean): void {
    node.children.forEach(child => {
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
