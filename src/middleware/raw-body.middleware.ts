import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    let data = '';
    req.setEncoding('utf8');

    req.on('data', (chunk: string) => {
      data += chunk;
    });

    req.on('end', () => {
      (req as any).rawBody = data;
      try {
        req.body = JSON.parse(data);
      } catch {
        req.body = {};
      }
      next();
    });
  }
}
