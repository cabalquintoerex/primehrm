import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({ message });
};
