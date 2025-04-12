import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ModalService } from '../../../core/services/utils/modal.service';

@Component({
  selector: 'app-modal-container',
  templateUrl: './modal-container.component.html',
  styleUrls: ['./modal-container.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ModalContainerComponent implements OnInit {
  modals$!: Observable<any[]>;

  constructor(private modalService: ModalService) { }

  ngOnInit() {
    this.modals$ = this.modalService.getModals();
  }

  closeModal(id: string) {
    const currentModals = this.modalService['modals'].getValue();
    const modalToClose = currentModals.find(m => m.id === id);

    if (modalToClose) {
      this.modalService['close'](id);
    }
  }

  onOverlayClick(event: MouseEvent, modal: any) {
    if (modal.config.closeOnOutsideClick) {
      this.closeModal(modal.id);
    }
  }

  getModalStyles(config: any) {
    return {
      width: config.width,
      height: config.height,
      'z-index': config.zIndex + 1
    };
  }

  getInjector(modal: any) {
    return modal.injector || null;
  }
}