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

  isAutoCalculatedNr(domain: string): boolean {
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
      'Prevalência cognitiva',
      'Total'
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

  private calculateNormalizedAverage(
    domains: string[]
  ): number | null {
    const rows = domains.map(
      domain => this.findEgpRow(domain)
    );

    const hasMissingValue = rows.some(
      row =>
        row?.normalizedScore === null ||
        row?.normalizedScore === undefined
    );

    if (hasMissingValue) {
      return null;
    }

    const total = rows.reduce(
      (sum, row) =>
        sum + Number(row?.normalizedScore ?? 0),
      0
    );

    return Math.round(
      (total / domains.length) * 100
    ) / 100;
  }

  recalculateEgpSummary(): void {
    const physicalDomains = [
      'Mobilização articular dos membros superiores',
      'Mobilização articular dos membros inferiores'
    ];

    const motorDomains = [
      'Equilíbrio Estático I',
      'Equilíbrio Estático II',
      'Equilíbrio Dinâmico I',
      'Equilíbrio Dinâmico II',
      'Motricidade fina dos membros inferiores'
    ];

    const cognitiveDomains = [
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
    ];

    const physicalConstraints =
      this.calculateSum(physicalDomains);

    const physicalConstraintsNr =
      this.calculateNormalizedAverage(
        physicalDomains
      );

    const motorPrevalence =
      this.calculateSum(motorDomains);

    const motorPrevalenceNr =
      this.calculateNormalizedAverage(
        motorDomains
      );

    const cognitivePrevalence =
      this.calculateSum(cognitiveDomains);

    const cognitivePrevalenceNr =
      this.calculateNormalizedAverage(
        cognitiveDomains
      );

    const physicalRow =
      this.findEgpRow('Constrangimentos físicos');

    const motorRow =
      this.findEgpRow('Prevalência motora');

    const cognitiveRow =
      this.findEgpRow('Prevalência cognitiva');

    const totalRow =
      this.findEgpRow('Total');

    if (physicalRow) {
      physicalRow.score =
        physicalConstraints;

      physicalRow.normalizedScore =
        physicalConstraintsNr;
    }

    if (motorRow) {
      motorRow.score =
        motorPrevalence;

      motorRow.normalizedScore =
        motorPrevalenceNr;
    }

    if (cognitiveRow) {
      cognitiveRow.score =
        cognitivePrevalence;

      cognitiveRow.normalizedScore =
        cognitivePrevalenceNr;
    }

    if (totalRow) {
      const pdSummaries = [
        physicalConstraints,
        motorPrevalence,
        cognitivePrevalence
      ];

      const nrSummaries = [
        physicalConstraintsNr,
        motorPrevalenceNr,
        cognitivePrevalenceNr
      ];

      totalRow.score =
        pdSummaries.some(value => value === null)
          ? null
          : pdSummaries.reduce(
            (total: number, value) =>
              total + (value ?? 0),
            0
          );

      totalRow.normalizedScore =
        nrSummaries.some(
          value => value === null
        )
          ? null
          : Math.round(
          (
            nrSummaries.reduce(
              (total: number, value) =>
                total + (value ?? 0),
              0
            ) / 3
          ) * 100
        ) / 100;
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
