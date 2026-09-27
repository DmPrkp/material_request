import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Логин без учёта регистра: «Admin» и «admin» — один пользователь. Иначе при входе
// легко промахнуться, а при регистрации — завести двойника.
const login = z.string().trim().toLowerCase();

// Верхняя граница не для красоты: bcrypt молча отбрасывает всё дальше 72 байт.
const newPassword = z.string().min(6).max(72);

// Почта — как логин, в нижнем регистре: «Ivan@…» и «ivan@…» один ящик, и частичный
// уникальный индекс по подтверждённым иначе пропустил бы оба.
const email = z.string().trim().toLowerCase().pipe(z.email().max(320));

// На каком языке письмо и какая локаль в ссылке. Клиент знает свою, сервер — нет.
const locale = z.enum(['ru', 'en']).default('ru');

const token = z.string().trim().min(1);

// strict — лишнее поле в теле падает 400, а не молча отбрасывается (раньше так делал
// ValidationPipe с forbidNonWhitelisted).
export const registerSchema = z.strictObject({
  login: login.regex(/^[a-z0-9._-]{3,32}$/, {
    message: 'login must be 3-32 characters long: latin letters, digits, ".", "_" or "-"',
  }),
  password: newPassword,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional(),
  // Необязательна: вход по логину, почта нужна только для восстановления пароля.
  email: email.optional(),
  locale,
});

// Без правил формата: они для регистрации, а на входе лишь подсказали бы, какой логин невозможен.
export const loginSchema = z.strictObject({
  login: login.min(1),
  password: z.string().min(1),
});

export const changePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1),
  newPassword,
});

/** Переслать письмо с подтверждением — вошедшему, на его текущий адрес. */
export const verifyRequestSchema = z.strictObject({ locale });

export const verifyEmailSchema = z.strictObject({ token });

/**
 * Восстановление: спрашиваем только адрес. Логин не спрашиваем намеренно — человек,
 * забывший пароль, нередко забыл и логин, а подтверждённый адрес и так однозначен.
 */
export const forgotPasswordSchema = z.strictObject({ email, locale });

export const resetPasswordSchema = z.strictObject({ token, newPassword });

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
export class VerifyRequestDto extends createZodDto(verifyRequestSchema) {}
export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}
export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
