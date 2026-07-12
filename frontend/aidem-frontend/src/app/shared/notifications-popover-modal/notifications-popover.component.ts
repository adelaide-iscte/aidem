import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Output
} from '@angular/core';

import {
  ExerciseNotificationService
} from '../../core/services/exercise-notification.service';

@Component({
  selector: 'app-notifications-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-popover.component.html',
  styleUrl: './notifications-popover.component.scss'
})
export class NotificationsPopoverComponent {

  @Output() close = new EventEmitter<void>();

  constructor(
    public notificationService: ExerciseNotificationService
  ) {}
}
