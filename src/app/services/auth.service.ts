import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

const ADMIN_EMAIL = 'admin@orosco.com';
const ADMIN_PASSWORD = '1234567A';
const SESSION_KEY = 'zodiac_admin_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private router: Router) {}

  login(email: string, password: string): boolean {
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  logout() {
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }
}
