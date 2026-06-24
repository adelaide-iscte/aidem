import {
  Component,
  ChangeDetectorRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import { SessionPlanService, SessionPlanExercise } from '../../core/services/session-plan.service';
import { PatientProfile } from '../../core/services/patient.service';
import {SideMenuComponent} from '../../shared/side-menu-modal/side-menu.component';
import {LoadingSpinnerComponent} from '../../shared/laoding-spinner-modal/loading-spinner.component';
import {AuthUser} from '../../core/services/auth.service';

interface HomeDay {
  label: string;
  dayNumber: number;
  isToday: boolean;
  date: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    NotificationsPopoverComponent,
    SideMenuComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnChanges, OnInit {
  @Input() patient!: PatientProfile;
  @Input() currentUser!: AuthUser;
  @Output() openActivities = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();

  showNotifications = false;
  todayActivities: SessionPlanExercise[] = [];
  isLoadingActivities = false;
  showSideMenu = false;
  days: HomeDay[] = [];

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  get caregiverFirstName(): string {
    return this.currentUser?.fullName?.trim().split(' ')[0] ?? '';
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  constructor(
    private sessionPlanService: SessionPlanService,
    private cdr: ChangeDetectorRef
  ) {}

  get patientDisplayName(): string {
    if (!this.patient?.fullName) {
      return '';
    }

    const names = this.patient.fullName.trim().split(' ');

    if (names.length === 1) {
      return names[0];
    }

    return `${names[0]} ${names[names.length - 1]}`;
  }

  ngOnInit(): void {
    this.buildDays();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['patient']?.currentValue?.id) {
      this.loadTodayActivities();
    }
  }

  async loadTodayActivities(): Promise<void> {
    if (!this.patient?.id) return;

    this.isLoadingActivities = true;

    try {
      const plan = await this.sessionPlanService.getTodayPlan(this.patient.id);

      this.todayActivities =
        (plan.exercises ?? []).filter(
          exercise => exercise.status !== 'SKIPPED'
        );
      console.log('HOME PLAN:', plan);
    } catch (error) {
      console.error('Erro ao carregar atividades do dia:', error);
      this.todayActivities = [];
    } finally {
      this.isLoadingActivities = false;
      this.cdr.detectChanges();
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  private buildDays(): void {
    const today = new Date();

    this.days = Array.from({ length: 4 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 3 + index);

      return {
        date,
        label: this.formatWeekDay(date),
        dayNumber: date.getDate(),
        isToday: this.isSameDay(date, today)
      };
    });
  }

  private formatWeekDay(date: Date): string {
    const weekDays = [
      'Dom.',
      'Seg.',
      'Ter.',
      'Qua.',
      'Qui.',
      'Sex.',
      'Sáb.'
    ];

    return weekDays[date.getDay()];
  }

  private isSameDay(dateA: Date, dateB: Date): boolean {
    return (
      dateA.getDate() === dateB.getDate() &&
      dateA.getMonth() === dateB.getMonth() &&
      dateA.getFullYear() === dateB.getFullYear()
    );
  }


}
