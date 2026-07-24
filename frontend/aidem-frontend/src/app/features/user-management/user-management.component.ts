import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  AppPatient,
  PatientService
} from '../../core/services/patient.service';

import {
  CaregiverRole,
  CaregiverUser,
  SaveCaregiverUserPayload,
  UserManagementService
} from '../../core/services/user-management.service';

import {
  LoadingSpinnerComponent
} from '../../shared/laoding-spinner-modal/loading-spinner.component';

import {
  DEFAULT_FORMAL_AVATAR,
  DEFAULT_INFORMAL_AVATAR,
  resizeProfileImage
} from '../../core/utils/image.util';

type RoleFilter =
  | 'ALL'
  | CaregiverRole;

type PageMode =
  | 'list'
  | 'form';

type CaregiverForm = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: CaregiverRole;
  avatar: string | null;
  patientIds: number[];
};

@Component({
  selector: 'app-user-management',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent
  ],

  templateUrl:
    './user-management.component.html',

  styleUrl:
    './user-management.component.scss'
})
export class UserManagementComponent
  implements OnInit {

  @Output()
  goBack =
    new EventEmitter<void>();

  caregivers: CaregiverUser[] = [];
  patients: AppPatient[] = [];
  avatarError = '';
  mode: PageMode = 'list';

  editingUser:
    CaregiverUser | null = null;

  searchTerm = '';
  patientSearchTerm = '';

  roleFilter:
    RoleFilter = 'ALL';

  isLoading = false;
  isSaving = false;

  showDeleteModal = false;

  userToDelete:
    CaregiverUser | null = null;

  deletingId:
    number | null = null;

  errorMessage = '';
  formError = '';

  form: CaregiverForm =
    this.createEmptyForm();

  constructor(
    private userManagementService:
    UserManagementService,

    private patientService:
    PatientService,

    private cdr:
    ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadData();
  }

  get pageTitle(): string {
    if (this.mode === 'list') {
      return 'Gestão de utilizadores';
    }

    return this.editingUser
      ? 'Editar utilizador'
      : 'Criar utilizador';
  }

  get isEditing(): boolean {
    return this.editingUser !== null;
  }

  get isInformalRole(): boolean {
    return (
      this.form.role ===
      'INFORMAL_CAREGIVER'
    );
  }

  get filteredCaregivers():
    CaregiverUser[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();

    return this.caregivers.filter(
      (user) => {

        const matchesRole =
          this.roleFilter === 'ALL' ||
          user.role ===
          this.roleFilter;

        const patientNames =
          user.patients
            .map(
              (patient) =>
                patient.name
            )
            .join(' ');

        const haystack =
          `
            ${user.fullName}
            ${user.email}
            ${patientNames}
          `.toLowerCase();

        return (
          matchesRole &&
          (
            !search ||
            haystack.includes(search)
          )
        );
      }
    );
  }

  get filteredPatients():
    AppPatient[] {

    const search =
      this.patientSearchTerm
        .trim()
        .toLowerCase();

    return this.patients.filter(
      (patient) => {

        if (!search) {
          return true;
        }

        const haystack =
          `
            ${patient.name}
            ${patient.code}
          `.toLowerCase();

        return haystack.includes(
          search
        );
      }
    );
  }

  async loadData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const [
        caregivers,
        patients
      ] = await Promise.all([
        this.userManagementService
          .getCaregivers(),

        this.patientService
          .getPatients()
      ]);

      this.caregivers =
        caregivers;

      this.patients =
        patients;

    } catch (error) {
      console.error(
        'Erro ao carregar gestão de utilizadores:',
        error
      );

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os utilizadores.';

    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openCreateForm(): void {
    this.editingUser = null;

    this.form =
      this.createEmptyForm();

    this.patientSearchTerm = '';
    this.formError = '';
    this.mode = 'form';
  }

  openEditForm(
    user: CaregiverUser

  ): void {
    this.editingUser = user;

    this.form = {
      fullName:
      user.fullName,

      email:
      user.email,

      password: '',

      confirmPassword: '',
      avatar:
      user.avatar,
      role:
      user.role,

      patientIds:
        user.patients.map(
          (patient) =>
            patient.id
        )
    };

    this.patientSearchTerm = '';
    this.formError = '';
    this.mode = 'form';
  }

  cancelForm(): void {
    this.editingUser = null;

    this.form =
      this.createEmptyForm();

    this.formError = '';
    this.mode = 'list';
  }

  onBack(): void {
    /*
     * Se estivermos dentro do formulário,
     * volta à lista.
     *
     * Se estivermos na lista,
     * volta à página anterior da aplicação.
     */
    if (this.mode === 'form') {
      this.cancelForm();
      return;
    }

    this.goBack.emit();
  }

  selectRole(
    role: CaregiverRole
  ): void {
    this.form.role = role;

    /*
     * Se alterar de formal para informal
     * e existirem vários utentes,
     * fica apenas o primeiro.
     */
    if (
      role ===
      'INFORMAL_CAREGIVER' &&

      this.form.patientIds.length > 1
    ) {
      this.form.patientIds = [
        this.form.patientIds[0]
      ];
    }
  }

  togglePatient(
    patientId: number
  ): void {
    const isSelected =
      this.isPatientSelected(
        patientId
      );

    /*
     * O informal só pode selecionar um.
     */
    if (this.isInformalRole) {
      this.form.patientIds =
        isSelected
          ? []
          : [patientId];

      return;
    }

    /*
     * O formal pode selecionar vários.
     */
    this.form.patientIds =
      isSelected
        ? this.form.patientIds.filter(
          (id) =>
            id !== patientId
        )
        : [
          ...this.form.patientIds,
          patientId
        ];
  }

  isPatientSelected(
    patientId: number
  ): boolean {
    return this.form
      .patientIds
      .includes(patientId);
  }

  async save(): Promise<void> {
    this.formError = '';

    if (!this.form.fullName.trim()) {
      this.formError =
        'Indique o nome.';

      return;
    }

    if (
      !this.isValidEmail(
        this.form.email
      )
    ) {
      this.formError =
        'Indique um email válido.';

      return;
    }

    if (
      !this.isEditing &&
      !this.form.password
    ) {
      this.formError =
        'Indique uma palavra-passe.';

      return;
    }

    if (
      this.form.password &&
      this.form.password.length < 6
    ) {
      this.formError =
        'A palavra-passe deve ter pelo menos 6 caracteres.';

      return;
    }

    if (
      this.form.password !==
      this.form.confirmPassword
    ) {
      this.formError =
        'As palavras-passe não coincidem.';

      return;
    }

    const payload:
      SaveCaregiverUserPayload = {

      fullName:
        this.form.fullName.trim(),

      email:
        this.form.email.trim(),

      password:
      this.form.password,

      role:
      this.form.role,

      avatar:
      this.form.avatar,

      patientIds:
      this.form.patientIds
    };

    this.isSaving = true;

    try {
      if (this.editingUser) {
        await this
          .userManagementService
          .updateCaregiver(
            this.editingUser.id,
            payload
          );

      } else {
        await this
          .userManagementService
          .createCaregiver(
            payload
          );
      }

      /*
       * Recarrega a lista para apresentar
       * os dados e associações atualizados.
       */
      await this.loadData();

      this.cancelForm();

    } catch (error) {
      console.error(
        'Erro ao guardar utilizador:',
        error
      );

      this.formError =
        error instanceof Error
          ? error.message
          : 'Não foi possível guardar o utilizador.';

    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  openDeleteModal(
    user: CaregiverUser
  ): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deletingId !== null) {
      return;
    }

    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.userToDelete) {
      return;
    }

    const user =
      this.userToDelete;

    this.deletingId = user.id;
    this.errorMessage = '';

    try {
      await this
        .userManagementService
        .deleteCaregiver(user.id);

      this.caregivers =
        this.caregivers.filter(
          (caregiver) =>
            caregiver.id !== user.id
        );

      this.showDeleteModal = false;
      this.userToDelete = null;

    } catch (error) {
      console.error(
        'Erro ao apagar utilizador:',
        error
      );

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível apagar o utilizador.';

    } finally {
      this.deletingId = null;
      this.cdr.detectChanges();
    }
  }

  roleLabel(
    role: CaregiverRole
  ): string {
    return role ===
    'FORMAL_CAREGIVER'
      ? 'Cuidador formal'
      : 'Cuidador informal';
  }

  userAvatar(
    user: CaregiverUser
  ): string {
    if (user.avatar) {
      return user.avatar;
    }

    return user.role ===
    'FORMAL_CAREGIVER'
      ? DEFAULT_FORMAL_AVATAR
      : DEFAULT_INFORMAL_AVATAR;
  }

  associationLabel(
    user: CaregiverUser
  ): string {
    const count =
      user.patients.length;

    if (count === 0) {
      return 'Sem utentes associados';
    }

    return count === 1
      ? '1 utente associado'
      : `${count} utentes associados`;
  }

  trackByUserId(
    _: number,
    user: CaregiverUser
  ): number {
    return user.id;
  }

  trackByPatientId(
    _: number,
    patient: AppPatient
  ): number {
    return patient.id;
  }

  private createEmptyForm():
    CaregiverForm {

    return {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      avatar: null,

      role:
        'FORMAL_CAREGIVER',

      patientIds: []
    };
  }

  private isValidEmail(
    email: string
  ): boolean {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email.trim())
    );
  }

  get selectedUserAvatar(): string {
    if (this.form.avatar) {
      return this.form.avatar;
    }

    return this.form.role ===
    'FORMAL_CAREGIVER'
      ? DEFAULT_FORMAL_AVATAR
      : DEFAULT_INFORMAL_AVATAR;
  }

  async onAvatarSelected(
    event: Event
  ): Promise<void> {
    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    input.value = '';

    if (!file) {
      return;
    }

    this.avatarError = '';

    try {
      this.form.avatar =
        await resizeProfileImage(file);

    } catch (error) {
      this.avatarError =
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar a fotografia.';
    }
  }

  removeAvatar(): void {
    this.form.avatar = null;
    this.avatarError = '';
  }
}
