import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';

/**
 * API contract expected by this screen:
 * POST /api/profile/two-factor-authentication/email/send-otp
 * POST /api/profile/two-factor-authentication/email/verify-otp  { otp: string }
 * POST /api/profile/two-factor-authentication/enable             { method: 'EMAIL' }
 *
 * The supplied project currently contains no 2FA endpoints or backend DTOs. Keep these paths
 * aligned with the server implementation when that API is added; the UI never fabricates an OTP.
 */
type VerificationStep = 'method' | 'otp';
type VerificationMethod = 'EMAIL' | 'AUTHENTICATOR';

@Component({
  selector: 'app/general-settings',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './general-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneralSettings {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/profile/two-factor-authentication`;
  private readonly cancelPendingRequests$ = new Subject<void>();

  protected readonly selectedTab = signal('General Settings');
  protected readonly isTwoFactorEnabled = signal(false);
  protected readonly isModalOpen = signal(false);
  protected readonly step = signal<VerificationStep>('method');
  protected readonly selectedMethod = signal<VerificationMethod | null>(null);
  protected readonly isSendingOtp = signal(false);
  protected readonly isVerifyingOtp = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly isResendingOtp = signal(false);
  protected readonly otpVerified = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly methodForm = new FormGroup({
    method: new FormControl<VerificationMethod | null>(null, Validators.required),
  });

  protected readonly otpForm = new FormGroup({
    otp: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d+$/)],
    }),
  });

  protected selectTab(tab: string): void {
    if (tab === 'Subscription & Billing') {
      void this.router.navigate(['/admin-dashboard/subscription']);
      return;
    }
    this.selectedTab.set(tab);
  }

  protected openVerification(): void {
    this.resetFlow();
    this.isModalOpen.set(true);
  }

  protected closeVerification(): void {
    // Closing at any point discards the uncommitted setup. Only the final save enables 2FA.
    this.cancelPendingRequests$.next();
    this.isModalOpen.set(false);
    this.resetFlow();
  }

  protected cancelVerification(): void {
    this.closeVerification();
  }

  protected onMethodChange(method: VerificationMethod): void {
    this.selectedMethod.set(method);
    this.methodForm.controls.method.setValue(method);
    this.methodForm.controls.method.markAsTouched();
    this.errorMessage.set('');
  }

  protected continueToOtp(): void {
    this.methodForm.markAllAsTouched();
    if (this.methodForm.invalid || !this.selectedMethod() || this.isSendingOtp()) {
      this.errorMessage.set('Please select a verification method to continue.');
      return;
    }

    if (this.selectedMethod() !== 'EMAIL') {
      this.errorMessage.set('Authenticator App verification will be available in Phase 2.');
      return;
    }

    this.isSendingOtp.set(true);
    this.errorMessage.set('');
    this.http
      .post(`${this.apiUrl}/email/send-otp`, {})
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancelPendingRequests$), finalize(() => this.isSendingOtp.set(false)))
      .subscribe({
        next: () => {
          this.step.set('otp');
          this.successMessage.set('A verification code has been sent to your email.');
        },
        error: (error: unknown) => this.showRequestError(error, 'Unable to send a verification code.'),
      });
  }

  protected onOtpInput(value: string): void {
    this.otpForm.controls.otp.setValue(value.replace(/\D/g, ''));
    this.errorMessage.set('');
  }

  protected verifyOtp(): void {
    this.otpForm.markAllAsTouched();
    if (this.otpForm.invalid || this.isVerifyingOtp() || this.otpVerified()) return;
    this.isVerifyingOtp.set(true);
    this.errorMessage.set('');
    this.http
      .post(`${this.apiUrl}/email/verify-otp`, { otp: this.otpForm.controls.otp.value })
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancelPendingRequests$), finalize(() => this.isVerifyingOtp.set(false)))
      .subscribe({
        next: () => {
          this.otpVerified.set(true);
          this.successMessage.set('Your email has been verified. Save to enable 2FA.');
        },
        error: (error: unknown) => this.showRequestError(error, 'The verification code could not be verified.'),
      });
  }

  protected resendOtp(): void {
    if (this.isResendingOtp() || this.isSendingOtp() || this.isVerifyingOtp() || this.isSaving()) return;
    this.isResendingOtp.set(true);
    this.errorMessage.set('');
    this.http
      .post(`${this.apiUrl}/email/send-otp`, {})
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancelPendingRequests$), finalize(() => this.isResendingOtp.set(false)))
      .subscribe({
        next: () => {
          this.otpVerified.set(false);
          this.otpForm.reset();
          this.successMessage.set('A new verification code has been sent to your email.');
        },
        error: (error: unknown) => this.showRequestError(error, 'Unable to resend the verification code.'),
      });
  }

  protected saveTwoFactor(): void {
    if (!this.otpVerified() || this.isSaving()) return;
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.http
      .post(`${this.apiUrl}/enable`, { method: 'EMAIL' })
      .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.cancelPendingRequests$), finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.isTwoFactorEnabled.set(true);
          this.closeVerification();
        },
        error: (error: unknown) => this.showRequestError(error, 'Unable to enable email verification.'),
      });
  }

  private showRequestError(error: unknown, fallback: string): void {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      this.errorMessage.set('Could not reach the server. Check your connection and try again.');
      return;
    }
    const message = error instanceof HttpErrorResponse ? error.error?.message : undefined;
    this.errorMessage.set(typeof message === 'string' ? message : fallback);
  }

  private resetFlow(): void {
    this.step.set('method');
    this.selectedMethod.set(null);
    this.methodForm.reset();
    this.otpForm.reset();
    this.isSendingOtp.set(false);
    this.isVerifyingOtp.set(false);
    this.isSaving.set(false);
    this.isResendingOtp.set(false);
    this.otpVerified.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
