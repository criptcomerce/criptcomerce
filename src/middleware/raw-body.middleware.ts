import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as express from 'express';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })(req, res, next);
  }
}
