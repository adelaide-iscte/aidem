import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-complementary-info-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './complementary-info-modal.component.html',
  styleUrl: './complementary-info-modal.component.scss'
})
export class ComplementaryInfoModalComponent {
  @Output() close = new EventEmitter<void>();

  closeModal(): void {
    this.close.emit();
  }
}
