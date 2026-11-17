import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoFaVerification } from './two-fa-verification';

describe('TwoFaVerification', () => {
  let component: TwoFaVerification;
  let fixture: ComponentFixture<TwoFaVerification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoFaVerification],
    }).compileComponents();

    fixture = TestBed.createComponent(TwoFaVerification);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
