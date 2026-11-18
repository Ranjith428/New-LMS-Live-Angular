import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type TwoFactorMethod = 'EMAIL' | 'AUTHENTICATOR';

/** POST /api/profile/2fa/authenticator/setup - what the QR code needs. */
export interface AuthenticatorSetup {
  /** Base32 key for "enter key manually". */
  secret: string;
  /** otpauth:// URI that Google Authenticator reads from the QR code. */
  otpauthUri: string;
}

/** GET /api/profile/2fa */
export interface TwoFactorStatus {
  enabled: boolean;
  /** Active method while 2FA is on, otherwise null. */
  method: TwoFactorMethod | null;
  /** e.g. j***@gmail.com - where the OTP is sent. */
  maskedEmail: string;
}

export type TwoFactorAction = 'ENABLE' | 'DISABLE';

/** Profile > Settings > "2FA Verification Method" (user must be logged in). */
@Injectable({ providedIn: 'root' })
export class TwoFactorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/profile/2fa`;

  getStatus(): Observable<TwoFactorStatus> {
    return this.http.get<ApiResponse<TwoFactorStatus>>(this.apiUrl).pipe(map(({ data }) => data));
  }

  /** Sends the OTP e-mail. Used for the first "Next" click and for every "Resend OTP". */
  sendOtp(action: TwoFactorAction): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/send-otp`, { action });
  }

  /** Google Authenticator: new secret for the QR code. Nothing is active until enable() succeeds. */
  setupAuthenticator(): Observable<AuthenticatorSetup> {
    return this.http
      .post<ApiResponse<AuthenticatorSetup>>(`${this.apiUrl}/authenticator/setup`, {})
      .pipe(map(({ data }) => data));
  }

  /** Verifies the code (e-mail OTP or authenticator code) and turns 2FA on in one call. */
  enable(otp: string): Observable<TwoFactorStatus> {
    return this.http
      .post<ApiResponse<TwoFactorStatus>>(`${this.apiUrl}/enable`, { otp })
      .pipe(map(({ data }) => data));
  }

  /** Verifies the code and turns 2FA off in one call. */
  disable(otp: string): Observable<TwoFactorStatus> {
    return this.http
      .post<ApiResponse<TwoFactorStatus>>(`${this.apiUrl}/disable`, { otp })
      .pipe(map(({ data }) => data));
  }
}
