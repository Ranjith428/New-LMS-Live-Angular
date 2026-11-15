import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagePanel } from './image-panel';

describe('ImagePanel', () => {
  let component: ImagePanel;
  let fixture: ComponentFixture<ImagePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(ImagePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
