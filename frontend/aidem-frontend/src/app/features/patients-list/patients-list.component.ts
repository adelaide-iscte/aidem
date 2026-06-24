import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import { AppPatient } from '../../core/services/patient.service';

type SortMode = 'recent' | 'alphabetical';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationsPopoverComponent],
  templateUrl: './patients-list.component.html',
  styleUrl: './patients-list.component.scss'
})
export class PatientsListComponent {
  @Input() patients: AppPatient[] = [];
  @Output() selectPatient = new EventEmitter<AppPatient>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();

  showSideMenu = false;

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  changePatient(): void {
    this.openPatients.emit();
    this.closeSideMenu();
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

  trackByPatientCode(_: number, patient: AppPatient): string {
    return patient.code;
  }
}
