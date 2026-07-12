import { Injectable, signal } from '@angular/core';
import {
  SessionPlanExercise,
  SessionPlanService
} from './session-plan.service';

export interface ExerciseNotification {
  id: string;
  title: string;
  text: string;
  time: string;
  type: 'EXERCISE_REMINDER';
}

@Injectable({
  providedIn: 'root'
})
export class ExerciseNotificationService {

  /*
   * Horários das notificações:
   * 07:00, 11:00, 15:00 e 19:00.
   *
   * O horário seguinte seria 23:00, mas já ultrapassa as 22:00.
   */
  private readonly notificationHours = [7, 11, 15, 19];

  private patientId: number | null = null;

  private timerId: ReturnType<typeof setInterval> | null = null;

  /*
   * Guarda o último horário para o qual já criámos uma notificação.
   * Evita criar a mesma notificação novamente a cada minuto.
   */
  private lastGeneratedSlot: number | null = null;
  private lastGeneratedDate: string | null = null;

  /*
   * A lista terá sempre zero ou uma notificação.
   * Ao criar uma nova usamos set([notification]), substituindo a anterior.
   */
  readonly notifications = signal<ExerciseNotification[]>([]);
  readonly unreadCount = signal(0);

  constructor(
    private sessionPlanService: SessionPlanService
  ) {}

  start(patientId: number): void {
    console.log('Notification service started', patientId);

    /*
     * Se já estamos a acompanhar este utente, não criamos outro timer.
     */
    if (this.patientId === patientId && this.timerId) {
      void this.checkScheduledNotification();
      return;
    }

    this.stop();

    this.patientId = patientId;

    this.lastGeneratedSlot = null;
    this.lastGeneratedDate = null;
    this.notifications.set([]);
    this.unreadCount.set(0);

    /*
     * Verifica logo ao entrar na aplicação.
     */
    void this.checkScheduledNotification();

    /*
     * Verifica o relógio a cada minuto.
     * A notificação só é criada quando estamos dentro de um horário válido.
     */
    this.timerId = setInterval(() => {
      void this.checkScheduledNotification();
    }, 60_000);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.patientId = null;
    this.lastGeneratedSlot = null;
    this.lastGeneratedDate = null;
    this.notifications.set([]);
    this.unreadCount.set(0);
  }

  /**
   * Atualiza imediatamente a notificação depois de um exercício
   * ser concluído, cancelado ou marcado como não realizado.
   */
  async refresh(): Promise<void> {
    if (!this.patientId) {
      return;
    }

    await this.updateCurrentNotification();
  }

  /**
   * Verifica se chegou um novo horário:
   * 07h, 11h, 15h ou 19h.
   */
  private async checkScheduledNotification(): Promise<void> {
    if (!this.patientId) {
      return;
    }

    const now = new Date();

    /*
     * Não cria notificações antes das 07h nem a partir das 22h.
     */
    if (now.getHours() < 7 || now.getHours() >= 22) {
      return;
    }

    const currentSlot = this.getCurrentSlot(now.getHours());

    if (currentSlot === null) {
      return;
    }

    const currentDate = this.toDateKey(now);

    const alreadyGenerated =
      this.lastGeneratedSlot === currentSlot &&
      this.lastGeneratedDate === currentDate;

    if (alreadyGenerated) {
      return;
    }

    await this.createNotification(currentSlot, now);
  }

  /**
   * Atualiza a notificação existente com a quantidade atual
   * de exercícios pendentes.
   *
   * Se já não houver exercícios pendentes, remove-a.
   */
  private async updateCurrentNotification(): Promise<void> {
    if (!this.patientId) {
      return;
    }

    const now = new Date();

    if (now.getHours() < 7 || now.getHours() >= 22) {
      return;
    }

    const currentSlot = this.getCurrentSlot(now.getHours());

    if (currentSlot === null) {
      return;
    }

    await this.createNotification(currentSlot, now, true);
  }

  markAsRead(): void {
    this.unreadCount.set(0);
  }


  private async createNotification(
    slotHour: number,
    now: Date,
    isRefresh = false
  ): Promise<void> {
    if (!this.patientId) {
      return;
    }

    try {
      const plan = await this.sessionPlanService.getTodayPlan(
        this.patientId
      );

      const remainingExercises = (plan.exercises ?? []).filter(
        exercise => this.isPending(exercise)
      ).length;

      /*
       * Se todos os exercícios estiverem terminados,
       * não mostramos nenhuma notificação.
       */
      if (remainingExercises === 0) {
        this.notifications.set([]);
        this.unreadCount.set(0);

        this.lastGeneratedSlot = slotHour;
        this.lastGeneratedDate = this.toDateKey(now);

        return;
      }

      const notification: ExerciseNotification = {
        id: 'exercise-reminder',
        title: this.getNotificationTitle(slotHour),
        text: this.getNotificationText(
          remainingExercises,
          slotHour
        ),
        time: this.formatTime(now),
        type: 'EXERCISE_REMINDER'
      };

      /*
       * Substitui a notificação anterior.
       * Nunca se acumulam vários lembretes de exercícios.
       */
      this.notifications.set([notification]);
      this.unreadCount.set(1);

      /*
       * No refresh atualizamos apenas a contagem.
       * Mesmo assim mantemos o slot como já processado.
       */
      this.lastGeneratedSlot = slotHour;
      this.lastGeneratedDate = this.toDateKey(now);

    } catch (error) {
      console.error(
        'Erro ao criar notificação dos exercícios:',
        error
      );
    }
  }

  private isPending(exercise: SessionPlanExercise): boolean {
    return (
      exercise.status !== 'COMPLETED' &&
      exercise.status !== 'SKIPPED'
    );
  }

  /**
   * Por exemplo:
   *
   * 08:30 -> slot das 07h
   * 12:00 -> slot das 11h
   * 17:00 -> slot das 15h
   * 21:00 -> slot das 19h
   */
  private getCurrentSlot(currentHour: number): number | null {
    const validSlots = this.notificationHours.filter(
      hour => hour <= currentHour
    );

    if (validSlots.length === 0) {
      return null;
    }

    return validSlots[validSlots.length - 1];
  }

  private getNotificationTitle(slotHour: number): string {
    switch (slotHour) {
      case 7:
        return 'Exercícios de hoje';

      case 11:
        return 'Ainda faltam alguns exercícios';

      case 15:
        return 'Está quase!';

      case 19:
        return 'Não se esqueça da sessão';

      default:
        return 'Exercícios pendentes';
    }
  }

  private getNotificationText(
    remaining: number,
    slotHour: number
  ): string {
    const exerciseWord =
      remaining === 1 ? 'exercício' : 'exercícios';

    switch (slotHour) {
      case 7:
        return remaining === 1
          ? 'Falta 1 exercício por realizar. Vamos começar com calma — cada exercício conta!'
          : `Faltam ${remaining} exercícios por realizar. Vamos começar com calma — cada exercício conta!`;

      case 11:
        return remaining === 1
          ? 'Bom trabalho até aqui! Falta apenas 1 exercício para concluir a sessão de hoje.'
          : `Bom trabalho até aqui! Ainda faltam ${remaining} exercícios para concluir a sessão de hoje.`;

      case 15:
        return remaining === 1
          ? 'Está quase! Falta apenas 1 exercício para terminar.'
          : `Está quase! Faltam apenas ${remaining} exercícios para terminar.`;

      case 19:
        return remaining === 1
          ? 'Não se esqueça de terminar o exercício que falta assim que puder.'
          : `Não se esqueça de terminar os ${remaining} ${exerciseWord} que faltam assim que puder.`;

      default:
        return remaining === 1
          ? 'Falta 1 exercício para concluir a sessão.'
          : `Faltam ${remaining} exercícios para concluir a sessão.`;
    }
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
