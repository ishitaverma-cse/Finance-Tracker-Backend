import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        amount: {
            type: Number,
            required: true,
            min: [0.01, 'Budget amount must be greater than zero']
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true,
            min: 2000
        }
    },
    {
        timestamps: true
    }
)

// Prevent duplicate budgets for the same category and month
// for the same user.
budgetSchema.index(
    { userId: 1, category: 1, month: 1, year: 1 },
    { unique: true }
)

const Budget = mongoose.model('Budget', budgetSchema)

export default Budget
