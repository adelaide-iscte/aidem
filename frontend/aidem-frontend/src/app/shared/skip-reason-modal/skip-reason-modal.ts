import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-skip-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skip-reason-modal.component.html',
  styleUrl: './skip-reason-modal.component.scss'
})
export class SkipReasonModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() submitReason = new EventEmitter<string>();

  reason = '';

  submit(): void {
    const cleanReason = this.reason.trim();

    if (!cleanReason) return;

    this.submitReason.emit(cleanReason);
    this.reason = '';
    this.close.emit();
  }
}
