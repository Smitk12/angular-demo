import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArcGis } from './arc-gis';

describe('ArcGis', () => {
  let component: ArcGis;
  let fixture: ComponentFixture<ArcGis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcGis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArcGis);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
