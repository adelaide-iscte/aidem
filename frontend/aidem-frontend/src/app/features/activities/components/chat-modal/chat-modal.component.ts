import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {CallOverlayComponent} from '../../../../shared/call-overlar-modal/call-overlay.component';
import {SideMenuComponent} from '../../../../shared/side-menu-modal/side-menu.component';

export interface PatientProfile {
  id: number;

  name: string;
  fullName: string;
  birthDate: string | null;
  age: number;
  code: string;

  diagnosisType: string;
  gender: string;

  phone: string;
  email: string;
  address: string;

  education: string;
  profession: string;
  sessionType: string;

  informalCaregiverName: string;
  informalCaregiverPhone: string;
  informalCaregiverEmail: string;

  avatar: string;
  subtitle: string;
}
@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CallOverlayComponent, SideMenuComponent],
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.scss']
})
export class ChatModalComponent {
  @Input() role: 'formal' | 'informal' = 'formal';
  @Input() patient!: PatientProfile;
  @Input() isAdmin = false;
  @Output() close = new EventEmitter<void>();
  @Output() goBack = new EventEmitter<void>();
  @Output() openPatients = new EventEmitter<void>();
  @Output() goHome = new EventEmitter<void>();
  @Output() openProfile = new EventEmitter<void>();
  @Output() openActivities = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  showSideMenu = false;

  @Output()
  openAdminActivities =
    new EventEmitter<void>();

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  get headerAvatar(): string {
    if (this.isAdmin) {
      return '/icons/adm.svg';
    }

    return this.role === 'formal'
      ? '/icons/professional.svg'
      : '/icons/generic_user.svg';
  }

  get contactName(): string {
    return this.role === 'formal'
      ? 'Administração'
      : 'Carolina Cortes';
  }

  get contactRole(): string {
    return this.role === 'formal'
      ? 'Serviços'
      : 'Profissional de saúde';
  }

  get contactAvatar(): string {
    return this.role === 'formal'
      ? '/icons/adm.svg'
      : '/icons/professional.svg';
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
