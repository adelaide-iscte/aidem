import { CommonModule } from '@angular/common';

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  EgpAssessment,
  PatientService,
  UpdateEgpRequest
} from '../../core/services/patient.service';

type EgpFormRow = {
  domain: string;
  score: number | null;
  normalizedScore: number | null;
  riskLevel: string | null;
  displayOrder: number;
};

@Component({
  selector: 'app-egp-edit-modal',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './egp-edit-modal.component.html',

  styleUrl:
    './egp-edit-modal.component.scss'
})
export class EgpEditModalComponent
  implements OnInit {

  @Input({ required: true })
  patientId!: number;

  @Input({ required: true })
  assessment!: EgpAssessment;

  @Input()
  patientName = '';

  @Output()
  cancel = new EventEmitter<void>();

  @Output()
  saved =
    new EventEmitter<EgpAssessment>();

  assessmentDate = '';
  egpRows: EgpFormRow[] = [];
  egpColumns: EgpFormRow[][] = [];

  isSaving = false;
  submitError = '';
  fieldErrors: string[] = [];

  constructor(
    private patientService: PatientService
  ) {}

  ngOnInit(): void {
    this.assessmentDate =
      this.assessment.assessmentDate;

    this.egpRows =
      this.assessment.rows
        .slice()
        .sort(
          (first, second) =>
            first.displayOrder -
            second.displayOrder
        )
        .map(row => ({
          domain: row.label,
          score: row.pd,

          normalizedScore:
          row.nr,

          riskLevel:
            this.hasRiskClassification(row.label)
              ? row.riskLevel || 'LOW'
              : null,

          displayOrder:
          row.displayOrder
        }));

    this.recalculateEgpSummary();

    const splitIndex = Math.ceil(
      this.egpRows.length / 2
    );

    this.egpColumns = [
      this.egpRows.slice(
        0,
        splitIndex
      ),

      this.egpRows.slice(
        splitIndex
      )
    ];
  }

  isSummaryRow(
    domain: string
  ): boolean {
    return [
      'Constrangimentos físicos',
      'Prevalência motora',
      'Prevalência cognitiva',
      'Total'
    ].includes(domain);
  }

  hasRiskClassification(
    domain: string
  ): boolean {
    return ![
      'Constrangimentos físicos',
      'Prevalência motora',
      'Prevalência cognitiva'
    ].includes(domain);
  }

  hasError(label: string): boolean {
    return this.fieldErrors.includes(
      label
    );
  }

  private findEgpRow(
    domain: string
  ): EgpFormRow | undefined {
    return this.egpRows.find(
      row => row.domain === domain
    );
  }

  private calculateSum(
    domains: string[]
  ): number | null {
    const rows = domains.map(
      domain =>
        this.findEgpRow(domain)
    );

    /*
     * Não apresenta resultados parciais.
     */
    const hasMissingValue =
      rows.some(
        row =>
          row?.score === null ||
          row?.score === undefined
      );

    if (hasMissingValue) {
      return null;
    }

    return rows.reduce(
      (total, row) =>
        total +
        Number(row?.score ?? 0),
      0
    );
  }

  recalculateEgpSummary(): void {
    const physicalConstraints =
      this.calculateSum([
        'Mobilização articular dos membros superiores',
        'Mobilização articular dos membros inferiores'
      ]);

    const motorPrevalence =
      this.calculateSum([
        'Equilíbrio Estático I',
        'Equilíbrio Estático II',
        'Equilíbrio Dinâmico I',
        'Equilíbrio Dinâmico II',
        'Motricidade fina dos membros inferiores'
      ]);

    const cognitivePrevalence =
      this.calculateSum([
        'Motricidade fina dos membros superiores',
        'Praxias',
        'Conhecimento das partes do corpo',
        'Vigilância',
        'Memória Percetiva',
        'Domínio Espacial',
        'Memória Verbal',
        'Perceção',
        'Domínio Temporal',
        'Comunicação'
      ]);

    const physicalRow =
      this.findEgpRow(
        'Constrangimentos físicos'
      );

    const motorRow =
      this.findEgpRow(
        'Prevalência motora'
      );

    const cognitiveRow =
      this.findEgpRow(
        'Prevalência cognitiva'
      );

    const totalRow =
      this.findEgpRow('Total');

    if (physicalRow) {
      physicalRow.score =
        physicalConstraints;
    }

    if (motorRow) {
      motorRow.score =
        motorPrevalence;
    }

    if (cognitiveRow) {
      cognitiveRow.score =
        cognitivePrevalence;
    }

    if (totalRow) {
      const summaries = [
        physicalConstraints,
        motorPrevalence,
        cognitivePrevalence
      ];

      const hasMissingSummary =
        summaries.some(
          value => value === null
        );

      totalRow.score =
        hasMissingSummary
          ? null
          : summaries.reduce(
            (
              total: number,
              value
            ) =>
              total + (value ?? 0),
            0
          );
    }
  }

  private validate(): boolean {
    this.recalculateEgpSummary();

    const errors: string[] = [];

    if (!this.assessmentDate) {
      errors.push(
        'Data da avaliação EGP'
      );
    }

    this.egpRows.forEach(row => {
      if (
        row.score === null ||
        row.score === undefined ||
        !Number.isFinite(
          Number(row.score)
        ) ||
        Number(row.score) < 0
      ) {
        errors.push(
          `EGP - ${row.domain} - PD`
        );
      }

      if (
        row.normalizedScore === null ||
        row.normalizedScore ===
        undefined ||
        !Number.isFinite(
          Number(row.normalizedScore)
        ) ||
        Number(
          row.normalizedScore
        ) < 0
      ) {
        errors.push(
          `EGP - ${row.domain} - NR`
        );
      }

      if (
        this.hasRiskClassification(
          row.domain
        ) &&
        !row.riskLevel
      ) {
        errors.push(
          `EGP - ${row.domain} - Risco`
        );
      }
    });

    this.fieldErrors = errors;

    return errors.length === 0;
  }

  async save(): Promise<void> {
    if (this.isSaving) {
      return;
    }

    this.submitError = '';

    if (!this.validate()) {
      this.submitError =
        'Existem campos obrigatórios por preencher.';

      return;
    }

    const payload:
      UpdateEgpRequest = {

      assessmentId:
      this.assessment.assessmentId,

      assessmentDate:
      this.assessmentDate,

      rows: this.egpRows.map(
        row => ({
          label: row.domain,

          pd:
            Number(row.score),

          nr:
            Number(
              row.normalizedScore
            ),

          riskLevel:
            this.hasRiskClassification(
              row.domain
            )
              ? row.riskLevel
              : null
        })
      )
    };

    this.isSaving = true;

    try {
      const updated =
        await this.patientService
          .updateLatestEgp(
            this.patientId,
            payload
          );

      this.saved.emit(updated);
    } catch (error) {
      console.error(
        'update EGP failed',
        error
      );

      this.submitError =
        error instanceof Error
          ? error.message
          : 'Erro ao atualizar dados EGP.';
    } finally {
      this.isSaving = false;
    }
  }

  cancelEditing(): void {
    if (!this.isSaving) {
      this.cancel.emit();
    }
  }
}
