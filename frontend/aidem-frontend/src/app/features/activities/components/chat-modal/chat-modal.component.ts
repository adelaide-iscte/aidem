import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CallOverlayComponent
} from '../../../../shared/call-overlar-modal/call-overlay.component';
import {
  SideMenuComponent
} from '../../../../shared/side-menu-modal/side-menu.component';
import {
  ChatContact,
  ChatMessage,
  ChatService
} from '../../../../core/services/chat.service';
import {
  PatientProfile
} from '../../../../core/services/patient.service';

@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CallOverlayComponent,
    SideMenuComponent
  ],
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.scss']
})
export class ChatModalComponent
  implements OnInit, OnChanges, OnDestroy {

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
  @Output() openUserManagement = new EventEmitter<void>();
  @Output() openAdminActivities = new EventEmitter<void>();

  @ViewChild('messagesContainer')
  private messagesContainer?: ElementRef<HTMLElement>;

  contact: ChatContact | null = null;
  messages: ChatMessage[] = [];
  message = '';

  isLoadingChat = false;
  isSendingMessage = false;
  chatError = '';
  sendError = '';

  showSideMenu = false;
  showCallOverlay = false;

  private pollingTimer:
    ReturnType<typeof setInterval> | null = null;

  private isPolling = false;

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initializeChat();
  }

  ngOnChanges(
    changes: SimpleChanges
  ): void {
    if (
      changes['patient'] &&
      !changes['patient'].firstChange
    ) {
      void this.initializeChat();
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
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
    if (this.contact?.fullName) {
      return this.contact.fullName;
    }

    return this.role === 'formal'
      ? 'Cuidador informal'
      : 'Profissional de saúde';
  }

  get contactRole(): string {
    switch (this.contact?.role) {
      case 'FORMAL_CAREGIVER':
        return 'Profissional de saúde';

      case 'INFORMAL_CAREGIVER':
        return 'Cuidador informal';

      default:
        return this.role === 'formal'
          ? 'Cuidador informal'
          : 'Profissional de saúde';
    }
  }

  get contactAvatar(): string {
    switch (this.contact?.role) {
      case 'INFORMAL_CAREGIVER':
        return '/icons/generic_user.svg';

      case 'FORMAL_CAREGIVER':
        return '/icons/professional.svg';

      default:
        return this.role === 'formal'
          ? '/icons/generic_user.svg'
          : '/icons/professional.svg';
    }
  }

  get canSendMessage(): boolean {
    return Boolean(
      this.contact &&
      !this.isLoadingChat &&
      !this.isSendingMessage &&
      this.message.trim()
    );
  }

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }

  openCallOverlay(): void {
    if (!this.contact) {
      return;
    }

    this.showCallOverlay = true;
  }

  closeCallOverlay(): void {
    this.showCallOverlay = false;
  }

  async sendMessage(): Promise<void> {
    const content = this.message.trim();

    if (
      !content ||
      !this.contact ||
      !this.patient?.id ||
      this.isSendingMessage
    ) {
      return;
    }

    this.isSendingMessage = true;
    this.sendError = '';

    try {
      const sentMessage =
        await this.chatService.sendMessage(
          this.patient.id,
          content
        );

      this.mergeMessages([sentMessage]);
      this.message = '';
      this.scrollToBottom();
    } catch (error) {
      console.error(
        'Erro ao enviar mensagem:',
        error
      );

      this.sendError =
        error instanceof Error
          ? error.message
          : 'Não foi possível enviar a mensagem.';
    } finally {
      this.isSendingMessage = false;
      this.cdr.detectChanges();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  formatMessageTime(
    sentAt: string
  ): string {
    const date = new Date(sentAt);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const today = new Date();

    const sameDay =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return new Intl.DateTimeFormat(
      'pt-PT',
      sameDay
        ? {
          hour: '2-digit',
          minute: '2-digit'
        }
        : {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }
    ).format(date);
  }

  trackByMessageId(
    _: number,
    chatMessage: ChatMessage
  ): number {
    return chatMessage.id;
  }

  private async initializeChat(): Promise<void> {
    this.stopPolling();

    this.contact = null;
    this.messages = [];
    this.chatError = '';
    this.sendError = '';

    if (!this.patient?.id) {
      this.chatError =
        'É necessário selecionar um utente para abrir as mensagens.';
      return;
    }

    this.isLoadingChat = true;

    try {
      const [contact, messages] =
        await Promise.all([
          this.chatService.getContact(
            this.patient.id
          ),
          this.chatService.getMessages(
            this.patient.id
          )
        ]);

      this.contact = contact;
      this.messages = messages;

      this.startPolling();
    } catch (error) {
      console.error(
        'Erro ao abrir conversa:',
        error
      );

      this.chatError =
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir esta conversa.';
    } finally {
      this.isLoadingChat = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollingTimer = setInterval(
      () => {
        void this.loadNewMessages();
      },
      5000
    );
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async loadNewMessages(): Promise<void> {
    if (
      this.isPolling ||
      !this.contact ||
      !this.patient?.id
    ) {
      return;
    }

    this.isPolling = true;

    try {
      const lastMessageId =
        this.messages.length > 0
          ? this.messages[
          this.messages.length - 1
            ].id
          : 0;

      const newMessages =
        await this.chatService.getMessages(
          this.patient.id,
          lastMessageId
        );

      if (newMessages.length > 0) {
        this.mergeMessages(newMessages);
        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    } catch (error) {
      console.warn(
        'Não foi possível atualizar as mensagens:',
        error
      );
    } finally {
      this.isPolling = false;
    }
  }

  private mergeMessages(
    newMessages: ChatMessage[]
  ): void {
    const messagesById =
      new Map<number, ChatMessage>();

    for (const chatMessage of [
      ...this.messages,
      ...newMessages
    ]) {
      messagesById.set(
        chatMessage.id,
        chatMessage
      );
    }

    this.messages = Array.from(
      messagesById.values()
    ).sort((a, b) => a.id - b.id);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container =
        this.messagesContainer?.nativeElement;

      if (container) {
        container.scrollTop =
          container.scrollHeight;
      }
    });
  }
}
