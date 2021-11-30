import mongoose from 'mongoose';

interface PendingOperation {
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
