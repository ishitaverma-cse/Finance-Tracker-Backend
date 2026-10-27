import express from 'express'
import Transaction from '../models/Transaction.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// POST /api/transactions - Add a transaction
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { type, name, amount, category, description, date } = req.body

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({
                message: 'Type must be income or expense'
            })
        }

        if (amount === undefined || amount === null || amount === '' ||
            !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({
                message: 'Amount must be a number greater than zero'
            })
        }

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                message: 'Transaction name is required'
            })
        }

        if (typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({
                message: 'Category is required'
            })
        }

        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({
                message: 'Description must be a string'
            })
        }

        if (date !== undefined &&
            (typeof date !== 'string' || !date.trim() ||
                !Number.isFinite(Date.parse(date)))) {
            return res.status(400).json({
                message: 'Please provide a valid date'
            })
        }

        const transaction = await Transaction.create({
            userId: req.user.userId,
            type,
            name: name.trim(),
            amount: Number(amount),
            category: category.trim(),
            description: description?.trim() || '',
            ...(date !== undefined && { date: new Date(date) })
        })

        res.status(201).json({
            message: 'Transaction added successfully',
            transaction
        })
    } catch (error) {
        console.error('Add transaction error:', error)
        res.status(500).json({
            message: 'Failed to add transaction'
        })
    }
})

// GET /api/transactions - List the logged-in user's transactions
router.get('/', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({
            userId: req.user.userId
        }).sort({ date: -1, createdAt: -1 })

        res.status(200).json({
            message: 'Transactions fetched successfully',
            count: transactions.length,
            transactions
        })
    } catch (error) {
        console.error('Fetch transactions error:', error)
        res.status(500).json({
            message: 'Failed to fetch transactions'
        })
    }
})


// PUT /api/transactions/:id - Update the logged-in user's transaction
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid transaction ID'
            })
        }

        const { type, name, amount, category, description, date } = req.body

        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({
                message: 'Type must be income or expense'
            })
        }

        if (
            amount === undefined ||
            amount === null ||
            amount === '' ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                message: 'Amount must be a number greater than zero'
            })
        }

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                message: 'Transaction name is required'
            })
        }

        if (typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({
                message: 'Category is required'
            })
        }

        if (description !== undefined && typeof description !== 'string') {
            return res.status(400).json({
                message: 'Description must be a string'
            })
        }

        if (
            date === undefined ||
            typeof date !== 'string' ||
            !date.trim() ||
            !Number.isFinite(Date.parse(date))
        ) {
            return res.status(400).json({
                message: 'Please provide a valid date'
            })
        }

        const transaction = await Transaction.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user.userId
            },
            {
                $set: {
                    type,
                    name: name.trim(),
                    amount: Number(amount),
                    category: category.trim(),
                    description: description?.trim() || '',
                    date: new Date(date)
                }
            },
            {
                new: true,
                runValidators: true
            }
        )

        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            })
        }

        res.status(200).json({
            message: 'Transaction updated successfully',
            transaction
        })
    } catch (error) {
        console.error('Update transaction error:', error)
        res.status(500).json({
            message: 'Failed to update transaction'
        })
    }
})


// DELETE /api/transactions/:id - Delete the logged-in user's transaction
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid transaction ID'
            })
        }

        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        })

        if (!transaction) {
            return res.status(404).json({
                message: 'Transaction not found'
            })
        }

        res.status(200).json({
            message: 'Transaction deleted successfully'
        })
    } catch (error) {
        console.error('Delete transaction error:', error)
        res.status(500).json({
            message: 'Failed to delete transaction'
        })
    }
})

export default router
