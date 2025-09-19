import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface CsvCell {
  value: string;
  columnIndex: number;
  rowIndex: number;
  isEscaped: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface CsvRow {
  cells: CsvCell[];
  columnCount: number;
  hasStructuralError: boolean;
  errorMessage?: string;
}

interface CsvAnalysis {
  rows: CsvRow[];
  expectedColumnCount: number;
  totalRows: number;
  structuralErrors: number;
  columns: string[];
  columnColors: string[];
}

@Component({
  selector: 'app-csv-analyzer',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './csv-analyzer.component.html',
  styleUrl: './csv-analyzer.component.scss'
})
export class CsvAnalyzerComponent {
  csvContent = '';
  delimiter = ',';
  hasHeader = true;
  analysis: CsvAnalysis | null = null;
  error: string | null = null;
  currentErrorIndex = 0;
  errorRows: number[] = [];

  readonly colorPalette = [
    '#e3f2fd', '#fce4ec', '#f3e5f5', '#e8f5e8', '#fff3e0',
    '#e1f5fe', '#fde7f3', '#f1e6ff', '#e8f6e8', '#fff8e1',
    '#e0f2f1', '#f9fbe7', '#fef7e0', '#f3e5ab', '#ede7f6',
    '#e8eaf6', '#e0f7fa', '#f1f8e9', '#fff9c4', '#ffecb3'
  ];

  analyzeCsv() {
    if (!this.csvContent.trim()) {
      this.error = 'Inserisci contenuto CSV da analizzare';
      return;
    }

    try {
      this.error = null;

      // Auto-rileva il delimitatore se non è stato specificato manualmente
      this.delimiter = this.detectDelimiter(this.csvContent);

      this.analysis = this.parseAndAnalyzeCsv(this.csvContent);
      this.updateErrorNavigation();
    } catch (e: any) {
      this.error = e?.message ?? 'Errore durante l\'analisi del CSV';
      this.analysis = null;
      this.errorRows = [];
      this.currentErrorIndex = 0;
    }
  }

  clearAnalysis() {
    this.csvContent = '';
    this.analysis = null;
    this.error = null;
    this.errorRows = [];
    this.currentErrorIndex = 0;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.csvContent = e.target?.result as string;
        this.analyzeCsv();
      };
      reader.readAsText(file);
    }
  }

  private detectDelimiter(content: string): string {
    const lines = content.split('\n').slice(0, 5); // Analizza prime 5 righe
    const delimiters = [',', ';', '|', '\t'];
    let bestDelimiter = ',';
    let maxConsistency = 0;

    for (const delimiter of delimiters) {
      let consistency = this.calculateDelimiterConsistency(lines, delimiter);
      if (consistency > maxConsistency) {
        maxConsistency = consistency;
        bestDelimiter = delimiter;
      }
    }

    return bestDelimiter;
  }

  private calculateDelimiterConsistency(lines: string[], delimiter: string): number {
    if (lines.length < 2) return 0;

    const columnCounts: number[] = [];

    for (const line of lines) {
      if (line.trim()) {
        const count = this.countDelimitersInLine(line, delimiter);
        columnCounts.push(count + 1); // +1 perché numero colonne = delimitatori + 1
      }
    }

    if (columnCounts.length < 2) return 0;

    // Calcola quanto sono consistenti i conteggi delle colonne
    const firstCount = columnCounts[0];
    const consistency = columnCounts.filter(count => count === firstCount).length / columnCounts.length;

    // Penalizza delimitatori che producono una sola colonna
    if (firstCount === 1) return consistency * 0.1;

    return consistency;
  }

  private countDelimitersInLine(line: string, delimiter: string): number {
    let count = 0;
    let inQuotes = false;
    let isEscaped = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"' && !isEscaped) {
        inQuotes = !inQuotes;
      } else if (char === '\\' && !isEscaped) {
        isEscaped = true;
        continue;
      } else if (char === delimiter && !inQuotes && !isEscaped) {
        count++;
      }

      isEscaped = false;
    }

    return count;
  }

  private parseAndAnalyzeCsv(content: string): CsvAnalysis {
    const lines = content.split('\n').filter(line => line.trim());
    const rows: CsvRow[] = [];
    let expectedColumnCount = 0;

    // Analizza prima riga per determinare numero di colonne atteso
    if (lines.length > 0) {
      const firstRowCells = this.parseCsvLine(lines[0], 0);
      expectedColumnCount = firstRowCells.length;
    }

    // Genera colori per le colonne
    const columnColors = this.generateColumnColors(expectedColumnCount);

    // Genera nomi colonne
    const columns = this.generateColumnNames(expectedColumnCount);

    let structuralErrors = 0;

    // Analizza tutte le righe
    lines.forEach((line, rowIndex) => {
      const cells = this.parseCsvLine(line, rowIndex);
      const hasStructuralError = cells.length !== expectedColumnCount;

      if (hasStructuralError) {
        structuralErrors++;
      }

      const row: CsvRow = {
        cells,
        columnCount: cells.length,
        hasStructuralError,
        errorMessage: hasStructuralError
          ? `Trovate ${cells.length} colonne, attese ${expectedColumnCount}`
          : undefined
      };

      rows.push(row);
    });

    return {
      rows,
      expectedColumnCount,
      totalRows: rows.length,
      structuralErrors,
      columns,
      columnColors
    };
  }

  private parseCsvLine(line: string, rowIndex: number): CsvCell[] {
    const cells: CsvCell[] = [];
    let currentCell = '';
    let inQuotes = false;
    let columnIndex = 0;
    let isEscaped = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !isEscaped) {
        inQuotes = !inQuotes;
        currentCell += char;
      } else if (char === '\\' && !isEscaped) {
        isEscaped = true;
        currentCell += char;
      } else if (char === this.delimiter && !inQuotes && !isEscaped) {
        // Fine cella
        cells.push({
          value: currentCell.trim(),
          columnIndex,
          rowIndex,
          isEscaped: currentCell.includes('\\'),
          hasError: false
        });
        currentCell = '';
        columnIndex++;
        isEscaped = false;
      } else {
        currentCell += char;
        if (isEscaped) {
          isEscaped = false;
        }
      }
    }

    // Ultima cella
    cells.push({
      value: currentCell.trim(),
      columnIndex,
      rowIndex,
      isEscaped: currentCell.includes('\\'),
      hasError: false
    });

    return cells;
  }

  private generateColumnColors(count: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.colorPalette[i % this.colorPalette.length]);
    }
    return colors;
  }

  private generateColumnNames(count: number): string[] {
    const columns: string[] = [];
    for (let i = 0; i < count; i++) {
      columns.push(`Col ${i + 1}`);
    }
    return columns;
  }

  getCellBackgroundColor(columnIndex: number): string {
    return this.analysis?.columnColors[columnIndex] ?? '#ffffff';
  }

  onDelimiterChange() {
    if (this.csvContent.trim() && this.analysis) {
      this.analyzeCsv();
    }
  }

  onHeaderChange() {
    if (this.csvContent.trim() && this.analysis) {
      // Non rianalizzare il CSV, solo aggiornare la visualizzazione
      // Il template già gestisce la logica di visualizzazione dell'header
    }
  }

  private updateErrorNavigation() {
    if (!this.analysis) return;

    this.errorRows = [];
    this.analysis.rows.forEach((row, index) => {
      if (row.hasStructuralError) {
        this.errorRows.push(index);
      }
    });

    this.currentErrorIndex = 0;
  }

  navigateToNextError() {
    if (this.errorRows.length === 0) return;

    this.currentErrorIndex = (this.currentErrorIndex + 1) % this.errorRows.length;
    this.scrollToErrorRow();
  }

  navigateToPreviousError() {
    if (this.errorRows.length === 0) return;

    this.currentErrorIndex = this.currentErrorIndex === 0
      ? this.errorRows.length - 1
      : this.currentErrorIndex - 1;
    this.scrollToErrorRow();
  }

  getCurrentErrorRowIndex(): number {
    if (this.errorRows.length === 0) return -1;
    return this.errorRows[this.currentErrorIndex];
  }

  isCurrentErrorRow(rowIndex: number): boolean {
    return rowIndex === this.getCurrentErrorRowIndex();
  }

  private scrollToErrorRow() {
    const currentErrorRow = this.getCurrentErrorRowIndex();
    if (currentErrorRow === -1) return;

    setTimeout(() => {
      const rowElement = document.querySelector(`[data-row-index="${currentErrorRow}"]`);
      if (rowElement) {
        rowElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  }

  getErrorNavigationText(): string {
    if (this.errorRows.length === 0) return 'Nessun errore';
    return `Errore ${this.currentErrorIndex + 1} di ${this.errorRows.length}`;
  }
}
