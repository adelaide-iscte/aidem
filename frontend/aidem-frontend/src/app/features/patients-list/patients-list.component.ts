import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NotificationsPopoverComponent
} from '../../shared/notifications-popover-modal/notifications-popover.component';
import {
  AppPatient,
  PatientService
} from '../../core/services/patient.service';
import {
  SideMenuComponent
} from '../../shared/side-menu-modal/side-menu.component';

type SortMode = 'recent' | 'alphabetical';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationsPopoverComponent, SideMenuComponent],
  templateUrl: './patients-list.component.html',
  styleUrl: './patients-list.component.scss'
})
export class PatientsListComponent {
  @Input() patients: AppPatient[] = [];
  @Input() isAdmin = false;
  @Output() selectPatient = new EventEmitter<AppPatient>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() createPatient = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  @Output()
  openAdminActivities =
    new EventEmitter<void>();

  @Output()
  openUserManagement =
    new EventEmitter<void>();

  @Output()
  logout = new EventEmitter<void>();
  @Input() canDeletePatients = false;
  @Output() patientDeleted =
    new EventEmitter<number>();

  showSideMenu = false;
  showDeleteModal = false;
  patientToDelete: AppPatient | null = null;
  deletingPatientId: number | null = null;
  deleteError = '';

  constructor(
    private patientService: PatientService,
    private cdr: ChangeDetectorRef
  ) {}

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  @Output() openCreateExercise = new EventEmitter<void>();

  changePatient(): void {
    this.openPatients.emit();
    this.closeSideMenu();
  }
  get headerAvatar(): string {
    return this.isAdmin
      ? '/icons/adm.svg'
      : '/icons/professional.svg';
  }


  searchTerm = '';
  sortMode: SortMode = 'recent';
  showNotifications = false;

  get filteredPatients(): AppPatient[] {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    const filtered = this.patients.filter((patient) => {
      if (!normalizedSearch) {
        return true;
      }

      const haystack = `${patient.name} ${patient.age} ${patient.code}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });

    if (this.sortMode === 'alphabetical') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
    }

    return filtered;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  toggleSortMode(): void {
    this.sortMode = this.sortMode === 'recent' ? 'alphabetical' : 'recent';
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  openPatient(patient: AppPatient): void {
    this.selectPatient.emit(patient);
  }
  openDeleteModal(
    patient: AppPatient
  ): void {
    if (!this.canDeletePatients) {
      return;
    }

    this.patientToDelete = patient;
    this.deleteError = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deletingPatientId !== null) {
      return;
    }

    this.showDeleteModal = false;
    this.patientToDelete = null;
    this.deleteError = '';
  }

  async confirmDelete(): Promise<void> {
    if (
      !this.canDeletePatients ||
      !this.patientToDelete
    ) {
      return;
    }

    const patient = this.patientToDelete;

    this.deletingPatientId = patient.id;
    this.deleteError = '';

    try {
      await this.patientService
        .deletePatient(patient.id);

      this.patientDeleted.emit(patient.id);

      this.showDeleteModal = false;
      this.patientToDelete = null;
    } catch (error) {
      console.error(
        'Erro ao remover utente:',
        error
      );

      this.deleteError =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover o utente.';
    } finally {
      this.deletingPatientId = null;
      this.cdr.detectChanges();
    }
  }

  trackByPatientCode(_: number, patient: AppPatient): string {
    return patient.code;
  }
}
