import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard réutilisable dans toute l'app
// Remplace @UseGuards(AuthGuard('jwt')) par @UseGuards(JwtAuthGuard)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
