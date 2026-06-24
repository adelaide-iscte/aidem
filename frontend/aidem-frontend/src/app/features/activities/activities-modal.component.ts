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

type UserRole = 'informal' | 'formal';

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

  @Output() goHome = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();

  sessionPlan: SessionPlan | null = null;
  activities: SessionPlanExercise[] = [];
  isLoadingPlan = false;
  planError = '';

  selectedActivity: SessionPlanExercise | null = null;
  showSideMenu = false;
  showSkipModal = false;
  showNotifications = false;
  showCallOverlay = false;
  showFeedbackModal = false;
  showInstructionsModal = false;
  showComplementaryInfoModal = false;

  constructor(private sessionPlanService: SessionPlanService,  private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    void this.loadTodayPlan();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedPatient'] && !changes['selectedPatient'].firstChange) {
      void this.loadTodayPlan();
    }
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
    return this.isFormalMode ? 'Contacte a administração!' : 'Contacte-nos!';
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

  activityImage(activity: SessionPlanExercise): string {
    return activity.mediaUrl || '/icons/activity-balance.svg';
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

  changePatient(): void {
    this.closeSideMenu();
    this.openPatients.emit();
  }

  toggleNotifications(): void { this.showNotifications = !this.showNotifications; }
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

    const updated = await this.sessionPlanService.sendFeedback(this.selectedActivity.sessionPlanExerciseId, {
      completed: true,
      difficultyFeedback: event.difficulty,
      emotionFeedback: event.completion,
      notes: event.reason
          ?? (event.completion === 'almost' ? 'Conseguiu quase finalizar a atividade.' : undefined)
    });

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

  private updateActivity(updated: SessionPlanExercise): void {
    this.activities = this.activities.map(activity =>
      activity.sessionPlanExerciseId === updated.sessionPlanExerciseId ? updated : activity
    );
    if (this.sessionPlan) {
      this.sessionPlan = { ...this.sessionPlan, exercises: this.activities };
    }
    this.cdr.detectChanges();
  }

  isSkipped(activity: SessionPlanExercise): boolean {
    return activity.status === 'SKIPPED';
  }

  isCompleted(activity: SessionPlanExercise): boolean {
    return activity.status === 'COMPLETED' || activity.status === 'SKIPPED';
  }

  isLocked(activity: SessionPlanExercise): boolean {
    return activity.status === 'COMPLETED' || activity.status === 'SKIPPED';
  }
}
