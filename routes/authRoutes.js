import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email, and password are required'
            })
        }

        // Validate name
        if (name.trim().length < 2 || name.trim().length > 50) {
            return res.status(400).json({
                message: 'Name must contain 2–50 characters'
            })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                message: 'Please enter a valid email address'
            })
        }

        // Validate password
        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({
                message: 'Password must contain at least 8 characters'
            })
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase()

        // Check for existing user
        const existingUser = await User.findOne({
            email: normalizedEmail
        })

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists'
            })
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 12)

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        })

        // Never return the password or password hash
        return res.status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (error) {
        // Handle concurrent duplicate registrations
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'An account with this email already exists'
            })
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Please check your registration details'
            })
        }

        console.error('Registration error:', error.message)

        return res.status(500).json({
            message: 'Server error during registration'
        })
    }
})


// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        // Validate required fields
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: 'Email and password are required'
            })
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase()

        // Find user and explicitly include password hash
        const user = await User.findOne({
            email: normalizedEmail
        }).select('+password')

        // Reject invalid credentials
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password'
            })
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        )

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid email or password'
            })
        }

        // Ensure JWT secret is configured
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured')

            return res.status(500).json({
                message: 'Server configuration error'
            })
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        )

        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        })
    } catch (error) {
        console.error('Login error:', error.message)

        return res.status(500).json({
            message: 'Server error during login'
        })
    }
})

export default router
