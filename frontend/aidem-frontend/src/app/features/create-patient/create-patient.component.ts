import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePatientRequest, PatientService } from '../../core/services/patient.service';

type PatientForm = {
  fullName: string;
  birthDate: string;
  gender: string;
  diagnosisType: string;
  phone: string;
  email: string;
  address: string;
  education: string;
  profession: string;
  sessionType: string;
  informalCaregiverName: string;
  informalCaregiverPhone: string;
  informalCaregiverEmail: string;
  notes: string;
  assessmentDate: string;
};

type EgpFormRow = {
  domain: string;
  score: number | null;
  normalizedScore: number | null;
  riskLevel: string;
  displayOrder: number;
};

@Component({
  selector: 'app-create-patient',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-patient.component.html',
  styleUrl: './create-patient.component.scss'
})
export class CreatePatientComponent {
  @Output() cancel = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  isSaving = false;
  submitError = '';
  fieldErrors: string[] = [];

  form: PatientForm = {
    fullName: '',
    birthDate: '',
    gender: '',
    diagnosisType: '',
    phone: '',
    email: '',
    address: '',
    education: '',
    profession: '',
    sessionType: '',
    informalCaregiverName: '',
    informalCaregiverPhone: '',
    informalCaregiverEmail: '',
    notes: '',
    assessmentDate: new Date().toISOString().slice(0, 10)
  };

  egpRows: EgpFormRow[] = [
    { domain: 'Equilíbrio Estático I', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 1 },
    { domain: 'Equilíbrio Estático II', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 2 },
    { domain: 'Equilíbrio Dinâmico I', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 3 },
    { domain: 'Equilíbrio Dinâmico II', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 4 },
    { domain: 'Mobilização articular dos membros superiores', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 5 },
    { domain: 'Mobilização articular dos membros inferiores', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 6 },
    { domain: 'Motricidade fina dos membros superiores', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 7 },
    { domain: 'Motricidade fina dos membros inferiores', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 8 },
    { domain: 'Praxias', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 9 },
    { domain: 'Conhecimento das partes do corpo', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 10 },
    { domain: 'Vigilância', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 11 },
    { domain: 'Memória Percetiva', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 12 },
    { domain: 'Domínio Espacial', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 13 },
    { domain: 'Memória Verbal', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 14 },
    { domain: 'Perceção', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 15 },
    { domain: 'Domínio Temporal', score: null, normalizedScore: null, riskLevel: 'LOW', displayOrder: 16 },
    {
      domain: 'Comunicação',
      score: null,
      normalizedScore: null,
      riskLevel: 'LOW',
      displayOrder: 17
    },
    {
      domain: 'Constrangimentos físicos',
      score: null,
      normalizedScore: null,
      riskLevel: 'LOW',
      displayOrder: 18
    },
    {
      domain: 'Prevalência motora',
      score: null,
      normalizedScore: null,
      riskLevel: 'LOW',
      displayOrder: 19
    },
    {
      domain: 'Prevalência cognitiva',
      score: null,
      normalizedScore: null,
      riskLevel: 'LOW',
      displayOrder: 20
    },
    {
      domain: 'Total',
      score: null,
      normalizedScore: null,
      riskLevel: 'LOW',
      displayOrder: 21
    }
  ];

  constructor(private patientService: PatientService) {}

  isSummaryRow(domain: string): boolean {
    return [
      'Constrangimentos físicos',
      'Prevalência motora',
      'Prevalência cognitiva',
      'Total'
    ].includes(domain);
  }

  private findEgpRow(domain: string): EgpFormRow | undefined {
    return this.egpRows.find(row => row.domain === domain);
  }

  private calculateSum(domains: string[]): number | null {
    const rows = domains.map(domain => this.findEgpRow(domain));

    /*
     * Não apresenta um resultado parcial.
     * Só calcula quando todos os campos necessários estiverem preenchidos.
     */
    const hasMissingValue = rows.some(
      row => row?.score === null || row?.score === undefined
    );

    if (hasMissingValue) {
      return null;
    }

    return rows.reduce(
      (total, row) => total + Number(row?.score ?? 0),
      0
    );
  }

  recalculateEgpSummary(): void {
    const physicalConstraints = this.calculateSum([
      'Mobilização articular dos membros superiores',
      'Mobilização articular dos membros inferiores'
    ]);

    const motorPrevalence = this.calculateSum([
      'Equilíbrio Estático I',
      'Equilíbrio Estático II',
      'Equilíbrio Dinâmico I',
      'Equilíbrio Dinâmico II',
      'Motricidade fina dos membros inferiores'
    ]);

    const cognitivePrevalence = this.calculateSum([
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

    const physicalRow = this.findEgpRow('Constrangimentos físicos');
    const motorRow = this.findEgpRow('Prevalência motora');
    const cognitiveRow = this.findEgpRow('Prevalência cognitiva');
    const totalRow = this.findEgpRow('Total');

    if (physicalRow) {
      physicalRow.score = physicalConstraints;
    }

    if (motorRow) {
      motorRow.score = motorPrevalence;
    }

    if (cognitiveRow) {
      cognitiveRow.score = cognitivePrevalence;
    }

    if (totalRow) {
      const summaries = [
        physicalConstraints,
        motorPrevalence,
        cognitivePrevalence
      ];

      if (summaries.some(value => value === null)) {
        totalRow.score = null;
      } else {
        totalRow.score = summaries.reduce(
          (total: number, value) => total + (value ?? 0),
          0
        );
      }
    }
  }

  hasError(label: string): boolean {
    return this.fieldErrors.includes(label);
  }

  validate(): boolean {
    this.recalculateEgpSummary();
    const errors: string[] = [];

    if (!this.form.fullName.trim()) errors.push('Nome');
    if (!this.form.birthDate) errors.push('Data de nascimento');
    if (!this.form.gender) errors.push('Sexo');
    if (!this.form.diagnosisType.trim()) errors.push('Diagnóstico');
    if (!this.form.address.trim()) errors.push('Morada');
    if (!this.form.education.trim()) errors.push('Escolaridade');
    if (!this.form.profession.trim()) errors.push('Profissão');
    if (!this.form.sessionType.trim()) errors.push('Sessão');
    if (!this.form.informalCaregiverName.trim()) errors.push('Nome do cuidador');
    if (!this.form.informalCaregiverPhone.trim()) errors.push('Telefone do cuidador');
    if (!this.form.informalCaregiverEmail.trim()) errors.push('Email do cuidador');
    if (!this.form.assessmentDate) errors.push('Data da avaliação EGP');

    this.egpRows.forEach((row) => {
      if (row.score === null || row.score === undefined) {
        errors.push(`EGP - ${row.domain} - PD`);
      }

      if (row.normalizedScore === null || row.normalizedScore === undefined) {
        errors.push(`EGP - ${row.domain} - NR`);
      }

      if (!row.riskLevel) {
        errors.push(`EGP - ${row.domain} - Risco`);
      }
    });

    this.fieldErrors = errors;
    return errors.length === 0;
  }

  async save(): Promise<void> {
    this.submitError = '';
    this.recalculateEgpSummary();

    if (!this.validate()) {
      this.submitError = 'Existem campos obrigatórios por preencher.';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.isSaving = true;

    const payload: CreatePatientRequest = {
      fullName: this.form.fullName.trim(),
      birthDate: this.form.birthDate,
      gender: this.form.gender,
      diagnosisType: this.form.diagnosisType.trim(),
      phone: this.form.phone.trim(),
      email: this.form.email.trim(),
      address: this.form.address.trim(),
      education: this.form.education.trim(),
      profession: this.form.profession.trim(),
      sessionType: 'Formação',
      informalCaregiverName: this.form.informalCaregiverName.trim(),
      informalCaregiverPhone: this.form.informalCaregiverPhone.trim(),
      informalCaregiverEmail: this.form.informalCaregiverEmail.trim(),
      notes: this.form.notes.trim(),
      assessmentDate: this.form.assessmentDate,
      egpScores: this.egpRows.map((row) => ({
        domain: row.domain,
        score: Number(row.score),
        normalizedScore: Number(row.normalizedScore),
        riskLevel: row.riskLevel,
        displayOrder: row.displayOrder
      }))
    };

    try {
      await this.patientService.createPatient(payload);
      this.created.emit();
    } catch (error) {
      console.error(error);
      this.submitError =
        error instanceof Error
          ? error.message
          : 'Erro ao criar utente.';
    } finally {
      this.isSaving = false;
    }
  }

  cancelCreation(): void {
    this.cancel.emit();
  }
}
