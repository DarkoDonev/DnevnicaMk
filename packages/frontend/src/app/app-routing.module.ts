import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdminGuard} from "./_guards/admin.guard";
import {AppComponent} from "./app.component";

const routes: Routes = [
  {
    path: 'home',
    component: AppComponent,
    canActivate: [AdminGuard]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
