import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'The email address is invalid' })
  @IsNotEmpty({ message: 'The email address is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'The password is required' })
  password!: string;
}
