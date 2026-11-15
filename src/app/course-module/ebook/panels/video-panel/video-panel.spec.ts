import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoPanel } from './video-panel';

describe('VideoPanel', () => {
  let component: VideoPanel;
  let fixture: ComponentFixture<VideoPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
