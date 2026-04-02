import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.repo.create(data);
    return this.repo.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.repo.find({
      where: { active: true },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<Product> {
    const product = await this.findById(id);
    if (!product) throw new NotFoundException(`Produto ${id} não encontrado`);
    return product;
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    await this.repo.update(id, data);
    return this.findByIdOrFail(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(id, { active: false });
  }
}
