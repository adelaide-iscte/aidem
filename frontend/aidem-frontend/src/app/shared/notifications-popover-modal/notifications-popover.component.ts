import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-notifications-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-popover.component.html',
  styleUrl: './notifications-popover.component.scss'
})
export class NotificationsPopoverComponent {
  @Input() notifications = [
    {
      title: 'Nova mensagem',
      text: 'O cuidador profissional enviou-lhe uma mensagem!',
      time: 'Agora'
    }
  ];

  @Output() close = new EventEmitter<void>();
}
