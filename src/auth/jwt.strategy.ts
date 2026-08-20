import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Extract the JWT from the Authorization header as a Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use the secret key from environment variables to verify the token
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  // The payload is the decoded JWT data
  validate(payload: { sub: string; email: string; role: string }) {
    // Whatever is returned here is automatically injected into req.user
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
