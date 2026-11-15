import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EbookEditor } from './ebook-editor';

describe('EbookEditor', () => {
  let component: EbookEditor;
  let fixture: ComponentFixture<EbookEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EbookEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(EbookEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
