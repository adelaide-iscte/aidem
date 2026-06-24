import {
  Component,
  ChangeDetectorRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import { SessionPlanService, SessionPlanExercise } from '../../core/services/session-plan.service';
import { PatientProfile } from '../../core/services/patient.service';
import {SideMenuComponent} from '../../shared/side-menu-modal/side-menu.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NotificationsPopoverComponent, SideMenuComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnChanges {
  @Input() patient!: PatientProfile;

  @Output() openActivities = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();

  showNotifications = false;
  todayActivities: SessionPlanExercise[] = [];
  isLoadingActivities = false;
  showSideMenu = false;

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  constructor(
    private sessionPlanService: SessionPlanService,
    private cdr: ChangeDetectorRef
  ) {}

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
}
