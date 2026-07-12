import {ChangeDetectorRef, Component, EventEmitter, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { ActivitiesModalComponent } from './features/activities/activities-modal.component';
import { ChatModalComponent } from './features/activities/components/chat-modal/chat-modal.component';
import { ProfileComponent } from './features/profile/profile.component';
import { PatientsListComponent } from './features/patients-list/patients-list.component';
import {AppPatient, PatientProfile, PatientService} from './core/services/patient.service';
import {LoadingSpinnerComponent} from './shared/laoding-spinner-modal/loading-spinner.component';
import {AuthUser} from './core/services/auth.service';
import { LoginSuccessEvent } from './features/auth/login/login.component';
import {CreatePatientComponent} from './features/create-patient/create-patient.component';
import {ContentsComponent} from './features/contents/contents.component';
import {ExerciseNotificationService} from './core/services/exercise-notification.service';

type UserRole = 'informal' | 'formal';
type AppPage = 'home' | 'patients' | 'activities' | 'chat' | 'profile' | 'createPatient' | 'contents';

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
    ContentsComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  @Output() openContents = new EventEmitter<void>();
  currentUser: AuthUser | null = null;
  isLoggedIn = false;
  userRole: UserRole = 'informal';
  currentPage: AppPage = 'home';
  isLoadingSelectedPatient = false;
  selectedPatientError = '';
  patients: AppPatient[] = [];
  selectedPatient: PatientProfile | null = null;
  isLoadingPatients = false;
  patientsError = '';

  constructor(
    private patientService: PatientService,
    private notificationService: ExerciseNotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  goToContents(): void {
    this.currentPage = 'contents';
  }

  openCreatePatient(): void {
    this.currentPage = 'createPatient';
  }

  async onPatientCreated(): Promise<void> {
    this.currentPage = 'patients';
    await this.loadPatients();
  }

  async onLogin(event: LoginSuccessEvent): Promise<void> {
    this.isLoggedIn = true;
    this.userRole = event.role;
    this.currentUser = event.user;

    if (event.role === 'formal') {
      this.currentPage = 'patients';
      this.cdr.detectChanges();

      await this.loadPatients();
      return;
    }

    await this.loadInformalCaregiverPatient();
  }

  private async loadInformalCaregiverPatient(): Promise<void> {
    if (!this.currentUser?.email) {
      this.selectedPatientError = 'Não foi possível identificar o cuidador.';
      return;
    }

    this.isLoadingSelectedPatient = true;
    this.selectedPatientError = '';
    this.cdr.detectChanges();

    try {
      const patients = await this.patientService.getPatients();

      const normalizedUserEmail =
        this.currentUser.email.trim().toLowerCase();

      for (const patient of patients) {
        const patientProfile =
          await this.patientService.getPatient(patient.id);

        const caregiverEmail =
          patientProfile.informalCaregiverEmail
            ?.trim()
            .toLowerCase();

        if (caregiverEmail === normalizedUserEmail) {
          this.selectedPatient = patientProfile;

          console.log(
            'A iniciar notificações para o utente informal:',
            patientProfile.id
          );

          this.notificationService.start(patientProfile.id);

          this.currentPage = 'home';
          return;
        }
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
    this.isLoadingPatients = true;
    this.patientsError = '';
    this.cdr.detectChanges();

    try {
      const result = await this.patientService.getPatients();

      console.log('PATIENTS RECEIVED IN APP:', result);

      this.patients = result;
    } catch (error) {
      console.error('loadPatients failed', error);
      this.patientsError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar lista de utentes.';
    } finally {
      this.isLoadingPatients = false;
      console.log('LOADING FINISHED:', this.isLoadingPatients);
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

      this.notificationService.start(this.selectedPatient.id);

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
    this.currentPage = 'patients';

    if (this.patients.length === 0) {
      await this.loadPatients();
    }
  }

  goToProfile(): void {
    this.currentPage = 'profile';
  }

  goToActivities(): void {
    this.currentPage = 'activities';
  }

  goToChat(): void {
    this.currentPage = 'chat';
  }

}
