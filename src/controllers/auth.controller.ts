import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register */
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** GET /auth/me — retorna usuário autenticado */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    const { password_hash, ...user } = req.user;
    return user;
  }
}
