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
import {
  SessionPlan,
  SessionPlanExercise,
  SessionPlanService
} from '../../core/services/session-plan.service';import { PatientProfile } from '../../core/services/patient.service';
import {SideMenuComponent} from '../../shared/side-menu-modal/side-menu.component';
import {LoadingSpinnerComponent} from '../../shared/laoding-spinner-modal/loading-spinner.component';
import {AuthUser} from '../../core/services/auth.service';
import { ExerciseNotificationService } from '../../core/services/exercise-notification.service';

interface HomeDay {
  label: string;
  dayNumber: number;
  monthLabel: string;
  isToday: boolean;
  date: Date;
}
type UserRole = 'informal' | 'formal';


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
  @Input() role: UserRole = 'informal';
  @Input() isAdmin = false;
  @Output() openActivities = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  @Output() openAdminActivities = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output()
  openUserManagement =
    new EventEmitter<void>();

  showNotifications = false;
  todayPlan: SessionPlan | null = null;
  todayActivities: SessionPlanExercise[] = [];
  isLoadingActivities = false;
  showSideMenu = false;
  days: HomeDay[] = [];

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

  get caregiverFirstName(): string {
    return this.currentUser?.fullName?.trim().split(' ')[0] ?? '';
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  constructor(
    private sessionPlanService: SessionPlanService,
    public notificationService: ExerciseNotificationService,
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

  get sessionTotalActivities(): number {
    return this.todayActivities.length;
  }

  get sessionRegisteredActivities(): number {
    return this.todayActivities.filter(
      activity => activity.status !== 'PENDING'
    ).length;
  }

  get sessionProgressPercent(): number {
    if (this.sessionTotalActivities === 0) {
      return 0;
    }

    return Math.round(
      (
        this.sessionRegisteredActivities /
        this.sessionTotalActivities
      ) * 100
    );
  }

  get sessionDurationMinutes(): number {
    if (this.todayPlan?.totalDurationMinutes) {
      return this.todayPlan.totalDurationMinutes;
    }

    if (this.todayPlan?.targetDurationMinutes) {
      return this.todayPlan.targetDurationMinutes;
    }

    return this.todayActivities.reduce(
      (total, activity) =>
        total + (activity.durationMinutes ?? 0),
      0
    );
  }

  get sessionSummaryTitle(): string {
    if (this.sessionTotalActivities === 0) {
      return 'Sem sessão preparada';
    }

    if (this.todayPlan?.status === 'COMPLETED') {
      return 'Sessão concluída';
    }

    if (
      this.todayPlan?.status === 'IN_PROGRESS' ||
      this.sessionRegisteredActivities > 0
    ) {
      return 'Sessão em curso';
    }

    return 'Sessão pronta para começar';
  }

  get sessionStatusLabel(): string {
    if (this.sessionTotalActivities === 0) {
      return 'Sem sessão';
    }

    if (this.todayPlan?.status === 'COMPLETED') {
      return 'Concluída';
    }

    if (
      this.todayPlan?.status === 'IN_PROGRESS' ||
      this.sessionRegisteredActivities > 0
    ) {
      return 'Em curso';
    }

    return 'Por iniciar';
  }

  get todayFormatted(): string {
    const today = new Date();

    const dayAndMonth = new Intl.DateTimeFormat('pt-PT', {
      day: 'numeric',
      month: 'long'
    }).format(today);

    const weekDay = new Intl.DateTimeFormat('pt-PT', {
      weekday: 'long'
    }).format(today);

    return `${dayAndMonth}, ${weekDay}`;
  }

  get sessionStatusClass(): string {
    if (this.todayPlan?.status === 'COMPLETED') {
      return 'completed';
    }

    if (
      this.todayPlan?.status === 'IN_PROGRESS' ||
      this.sessionRegisteredActivities > 0
    ) {
      return 'in-progress';
    }

    return 'not-started';
  }

  get sessionActionLabel(): string {
    if (this.todayPlan?.status === 'COMPLETED') {
      return 'Ver sessão';
    }

    if (this.sessionRegisteredActivities > 0) {
      return 'Continuar';
    }

    return 'Iniciar';
  }

  async loadTodayActivities(): Promise<void> {
    if (!this.patient?.id) return;

    this.isLoadingActivities = true;

    try {
      const plan =
        await this.sessionPlanService.getTodayPlan(
          this.patient.id
        );

      this.todayPlan = plan;
      this.todayActivities = plan.exercises ?? [];
    } catch (error) {
      console.error(
        'Erro ao carregar atividades do dia:',
        error
      );

      this.todayPlan = null;
      this.todayActivities = [];
    } finally {
      this.isLoadingActivities = false;
      this.cdr.detectChanges();
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;

    if (this.showNotifications) {
      this.notificationService.markAsRead();
    }
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
        monthLabel: this.formatMonth(date),
        isToday: this.isSameDay(date, today),
      };
    });
  }

  private formatMonth(date: Date): string {
    return new Intl.DateTimeFormat('pt-PT', {
      month: 'short'
    })
      .format(date)
      .replace('.', '');
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
