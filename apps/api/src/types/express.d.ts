/**
 * Ambient express augmentation: `req.user` is attached by `middleware/protect`
 * after a verified JWT lookup.
 */
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};
