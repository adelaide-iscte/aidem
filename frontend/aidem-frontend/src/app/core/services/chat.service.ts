import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export type ChatContactRole =
  | 'ADMIN'
  | 'FORMAL_CAREGIVER'
  | 'INFORMAL_CAREGIVER';

export type ChatContact = {
  id: number;
  fullName: string;
  role: ChatContactRole;
};

export type ChatMessage = {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  sentAt: string;
  mine: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  // Local:
  // private readonly apiUrl =
  //   'http://localhost:8080/api/chat';

  // Produção:
  private readonly apiUrl =
    'https://aidem-backend.onrender.com/api/chat';

  constructor(
    private authService: AuthService
  ) {}

  async getContact(
    patientId: number
  ): Promise<ChatContact> {
    const response = await fetch(
      `${this.apiUrl}/patients/${patientId}/contact`,
      {
        headers: this.getHeaders()
      }
    );

    return this.handleResponse<ChatContact>(
      response,
      'Erro ao carregar o contacto da conversa'
    );
  }

  async getMessages(
    patientId: number,
    afterId?: number
  ): Promise<ChatMessage[]> {
    const query =
      afterId !== undefined
        ? `?afterId=${afterId}`
        : '';

    const response = await fetch(
      `${this.apiUrl}/patients/${patientId}/messages${query}`,
      {
        headers: this.getHeaders(),
        cache: 'no-store'
      }
    );

    return this.handleResponse<ChatMessage[]>(
      response,
      'Erro ao carregar as mensagens'
    );
  }

  async sendMessage(
    patientId: number,
    content: string
  ): Promise<ChatMessage> {
    const response = await fetch(
      `${this.apiUrl}/patients/${patientId}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          content
        })
      }
    );

    return this.handleResponse<ChatMessage>(
      response,
      'Erro ao enviar a mensagem'
    );
  }

  private getHeaders(
    includeContentType = false
  ): HeadersInit {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error('TOKEN_MISSING');
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(includeContentType
        ? {
          'Content-Type': 'application/json'
        }
        : {})
    };
  }

  private async handleResponse<T>(
    response: Response,
    defaultError: string
  ): Promise<T> {
    const raw = await response.text();

    if (response.status === 401) {
      this.authService.expireSession();

      throw new Error(
        'A sessão expirou. Inicie sessão novamente.'
      );
    }

    if (!response.ok) {
      throw new Error(
        this.readErrorMessage(raw) ||
        `${defaultError} (${response.status}).`
      );
    }

    return raw
      ? JSON.parse(raw) as T
      : {} as T;
  }

  private readErrorMessage(
    raw: string
  ): string {
    if (!raw) {
      return '';
    }

    try {
      const body = JSON.parse(raw) as {
        detail?: string;
        message?: string;
      };

      return (
        body.detail ||
        body.message ||
        raw
      );
    } catch {
      return raw;
    }
  }
}
