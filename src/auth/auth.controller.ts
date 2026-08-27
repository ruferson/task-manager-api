import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import type { UserPayload } from './decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth') // Base path: /auth
export class AuthController {
  // Inject AuthService to handle business logic
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register') // Endpoint: POST /auth/register
  register(@Body() registerDto: RegisterDto) {
    // @Body() extracts and validates the JSON payload using RegisterDto
    return this.authService.register(registerDto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login') // Endpoint: POST /auth/login
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(AuthGuard('jwt')) // Protect this route with JWT authentication
  @Get('profile') // Endpoint: GET /auth/profile
  getProfile(@CurrentUser() user: UserPayload) {
    // Returns the current authenticated user's data from the token
    return user;
  }
}
