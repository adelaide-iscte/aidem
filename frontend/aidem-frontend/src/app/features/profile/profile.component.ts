import { CommonModule } from '@angular/common';
import { Component, ChangeDetectorRef, EventEmitter, Input, Output } from '@angular/core';
import { EgpModalComponent } from '../../shared/egp-modal/src/app/shared/egp-modal/egp-modal.component';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import {
  EgpAssessment,
  PatientProfile,
  PatientService,
  SessionHistory,
  SessionHistoryExercise,
  UpdatePatientRequest
} from '../../core/services/patient.service';import {SideMenuComponent} from '../../shared/side-menu-modal/side-menu.component';
import {LoadingSpinnerComponent} from '../../shared/laoding-spinner-modal/loading-spinner.component';
import { FormsModule } from '@angular/forms';
import {
  ExerciseNotificationService
} from '../../core/services/exercise-notification.service';

type ProfileTab = 'dados' | 'sessoes';
type UserRole = 'informal' | 'formal';
type UserDataRow = [
  { label: string; value: string },
  { label: string; value: string }
];
import {
  DEFAULT_PATIENT_AVATAR,
  resizeProfileImage
} from '../../core/utils/image.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    EgpModalComponent,
    NotificationsPopoverComponent,
    SideMenuComponent,
    LoadingSpinnerComponent
  ],
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
  @Output() openAdminActivities = new EventEmitter<void>();
  @Output() openUserManagement = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() patientUpdated = new EventEmitter<PatientProfile>();
  @Output() patientDeleted = new EventEmitter<number>();

  showSideMenu = false;
  selectedSession: SessionHistory | null = null;
  isEditing = false;
  isSavingProfile = false;
  editError = '';
  showDeleteModal = false;
  isDeletingPatient = false;
  deleteError = '';
  avatarError = '';
  readonly maxBirthDate = new Date().toISOString().slice(0, 10);

  editForm: UpdatePatientRequest = this.createEmptyEditForm();

  get editablePatientAvatar(): string {
    return (
      this.editForm.avatar ||
      DEFAULT_PATIENT_AVATAR
    );
  }

  async onPatientAvatarSelected(
    event: Event
  ): Promise<void> {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    this.avatarError = '';

    try {
      const resizedAvatar =
        await resizeProfileImage(file);

      this.editForm = {
        ...this.editForm,
        avatar: resizedAvatar
      };

      this.cdr.detectChanges();

    } catch (error) {
      this.avatarError =
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar a fotografia.';

      this.cdr.detectChanges();

    } finally {
      input.value = '';
    }
  }

  removePatientAvatar(): void {
    this.editForm = {
      ...this.editForm,
      avatar: null
    };

    this.avatarError = '';
    this.cdr.detectChanges();
  }

  get headerAvatar(): string {
    if (this.isAdmin) {
      return '/icons/adm.svg';
    }

    return this.role === 'formal'
      ? '/icons/professional.svg'
      : '/icons/generic_user.svg';
  }

  get canEditProfile(): boolean {
    return (
      this.isAdmin ||
      this.role === 'formal'
    );
  }

  get canDeletePatient(): boolean {
    return (
      this.isAdmin ||
      this.role === 'formal'
    );
  }

  get patientGenderLabel(): string {
    switch (this.patient.gender) {
      case 'MALE':
        return 'Masculino';

      case 'FEMALE':
        return 'Feminino';

      case 'OTHER':
        return 'Outro';

      default:
        return this.patient.gender || '-';
    }
  }

  startEditing(): void {
    if (!this.canEditProfile) {
      return;
    }

    this.activeTab = 'dados';
    this.editError = '';
    this.avatarError = '';

    this.editForm =
      this.createEditForm(
        this.patient
      );

    this.isEditing = true;
  }

  cancelEditing(): void {
    this.avatarError = '';
    if (this.isSavingProfile) {
      return;
    }

    this.isEditing = false;
    this.editError = '';

    this.editForm =
      this.createEditForm(
        this.patient
      );
  }

  openDeleteModal(): void {
    if (
      !this.canDeletePatient ||
      this.isEditing
    ) {
      return;
    }

    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.isDeletingPatient) {
      return;
    }

    this.showDeleteModal = false;
    this.deleteError = '';
  }

  async confirmDelete(): Promise<void> {
    if (
      !this.canDeletePatient ||
      !this.patient?.id ||
      this.isDeletingPatient
    ) {
      return;
    }

    const patientId = this.patient.id;

    this.isDeletingPatient = true;
    this.deleteError = '';
    this.cdr.detectChanges();

    try {
      await this.patientService
        .deletePatient(patientId);

      this.showDeleteModal = false;
      this.isDeletingPatient = false;

      this.patientDeleted.emit(patientId);

    } catch (error) {
      console.error(
        'Erro ao remover utente:',
        error
      );

      this.deleteError =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o utente.';

      this.isDeletingPatient = false;
      this.cdr.detectChanges();
    }
  }

  async saveProfile(): Promise<void> {
    if (
      !this.canEditProfile ||
      !this.patient?.id ||
      this.isSavingProfile
    ) {
      return;
    }

    this.editError = '';

    if (!this.hasRequiredEditFields()) {
      this.editError =
        'Preencha todos os campos obrigatórios.';

      return;
    }

    if (
      this.editForm.email.trim() &&
      !this.isValidEmail(
        this.editForm.email
      )
    ) {
      this.editError =
        'Indique um email válido para o utente.';

      return;
    }

    if (
      this.editForm.informalCaregiverEmail.trim() &&
      !this.isValidEmail(
        this.editForm.informalCaregiverEmail
      )
    ) {
      this.editError =
        'Indique um email válido para o cuidador.';

      return;
    }

    const payload:
      UpdatePatientRequest = {

      fullName:
        this.editForm.fullName.trim(),

      birthDate:
      this.editForm.birthDate,

      gender:
      this.editForm.gender,

      diagnosisType:
        this.editForm
          .diagnosisType
          .trim(),

      phone:
        this.editForm.phone.trim(),

      email:
        this.editForm.email.trim(),

      address:
        this.editForm.address.trim(),

      education:
        this.editForm.education.trim(),

      profession:
        this.editForm.profession.trim(),
      avatar:
      this.editForm.avatar,
      sessionType:
        this.editForm.sessionType.trim(),

      informalCaregiverName:
        this.editForm
          .informalCaregiverName
          .trim(),

      informalCaregiverPhone:
        this.editForm
          .informalCaregiverPhone
          .trim(),

      informalCaregiverEmail:
        this.editForm
          .informalCaregiverEmail
          .trim()
    };

    this.isSavingProfile = true;

    try {
      const updatedPatient =
        await this.patientService
          .updatePatient(
            this.patient.id,
            payload
          );

      this.patient =
        updatedPatient;

      this.patientUpdated.emit(
        updatedPatient
      );

      this.editForm =
        this.createEditForm(
          updatedPatient
        );

      this.isEditing = false;

    } catch (error) {
      console.error(
        'Erro ao atualizar perfil do utente:',
        error
      );

      this.editError =
        error instanceof Error
          ? error.message
          : 'Não foi possível guardar as alterações.';

    } finally {
      this.isSavingProfile = false;
      this.cdr.detectChanges();
    }
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

  egpData: EgpAssessment | null = null;
  isLoadingEgp = false;
  egpError = '';

  constructor(
    private patientService: PatientService,
    public notificationService: ExerciseNotificationService,
    private cdr: ChangeDetectorRef
  ) {}

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

    if (this.showNotifications) {
      this.notificationService.markAsRead();
    }
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

  onEgpUpdated(
    assessment: EgpAssessment
  ): void {
    /*
     * Atualiza os dados em memória para que
     * a visualização e o gráfico apresentem
     * imediatamente os novos valores.
     */
    this.egpData = assessment;
    this.egpError = '';

    this.cdr.detectChanges();
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
          value: this.patientGenderLabel
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
        return 'Não concluído';

      case 'SKIPPED':
        return 'Não realizado';

      default:
        return 'Pendente';
    }
  }

  effectiveExerciseStatus(
    exercise: SessionHistoryExercise
  ): SessionHistoryExercise['status'] {

    if (exercise.status === 'SKIPPED') {
      return 'SKIPPED';
    }

    if (
      exercise.completed === false ||
      exercise.emotionFeedback?.toLowerCase() === 'no' ||
      exercise.emotionFeedback?.toLowerCase() === 'nao' ||
      exercise.emotionFeedback?.toLowerCase() === 'não'
    ) {
      return 'FAILED';
    }

    return exercise.status;
  }

  exerciseStatusReason(exercise: SessionHistoryExercise): string {
    const status = this.effectiveExerciseStatus(exercise);

    if (status === 'FAILED') {
      return exercise.caregiverReason
        ? `Observações: ${exercise.caregiverReason}`
        : 'O exercício foi realizado, mas não foi concluído.';
    }

    if (status === 'SKIPPED') {
      return exercise.caregiverReason
        ? `Motivo para não realizar: ${exercise.caregiverReason}`
        : 'O cuidador decidiu não realizar este exercício.';
    }

    if (status === 'COMPLETED') {
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

  private hasRequiredEditFields():
    boolean {

    return Boolean(
      this.editForm.fullName.trim() &&
      this.editForm.birthDate &&
      this.editForm.gender &&
      this.editForm
        .diagnosisType
        .trim() &&
      this.editForm.address.trim() &&
      this.editForm.education.trim() &&
      this.editForm.profession.trim() &&
      this.editForm.sessionType.trim() &&
      this.editForm
        .informalCaregiverName
        .trim()
    );
  }

  private isValidEmail(
    value: string
  ): boolean {

    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(value.trim())
    );
  }

  private createEditForm(
    patient: PatientProfile
  ): UpdatePatientRequest {

    return {
      fullName:
        patient.fullName ?? '',

      birthDate:
        patient.birthDate ?? '',

      gender:
        patient.gender ?? '',

      diagnosisType:
        patient.diagnosisType ?? '',

      phone:
        patient.phone ?? '',

      email:
        patient.email ?? '',

      address:
        patient.address ?? '',

      education:
        patient.education ?? '',

      profession:
        patient.profession ?? '',

      sessionType:
        patient.sessionType ?? '',

      informalCaregiverName:
        patient.informalCaregiverName ?? '',

      informalCaregiverPhone:
        patient.informalCaregiverPhone ?? '',

      informalCaregiverEmail:
        patient.informalCaregiverEmail ?? '',

      avatar:
        patient.avatar === DEFAULT_PATIENT_AVATAR
          ? null
          : patient.avatar
    };
  }

  private createEmptyEditForm():
    UpdatePatientRequest {

    return {
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
      avatar: null
    };
  }

}
