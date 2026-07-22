
const asyncHandler = (fn) => (req, res, next) => {
    try {
        await fn(req, res, next)
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Server Error',
        })
    }
}

export { asyncHandler }