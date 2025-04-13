import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from "../../core/auth/services/auth.service";

export const authInterceptor: HttpInterceptorFn = (
    request: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);

    // Get the auth token
    const token = authService.getAccessToken();

    // Only add the token for API requests (not for GitHub API calls)
    if (token && !request.url.includes('api.github.com')) {
        const authReq = request.clone({
            headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next(authReq);
    }

    return next(request);
};