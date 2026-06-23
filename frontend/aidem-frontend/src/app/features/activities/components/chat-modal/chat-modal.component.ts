import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {CallOverlayComponent} from '../../../../shared/call-overlar-modal/call-overlay.component';

@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CallOverlayComponent],
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.scss']
})
export class ChatModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();

  message = '';

  showCallOverlay = false;

  openCallOverlay(): void {
    this.showCallOverlay = true;
  }

  closeCallOverlay(): void {
    this.showCallOverlay = false;
  }

  sendMessage(): void {
    if (!this.message.trim()) return;

    console.log('Mensagem enviada:', this.message);
    this.message = '';
  }

  closeModal(): void {
    this.close.emit();
  }
}
