import mongoose from 'mongoose';

export interface Task {
  _id: string;
  operation: 'createAccount' | 'createMailingList';
  createdTimestamp: Date;
  actionTimestamp?: Date;
  status: 'pending' | 'executed' | 'rejected' | 'failed';
  data: any;
}

const taskSchema = new mongoose.Schema<Task>({
  _id: {
    type: String,
    required: true,
  },
  operation: {
    type: String,
    enum: ['createAccount', 'createMailingList'],
    required: true,
  },
  createdTimestamp: {
    type: Date,
    required: true,
    index: true,
  },
  actionTimestamp: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'executed', 'rejected', 'failed'],
    required: true,
    default: 'pending',
  },
  data: {
    // json stringified request
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
});

export const TaskModel = mongoose.model<Task>('Task', taskSchema);

export interface PasswordResetRequest {
  // password reset requests generate two keys: the ID, which is stored plain, and the key, which is
  // hashed with argon2 before being stored. Both are provided to the user and they make a request;
  // then we look up the request for the ID and compare hashed keys, basically exactly like a normal
  // username/password login flow.
  _id: string;
  key: string;
  user: string;
  timestamp: Date;
  suppressEmail?: boolean;
}

const passwordResetRequestSchema = new mongoose.Schema<PasswordResetRequest>({
  _id: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  user: {
    type: String,
    required: true,
    index: true, // we'll search by user to invalidate previous reset requests
  },
  timestamp: {
    type: Date,
    expires: 0,
  },
  suppressEmail: {
    type: Boolean,
    required: false,
  },
});

export const PasswordResetRequestModel = mongoose.model<PasswordResetRequest>(
  'PasswordReset',
  passwordResetRequestSchema,
);

// new interface for email verification
export interface VerifyEmailRequest {
  // verification email links generate two keys: the ID, which is stored plain, and the key, which is
  // hashed with argon2 before being stored.
  // Both are provided to the user and they make a request;
  // then we look up the request for the ID and compare hashed keys, basically exactly like a normal
  // username/password login flow.
  _id: string;
  key: string;
  email: string;
  timestamp: Date;
  suppressEmail?: boolean;
}

const verifyEmailRequestSchema = new mongoose.Schema<VerifyEmailRequest>({
  _id: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    expires: 0,
  },
  suppressEmail: {
    type: Boolean,
    required: false,
  },
});

export const VerifyEmailRequestModel = mongoose.model<VerifyEmailRequest>(
  'VerifyEmail',
  verifyEmailRequestSchema,
);

export interface MinecraftWhitelist {
  _id: string;
  mcUuid: string;
}

// TODO probably better if this used account UUIDs in some way?
const minecraftWhitelistSchema = new mongoose.Schema<MinecraftWhitelist>({
  _id: {
    type: String,
    required: true,
  },
  mcUuid: {
    type: String,
    required: true,
  },
});

export const MinecraftWhitelistModel = mongoose.model<MinecraftWhitelist>(
  'MinecraftWhitelist',
  minecraftWhitelistSchema,
);

export interface StaffMessage {
  _id: string;
  startDate: Date;
  endDate: Date;
  message: string;
}

const staffMessageSchema = new mongoose.Schema<StaffMessage>({
  _id: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

export const StaffMessageModel = mongoose.model<StaffMessage>('StaffMessage', staffMessageSchema);
