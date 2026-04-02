import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    // Inclui password_hash explicitamente — necessário para login
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }
}
