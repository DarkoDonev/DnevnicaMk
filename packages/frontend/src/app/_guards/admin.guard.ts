import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot,} from '@angular/router';


@Injectable({providedIn: 'root'})
export class AdminGuard implements CanActivate {
  constructor(
    private router: Router,
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const accessToken = localStorage.getItem('accessToken');
    if (!!accessToken) {
      return true;
    }

    return this.router.createUrlTree(['/login']);
  }
}
