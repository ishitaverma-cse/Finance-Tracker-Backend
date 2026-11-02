import mongoose from 'mongoose'
import express from 'express'
import Budget from '../models/Budget.js'
import Transaction from '../models/Transaction.js'
import authMiddleware from '../middleware/authMiddleware.js'

const router = express.Router()

// Helper: Validate month and year
const getMonthYear = (month, year) => {
    const currentDate = new Date()

    const selectedMonth = month === undefined
        ? currentDate.getMonth() + 1
        : Number(month)

    const selectedYear = year === undefined
        ? currentDate.getFullYear()
        : Number(year)

    if (
        !Number.isInteger(selectedMonth) ||
        selectedMonth < 1 ||
        selectedMonth > 12
    ) {
        return null
    }

    if (
        !Number.isInteger(selectedYear) ||
        selectedYear < 2000
    ) {
        return null
    }

    return {
        month: selectedMonth,
        year: selectedYear
    }
}

// Helper: Get monthly date range
const getDateRange = (month, year) => ({
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1))
})

// POST /api/budgets - Create a monthly budget
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { category, amount, month, year } = req.body

        if (typeof category !== 'string' || !category.trim()) {
            return res.status(400).json({
                message: 'Category is required'
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
                message: 'Budget amount must be greater than zero'
            })
        }

        const period = getMonthYear(month, year)

        if (!period) {
            return res.status(400).json({
                message: 'Please provide a valid month and year'
            })
        }

        const budget = await Budget.create({
            userId: req.user.userId,
            category: category.trim(),
            amount: Number(amount),
            month: period.month,
            year: period.year
        })

        return res.status(201).json({
            message: 'Budget created successfully',
            budget
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A budget for this category already exists for this month'
            })
        }

        console.error('Create budget error:', error)

        return res.status(500).json({
            message: 'Failed to create budget'
        })
    }
})


// GET /api/budgets - Fetch monthly budgets with spending statistics
router.get('/', authMiddleware, async (req, res) => {
    try {
        const period = getMonthYear(
            req.query.month,
            req.query.year
        )

        if (!period) {
            return res.status(400).json({
                message: 'Please provide a valid month and year'
            })
        }

        const { month, year } = period
        const { start, end } = getDateRange(month, year)

        const budgets = await Budget.find({
            userId: req.user.userId,
            month,
            year
        }).sort({ category: 1 })

        const spending = await Transaction.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user.userId),
                    type: 'expense',
                    date: {
                        $gte: start,
                        $lt: end
                    }
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalSpent: {
                        $sum: '$amount'
                    }
                }
            }
        ])

        const spendingMap = new Map(
            spending.map((item) => [
                item._id,
                item.totalSpent
            ])
        )

        const budgetDetails = budgets.map((budget) => {
            const spent = spendingMap.get(budget.category) || 0
            const remaining = budget.amount - spent

            const percentageUsed =
                (spent / budget.amount) * 100

            return {
                ...budget.toObject(),
                spent,
                remaining,
                percentageUsed: Number(percentageUsed.toFixed(2)),
                isExceeded: spent > budget.amount
            }
        })

        const totalBudget = budgetDetails.reduce(
            (total, budget) => total + budget.amount,
            0
        )

        const totalSpent = budgetDetails.reduce(
            (total, budget) => total + budget.spent,
            0
        )

        const totalRemaining = totalBudget - totalSpent

        return res.status(200).json({
            message: 'Budgets fetched successfully',
            month,
            year,
            summary: {
                totalBudget,
                totalSpent,
                totalRemaining,
                percentageUsed: totalBudget > 0
                    ? Number(
                        ((totalSpent / totalBudget) * 100).toFixed(2)
                    )
                    : 0
            },
            count: budgetDetails.length,
            budgets: budgetDetails
        })
    } catch (error) {
        console.error('Fetch budgets error:', error)

        return res.status(500).json({
            message: 'Failed to fetch budgets'
        })
    }
})


// PUT /api/budgets/:id - Update a monthly budget
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid budget ID'
            })
        }

        const budget = await Budget.findOne({
            _id: req.params.id,
            userId: req.user.userId
        })

        if (!budget) {
            return res.status(404).json({
                message: 'Budget not found'
            })
        }

        const { category, amount, month, year } = req.body

        if (category !== undefined) {
            if (
                typeof category !== 'string' ||
                !category.trim()
            ) {
                return res.status(400).json({
                    message: 'Category is required'
                })
            }

            budget.category = category.trim()
        }

        if (amount !== undefined) {
            if (
                amount === null ||
                amount === '' ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0
            ) {
                return res.status(400).json({
                    message: 'Budget amount must be greater than zero'
                })
            }

            budget.amount = Number(amount)
        }

        if (month !== undefined || year !== undefined) {
            const period = getMonthYear(
                month ?? budget.month,
                year ?? budget.year
            )

            if (!period) {
                return res.status(400).json({
                    message: 'Please provide a valid month and year'
                })
            }

            budget.month = period.month
            budget.year = period.year
        }

        await budget.save()

        return res.status(200).json({
            message: 'Budget updated successfully',
            budget
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A budget for this category already exists for this month'
            })
        }

        console.error('Update budget error:', error)

        return res.status(500).json({
            message: 'Failed to update budget'
        })
    }
})


// DELETE /api/budgets/:id - Delete a monthly budget
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({
                message: 'Invalid budget ID'
            })
        }

        const budget = await Budget.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        })

        if (!budget) {
            return res.status(404).json({
                message: 'Budget not found'
            })
        }

        return res.status(200).json({
            message: 'Budget deleted successfully'
        })
    } catch (error) {
        console.error('Delete budget error:', error)

        return res.status(500).json({
            message: 'Failed to delete budget'
        })
    }
})

export default router
