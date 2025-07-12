const { sql } = require('../db');

exports.getDashboardSummary = async (req, res) => {
    const userId = req.params.id;
    console.log('User ID:', userId);
    try {
        const pool = sql.pool;
        const request = new sql.Request(pool);

        // Get user ID from the authenticated request
        const userId = req.user.uid;

        const result = await request
        .input('userId', sql.VarChar, userId)
        .query('SELECT * FROM OcrHistories WHERE user_id = @userId');
        res.json(result);
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
}

exports.getHistoryItem = async (req, res) => {
    const historyId = req.params.id;
    const userId = req.user.uid;

    try {
        const pool = sql.pool;
        const request = new sql.Request(pool);
        const result = await request
        .input('historyId', sql.Int, historyId)
        .input('userId', sql.Int, userId)
        .query('SELECT * FROM OcrHistories WHERE id = @historyId AND user_id = @userId');
        res.json(result);
    } catch (error) {
        console.error('Error fetching history item:', error);
        res.status(500).json({ error: 'Failed to fetch history item' });
    }
}