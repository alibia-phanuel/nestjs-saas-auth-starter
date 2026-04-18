import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/signup ──────────────────────────
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un nouveau compte utilisateur' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Compte créé avec succès' })
  @ApiResponse({
    status: 409,
    description: 'Un compte avec cet email existe déjà',
  })
  @ApiResponse({
    status: 400,
    description: 'Erreur de validation — champs manquants ou invalides',
  })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  // ── POST /auth/login ───────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter avec email et mot de passe' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie — retourne les tokens JWT',
    schema: {
      example: {
        key: 'auth.login_success',
        message: 'Connexion réussie',
        accessToken: 'eyJhbGc...',
        refreshToken: 'eyJhbGc...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── GET /auth/me ───────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Récupérer l'utilisateur actuellement connecté" })
  @ApiResponse({ status: 200, description: "Données de l'utilisateur courant" })
  @ApiResponse({
    status: 401,
    description: 'Non autorisé — token manquant ou invalide',
  })
  getMe(@CurrentUser() user: unknown) {
    return user;
  }
}
