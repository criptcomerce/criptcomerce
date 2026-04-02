import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async createUser(data: {
    name: string;
    email: string;
    password_hash: string;
  }) {
    return this.userRepo.create(data);
  }

  async findByEmail(email: string) {
    return this.userRepo.findByEmail(email);
  }

  async findById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }
}
