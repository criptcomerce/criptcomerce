import { Injectable, Logger } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly productRepo: ProductRepository) {}

  async findAll() {
    return this.productRepo.findAll();
  }

  async findById(id: string) {
    return this.productRepo.findByIdOrFail(id);
  }

  async create(dto: CreateProductDto) {
    const product = await this.productRepo.create(dto);
    this.logger.log(`[PRODUCT] Criado | id: ${product.id} | nome: ${product.name} | preço: $${product.price_usd}`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productRepo.update(id, dto);
    this.logger.log(`[PRODUCT] Atualizado | id: ${product.id}`);
    return product;
  }

  async remove(id: string) {
    await this.productRepo.findByIdOrFail(id);
    await this.productRepo.softDelete(id);
    this.logger.log(`[PRODUCT] Removido (soft delete) | id: ${id}`);
    return { message: 'Produto removido com sucesso' };
  }
}
