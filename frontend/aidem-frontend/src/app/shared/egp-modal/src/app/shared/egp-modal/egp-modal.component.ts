import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import {
  LoadingSpinnerComponent
} from '../../../../../laoding-spinner-modal/loading-spinner.component';

import {
  EgpEditModalComponent
} from '../../../../../egp-edit-modal/egp-edit-modal.component';

import type {
  EgpAssessment,
  EgpRow
} from '../../../../../../core/services/patient.service';

type PatientCard = {
  title: string;
  name: string;
  avatar: string;
};

type UserDataRow = [
  {
    label: string;
    value: string;
  },
  {
    label: string;
    value: string;
  }
];

@Component({
  selector: 'app-egp-modal',
  standalone: true,

  imports: [
    CommonModule,
    LoadingSpinnerComponent,
    EgpEditModalComponent
  ],

  templateUrl:
    './egp-modal.component.html',

  styleUrl:
    './egp-modal.component.scss'
})
export class EgpModalComponent {

  @Output()
  close = new EventEmitter<void>();

  @Output()
  updated =
    new EventEmitter<EgpAssessment>();

  @Input()
  patientCard: PatientCard = {
    title: 'Perfil do utente',
    name: '',
    avatar: '/icons/generic_user.svg'
  };

  @Input()
  userData: UserDataRow[] = [];

  @Input()
  rows: EgpRow[] = [];

  @Input()
  patientId: number | null = null;

  @Input()
  assessmentId: number | null = null;

  @Input()
  assessmentDate = '';

  @Input()
  canEdit = false;

  @Input()
  isLoading = false;

  @Input()
  error = '';

  showGraphModal = false;
  showEditModal = false;

  private readonly chartWidth = 600;

  get visibleRows(): EgpRow[] {
    return this.rows
      .slice()
      .sort(
        (first, second) =>
          (first.displayOrder ?? 0) -
          (second.displayOrder ?? 0)
      );
  }

  get firstColumnRows(): EgpRow[] {
    return this.visibleRows.slice(
      0,
      this.columnSplitIndex
    );
  }

  get secondColumnRows(): EgpRow[] {
    return this.visibleRows.slice(
      this.columnSplitIndex
    );
  }

  private get columnSplitIndex(): number {
    const rows = this.visibleRows;
    const totalRows = rows.length;

    if (totalRows === 0) {
      return 0;
    }

    const totalWeight = rows.reduce(
      (total, row) =>
        total + this.rowWeight(row),
      0
    );

    const targetWeight =
      totalWeight / 2;

    let currentWeight = 0;

    let weightedSplitIndex =
      Math.ceil(totalRows / 2);

    for (
      let index = 0;
      index < totalRows;
      index++
    ) {
      currentWeight +=
        this.rowWeight(rows[index]);

      if (
        currentWeight >=
        targetWeight
      ) {
        weightedSplitIndex =
          index + 1;

        break;
      }
    }

    const minimumSplitIndex =
      Math.floor(totalRows / 2);

    const maximumSplitIndex =
      Math.ceil(totalRows / 2);

    return Math.max(
      minimumSplitIndex,

      Math.min(
        weightedSplitIndex,
        maximumSplitIndex
      )
    );
  }

  private rowWeight(
    row: EgpRow
  ): number {
    /*
     * Os nomes maiores podem ocupar
     * duas linhas.
     */
    return row.label.length > 34
      ? 2
      : 1;
  }

  get chartRows(): EgpRow[] {
    return this.visibleRows;
  }

  formatScore(
    value: number
  ): string {
    return new Intl.NumberFormat(
      'pt-PT',
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }
    ).format(value);
  }

  pointX(value: number): number {
    const clampedValue =
      Math.max(
        0,
        Math.min(6, value)
      );

    return (
      clampedValue / 6
    ) * this.chartWidth;
  }

  pointY(index: number): number {
    return index + 0.5;
  }

  get chartPath(): string {
    return this.chartRows
      .map(
        (row, index) => {
          const command =
            index === 0
              ? 'M'
              : 'L';

          return (
            `${command} ` +
            `${this.pointX(row.nr)} ` +
            `${this.pointY(index)}`
          );
        }
      )
      .join(' ');
  }

  isSummaryRow(
    label: string
  ): boolean {
    const normalizedLabel =
      label
        .trim()
        .toLocaleLowerCase(
          'pt-PT'
        );

    return [
      'constrangimentos físicos',
      'prevalência motora',
      'prevalência cognitiva',
      'total'
    ].includes(normalizedLabel);
  }

  openGraph(): void {
    if (this.rows.length > 0) {
      this.showGraphModal = true;
    }
  }

  closeGraph(): void {
    this.showGraphModal = false;
  }

  /*
   * Constrói a avaliação que será
   * enviada para o modal de edição.
   */
  get editableAssessment():
    EgpAssessment | null {

    if (this.assessmentId === null) {
      return null;
    }

    return {
      assessmentId:
      this.assessmentId,

      assessmentDate:
      this.assessmentDate,

      rows:
      this.rows
    };
  }

  openEditModal(): void {
    if (
      !this.canEdit ||
      this.patientId === null ||
      this.editableAssessment === null
    ) {
      return;
    }

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  onEgpSaved(
    assessment: EgpAssessment
  ): void {
    /*
     * Atualiza imediatamente os valores
     * apresentados e utilizados no gráfico.
     */
    this.assessmentId =
      assessment.assessmentId;

    this.assessmentDate =
      assessment.assessmentDate;

    this.rows =
      assessment.rows;

    this.showEditModal = false;

    this.updated.emit(
      assessment
    );
  }

  closeModal(): void {
    this.close.emit();
  }
}
