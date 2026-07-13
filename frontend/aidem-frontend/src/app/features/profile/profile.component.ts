import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, EventEmitter, Input, Output } from '@angular/core';
import { EgpModalComponent } from '../../shared/egp-modal/src/app/shared/egp-modal/egp-modal.component';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import {EgpAssessment, PatientProfile, PatientService, SessionHistory, SessionHistoryExercise} from '../../core/services/patient.service';
import {SideMenuComponent} from '../../shared/side-menu-modal/side-menu.component';
import {LoadingSpinnerComponent} from '../../shared/laoding-spinner-modal/loading-spinner.component';

type ProfileTab = 'dados' | 'sessoes';
type UserRole = 'informal' | 'formal';
type UserDataRow = [
  { label: string; value: string },
  { label: string; value: string }
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, EgpModalComponent, NotificationsPopoverComponent, SideMenuComponent, LoadingSpinnerComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  @Input() role: UserRole = 'informal';
  @Input() patient!: PatientProfile;
  @Input() isAdmin = false;

  @Output() goHome = new EventEmitter<void>();
  @Output() openActivities = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  @Output()
  openAdminActivities =
    new EventEmitter<void>();

  @Output()
  logout = new EventEmitter<void>();

  showSideMenu = false;
  selectedSession: SessionHistory | null = null;

  get headerAvatar(): string {
    if (this.isAdmin) {
      return '/icons/adm.svg';
    }

    return this.role === 'formal'
      ? '/icons/professional.svg'
      : '/icons/generic_user.svg';
  }

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }


  sessionHistory: SessionHistory[] = [];
  isLoadingSessions = false;
  sessionsError = '';
  expandedSessionId: number | null = null;

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
    if (
      this.role !== 'informal' ||
      this.isAdmin
    ) {
      return;
    }

    this.showNotifications =
      !this.showNotifications;
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
    if (!this.patient?.id || this.isLoadingSessions) {
      return;
    }

    this.isLoadingSessions = true;
    this.sessionsError = '';

    try {
      this.sessionHistory =
        await this.patientService.getSessionHistory(
          this.patient.id
        );

      console.log(
        'SESSION HISTORY LOADED:',
        this.sessionHistory
      );
    } catch (error) {
      console.error(
        'Erro ao carregar histórico:',
        error
      );

      this.sessionsError =
        'Não foi possível carregar o histórico de sessões.';
    } finally {
      this.isLoadingSessions = false;
      console.log(
        'LOADING TERMINADO:',
        this.isLoadingSessions
      );
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

  openSessionDetails(session: SessionHistory): void {
    this.selectedSession = session;
  }

  closeSessionDetails(): void {
    this.selectedSession = null;
  }

  exerciseStatusLabel(status: SessionHistoryExercise['status']): string {
    switch (status) {
      case 'COMPLETED':
        return 'Concluído';
      case 'FAILED':
        return 'Não conseguido';
      case 'SKIPPED':
        return 'Não realizado';
      default:
        return 'Pendente';
    }
  }

  exerciseStatusReason(exercise: SessionHistoryExercise): string {
    if (exercise.status === 'FAILED') {
      return exercise.caregiverReason
        ? `Motivo indicado: ${exercise.caregiverReason}`
        : 'O exercício foi tentado, mas não foi conseguido.';
    }

    if (exercise.status === 'SKIPPED') {
      return exercise.caregiverReason
        ? `Motivo para não realizar: ${exercise.caregiverReason}`
        : 'O cuidador decidiu não realizar este exercício.';
    }

    if (exercise.status === 'COMPLETED') {
      return exercise.caregiverReason
        ? `Observações: ${exercise.caregiverReason}`
        : 'Exercício realizado.';
    }

    return 'Ainda não existe registo para este exercício.';
  }

  difficultyFeedbackLabel(value: string | null): string {
    switch (value) {
      case 'EASY':
        return 'Fácil';
      case 'OK':
        return 'Média';
      case 'HARD':
        return 'Difícil';
      case 'TOO_HARD':
        return 'Muito difícil';
      default:
        return '-';
    }
  }

  completionAnswerLabel(value: string | null): string {
    switch (value) {
      case 'yes':
      case 'YES':
      case 'sim':
        return 'Sim';

      case 'almost':
      case 'ALMOST':
      case 'quase':
        return 'Quase';

      case 'no':
      case 'NO':
      case 'nao':
      case 'não':
        return 'Não';

      default:
        return '-';
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
