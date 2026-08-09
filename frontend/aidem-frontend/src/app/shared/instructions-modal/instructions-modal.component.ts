import { Component, EventEmitter, ChangeDetectorRef, Output, Input, OnDestroy } from '@angular/core';
import { SessionPlanExercise } from '../../core/services/session-plan.service';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-instructions-modal',
  standalone: true,
  templateUrl: './instructions-modal.component.html',
  styleUrl: './instructions-modal.component.scss'
})
export class InstructionsModalComponent implements OnDestroy {
  @Input() activity?: SessionPlanExercise;
  @Output() close = new EventEmitter<void>();

  constructor(
    private cdr: ChangeDetectorRef
  ) {}

  selectedActivity: SessionPlanExercise | null = null;
  showInstructionsModal = false;
  isVideoPlayerOpen = false;
  isDemoPlaying = false;
  isDemoMuted = false;
  currentInstructionMediaIndex = 0;

  demoCurrentTime = 0;
  readonly demoDuration = 34;

  private demoTimer: ReturnType<typeof setInterval> | null = null;

  get demoProgress(): number {
    return (
      this.demoCurrentTime /
      this.demoDuration
    ) * 100;
  }

  openVideoPlayer(): void {
    this.stopDemoTimer();

    this.demoCurrentTime = 0;
    this.isDemoPlaying = false;
    this.currentInstructionMediaIndex = 0;
    this.isVideoPlayerOpen = true;
  }

  closeVideoPlayer(): void {
    this.stopDemoTimer();

    this.isDemoPlaying = false;
    this.demoCurrentTime = 0;
    this.isVideoPlayerOpen = false;
  }

  toggleDemoPlayback(): void {
    if (this.demoCurrentTime >= this.demoDuration) {
      this.demoCurrentTime = 0;
    }

    this.isDemoPlaying = !this.isDemoPlaying;

    if (this.isDemoPlaying) {
      this.startDemoTimer();
    } else {
      this.stopDemoTimer();
    }
  }

  skipDemo(seconds: number): void {
    this.demoCurrentTime = Math.min(
      this.demoDuration,
      Math.max(0, this.demoCurrentTime + seconds)
    );

    if (this.demoCurrentTime >= this.demoDuration) {
      this.isDemoPlaying = false;
      this.stopDemoTimer();
    }
  }

  seekDemo(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.demoCurrentTime = Number(input.value);

    if (this.demoCurrentTime >= this.demoDuration) {
      this.isDemoPlaying = false;
      this.stopDemoTimer();
    }
  }

  toggleDemoMute(): void {
    this.isDemoMuted = !this.isDemoMuted;
  }

  togglePlayerFullscreen(player: HTMLElement): void {
    const documentReference = player.ownerDocument;

    if (documentReference.fullscreenElement) {
      void documentReference.exitFullscreen();
      return;
    }

    void player.requestFullscreen();
  }

  formatDemoTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
      `${minutes.toString().padStart(2, '0')}:` +
      `${remainingSeconds.toString().padStart(2, '0')}`
    );
  }

  ngOnDestroy(): void {
    this.stopDemoTimer();
  }

  private startDemoTimer(): void {
    this.stopDemoTimer();

    this.demoTimer = setInterval(() => {
      if (this.demoCurrentTime >= this.demoDuration) {
        this.demoCurrentTime = this.demoDuration;
        this.isDemoPlaying = false;
        this.stopDemoTimer();
        return;
      }

      this.demoCurrentTime++;
    }, 1000);
  }

  private stopDemoTimer(): void {
    if (this.demoTimer !== null) {
      clearInterval(this.demoTimer);
      this.demoTimer = null;
    }
  }

  openInstructionsModal(activity: SessionPlanExercise): void {
    this.selectedActivity = activity;
    this.showInstructionsModal = false;

    setTimeout(() => {
      this.showInstructionsModal = true;
      this.cdr.detectChanges();
    });
  }

  hasInstructionImage(
    activity?: SessionPlanExercise
  ): boolean {
    return Boolean(
      activity?.instructionMediaUrls?.length
    );
  }

  getInstructionMediaUrls(
    activity?: SessionPlanExercise
  ): string[] {
    const media =
      activity?.instructionMediaUrls ?? [];

    return media
      .filter(value => Boolean(value?.trim()))
      .map(value => this.normalizeMediaUrl(value));
  }

  getCurrentInstructionMediaUrl(
    activity?: SessionPlanExercise
  ): string {
    const media =
      this.getInstructionMediaUrls(activity);

    return (
      media[
        this.currentInstructionMediaIndex
        ] ||
      activity?.mediaUrl?.trim() ||
      '/icons/generic_exercise.svg'
    );
  }

  private normalizeMediaUrl(
    media: string
  ): string {
    const normalized = media.trim();

    return (
      normalized.startsWith('data:') ||
      normalized.startsWith('blob:') ||
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('/')
    )
      ? normalized
      : `/${normalized}`;
  }

  previousInstructionMedia(): void {
    if (
      this.currentInstructionMediaIndex > 0
    ) {
      this.currentInstructionMediaIndex--;
    }
  }

  nextInstructionMedia(
    activity?: SessionPlanExercise
  ): void {
    const mediaCount =
      this.getInstructionMediaUrls(
        activity
      ).length;

    if (
      this.currentInstructionMediaIndex <
      mediaCount - 1
    ) {
      this.currentInstructionMediaIndex++;
    }
  }

  getVideoBackground(
    activity?: SessionPlanExercise
  ): string {
    const imageUrl =
      this.getCurrentInstructionMediaUrl(
        activity
      );

    return `
    linear-gradient(
      rgba(0, 0, 0, .35),
      rgba(0, 0, 0, .35)
    ),
    url("${imageUrl}")
  `;
  }

  ngOnChanges(): void {
    console.log('INSTRUCTIONS ACTIVITY:', this.activity);
  }

  closeInstructionsModal(): void {
    this.showInstructionsModal = false;
    this.selectedActivity = null;
    this.cdr.detectChanges();
  }
  closeModal(): void {
    this.close.emit();
  }
}
