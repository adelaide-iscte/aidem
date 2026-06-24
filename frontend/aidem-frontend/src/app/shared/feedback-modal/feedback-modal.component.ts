import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type FeedbackSubmitEvent = {
  completion: 'yes' | 'almost' | 'no';
  difficulty: 'easy' | 'medium' | 'hard';
  reason?: string;
};

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.scss'
})
export class FeedbackModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() submitFeedback = new EventEmitter<FeedbackSubmitEvent>();

  selectedCompletion: FeedbackSubmitEvent['completion'] | '' = '';
  selectedDifficulty: FeedbackSubmitEvent['difficulty'] | '' = '';
  reason = '';

  showReasonStep = false;
  showSuccess = false;

  selectCompletion(value: FeedbackSubmitEvent['completion']): void {
    this.selectedCompletion = value;
  }

  selectDifficulty(value: FeedbackSubmitEvent['difficulty']): void {
    this.selectedDifficulty = value;
  }

  submit(): void {
    if (!this.selectedCompletion || !this.selectedDifficulty) return;

    if (this.selectedCompletion === 'almost' || this.selectedCompletion === 'no') {
      this.showReasonStep = true;
      return;
    }

    this.emitFeedback();
  }

  submitReason(): void {
    if (!this.reason.trim()) return;
    this.emitFeedback();
  }

  private emitFeedback(): void {
    if (!this.selectedCompletion || !this.selectedDifficulty) return;

    this.submitFeedback.emit({
      completion: this.selectedCompletion,
      difficulty: this.selectedDifficulty,
      reason: this.reason.trim() || undefined
    });

    this.showSuccess = true;
  }

  closeModal(): void {
    this.close.emit();
  }
}
