import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectAlgoritmComponent } from './select-algoritm.component';

describe('SelectAlgoritmComponent', () => {
  let component: SelectAlgoritmComponent;
  let fixture: ComponentFixture<SelectAlgoritmComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectAlgoritmComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectAlgoritmComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
