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
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .slice(0, 21);
  }

  get firstColumnRows(): EgpEntry[] {
    return this.visibleRows.slice(0, 10);
  }

  get secondColumnRows(): EgpEntry[] {
    return this.visibleRows.slice(10, 21);
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

  get polylinePoints(): string {
    const topPadding = 18;
    const rowHeight = 39.2;
    const usableWidth = 556;

    return this.chartRows
      .map((row, index) => {
        const clampedValue = Math.max(0, Math.min(6, row.nr));
        const x = (clampedValue / 6) * usableWidth;
        const y = topPadding + index * rowHeight;
        return `${x},${y}`;
      })
      .join(' ');
  }

  pointX(value: number): number {
    return (Math.max(0, Math.min(6, value)) / 6) * 556;
  }

  pointY(index: number): number {
    return 18 + index * 39.2;
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

