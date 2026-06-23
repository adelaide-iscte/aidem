import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FeedbackSubmitEvent = {
  completion: 'yes' | 'almost' | 'no';
  difficulty: 'easy' | 'medium' | 'hard';
};

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feedback-modal.component.html',
  styleUrl: './feedback-modal.component.scss'
})
export class FeedbackModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() submitFeedback = new EventEmitter<FeedbackSubmitEvent>();

  selectedCompletion: FeedbackSubmitEvent['completion'] | '' = '';
  selectedDifficulty: FeedbackSubmitEvent['difficulty'] | '' = '';
  showSuccess = false;

  selectCompletion(value: FeedbackSubmitEvent['completion']): void {
    this.selectedCompletion = value;
  }

  selectDifficulty(value: FeedbackSubmitEvent['difficulty']): void {
    this.selectedDifficulty = value;
  }

  submit(): void {
    if (!this.selectedCompletion || !this.selectedDifficulty) return;

    this.submitFeedback.emit({
      completion: this.selectedCompletion,
      difficulty: this.selectedDifficulty
    });

    this.showSuccess = true;
  }

  closeModal(): void {
    this.close.emit();
  }
}
