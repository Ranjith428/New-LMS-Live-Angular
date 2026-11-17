import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  computed,
  signal,
  viewChild,
} from '@angular/core';

export type TwoFaMethod = 'email' | 'google';
type Step = 'method' | 'otp';

interface MethodOption {
  id: TwoFaMethod;
  label: string;
}

/** Must match the tfa-*-out animation duration in styles.css. */
const CLOSE_MS = 220;
/** Must match the slide duration (duration-500) in the template. */
const SLIDE_MS = 500;
const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

@Component({
  selector: 'app-two-fa-verification',
  imports: [],
  templateUrl: './two-fa-verification.html',
  styleUrl: './two-fa-verification.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFaVerification implements OnDestroy {
  readonly methods: MethodOption[] = [
    { id: 'email', label: 'Email Verification' },
    { id: 'google', label: 'Google Authenticator' },
  ];

  /** UI-only for now. Wire to the backend (enable / disable 2FA) later. */
  readonly enabled = signal(false);

  readonly dialogOpen = signal(false);
  /** true while the close animation plays, then the dialog is removed from the DOM. */
  readonly closing = signal(false);

  /** Which slide is showing: 1) pick a method  2) enter the OTP. */
  readonly step = signal<Step>('method');
  readonly selected = signal<TwoFaMethod>('email');

  readonly otp = signal('');
  readonly verified = signal(false);
  /** Seconds left before "Resend OTP" can be used again (0 = can resend). */
  readonly cooldown = signal(0);

  readonly canVerify = computed(() => this.otp().length === OTP_LENGTH && !this.verified());
  readonly otpLength = OTP_LENGTH;

  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly otpInput = viewChild<ElementRef<HTMLInputElement>>('otpInput');
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  /** "Turn On" opens the popup; "Turn Off" (when already on) switches it off. */
  onMainButton(): void {
    if (this.enabled()) {
      // TODO: call the "disable 2FA" API here.
      this.enabled.set(false);
      return;
    }
    clearTimeout(this.closeTimer);
    this.resetDialog();
    this.closing.set(false);
    this.dialogOpen.set(true);
    // Move focus into the dialog once it has rendered (keyboard / screen reader users).
    setTimeout(() => this.panel()?.nativeElement.focus(), 0);
  }

  select(id: TwoFaMethod): void {
    this.selected.set(id);
  }

  /** Step 1 -> Step 2: the content slides to the left, the OTP step comes in from the right. */
  next(): void {
    // TODO: branch on this.selected():
    //   'email'  -> call the API that e-mails the OTP (then show the OTP step, as below)
    //   'google' -> show the QR code step instead of the OTP step
    // For now both methods go to the OTP step.
    this.step.set('otp');
    this.startCooldown();
    setTimeout(() => this.otpInput()?.nativeElement.focus(), SLIDE_MS);
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    input.value = digits; // keep the field numeric only
    this.otp.set(digits);
  }

  verify(): void {
    if (!this.canVerify()) return;
    // TODO: call the "verify OTP" API with this.otp(); only set verified on success.
    this.verified.set(true);
  }

  resend(): void {
    if (this.cooldown() > 0 || this.verified()) return;
    // TODO: call the "resend OTP" API here.
    this.otp.set('');
    const el = this.otpInput()?.nativeElement;
    if (el) {
      el.value = '';
      el.focus();
    }
    this.startCooldown();
  }

  save(): void {
    if (!this.verified()) return;
    // TODO: call the "enable 2FA" API here.
    this.enabled.set(true);
    this.close();
  }

  @HostListener('document:keydown.escape')
  close(): void {
    if (!this.dialogOpen() || this.closing()) return;
    this.closing.set(true);
    this.closeTimer = setTimeout(() => {
      this.dialogOpen.set(false);
      this.closing.set(false);
      this.stopCooldown();
    }, CLOSE_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.closeTimer);
    this.stopCooldown();
  }

  private resetDialog(): void {
    this.step.set('method');
    this.selected.set('email');
    this.otp.set('');
    this.verified.set(false);
    this.stopCooldown();
  }

  private startCooldown(): void {
    this.stopCooldown();
    this.cooldown.set(RESEND_SECONDS);
    this.cooldownTimer = setInterval(() => {
      const left = this.cooldown() - 1;
      this.cooldown.set(Math.max(0, left));
      if (left <= 0) this.stopCooldown();
    }, 1000);
  }

  private stopCooldown(): void {
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = undefined;
    this.cooldown.set(0);
  }
}