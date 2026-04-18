import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot,} from '@angular/router';


@Injectable({providedIn: 'root'})
export class AdminGuard implements CanActivate {
  constructor(
    private router: Router,
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // This is for now just, it need to be implemented.
    return true;
  }
}
