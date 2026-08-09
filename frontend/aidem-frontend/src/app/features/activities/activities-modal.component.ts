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
import { FormsModule } from '@angular/forms';
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
import {
  Exercise,
  ExerciseService
} from '../../core/services/exercise.service';

type UserRole = 'informal' | 'formal';
type PlanView =
  | 'daily'
  | 'weekly';

type PlanDay = {
  sessionDate: string;
  plan: SessionPlan | null;
};

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
    FormsModule,
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
  visiblePlanDays: PlanDay[] = [];
  selectedWeekPlan: SessionPlan | null = null;
  selectedWeekDate: string | null = null;
  planWindowStart = this.toLocalDateString(new Date());
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
  showAddExerciseModal = false;
  availableExercises: Exercise[] = [];
  isLoadingExercises = false;
  isChangingPlan = false;
  planEditError = '';
  exerciseSearch = '';
  exerciseTypeFilter: 'ALL' | 'MOTOR' | 'COGNITIVE' | 'MIXED' = 'ALL';
  exerciseDifficultyFilter: 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' = 'ALL';
  showRemoveActivityModal = false;
  activityToRemove: SessionPlanExercise | null = null;

  constructor(
    private sessionPlanService: SessionPlanService,
    private exerciseService: ExerciseService,
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

  get canEditSelectedPlan(): boolean {
    if (
      !this.isAdmin ||
      !this.selectedWeekPlan
    ) {
      return false;
    }

    const selectedDate =
      new Date(
        `${this.selectedWeekPlan.sessionDate}T00:00:00`
      );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return selectedDate >= today;
  }

  get canEditTodayPlan(): boolean {
    return (
      this.isAdmin &&
      !!this.sessionPlan
    );
  }
  async openAddExerciseModal(): Promise<void> {

    if (!this.isAdmin) {
      return;
    }

    this.planEditError = '';
    this.exerciseSearch = '';
    this.exerciseTypeFilter = 'ALL';
    this.exerciseDifficultyFilter = 'ALL';
    this.isLoadingExercises = true;
    this.showAddExerciseModal = true;

    try {

      const firstPage =
        await this.exerciseService
          .getExercises(
            0,
            100,
            ''
          );

      let exercises = [
        ...firstPage.content
      ];

      for (
        let page = 1;
        page < firstPage.totalPages;
        page++
      ) {

        const nextPage =
          await this.exerciseService
            .getExercises(
              page,
              100,
              ''
            );

        exercises = [
          ...exercises,
          ...nextPage.content
        ];
      }

      this.availableExercises =
        exercises;

    } catch (error) {

      console.error(
        'Erro ao carregar atividades',
        error
      );

      this.planEditError =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as atividades.';

    } finally {

      this.isLoadingExercises = false;
      this.cdr.detectChanges();
    }
  }

  closeAddExerciseModal(): void {
    this.showAddExerciseModal = false;
    this.planEditError = '';
    this.exerciseSearch = '';
    this.exerciseTypeFilter = 'ALL';
    this.exerciseDifficultyFilter = 'ALL';
  }

  private get editablePlan():
    SessionPlan | null {

    if (this.planView === 'daily') {
      return this.sessionPlan;
    }

    return this.selectedWeekPlan;
  }

  async addExerciseToSelectedPlan(
    exercise: Exercise
  ): Promise<void> {

    const plan =
      this.editablePlan;

    if (
      !this.isAdmin ||
      !plan
    ) {
      return;
    }

    this.planEditError = '';
    this.isChangingPlan = true;

    try {

      const updatedPlan =
        await this.sessionPlanService
          .addExerciseToPlan(
            plan.id,
            exercise.id
          );

      this.applyUpdatedPlan(
        updatedPlan
      );

      this.closeAddExerciseModal();

    } catch (error) {

      console.error(
        'Erro ao adicionar atividade ao plano',
        error
      );

      this.planEditError =
        error instanceof Error
          ? error.message
          : 'Não foi possível adicionar a atividade.';

    } finally {

      this.isChangingPlan = false;
      this.cdr.detectChanges();
    }
  }

  openRemoveActivityModal(
    activity: SessionPlanExercise
  ): void {
    if (!this.isAdmin) {
      return;
    }

    this.activityToRemove = activity;
    this.showRemoveActivityModal = true;
    this.planEditError = '';
  }

  closeRemoveActivityModal(): void {
    if (this.isChangingPlan) {
      return;
    }

    this.showRemoveActivityModal = false;
    this.activityToRemove = null;
    this.planEditError = '';
  }

  async confirmRemoveActivity(): Promise<void> {
    if (
      !this.isAdmin ||
      !this.activityToRemove
    ) {
      return;
    }

    const activity = this.activityToRemove;

    this.planEditError = '';
    this.isChangingPlan = true;

    try {
      const updatedPlan =
        await this.sessionPlanService
          .removeExerciseFromPlan(
            activity.sessionPlanExerciseId
          );

      this.applyUpdatedPlan(updatedPlan);

      this.showRemoveActivityModal = false;
      this.activityToRemove = null;

    } catch (error) {
      console.error(
        'Erro ao remover atividade',
        error
      );

      this.planEditError =
        error instanceof Error
          ? error.message
          : 'Não foi possível remover a atividade.';

    } finally {
      this.isChangingPlan = false;
      this.cdr.detectChanges();
    }
  }

  private applyUpdatedPlan(
    updatedPlan: SessionPlan
  ): void {

    if (
      this.sessionPlan?.id ===
      updatedPlan.id
    ) {
      this.sessionPlan =
        updatedPlan;

      this.activities =
        updatedPlan.exercises;
    }

    const index =
      this.weekPlans.findIndex(
        plan =>
          plan.id ===
          updatedPlan.id
      );

    if (index >= 0) {

      this.weekPlans = [
        ...this.weekPlans
      ];

      this.weekPlans[index] =
        updatedPlan;
    }

    if (
      this.selectedWeekPlan?.id ===
      updatedPlan.id
    ) {
      this.selectedWeekPlan =
        updatedPlan;
    }

    this.visiblePlanDays =
      this.visiblePlanDays.map(
        day =>
          day.sessionDate ===
          updatedPlan.sessionDate
            ? {
              ...day,
              plan: updatedPlan
            }
            : day
      );
  }

  get selectableExercises(): Exercise[] {
    const plan = this.editablePlan;

    const existingIds = new Set(
      plan?.exercises.map(
        activity => activity.exerciseId
      ) ?? []
    );

    const normalizedSearch =
      this.exerciseSearch
        .trim()
        .toLowerCase();

    return this.availableExercises
      .filter(
        exercise =>
          !existingIds.has(exercise.id)
      )
      .filter(exercise => {
        if (!normalizedSearch) {
          return true;
        }

        const values = [
          exercise.title,
          exercise.domain,
          exercise.description,
          this.activityTypeLabel(
            exercise.activityType
          ),
          this.exerciseDifficultyLabel(
            exercise.difficultyLevel
          )
        ];

        return values.some(
          value =>
            value
              ?.toLowerCase()
              .includes(normalizedSearch)
        );
      })
      .filter(
        exercise =>
          this.exerciseTypeFilter === 'ALL' ||
          exercise.activityType ===
          this.exerciseTypeFilter
      )
      .filter(
        exercise =>
          this.exerciseDifficultyFilter === 'ALL' ||
          exercise.difficultyLevel ===
          this.exerciseDifficultyFilter
      );
  }

  activityTypeLabel(
    type: string
  ): string {
    switch (type) {
      case 'MOTOR':
        return 'Motora';
      case 'COGNITIVE':
        return 'Cognitiva';
      case 'MIXED':
        return 'Mista';
      default:
        return type;
    }
  }

  exerciseDifficultyLabel(
    difficulty: string
  ): string {
    switch (difficulty) {
      case 'LOW':
        return 'Baixa';
      case 'MEDIUM':
        return 'Média';
      case 'HIGH':
        return 'Alta';
      default:
        return difficulty;
    }
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
      this.visiblePlanDays = [];
      this.selectedWeekPlan = null;
      this.selectedWeekDate = null;
      this.planWindowStart = this.toLocalDateString(new Date());
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
        'Escolha um utente para consultar o plano de 14 dias.';

      this.weekPlans = [];
      this.visiblePlanDays = [];
      this.selectedWeekPlan = null;
      this.selectedWeekDate = null;
      return;
    }

    this.isLoadingWeekPlan = true;
    this.weekPlanError = '';

    try {
      this.weekPlans =
        await this.sessionPlanService.getPlanRange(
          this.selectedPatient.id,
          this.planWindowStart
        );

      this.visiblePlanDays =
        this.buildVisiblePlanDays(
          this.planWindowStart,
          this.weekPlans
        );

      const preferredDate =
        this.selectedWeekDate &&
        this.visiblePlanDays.some(
          day => day.sessionDate === this.selectedWeekDate
        )
          ? this.selectedWeekDate
          : this.visiblePlanDays.find(
            day => this.isToday(day.sessionDate)
          )?.sessionDate ??
          this.visiblePlanDays[0]?.sessionDate ??
          null;

      const preferredDay =
        this.visiblePlanDays.find(
          day => day.sessionDate === preferredDate
        ) ?? null;

      this.selectedWeekDate =
        preferredDay?.sessionDate ?? null;

      this.selectedWeekPlan =
        preferredDay?.plan ?? null;

    } catch (error) {
      console.error(
        'Erro ao carregar plano de 14 dias',
        error
      );

      this.weekPlanError =
        error instanceof Error
          ? error.message
          : 'Erro ao carregar o plano de 14 dias.';

      this.weekPlans = [];
      this.visiblePlanDays = [];
      this.selectedWeekPlan = null;
      this.selectedWeekDate = null;

    } finally {
      this.isLoadingWeekPlan = false;
      this.cdr.detectChanges();
    }
  }

  selectPlanDay(
    day: PlanDay
  ): void {
    this.selectedWeekDate = day.sessionDate;
    this.selectedWeekPlan = day.plan;
  }

  async previousPlanWeek(): Promise<void> {
    this.planWindowStart =
      this.shiftDateString(
        this.planWindowStart,
        -7
      );

    this.selectedWeekDate = null;
    await this.loadWeekPlan();
  }

  async nextPlanWeek(): Promise<void> {
    this.planWindowStart =
      this.shiftDateString(
        this.planWindowStart,
        7
      );

    this.selectedWeekDate = null;
    await this.loadWeekPlan();
  }

  async goToCurrentPlanWindow(): Promise<void> {
    this.planWindowStart =
      this.toLocalDateString(
        new Date()
      );

    this.selectedWeekDate = null;
    await this.loadWeekPlan();
  }

  private buildVisiblePlanDays(
    startDate: string,
    plans: SessionPlan[]
  ): PlanDay[] {
    const planByDate = new Map(
      plans.map(
        plan => [plan.sessionDate, plan]
      )
    );

    return Array.from(
      { length: 14 },
      (_, index) => {
        const sessionDate =
          this.shiftDateString(
            startDate,
            index
          );

        return {
          sessionDate,
          plan:
            planByDate.get(sessionDate) ??
            null
        };
      }
    );
  }

  private shiftDateString(
    dateString: string,
    days: number
  ): string {
    const date =
      new Date(
        `${dateString}T12:00:00`
      );

    date.setDate(
      date.getDate() + days
    );

    return this.toLocalDateString(date);
  }

  private toLocalDateString(
    date: Date
  ): string {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');
    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  get planWindowEnd(): string {
    return this.shiftDateString(
      this.planWindowStart,
      13
    );
  }

  get isCurrentPlanWindow(): boolean {
    return this.planWindowStart ===
      this.toLocalDateString(new Date());
  }

  get selectedWeekDisplayDate(): string | null {
    return this.selectedWeekDate;
  }

  get isSelectedWeekPlanPast(): boolean {
    if (!this.selectedWeekDate) {
      return false;
    }

    return this.selectedWeekDate <
      this.toLocalDateString(new Date());
  }

  get canClassifySelectedPlan(): boolean {
    if (!this.selectedWeekDate) {
      return false;
    }

    return this.selectedWeekDate <=
      this.toLocalDateString(new Date());
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
    return !!this.selectedWeekDate &&
      this.isToday(
        this.selectedWeekDate
      );
  }

  weekDayLabel(
    sessionDate: string | null
  ): string {
    if (!sessionDate) {
      return '';
    }

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
    sessionDate: string | null
  ): string {
    if (!sessionDate) {
      return '';
    }

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
    sessionDate: string | null
  ): string {
    if (!sessionDate) {
      return '';
    }

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
          activity.status !== 'PENDING'
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
      activity.status !== 'PENDING'
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


    const updatedPlanByDate = new Map(
      this.weekPlans.map(
        plan => [plan.sessionDate, plan]
      )
    );

    this.visiblePlanDays =
      this.visiblePlanDays.map(
        day => ({
          ...day,
          plan:
            updatedPlanByDate.get(
              day.sessionDate
            ) ??
            day.plan
        })
      );

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
    return activity.status !== 'PENDING';
  }
}
