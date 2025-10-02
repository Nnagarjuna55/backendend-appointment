import jwt from 'jsonwebtoken';

export const generateToken = (userId: string, source: string = 'web'): string => {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    const expiresIn = process.env.JWT_EXPIRE || '7d';

    return jwt.sign(
        { userId, source },
        secret,
        { expiresIn: expiresIn }
    ) as string;
};

export const verifyToken = (token: string): any => {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key';
    return jwt.verify(token, secret);
};
