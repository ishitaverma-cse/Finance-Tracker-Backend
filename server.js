import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
import authRoutes from './routes/authRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'

import authMiddleware from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Authentication routes
app.use('/api/auth', authRoutes)

// Transaction routes
app.use('/api/transactions', transactionRoutes)


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

startServer()