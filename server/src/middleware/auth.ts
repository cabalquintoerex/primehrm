import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { lguHasModule, userHasModule, type ModuleKey } from '../config/modules';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
    lguId: number | null;
    departmentId: number | null;
    /** Licensed modules of the user's LGU. Null = unrestricted (super admins, applicants). */
    enabledModules: unknown;
    /** Per-user module grant. Null = no modules (deny-by-default) for LGU staff. */
    moduleAccess: unknown;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        lguId: true,
        departmentId: true,
        isActive: true,
        moduleAccess: true,
        lgu: { select: { enabledModules: true } },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      lguId: user.lguId,
      departmentId: user.departmentId,
      enabledModules: user.lgu?.enabledModules ?? null,
      moduleAccess: user.moduleAccess ?? null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requireLguAdmin = requireRole('SUPER_ADMIN', 'LGU_HR_ADMIN');

/**
 * Block access unless the user may enter the given module. Enforces two layers:
 * the LGU's licensing and the user's own module grant. SUPER_ADMIN bypasses both.
 * Must run after `authenticate`.
 */
export const requireModule = (module: ModuleKey) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!lguHasModule(req.user.enabledModules, module)) {
      return res.status(403).json({ message: `The ${module} module is not enabled for your LGU` });
    }
    if (!userHasModule(req.user.role, req.user.moduleAccess, module)) {
      return res.status(403).json({ message: `You do not have access to the ${module} module` });
    }
    next();
  };
};

/** Block SUPER_ADMIN from write operations (view-only access) */
export const denySuperAdminWrite = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Super Admin has view-only access to this module' });
  }
  next();
};
