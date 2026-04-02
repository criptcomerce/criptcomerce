import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './user.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import type { JwtPayload } from '../auth/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userService.createUser({
      name: dto.name,
      email: dto.email,
      password_hash,
    });

    this.logger.log(`[AUTH] Registrado | id: ${user.id} | email: ${user.email}`);

    return {
      token: this.generateToken(user.id, user.email),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const passwordMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatch) throw new UnauthorizedException('Credenciais inválidas');

    this.logger.log(`[AUTH] Login | id: ${user.id} | email: ${user.email}`);

    return {
      token: this.generateToken(user.id, user.email),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at },
    };
  }

  private generateToken(userId: string, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
}
