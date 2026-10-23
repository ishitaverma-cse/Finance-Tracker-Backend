import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Test route
app.get('/', (req, res) => {
    res.send('Thrive Backend is running successfully! 💰')
})

// Start the server
const startServer = async () => {
    await connectDB()

    app.listen(PORT, () => {
        console.log(`Thrive server is running on port ${PORT}`)
    })
}

startServer()