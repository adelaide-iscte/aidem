import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss'
})
export class SideMenuComponent {
  @Output() close = new EventEmitter<void>();
  @Output() changePatient = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<void>();

  showSideMenu = false;

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void {
    this.showSideMenu = false;
  }
}
