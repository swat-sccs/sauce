import mongoose from 'mongoose';

export interface PendingOperation {
  _id: string;
  operation: 'createAccount';
  createdTimestamp: Date;
  actionTimestamp?: Date;
  status: 'pending' | 'executed' | 'rejected' | 'failed';
  data: any;
}

const pendingOperationSchema = new mongoose.Schema<PendingOperation>({
  _id: {
    type: String,
    required: true,
  },
  operation: {
    type: String,
    enum: ['createAccount'],
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

export const PendingOperationModel = mongoose.model<PendingOperation>(
  'PendingOperation',
  pendingOperationSchema,
);

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
    expires: 3600,
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
