import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {CallOverlayComponent} from '../../../../shared/call-overlar-modal/call-overlay.component';
import {SideMenuComponent} from '../../../../shared/side-menu-modal/side-menu.component';

@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CallOverlayComponent, SideMenuComponent],
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.scss']
})
export class ChatModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openActivities = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();

  showSideMenu = false;

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

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
