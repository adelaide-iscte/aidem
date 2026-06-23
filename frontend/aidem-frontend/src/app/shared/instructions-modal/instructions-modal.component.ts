import { Component, EventEmitter, ChangeDetectorRef, Output, Input } from '@angular/core';
import { SessionPlanExercise } from '../../core/services/session-plan.service';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-instructions-modal',
  standalone: true,
  templateUrl: './instructions-modal.component.html',
  styleUrl: './instructions-modal.component.scss'
})
export class InstructionsModalComponent {
  @Input() activity?: SessionPlanExercise;
  @Output() close = new EventEmitter<void>();

  constructor(
    private cdr: ChangeDetectorRef
  ) {}

  selectedActivity: SessionPlanExercise | null = null;
  showInstructionsModal = false;

  openInstructionsModal(activity: SessionPlanExercise): void {
    this.selectedActivity = activity;
    this.showInstructionsModal = false;

    setTimeout(() => {
      this.showInstructionsModal = true;
      this.cdr.detectChanges();
    });
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
