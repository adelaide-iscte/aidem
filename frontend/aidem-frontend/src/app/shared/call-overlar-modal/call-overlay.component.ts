import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-call-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-overlay.component.html',
  styleUrl: './call-overlay.component.scss'
})
export class CallOverlayComponent {
  @Input() name = 'Carolina Santos Cortes';
  @Input() status = 'A chamar ...';
  @Input() avatar = '/icons/professional.svg';

  @Output() endCall = new EventEmitter<void>();
}
