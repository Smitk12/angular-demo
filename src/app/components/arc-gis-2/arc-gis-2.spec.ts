import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArcGis2 } from './arc-gis-2';

describe('ArcGis2', () => {
  let component: ArcGis2;
  let fixture: ComponentFixture<ArcGis2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArcGis2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArcGis2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
