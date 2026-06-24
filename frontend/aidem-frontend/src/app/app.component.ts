import {ChangeDetectorRef, Component } from '@angular/core';
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

type UserRole = 'informal' | 'formal';
type AppPage = 'home' | 'patients' | 'activities' | 'chat' | 'profile';

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
    LoadingSpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

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
    private cdr: ChangeDetectorRef
  ) {}

  onLogin(event: LoginSuccessEvent): void {
    this.isLoggedIn = true;
    this.userRole = event.role;
    this.currentUser = event.user;

    if (event.role === 'formal') {
      this.currentPage = 'patients';
      this.cdr.detectChanges();
      this.loadPatients();
      return;
    }

    this.currentPage = 'home';
    this.cdr.detectChanges();
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
      this.selectedPatient = await this.patientService.getPatient(patient.id);
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
