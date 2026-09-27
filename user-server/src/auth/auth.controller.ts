import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PublicUser } from '../users/public-user';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from './decorators';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifyRequestDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return user;
  }

  // Не @Public: продлить можно только ещё живой токен — протухший ведёт на вход заново.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@CurrentUser() user: PublicUser) {
    return this.authService.refresh(user.id);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUser() user: PublicUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto);
  }

  // Не @Public: переслать письмо можно только себе, на адрес из своего профиля.
  @Post('email/verify-request')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestEmailVerification(@CurrentUser() user: PublicUser, @Body() dto: VerifyRequestDto) {
    return this.authService.requestEmailVerification(user.id, dto.locale);
  }

  // @Public: по ссылке из письма приходят из почтового клиента, без токена.
  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  // 204 всегда, даже если такого адреса нет: иначе форма покажет, кто зарегистрирован.
  @Public()
  @Post('password/forgot')
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
