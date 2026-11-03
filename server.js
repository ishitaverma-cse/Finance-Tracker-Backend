import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import budgetRoutes from './routes/budgetRoutes.js'

import authMiddleware from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173'
].filter(Boolean)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}))
app.use(express.json())

// Authentication routes
app.use('/api/auth', authRoutes)

// Transaction routes
app.use('/api/transactions', transactionRoutes)

// Budget routes
app.use('/api/budgets', budgetRoutes)

// Test route
app.get('/', (req, res) => {
    res.send('Thrive Backend is running successfully! 💰')
})

// Protected test route
app.get('/api/auth/protected', authMiddleware, (req, res) => {
    res.status(200).json({
        message: 'Access granted! You are authenticated.',
        userId: req.user.userId
    })
})

// Start the server
const startServer = async () => {
    await connectDB()

    app.listen(PORT, () => {
        console.log(`Thrive server is running on port ${PORT}`)
    })
}

startServer().catch((error) => {
    console.error('Failed to start Thrive server:', error)
    process.exit(1)
})