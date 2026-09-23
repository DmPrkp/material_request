import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Логин без учёта регистра: «Admin» и «admin» — один пользователь. Иначе при входе
// легко промахнуться, а при регистрации — завести двойника.
const login = z.string().trim().toLowerCase();

// Верхняя граница не для красоты: bcrypt молча отбрасывает всё дальше 72 байт.
const newPassword = z.string().min(6).max(72);

// strict — лишнее поле в теле падает 400, а не молча отбрасывается (раньше так делал
// ValidationPipe с forbidNonWhitelisted).
export const registerSchema = z.strictObject({
  login: login.regex(/^[a-z0-9._-]{3,32}$/, {
    message: 'login must be 3-32 characters long: latin letters, digits, ".", "_" or "-"',
  }),
  password: newPassword,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional(),
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

export class RegisterDto extends createZodDto(registerSchema) {}
export class LoginDto extends createZodDto(loginSchema) {}
export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
