import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { SignupModel } from '../models/signup.model';
import { LoginModel } from '../models/login.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private httpClientWithoutInterceptor: HttpClient;

  constructor(private http: HttpClient, private httpBackend: HttpBackend) {
    this.httpClientWithoutInterceptor = new HttpClient(httpBackend);
  }

  /**
   * Sends a POST request to log in a user with email and password.
   *
   * @param {string} username - The username or email of the user.
   * @param {string} password - The password of the user.
   * @param {boolean} remember - Whether to remember the user or not.
   * @returns {Observable<any>} - An observable with the response from the server.
   */
  loginWithEmailAndPassword(user: LoginModel): Observable<any> {
    return this.http.post<any>(`${environment.baseUrl}/login/`, user).pipe(
      tap((response) => {
        const storage = user.remember ? localStorage : sessionStorage;
        storage.setItem('token', response.token);
      })
    );
  }

  /**
   * Sends a POST request to sign up a new user with email and password.
   *
   * @param {string} username - The username of the user.
   * @param {string} lastname - The last name of the user.
   * @param {string} email - The email of the user.
   * @param {string} password - The password of the user.
   * @returns {Observable<Object>} - An observable with the response from the server.
   */
  signUPWithEmailAndPassword(newUser: SignupModel): Observable<Object> {
    return this.http.post(`${environment.baseUrl}/signup/`, newUser);
  }

  /**
   * Sends a POST request to reset a user's password given a email.
   * @param {string} email - The email of the user to reset.
   * @returns {Promise<any>} - A promise that resolves with the response of the server.
   */
  async forgotPassword(email: string): Promise<any> {
    const body = { email };
    const link = `${environment.baseUrl}/password-reset/`;
    try {
      const response = await firstValueFrom(
        this.httpClientWithoutInterceptor.post<any>(link, body, {
          headers: { 'Content-Type': 'application/json' },
          observe: 'response',
        })
      );
      return response;
    } catch (error) {
      console.error('Request-Fehler:', error);
      throw error;
    }
  }

  checkTokenValidity(token: any): void {
    this.httpClientWithoutInterceptor
      .get(`${environment.baseUrl}/password-reset/${token}`)
      .subscribe({
        error: (error) => {
          if (
            error.error === 'Token expired' ||
            error.error === 'Invalid token'
          ) {
            console.error(
              'The Token has expired or is invalid. Please try again.'
            );
          }
        },
      });
  }

  /**
   * Sends a POST request to reset a user's password given a token.
   * @param {string} token - The token given to the user via email.
   * @param {string} password - The new password of the user.
   * @returns {Promise<void>} - A promise that resolves when the request is finished.
   */
  async resetPassword(token: any, password: string): Promise<any> {
    const body = { password };
    const link = `${environment.baseUrl}/password-reset/${token}/`;
    try {
      const response = await firstValueFrom(
        this.httpClientWithoutInterceptor.post<any>(link, body, {
          headers: { 'Content-Type': 'application/json' },
          observe: 'response',
        })
      );
      return response;
    } catch (error) {
      console.error('Request-Error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the token from local storage.
   *
   * @returns {string | null} - The stored token or null if not found.
   */
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  /**
   * Sends a POST request to validate a token.
   *
   * @param {string} token - The token to be validated.
   * @returns {Observable<any>} - An observable of the HTTP response.
   */
  getAndValidateToken(token: string): Observable<any> {
    const headers = { Authorization: 'Token ' + token };
    const url = `${environment.baseUrl}/authentication/`;
    const body = { token };
    return this.http.post<any>(url, body, {
      headers: headers,
      observe: 'response',
    });
  }
}
