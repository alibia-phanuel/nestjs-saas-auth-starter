import { ObjectType, Field } from '@nestjs/graphql';

// ── AuthResponse — retourné après login/signup ────────

@ObjectType()
export class AuthResponse {
  @Field()
  key!: string;

  @Field()
  message!: string;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field({ nullable: true })
  requiresTwoFactor?: boolean;

  @Field({ nullable: true })
  email?: string;
}

// ── MessageResponse — réponse générique ──────────────

@ObjectType()
export class MessageResponse {
  @Field()
  key!: string;

  @Field()
  message!: string;
}
