import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  // Inject PrismaService for database access and JwtService for token generation
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    // 1. Check if user already exists
    // 'findUnique' searches for a unique field (email) in the User table
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    // If exists, throw a NestJS ConflictException (returns 409 status code)
    if (existingUser) {
      throw new ConflictException('Email address is already registered');
    }

    // 2. Encrypt the password (Hashing)
    // bcrypt.hash takes the password and "salt rounds" (standard cost: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create new record in the database
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // 4. Security cleanup
    // Remove password from the response using destructuring
    // We should never return the password (even the hash) in HTTP responses!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find the user in the database
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare the provided password with the stored Hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Create payload and sign the JWT Token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
