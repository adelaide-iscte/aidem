import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, EventEmitter, Input, Output } from '@angular/core';
import { EgpModalComponent } from '../../shared/egp-modal/src/app/shared/egp-modal/egp-modal.component';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import {EgpAssessment, PatientProfile, PatientService, SessionHistory} from '../../core/services/patient.service';

type ProfileTab = 'dados' | 'sessoes';
type UserRole = 'informal' | 'formal';
type UserDataRow = [
  { label: string; value: string },
  { label: string; value: string }
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, EgpModalComponent, NotificationsPopoverComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  @Input() role: UserRole = 'informal';
  @Input() patient!: PatientProfile;

  @Output() goHome = new EventEmitter<void>();
  @Output() openActivities = new EventEmitter<void>();

  sessionHistory: SessionHistory[] = [];
  isLoadingSessions = false;
  sessionsError = '';

  showEgpModal = false;
  showNotifications = false;
  constructor(
    private patientService: PatientService,
    private cdr: ChangeDetectorRef
  ) {}
  egpData: EgpAssessment | null = null;
  isLoadingEgp = false;
  egpError = '';


  get patientSubtitle(): string {
    return this.patient.subtitle ?? `${this.patient.age} anos - Paciente com demência`;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  async openEgpModal(): Promise<void> {
    if (!this.patient?.id || this.isLoadingEgp) return;

    this.showEgpModal = true;
    this.isLoadingEgp = true;
    this.egpError = '';
    this.egpData = null;
    this.cdr.detectChanges();

    try {
      this.egpData = await this.patientService.getLatestEgp(this.patient.id);
      console.log('EGP LOADED:', this.egpData);
    } catch (error) {
      console.error('load EGP failed', error);
      this.egpError =
        error instanceof Error ? error.message : 'Erro ao carregar dados EGP.';
    } finally {
      this.isLoadingEgp = false;
      this.cdr.detectChanges();
    }
  }

  get egpUserData(): UserDataRow[] {
    return [
      [
        {
          label: 'Examinando',
          value: this.patient.code
        },
        {
          label: 'Sexo',
          value: this.patient.gender === 'MALE'
            ? 'Masculino'
            : 'Feminino'
        }
      ],

      [
        {
          label: 'Sessão',
          value: this.patient.sessionType || '-'
        },
        {
          label: 'Escolaridade',
          value: this.patient.education || '-'
        }
      ],

      [
        {
          label: 'Idade',
          value: `${this.patient.age} anos`
        },
        {
          label: 'Profissão',
          value: this.patient.profession || '-'
        }
      ]
    ];
  }

  closeEgpModal(): void {
    this.showEgpModal = false;
  }

  async loadSessionHistory(): Promise<void> {
    if (!this.patient?.id || this.isLoadingSessions) return;

    this.isLoadingSessions = true;
    this.sessionsError = '';

    try {
      this.sessionHistory = await this.patientService.getSessionHistory(this.patient.id);
      console.log('SESSION HISTORY LOADED:', this.sessionHistory);
    } catch (error) {
      console.error('loadSessionHistory failed', error);
      this.sessionsError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar histórico de sessões.';
    } finally {
      this.isLoadingSessions = false;
      this.cdr.detectChanges();
    }
  }

  activeTab: ProfileTab = 'dados';

  async setTab(tab: ProfileTab): Promise<void> {
    this.activeTab = tab;

    if (tab === 'sessoes' && this.sessionHistory.length === 0) {
      await this.loadSessionHistory();
    }
  }

  formatSessionDate(date: string): string {
    const parsedDate = new Date(date + 'T00:00:00');

    return new Intl.DateTimeFormat('pt-PT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(parsedDate);
  }

}
