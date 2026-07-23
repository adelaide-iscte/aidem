import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
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
  ExerciseNotificationService
} from '../../../../core/services/exercise-notification.service';

import {
  NotificationsPopoverComponent
} from '../../../../shared/notifications-popover-modal/notifications-popover.component';
import {
  ChatContact,
  ChatContactRole,
  ChatConversation,
  ChatMessage,
  ChatService
} from '../../../../core/services/chat.service';

@Component({
  selector: 'app-chat-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CallOverlayComponent,
    SideMenuComponent,
    NotificationsPopoverComponent
  ],
  templateUrl: './chat-modal.component.html',
  styleUrls: ['./chat-modal.component.scss']
})
export class ChatModalComponent
  implements OnInit, OnDestroy {

  @Input()
  role: 'formal' | 'informal' = 'formal';

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
  @Output() logout = new EventEmitter<void>();
  @ViewChild('messagesContainer')

  private messagesContainer?:
    ElementRef<HTMLElement>;

  conversations: ChatConversation[] = [];
  contacts: ChatContact[] = [];
  messages: ChatMessage[] = [];

  selectedContact: ChatContact | null = null;

  message = '';
  contactSearch = '';

  isLoadingConversations = false;
  isLoadingContacts = false;
  isLoadingMessages = false;
  isSendingMessage = false;

  showNewMessage = false;
  showSideMenu = false;
  showCallOverlay = false;

  conversationsError = '';
  contactsError = '';
  messagesError = '';
  sendError = '';
  showNotifications = false;

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;

  constructor(
    private chatService: ChatService,
    public notificationService: ExerciseNotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  toggleNotifications(): void {
    if (
      this.role !== 'informal' ||
      this.isAdmin
    ) {
      return;
    }

    this.showNotifications =
      !this.showNotifications;

    if (this.showNotifications) {
      this.notificationService.markAsRead();
    }
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  get headerAvatar(): string {
    if (this.isAdmin) {
      return '/icons/adm.svg';
    }

    return this.role === 'formal'
      ? '/icons/professional.svg'
      : '/icons/generic_user.svg';
  }

  get filteredContacts(): ChatContact[] {
    const search =
      this.contactSearch
        .trim()
        .toLocaleLowerCase('pt-PT');

    if (!search) {
      return this.contacts;
    }

    return this.contacts.filter(contact => {
      const searchable =
        `${contact.fullName} ${this.roleLabel(contact.role)}`
          .toLocaleLowerCase('pt-PT');

      return searchable.includes(search);
    });
  }

  get canSendMessage(): boolean {
    return Boolean(
      this.selectedContact &&
      !this.isLoadingMessages &&
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

  async openNewMessagePicker():
    Promise<void> {

    this.showNewMessage = true;
    this.contactSearch = '';

    if (this.contacts.length === 0) {
      await this.loadContacts();
    }
  }

  closeNewMessagePicker(): void {
    this.showNewMessage = false;
    this.contactSearch = '';
  }

  async selectConversation(
    conversation: ChatConversation
  ): Promise<void> {

    await this.openConversation({
      id: conversation.contactId,
      fullName: conversation.contactName,
      role: conversation.contactRole
    });
  }

  async selectContact(
    contact: ChatContact
  ): Promise<void> {

    this.closeNewMessagePicker();

    await this.openConversation(
      contact
    );
  }

  returnToConversationList(): void {
    this.selectedContact = null;
    this.messages = [];
    this.message = '';
    this.messagesError = '';
    this.sendError = '';
  }

  openCallOverlay(): void {
    if (!this.selectedContact) {
      return;
    }

    this.showCallOverlay = true;
  }

  closeCallOverlay(): void {
    this.showCallOverlay = false;
  }

  async sendMessage(): Promise<void> {
    const content =
      this.message.trim();

    if (
      !content ||
      !this.selectedContact ||
      this.isSendingMessage
    ) {
      return;
    }

    this.isSendingMessage = true;
    this.sendError = '';

    try {
      const sentMessage =
        await this.chatService.sendMessage(
          this.selectedContact.id,
          content
        );

      this.mergeMessages([
        sentMessage
      ]);

      this.message = '';

      this.scrollToBottom();

      await this.loadConversations(true);
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

  avatarForRole(
    role: ChatContactRole
  ): string {

    switch (role) {
      case 'ADMIN':
        return '/icons/adm.svg';

      case 'FORMAL_CAREGIVER':
        return '/icons/professional.svg';

      case 'INFORMAL_CAREGIVER':
        return '/icons/generic_user.svg';
    }
  }

  roleLabel(
    role: ChatContactRole
  ): string {

    switch (role) {
      case 'ADMIN':
        return 'Administração';

      case 'FORMAL_CAREGIVER':
        return 'Profissional de saúde';

      case 'INFORMAL_CAREGIVER':
        return 'Cuidador informal';
    }
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

  formatConversationTime(
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
          month: '2-digit'
        }
    ).format(date);
  }

  trackByConversation(
    _: number,
    conversation: ChatConversation
  ): number {
    return conversation.contactId;
  }

  trackByContact(
    _: number,
    contact: ChatContact
  ): number {
    return contact.id;
  }

  trackByMessageId(
    _: number,
    chatMessage: ChatMessage
  ): number {
    return chatMessage.id;
  }

  private async initialize():
    Promise<void> {

    await this.loadConversations();

    this.startPolling();
  }

  private async loadConversations(
    silent = false
  ): Promise<void> {

    if (!silent) {
      this.isLoadingConversations = true;
      this.conversationsError = '';
    }

    try {
      this.conversations =
        await this.chatService
          .getConversations();
    } catch (error) {
      console.error(
        'Erro ao carregar conversas:',
        error
      );

      if (!silent) {
        this.conversationsError =
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as conversas.';
      }
    } finally {
      if (!silent) {
        this.isLoadingConversations = false;
      }

      this.cdr.detectChanges();
    }
  }

  private async loadContacts():
    Promise<void> {

    this.isLoadingContacts = true;
    this.contactsError = '';

    try {
      this.contacts =
        await this.chatService
          .getContacts();
    } catch (error) {
      console.error(
        'Erro ao carregar contactos:',
        error
      );

      this.contactsError =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os utilizadores.';
    } finally {
      this.isLoadingContacts = false;
      this.cdr.detectChanges();
    }
  }

  private async openConversation(
    contact: ChatContact
  ): Promise<void> {

    this.selectedContact = contact;
    this.messages = [];
    this.message = '';
    this.messagesError = '';
    this.sendError = '';
    this.isLoadingMessages = true;

    try {
      this.messages =
        await this.chatService
          .getMessages(contact.id);
    } catch (error) {
      console.error(
        'Erro ao abrir conversa:',
        error
      );

      this.messagesError =
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir esta conversa.';
    } finally {
      this.isLoadingMessages = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollingTimer = setInterval(
      () => {
        void this.poll();
      },
      5000
    );
  }

  private stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(
        this.pollingTimer
      );

      this.pollingTimer = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.isPolling) {
      return;
    }

    this.isPolling = true;

    try {
      await this.loadConversations(
        true
      );

      if (this.selectedContact) {
        await this.loadNewMessages();
      }
    } finally {
      this.isPolling = false;
    }
  }

  private async loadNewMessages():
    Promise<void> {

    if (!this.selectedContact) {
      return;
    }

    try {
      const lastMessageId =
        this.messages.length > 0
          ? this.messages[
          this.messages.length - 1
            ].id
          : 0;

      const newMessages =
        await this.chatService.getMessages(
          this.selectedContact.id,
          lastMessageId
        );

      if (newMessages.length > 0) {
        this.mergeMessages(
          newMessages
        );

        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    } catch (error) {
      console.warn(
        'Não foi possível atualizar as mensagens:',
        error
      );
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
    ).sort(
      (a, b) => a.id - b.id
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container =
        this.messagesContainer
          ?.nativeElement;

      if (container) {
        container.scrollTop =
          container.scrollHeight;
      }
    });
  }
}
