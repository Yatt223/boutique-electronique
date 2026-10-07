import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CaisseLayoutComponent } from './caisse-layout.component';

describe('CaisseLayoutComponent', () => {
  let component: CaisseLayoutComponent;
  let fixture: ComponentFixture<CaisseLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CaisseLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CaisseLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
