import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AdminSummary, AuthService } from '../../services/auth';

type AdminStatus = 'Active' | 'Inactive';
type StatusDraft = { suspend: boolean; startDate: string; endDate: string; status: AdminStatus };
type Confirmation = { type: 'delete' | 'inactive'; admin: AdminSummary };

@Component({
  selector: 'app-admin-list',
  templateUrl: './admin-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminList {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly admins = signal<AdminSummary[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<'All' | AdminStatus>('All');
  readonly currentPage = signal(0);
  readonly pageSize = signal(12);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));
  readonly visibleAdmins = computed(() => this.admins());
  readonly selectedIds = signal<number[]>([]);
  readonly allVisibleSelected = computed(() => this.admins().length > 0 && this.admins().every(a => this.selectedIds().includes(a.id)));
  readonly openActionId = signal<number | null>(null);
  readonly bulkMenuOpen = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly statusDraft = signal<StatusDraft | null>(null);
  readonly confirmAction = signal<Confirmation | null>(null);

  constructor() { this.loadAdmins(); }

  loadAdmins(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.loadError.set(null);
    this.authService.listAdmins({ search: this.searchTerm().trim(), status: this.statusFilter(), page: this.currentPage(), size: this.pageSize() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.admins.set(page.content ?? []);
          this.totalElements.set(page.totalElements ?? 0);
          this.totalPages.set(page.totalPages ?? 0);
          this.currentPage.set(page.number ?? 0);
          const available = new Set(page.content.map(admin => admin.id));
          this.selectedIds.update(ids => ids.filter(id => available.has(id)));
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); this.loadError.set('Unable to load administrators. Please try again.'); },
      });
  }

  onSearch(value: string): void { this.searchTerm.set(value); this.currentPage.set(0); this.loadAdmins(); }
  onStatusFilter(value: string): void { this.statusFilter.set(value as 'All' | AdminStatus); this.currentPage.set(0); this.loadAdmins(); }
  changePage(page: number): void { if (!this.loading() && page >= 0 && page < this.totalPages()) { this.currentPage.set(page); this.loadAdmins(); } }
  changePageSize(value: string): void { this.pageSize.set(Number(value)); this.currentPage.set(0); this.loadAdmins(); }
  toggleBulkMenu(): void { this.bulkMenuOpen.update(value => !value); this.openActionId.set(null); }
  toggleSelectAll(checked: boolean): void { this.selectedIds.set(checked ? this.admins().map(a => a.id) : []); }
  toggleSelection(id: number, checked: boolean): void { this.selectedIds.update(ids => checked ? [...new Set([...ids, id])] : ids.filter(item => item !== id)); }
  toggleActionMenu(admin: AdminSummary): void {
    this.bulkMenuOpen.set(false);
    this.openActionId.update(id => id === admin.id ? null : admin.id);
    if (this.openActionId() === admin.id) this.statusDraft.set({ suspend: false, startDate: '', endDate: '', status: admin.status });
  }
  closeActionMenu(): void { this.openActionId.set(null); this.statusDraft.set(null); }
  updateStatusDraft(field: keyof StatusDraft, value: string | boolean): void {
    this.statusDraft.update(draft => draft ? { ...draft, [field]: value } as StatusDraft : draft);
  }
  formatName(admin: AdminSummary): string { return admin.username?.trim() || 'Unknown Admin'; }
  saveStatus(admin: AdminSummary): void {
    const draft = this.statusDraft();
    if (!draft) return;
    if (draft.suspend && (!draft.startDate || !draft.endDate || draft.endDate <= draft.startDate)) {
      this.errorMessage.set('Enter a valid suspension period with an end date after the start date.');
      return;
    }
    if (draft.status === 'Inactive' && admin.status !== 'Inactive') {
      this.confirmAction.set({ type: 'inactive', admin });
    } else if (draft.status !== admin.status || draft.suspend) {
      this.errorMessage.set('Admin status update API is not configured. No status was changed.');
    }
    this.closeActionMenu();
  }
  requestDelete(admin: AdminSummary): void { this.confirmAction.set({ type: 'delete', admin }); this.closeActionMenu(); }
  confirmStatusAction(): void {
    const action = this.confirmAction();
    if (action) this.errorMessage.set(action.type === 'delete' ? 'Admin deletion API is not configured. No administrator was deleted.' : 'Admin status update API is not configured. No status was changed.');
    this.confirmAction.set(null);
  }
  cancelConfirmation(): void { this.confirmAction.set(null); }
  applyBulkStatus(status: AdminStatus): void {
    if (!this.selectedIds().length) return;
    this.errorMessage.set(`Bulk ${status.toLowerCase()} API is not configured. No administrators were changed.`);
    this.bulkMenuOpen.set(false);
  }
  bulkDelete(): void {
    if (!this.selectedIds().length) return;
    this.errorMessage.set('Bulk deletion API is not configured. No administrators were deleted.');
    this.bulkMenuOpen.set(false);
  }
 openEditProfile(admin: any): void {
  this.router.navigate(['/admin-dashboard/edit-profile'], {
    state: { adminData: admin }
  });
}
}
