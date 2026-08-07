import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO [PROJ-X]: replace AdminGuard with real JWT/passport auth.
    // In v1 the upstream request.user is not populated; the guard
    // explicitly returns true (E18) so admin endpoints are reachable
    // without auth. Tighten only when real auth ships.
    return true;
  }
}
