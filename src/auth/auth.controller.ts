import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account. Returns i18n message key.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        key: 'auth.signup_success',
        message: 'Account created successfully. Please check your email.',
        user: {
          id: 'uuid',
          email: 'phanuel@example.com',
          firstName: 'Phanuel',
          status: 'PENDING',
          emailVerified: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
    schema: {
      example: {
        key: 'auth.email_already_exists',
        message: 'An account with this email already exists',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
}
