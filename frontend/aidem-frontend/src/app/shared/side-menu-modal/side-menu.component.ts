import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-side-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss'
})
export class SideMenuComponent {
  @Input() canChangePatient = true;
  @Input() isAdmin = false;
  @Output() close = new EventEmitter<void>();
  @Output() changePatient = new EventEmitter<void>();
  @Output() openContents = new EventEmitter<void>();
  @Output() openAdminActivities = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() openUserManagement = new EventEmitter<void>();

  showSideMenu = false;

  openSideMenu(): void {
    this.showSideMenu = true;
  }

  closeSideMenu(): void { this.showSideMenu = false;
  }
}
