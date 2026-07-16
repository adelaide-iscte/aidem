import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {LoadingSpinnerComponent} from '../../../../../laoding-spinner-modal/loading-spinner.component';

type EgpEntry = {
  label: string;
  pd: number;
  nr: number;
  riskLevel?: string;
  displayOrder?: number;
  summary?: boolean;
};

type PatientCard = {
  title: string;
  name: string;
  avatar: string;
};

type UserDataRow = [
  { label: string; value: string },
  { label: string; value: string }
];

@Component({
  selector: 'app-egp-modal',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  templateUrl: './egp-modal.component.html',
  styleUrl: './egp-modal.component.scss'
})
export class EgpModalComponent {
  @Output() close = new EventEmitter<void>();

  @Input() patientCard: PatientCard = {
    title: 'Perfil do utente',
    name: '',
    avatar: '/icons/generic_user.svg'
  };

  @Input() userData: UserDataRow[] = [];
  @Input() rows: EgpEntry[] = [];
  @Input() isLoading = false;
  @Input() error = '';

  showGraphModal = false;

  get visibleRows(): EgpEntry[] {
    return this.rows
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  get firstColumnRows(): EgpEntry[] {
    return this.visibleRows.slice(0, this.columnSplitIndex);
  }

  get secondColumnRows(): EgpEntry[] {
    return this.visibleRows.slice(this.columnSplitIndex);
  }

  private get columnSplitIndex(): number {
    const rows = this.visibleRows;
    const totalRows = rows.length;

    if (totalRows === 0) {
      return 0;
    }

    const totalWeight = rows.reduce(
      (total, row) => total + this.rowWeight(row),
      0
    );

    const targetWeight = totalWeight / 2;
    let currentWeight = 0;
    let weightedSplitIndex = Math.ceil(totalRows / 2);

    for (let index = 0; index < totalRows; index++) {
      currentWeight += this.rowWeight(rows[index]);

      if (currentWeight >= targetWeight) {
        weightedSplitIndex = index + 1;
        break;
      }
    }

    /*
     * Mantém as colunas equilibradas em número de linhas.
     * Com 21 registos, o índice só pode ficar entre 10 e 11.
     */
    const minimumSplitIndex = Math.floor(totalRows / 2);
    const maximumSplitIndex = Math.ceil(totalRows / 2);

    return Math.max(
      minimumSplitIndex,
      Math.min(weightedSplitIndex, maximumSplitIndex)
    );
  }

  private rowWeight(row: EgpEntry): number {
    /*
     * Os nomes maiores quebram em duas linhas e ocupam mais espaço.
     * Por isso contam como duas linhas ao equilibrar as colunas.
     */
    return row.label.length > 34 ? 2 : 1;
  }

  get chartRows(): EgpEntry[] {
    return this.visibleRows;
  }

  formatScore(value: number): string {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  }

  get chartPath(): string {
    return this.chartRows
      .map((row, index) => {
        const x = this.pointX(row.nr);
        const y = this.pointY(index);

        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  pointX(value: number): number {
    return (Math.max(0, Math.min(6, value)) / 6) * 556;
  }

  isSummaryRow(label: string): boolean {
    const normalizedLabel = label
      .trim()
      .toLocaleLowerCase('pt-PT');

    return [
      'constrangimentos físicos',
      'prevalência motora',
      'prevalência cognitiva',
      'total'
    ].includes(normalizedLabel);
  }

  pointY(index: number): number {
    const chartHeight = 800;
    const numberOfRows = this.chartRows.length;

    if (numberOfRows === 0) {
      return 0;
    }

    const rowHeight = chartHeight / numberOfRows;

    // Centro da faixa correspondente à linha.
    return rowHeight * (index + 0.5);
  }

  openGraph(): void {
    if (this.rows.length > 0) {
      this.showGraphModal = true;
    }
  }

  closeGraph(): void {
    this.showGraphModal = false;
  }

  closeModal(): void {
    this.close.emit();
  }

}

