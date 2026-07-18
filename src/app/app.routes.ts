import { Routes } from '@angular/router';
import { FavoritesPageComponent } from './components/favorites-page.component';
import { HistoryPageComponent } from './components/history-page.component';
import { ProfileDetailPageComponent } from './components/profile-detail-page.component';
import { SearchPageComponent } from './components/search-page.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'search' },
	{ path: 'search', component: SearchPageComponent },
	{ path: 'profile/:login', component: ProfileDetailPageComponent },
	{
		path: 'favorites',
		component: FavoritesPageComponent,
	},
	{
		path: 'history',
		component: HistoryPageComponent,
	},
	{
		path: '**',
		redirectTo: 'search',
	},
];
