import jwt from 'jsonwebtoken'

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        // Check whether the Authorization header exists
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required. Please log in.'
            })
        }

        // Extract the token
        const token = authHeader.split(' ')[1]

        if (!token) {
            return res.status(401).json({
                message: 'Authentication token is missing'
            })
        }

        // Verify the token using our secret key
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        // Ensure the token contains a user ID
        if (!decoded.userId) {
            return res.status(401).json({
                message: 'Invalid authentication token'
            })
        }

        // Make the authenticated user's ID available to routes
        req.user = {
            userId: decoded.userId
        }

        // Allow the request to continue
        next()
    } catch (error) {
        if (
            error.name === 'TokenExpiredError' ||
            error.name === 'JsonWebTokenError' ||
            error.name === 'NotBeforeError'
        ) {
            return res.status(401).json({
                message: 'Invalid or expired authentication token'
            })
        }

        console.error('Authentication error:', error.message)

        return res.status(500).json({
            message: 'Internal server error'
        })
    }
}

export default authMiddleware
