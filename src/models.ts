import mongoose from 'mongoose';

interface PendingOperation {
  _id: string;
  operation: 'createAccount';
  createdTimestamp: Date;
  executedTimestamp?: Date;
  executed: boolean;
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
  executedTimestamp: {
    type: Date,
    default: null,
  },
  executed: {
    type: Boolean,
    required: true,
    default: false,
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
