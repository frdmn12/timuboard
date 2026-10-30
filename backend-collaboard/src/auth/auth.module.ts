import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleTokenVerifier } from './google-token.verifier';
import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetService } from './password-reset.service';
import { PasswordResetToken } from './password-reset-token.entity';
import { Session } from './session.entity';
import { SessionsService } from './sessions.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      EmailVerificationToken,
      PasswordResetToken,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('JWT_ACCESS_TTL') as never,
        },
      }),
    }),
    UsersModule,
    MailModule,
  ],
  exports: [JwtModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionsService,
    EmailVerificationService,
    PasswordResetService,
    GoogleTokenVerifier,
    JwtStrategy,
  ],
})
export class AuthModule {}
