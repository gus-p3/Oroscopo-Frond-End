import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PersonaDetailComponent } from './persona-detail.component';

describe('PersonaDetailComponent', () => {
  let component: PersonaDetailComponent;
  let fixture: ComponentFixture<PersonaDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PersonaDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PersonaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
