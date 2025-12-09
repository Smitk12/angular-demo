import { Routes } from '@angular/router';
import { ArcGis } from './components/arc-gis/arc-gis';
import { Dashboard } from './components/dashboard/dashboard';
import { ArcGis2 } from './components/arc-gis-2/arc-gis-2';

export const routes: Routes = [
    {
        path: '',
        component: Dashboard
    },
    {
        path: 'map',
        component: ArcGis2
    },
];
