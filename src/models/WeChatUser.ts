import mongoose, { Document, Schema } from 'mongoose';

export interface IWeChatUser extends Document {
    openid: string;
    unionid?: string;
    nickname: string;
    avatar?: string;
    gender?: number;
    city?: string;
    province?: string;
    country?: string;
    language?: string;
    sessionKey: string;
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const wechatUserSchema = new Schema<IWeChatUser>({
    openid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    unionid: {
        type: String,
        unique: true,
        sparse: true
    },
    nickname: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    gender: {
        type: Number,
        enum: [0, 1, 2] // 0: unknown, 1: male, 2: female
    },
    city: {
        type: String
    },
    province: {
        type: String
    },
    country: {
        type: String
    },
    language: {
        type: String,
        default: 'zh_CN'
    },
    sessionKey: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLoginAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.model<IWeChatUser>('WeChatUser', wechatUserSchema);
