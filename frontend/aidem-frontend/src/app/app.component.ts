import {ChangeDetectorRef, Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { ActivitiesModalComponent } from './features/activities/activities-modal.component';
import { ChatModalComponent } from './features/activities/components/chat-modal/chat-modal.component';
import { ProfileComponent } from './features/profile/profile.component';
import { PatientsListComponent } from './features/patients-list/patients-list.component';
import {AppPatient, PatientProfile, PatientService} from './core/services/patient.service';
import {LoadingSpinnerComponent} from './shared/laoding-spinner-modal/loading-spinner.component';
import { LoginSuccessEvent } from './features/auth/login/login.component';
import {CreatePatientComponent} from './features/create-patient/create-patient.component';
import {ContentsComponent} from './features/contents/contents.component';
import {ExerciseNotificationService} from './core/services/exercise-notification.service';
import { Subscription } from 'rxjs';
import {  UserManagementComponent } from './features/user-management/user-management.component';

import {
  AdminExercisesComponent
} from './features/admin-exercises/admin-exercises.component';


import {
  Exercise
} from './core/services/exercise.service';

import {
  AuthService,
  AuthUser,
  FrontendRole
} from './core/services/auth.service';
import {ExerciseFormComponent} from './features/exercise-form/exercise-form.component';

type UserRole =
  | 'admin'
  | 'informal'
  | 'formal';

type CaregiverViewRole =
  | 'informal'
  | 'formal';

type AppPage =
  | 'home'
  | 'patients'
  | 'activities'
  | 'chat'
  | 'profile'
  | 'createPatient'
  | 'contents'
  | 'adminActivities'
  | 'adminUsers'
  | 'exerciseForm';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
  CommonModule,
  LoginComponent,
  HomeComponent,
  ActivitiesModalComponent,
  ChatModalComponent,
  ProfileComponent,
  PatientsListComponent,
  LoadingSpinnerComponent,
  CreatePatientComponent,
  ContentsComponent,
  AdminExercisesComponent,
  ExerciseFormComponent,
  UserManagementComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {

  @Output() openContents = new EventEmitter<void>();
  currentUser: AuthUser | null = null;
  isLoggedIn = false;
  userRole: UserRole = 'informal';
  selectedExerciseToEdit: Exercise | null = null;
  activeCaregiverView: CaregiverViewRole = 'informal';
  currentPage: AppPage = 'home';
  isLoadingSelectedPatient = false;
  selectedPatientError = '';
  patients: AppPatient[] = [];
  selectedPatient: PatientProfile | null = null;
  isLoadingPatients = false;
  patientsError = '';
  private sessionExpiredSubscription?: Subscription;
  private isLoadingPatientsRequest = false;
  private pageBeforeAdminActivities: AppPage = 'patients';
  private pageBeforeContents: AppPage = 'home';
  private pageBeforeAdminUsers: AppPage = 'patients';

  constructor(
    private patientService: PatientService,
    private notificationService: ExerciseNotificationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    this.sessionExpiredSubscription =
      this.authService.sessionExpired$
        .subscribe(() => {
          this.handleLogout();
        });

    void this.restoreSession();
  }

  ngOnDestroy(): void {
    this.sessionExpiredSubscription?.unsubscribe();
  }


  openUserManagement(): void {
    if (!this.isAdmin) {
      return;
    }

    this.pageBeforeAdminUsers =
      this.currentPage;

    this.currentPage =
      'adminUsers';
  }

  closeUserManagement(): void {
    this.currentPage =
      this.pageBeforeAdminUsers;
  }

  private async restoreSession(): Promise<void> {
    const token =
      this.authService.getToken();

    const user =
      this.authService.getStoredUser();

    if (!token || !user) {
      this.handleLogout();
      return;
    }

    this.isLoggedIn = true;
    this.currentUser = user;
    this.userRole =
      this.authService.toFrontendRole(
        user.role
      );

    if (this.userRole === 'admin') {
      this.activeCaregiverView = 'formal';
      this.currentPage = 'patients';

      await this.loadPatients();
      return;
    }

    if (this.userRole === 'formal') {
      this.activeCaregiverView = 'formal';
      this.currentPage = 'patients';

      await this.loadPatients();
      return;
    }

    this.activeCaregiverView = 'informal';

    await this.loadInformalCaregiverPatient();
  }

  handleLogout(): void {
    this.notificationService.stop();
    this.authService.logout();

    this.isLoggedIn = false;
    this.currentUser = null;
    this.selectedPatient = null;
    this.patients = [];

    this.userRole = 'informal';
    this.activeCaregiverView = 'informal';
    this.currentPage = 'home';

    this.selectedPatientError = '';
    this.patientsError = '';

    this.cdr.detectChanges();
  }

  openAdminActivities(): void {
    if (!this.isAdmin) {
      return;
    }

    this.pageBeforeAdminActivities =
      this.currentPage;

    this.selectedExerciseToEdit = null;
    this.currentPage = 'adminActivities';
  }

  openCreateExercise(): void {
    if (!this.isAdmin) {
      return;
    }

    this.selectedExerciseToEdit = null;
    this.currentPage = 'exerciseForm';
  }

  openEditExercise(
    exercise: Exercise
  ): void {
    if (!this.isAdmin) {
      return;
    }

    this.selectedExerciseToEdit = exercise;
    this.currentPage = 'exerciseForm';
  }

  closeExerciseForm(): void {
    this.selectedExerciseToEdit = null;
    this.currentPage = 'adminActivities';
  }

  onExerciseSaved(): void {
    this.selectedExerciseToEdit = null;
    this.currentPage = 'adminActivities';
  }

  closeAdminActivities(): void {
    this.currentPage =
      this.pageBeforeAdminActivities;
  }

  goToContents(): void {
    this.pageBeforeContents = this.currentPage;
    this.currentPage = 'contents';
  }

  closeContents(): void {
    this.currentPage = this.pageBeforeContents;
  }

  openCreatePatient(): void {
    if (this.userRole === 'informal') {
      return;
    }

    this.currentPage =
      'createPatient';
  }

  get isAdmin(): boolean {
    return this.userRole === 'admin';
  }

  get componentRole(): CaregiverViewRole {
    return this.activeCaregiverView;
  }

  async onPatientCreated(): Promise<void> {
    this.currentPage = 'patients';
    await this.loadPatients();
  }

  async onLogin(
    event: LoginSuccessEvent
  ): Promise<void> {
    this.notificationService.stop();
    this.isLoggedIn = true;
    this.userRole = event.role;
    this.currentUser = event.user;
    this.selectedPatient = null;
    this.selectedPatientError = '';
    this.patientsError = '';

    if (event.role === 'admin') {
      this.activeCaregiverView = 'formal';
      this.currentPage = 'patients';
      this.cdr.detectChanges();

      await this.loadPatients();
      return;
    }

    if (event.role === 'formal') {
      this.activeCaregiverView = 'formal';
      this.currentPage = 'patients';
      this.cdr.detectChanges();

      await this.loadPatients();
      return;
    }

    this.activeCaregiverView = 'informal';
    await this.loadInformalCaregiverPatient();
  }

  onExerciseCreated(): void {
    this.currentPage =
      this.selectedPatient
        ? 'home'
        : 'patients';
  }
  closeCreateExercise(): void {
    this.currentPage =
      this.selectedPatient
        ? 'home'
        : 'patients';
  }


  private async loadInformalCaregiverPatient():
    Promise<void> {

    if (!this.currentUser?.email) {
      this.selectedPatientError =
        'Não foi possível identificar o cuidador.';

      return;
    }

    this.isLoadingSelectedPatient = true;
    this.selectedPatientError = '';

    this.cdr.detectChanges();

    try {
      /*
       * Para um informal, o backend devolve
       * apenas o utente que lhe foi associado.
       */
      const patients =
        await this.patientService
          .getPatients();

      const associatedPatient =
        patients[0];

      if (associatedPatient) {
        const patientProfile =
          await this.patientService
            .getPatient(
              associatedPatient.id
            );

        this.selectedPatient =
          patientProfile;

        this.notificationService.start(
          patientProfile.id
        );

        this.currentPage = 'home';

        return;
      }

      this.selectedPatient = null;

      this.selectedPatientError =
        'Não foi encontrado nenhum utente associado a este cuidador informal.';

    } catch (error) {
      console.error(
        'Erro ao carregar utente do cuidador informal:',
        error
      );

      this.selectedPatientError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar o utente associado.';

    } finally {
      this.isLoadingSelectedPatient = false;
      this.cdr.detectChanges();
    }
  }

  async loadPatients(): Promise<void> {
    if (this.isLoadingPatientsRequest) {
      return;
    }

    this.isLoadingPatientsRequest = true;
    this.isLoadingPatients = true;
    this.patientsError = '';

    this.cdr.detectChanges();

    try {
      const result =
        await this.patientService.getPatients();

      this.patients = result;

      console.log(
        'PATIENTS RECEIVED IN APP:',
        this.patients
      );
    } catch (error) {
      console.error(
        'loadPatients failed',
        error
      );

      this.patients = [];

      this.patientsError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar lista de utentes.';
    } finally {
      this.isLoadingPatients = false;
      this.isLoadingPatientsRequest = false;

      console.log(
        'LOADING FINISHED:',
        this.isLoadingPatients
      );

      this.cdr.detectChanges();
    }
  }

  async onSelectPatient(patient: AppPatient): Promise<void> {
    this.isLoadingSelectedPatient = true;
    this.selectedPatientError = '';
    this.cdr.detectChanges();

    try {
      this.selectedPatient =
        await this.patientService.getPatient(patient.id);

      this.notificationService.stop();

      this.currentPage = 'home';
    } catch (error) {
      console.error('Erro ao abrir utente:', error);

      this.selectedPatientError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar perfil do utente.';
    } finally {
      this.isLoadingSelectedPatient = false;
      this.cdr.detectChanges();
    }
  }

  goToHome(): void {
    this.currentPage = 'home';
  }

  async goToPatients(): Promise<void> {
    if (
      this.userRole === 'informal' &&
      !this.isAdmin
    ) {
      return;
    }

    this.currentPage = 'patients';

    if (
      this.patients.length === 0 &&
      !this.isLoadingPatientsRequest
    ) {
      await this.loadPatients();
    }
  }

  goToProfile(): void {
    this.currentPage = 'profile';
  }

  onPatientUpdated(
    updatedPatient: PatientProfile
  ): void {

    /*
     * Atualiza o utente selecionado.
     *
     * Assim, a Home, o Perfil e as
     * Atividades recebem imediatamente
     * os novos dados.
     */
    this.selectedPatient =
      updatedPatient;


    /*
     * Atualiza também a informação
     * apresentada na lista de utentes.
     */
    this.patients =
      this.patients.map(
        (patient) =>

          patient.id ===
          updatedPatient.id

            ? {
              ...patient,

              name:
              updatedPatient.name,

              birthDate:
              updatedPatient.birthDate,

              age:
              updatedPatient.age,

              avatar:
              updatedPatient.avatar,

              subtitle:
              updatedPatient.subtitle
            }

            : patient
      );

    this.cdr.detectChanges();
  }

  goToActivities(): void {
    this.currentPage = 'activities';
  }

  goToChat(): void {
    this.currentPage = 'chat';
  }

}
