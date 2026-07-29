import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FeedbackModalComponent, FeedbackSubmitEvent } from '../../shared/feedback-modal/feedback-modal.component';
import { InstructionsModalComponent } from '../../shared/instructions-modal/instructions-modal.component';
import { ComplementaryInfoModalComponent } from '../../shared/complementary-info-modal/complementary-info-modal.component';
import { CallOverlayComponent } from '../../shared/call-overlar-modal/call-overlay.component';
import { NotificationsPopoverComponent } from '../../shared/notifications-popover-modal/notifications-popover.component';
import { SkipReasonModalComponent } from '../../shared/skip-reason-modal/skip-reason-modal';
import { SessionPlan, SessionPlanExercise, SessionPlanService } from '../../core/services/session-plan.service';
import {SideMenuComponent} from "../../shared/side-menu-modal/side-menu.component";
import {LoadingSpinnerComponent} from "../../shared/laoding-spinner-modal/loading-spinner.component";
import { ExerciseNotificationService } from '../../core/services/exercise-notification.service';

type UserRole = 'informal' | 'formal';
type PlanView =
  | 'daily'
  | 'weekly';

type SelectedPatient = {
  id: number;
  name: string;
  age: number;
  code: string;
  avatar: string;
  subtitle?: string;
};

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [
    CommonModule,
    FeedbackModalComponent,
    InstructionsModalComponent,
    ComplementaryInfoModalComponent,
    CallOverlayComponent,
    NotificationsPopoverComponent,
    SkipReasonModalComponent,
    SideMenuComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './activities-modal.component.html',
  styleUrl: './activities-modal.component.scss'
})
export class ActivitiesModalComponent implements OnInit, OnChanges {
  @Input() role: UserRole = 'informal';
  @Input() selectedPatient: SelectedPatient | null = null;
  @Input() isAdmin = false;

  @Output() goHome = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() openAdminActivities = new EventEmitter<void>();
  @Output()
  openUserManagement =
    new EventEmitter<void>();

  sessionPlan: SessionPlan | null = null;
  activities: SessionPlanExercise[] = [];
  isLoadingPlan = false;
  planError = '';
  planView: PlanView = 'daily';
  weekPlans: SessionPlan[] = [];
  selectedWeekPlan: SessionPlan | null = null;
  isLoadingWeekPlan = false;
  weekPlanError = '';

  selectedActivity: SessionPlanExercise | null = null;
  showSideMenu = false;
  showSkipModal = false;
  showNotifications = false;
  showCallOverlay = false;
  showFeedbackModal = false;
  showInstructionsModal = false;
  showComplementaryInfoModal = false;

  constructor(
    private sessionPlanService: SessionPlanService,
    public notificationService: ExerciseNotificationService,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    void this.loadTodayPlan();
  }

  get headerAvatar(): string {
    if (this.isAdmin) {
      return '/icons/adm.svg';
    }

    return this.role === 'formal'
      ? '/icons/professional.svg'
      : '/icons/generic_user.svg';
  }

  get supportContactName(): string {
    return this.isFormalMode
      ? 'Carolina Cortes'
      : 'Profissional de saúde';
  }

  get supportContactAvatar(): string {
    return '/icons/professional.svg';
  }

  ngOnChanges(
    changes: SimpleChanges
  ): void {
    if (
      changes['selectedPatient'] &&
      !changes['selectedPatient'].firstChange
    ) {
      this.weekPlans = [];
      this.selectedWeekPlan = null;
      this.weekPlanError = '';

      void this.loadTodayPlan();

      if (this.planView === 'weekly') {
        void this.loadWeekPlan();
      }
    }
  }

  async selectPlanView(
    view: PlanView
  ): Promise<void> {
    this.planView = view;

    if (
      view === 'weekly' &&
      this.weekPlans.length === 0
    ) {
      await this.loadWeekPlan();
    }
  }

  async loadWeekPlan(): Promise<void> {
    if (!this.selectedPatient?.id) {
      this.weekPlanError =
        'Escolha um utente para consultar o plano semanal.';

      this.weekPlans = [];
      this.selectedWeekPlan = null;
      return;
    }

    this.isLoadingWeekPlan = true;
    this.weekPlanError = '';

    try {
      this.weekPlans =
        await this.sessionPlanService.getWeekPlan(
          this.selectedPatient.id
        );

      const todayPlan =
        this.weekPlans.find(
          plan =>
            this.isToday(
              plan.sessionDate
            )
        );

      this.selectedWeekPlan =
        todayPlan ??
        this.weekPlans[0] ??
        null;

    } catch (error) {
      console.error(
        'Erro ao carregar plano semanal',
        error
      );

      this.weekPlanError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar o plano semanal.';

      this.weekPlans = [];
      this.selectedWeekPlan = null;

    } finally {
      this.isLoadingWeekPlan = false;
      this.cdr.detectChanges();
    }
  }

  selectWeekPlan(
    plan: SessionPlan
  ): void {
    this.selectedWeekPlan = plan;
  }

  isToday(
    sessionDate: string
  ): boolean {
    const today = new Date();

    const date =
      new Date(
        `${sessionDate}T00:00:00`
      );

    return (
      date.getFullYear() ===
      today.getFullYear() &&
      date.getMonth() ===
      today.getMonth() &&
      date.getDate() ===
      today.getDate()
    );
  }

  get isSelectedWeekPlanToday(): boolean {
    return !!this.selectedWeekPlan &&
      this.isToday(
        this.selectedWeekPlan.sessionDate
      );
  }

  weekDayLabel(
    sessionDate: string
  ): string {
    const date =
      new Date(
        `${sessionDate}T00:00:00`
      );

    const label =
      new Intl.DateTimeFormat(
        'pt-PT',
        {
          weekday: 'short'
        }
      ).format(date);

    return (
      label
        .replace('.', '')
        .charAt(0)
        .toUpperCase() +
      label
        .replace('.', '')
        .slice(1)
    );
  }

  weekDayNumber(
    sessionDate: string
  ): string {
    return new Intl.DateTimeFormat(
      'pt-PT',
      {
        day: '2-digit'
      }
    ).format(
      new Date(
        `${sessionDate}T00:00:00`
      )
    );
  }

  weekMonthLabel(
    sessionDate: string
  ): string {
    return new Intl.DateTimeFormat(
      'pt-PT',
      {
        month: 'short'
      }
    )
      .format(
        new Date(
          `${sessionDate}T00:00:00`
        )
      )
      .replace('.', '');
  }

  get selectedWeekActivities():
    SessionPlanExercise[] {
    return (
      this.selectedWeekPlan?.exercises ??
      []
    );
  }

  get selectedWeekCompletedCount():
    number {
    return this.selectedWeekActivities
      .filter(
        activity =>
          activity.status === 'COMPLETED' ||
          activity.status === 'SKIPPED'
      )
      .length;
  }

  get selectedWeekProgressPercent():
    number {
    const total =
      this.selectedWeekActivities.length;

    if (total === 0) {
      return 0;
    }

    return Math.round(
      (
        this.selectedWeekCompletedCount /
        total
      ) * 100
    );
  }


  async loadTodayPlan(): Promise<void> {
    if (!this.selectedPatient?.id) {
      this.planError = 'Escolha um utente para gerar o plano diário.';
      this.activities = [];
      return;
    }

    this.isLoadingPlan = true;
    this.planError = '';

    try {
      this.sessionPlan = await this.sessionPlanService.getTodayPlan(this.selectedPatient.id);
      this.activities = this.sessionPlan.exercises;
    } catch (error) {
      console.error('Erro ao carregar plano diário', error);
      this.planError = error instanceof Error ? error.message : 'Erro ao carregar plano diário.';
      this.activities = [];
    } finally {
      this.isLoadingPlan = false;
      this.cdr.detectChanges();
    }
  }

  get isFormalMode(): boolean {
    return this.role === 'formal';
  }

  get supportCopy(): string {
    return this.isFormalMode
      ? 'Contacte a administração!'
      : 'Contacte-nos!';
  }

  get completedCount(): number {
    return this.activities.filter(activity =>
        activity.status === 'COMPLETED' || activity.status === 'SKIPPED'
    ).length;
  }

  get progressPercent(): number {
    if (this.activities.length === 0) return 0;
    return Math.round((this.completedCount / this.activities.length) * 100);
  }

  get progressBarWidth(): string {
    return `${this.progressPercent}%`;
  }

  activityImage(
    activity: SessionPlanExercise
  ): string {
    const media =
      activity.mediaUrl?.trim();

    if (!media) {
      return '/icons/generic_exercise.svg';
    }

    if (
      media.startsWith('data:image/') ||
      media.startsWith('http://') ||
      media.startsWith('https://') ||
      media.startsWith('/')
    ) {
      return media;
    }

    return `/${media}`;
  }

  difficultyLabel(value: string): string {
    switch (value) {
      case 'HIGH': return 'Alto risco';
      case 'MEDIUM': return 'Risco médio';
      case 'LOW': return 'Baixo risco';
      default: return value;
    }
  }

  openSideMenu(): void { this.showSideMenu = true; }
  closeSideMenu(): void { this.showSideMenu = false; }

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
  closeNotifications(): void { this.showNotifications = false; }
  openCallOverlay(): void { this.showCallOverlay = true; }
  closeCallOverlay(): void { this.showCallOverlay = false; }
  openComplementaryInfoModal(): void { this.showComplementaryInfoModal = true; }
  closeComplementaryInfoModal(): void { this.showComplementaryInfoModal = false; }

  openInstructionsModal(activity: SessionPlanExercise): void {
    this.selectedActivity = activity;
    this.showInstructionsModal = true;
  }

  closeInstructionsModal(): void { this.showInstructionsModal = false; }

  openFeedbackModal(activity: SessionPlanExercise): void {
    this.selectedActivity = activity;
    this.showFeedbackModal = true;
  }

  closeFeedbackModal(): void { this.showFeedbackModal = false; }

  openSkipModal(activity: SessionPlanExercise): void {
    this.selectedActivity = activity;
    this.showSkipModal = true;
  }

  closeSkipModal(): void { this.showSkipModal = false; }

  async submitFeedback(event: FeedbackSubmitEvent): Promise<void> {
    if (!this.selectedActivity) return;


    const completed = event.completion === 'yes' || event.completion === 'almost';

    const updated = await this.sessionPlanService.sendFeedback(

        this.selectedActivity.sessionPlanExerciseId,
        {
          completed: completed,
          difficultyFeedback: event.difficulty,
          emotionFeedback: event.completion,
          notes: event.reason
        }
    );

    this.updateActivity(updated);
    this.closeFeedbackModal();
  }

  async resetExercise(activity: SessionPlanExercise): Promise<void> {
    try {
      const updated = await this.sessionPlanService.resetExercise(activity.sessionPlanExerciseId);
      this.updateActivity(updated);
    } catch (error) {
      console.error('Erro ao cancelar atividade concluída', error);
      this.planError = error instanceof Error ? error.message : 'Erro ao cancelar atividade concluída.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async submitSkip(reason: string): Promise<void> {
    if (!this.selectedActivity) return;

    const updated = await this.sessionPlanService.skipExercise(
        this.selectedActivity.sessionPlanExerciseId,
        reason
    );

    this.updateActivity(updated);
    this.selectedActivity = null;
    this.closeSkipModal();
  }

  private updateActivity(
    updated: SessionPlanExercise
  ): void {
    /*
     * Atualiza o plano diário.
     */
    this.activities =
      this.activities.map(
        activity =>
          activity.sessionPlanExerciseId ===
          updated.sessionPlanExerciseId
            ? updated
            : activity
      );

    if (this.sessionPlan) {
      this.sessionPlan = {
        ...this.sessionPlan,
        exercises: this.activities
      };
    }

    /*
     * Atualiza os planos da vista semanal.
     */
    this.weekPlans =
      this.weekPlans.map(plan => ({
        ...plan,

        exercises:
          plan.exercises.map(
            activity =>
              activity.sessionPlanExerciseId ===
              updated.sessionPlanExerciseId
                ? updated
                : activity
          )
      }));

    if (this.selectedWeekPlan) {
      this.selectedWeekPlan = {
        ...this.selectedWeekPlan,

        exercises:
          this.selectedWeekPlan.exercises.map(
            activity =>
              activity.sessionPlanExerciseId ===
              updated.sessionPlanExerciseId
                ? updated
                : activity
          )
      };
    }

    void this.notificationService.refresh();

    this.cdr.detectChanges();
  }

  isCompleted(activity: SessionPlanExercise): boolean {
    return activity.status === 'COMPLETED';
  }

  isSkipped(activity: SessionPlanExercise): boolean {
    return activity.status === 'SKIPPED';
  }

  isLocked(activity: SessionPlanExercise): boolean {
    return activity.status === 'COMPLETED' || activity.status === 'SKIPPED';
  }
}
