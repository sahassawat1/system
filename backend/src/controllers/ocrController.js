// backend-nodejs/controllers/ocrController.js
const { sql } = require('../db');
const { performGeminiOcr } = require('../services/geminiService');

// @route   POST /api/ocr/upload
// @desc    Upload file, perform OCR, and save to history
// @access  Private
exports.uploadAndOcr = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }

    const userId = req.user.id;
    const firebaseUid = req.user.firebase_uid;
    const uploadedFilename = req.file.originalname;
    const mimeType = req.file.mimetype;
    const imageBuffer = req.file.buffer;
    const ocrLanguage = req.body.ocrLanguage || 'eng';
    const documentType = req.body.documentType || 'general'; // <--- เพิ่มตรงนี้! รับ documentType จาก req.body

    let historyId;
    let transaction;

    try {
        const pool = sql.pool;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = new sql.Request(transaction);

        // 1. Insert initial pending status into OcrHistories
        const insertResult = await request
            .input('userId', sql.Int, userId)
            .input('firebaseUid', sql.NVarChar, firebaseUid)
            .input('filename', sql.NVarChar, uploadedFilename)
            .input('originalFilePath', sql.NVarChar, 'N/A')
            .input('mimeType', sql.NVarChar, mimeType)
            .input('imageSize', sql.BigInt, req.file.size)
            .input('status', sql.NVarChar, 'pending')
            .input('documentType', sql.NVarChar, documentType) // <--- เพิ่มตรงนี้! บันทึก documentType
            .query(`
                INSERT INTO OcrHistories (
                    user_id, firebase_uid, file_name, original_file_path,
                    processed_text, status, image_mime_type, image_size,
                    document_type, -- <--- เพิ่มตรงนี้ใน INSERT fields
                    created_at, updated_at
                )
                OUTPUT INSERTED.ocr_history_id
                VALUES (
                    @userId, @firebaseUid, @filename, @originalFilePath,
                    '', @status, @mimeType, @imageSize,
                    @documentType, -- <--- เพิ่มตรงนี้ใน VALUES
                    GETDATE(), GETDATE()
                )
            `);

        historyId = insertResult.recordset[0].ocr_history_id;

        let ocrTextResult = '';
        let processStatus = 'failed';
        let errorMessage = null;
        let processingTimeMs = 0;

        const startTime = process.hrtime.bigint();

        try {
            // 2. Perform OCR using Gemini Service
            // ส่ง documentType ไปยัง performGeminiOcr ด้วย
            const geminiResult = await performGeminiOcr(imageBuffer, mimeType, ocrLanguage, documentType); // <--- เพิ่มตรงนี้!
            ocrTextResult = geminiResult.ocr_text_result;
            processStatus = 'completed';

        } catch (ocrError) {
            console.error(`OCR processing failed for ${uploadedFilename}:`, ocrError);
            ocrTextResult = `OCR processing failed: ${ocrError.message || 'Unknown error'}`;
            processStatus = 'failed';
            errorMessage = ocrError.message || 'Unknown OCR error';
        }

        const endTime = process.hrtime.bigint();
        processingTimeMs = Number((endTime - startTime) / 1_000_000n);

        // 3. Update OcrHistories with OCR results and final status
        const updateRequest = new sql.Request(transaction);
        await updateRequest
            .input('historyId', sql.Int, historyId)
            .input('ocrResult', sql.NVarChar, ocrTextResult)
            .input('status', sql.NVarChar, processStatus)
            .input('errorMessage', sql.NVarChar, errorMessage)
            .input('processingTimeMs', sql.Int, processingTimeMs)
            .query(`
                UPDATE OcrHistories
                SET processed_text = @ocrResult,
                    status = @status,
                    error_message = @errorMessage,
                    processing_time_ms = @processingTimeMs,
                    updated_at = GETDATE()
                WHERE ocr_history_id = @historyId
            `);

        await transaction.commit();

        res.status(200).json({
            msg: 'File uploaded and OCR processed',
            id: historyId,
            firebase_uid: firebaseUid,
            file_name: uploadedFilename,
            original_file_path: 'N/A',
            image_mime_type: mimeType,
            image_size: req.file.size,
            processed_text: ocrTextResult,
            status: processStatus,
            error_message: errorMessage,
            processing_time_ms: processingTimeMs,
            document_type: documentType, // <--- เพิ่มตรงนี้ใน response
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('Error during file upload or OCR process:', err.message);
        if (transaction) {
            try {
                await transaction.rollback();
                console.log('Transaction rolled back due to error.');
            } catch (rbErr) {
                console.error('Error during transaction rollback:', rbErr.message);
            }
        }

        if (!historyId) {
            return res.status(500).json({ msg: 'Server error during initial upload process', error: err.message });
        }

        try {
            const pool = sql.pool;
            const fallbackRequest = new sql.Request(pool);
            await fallbackRequest
                .input('historyId', sql.Int, historyId)
                .input('status', sql.NVarChar, 'failed')
                .input('ocrResult', sql.NVarChar, `Error: ${err.message}`)
                .input('errorMessage', sql.NVarChar, err.message)
                .input('processingTimeMs', sql.Int, processingTimeMs)
                .query(`
                    UPDATE OcrHistories
                    SET status = @status,
                        processed_text = @ocrResult,
                        error_message = @errorMessage,
                        processing_time_ms = @processingTimeMs,
                        updated_at = GETDATE()
                    WHERE ocr_history_id = @historyId
                `);
            console.log(`Updated OcrHistory ${historyId} to Failed status.`);
        } catch (dbErr) {
            console.error('Failed to update history status after error:', dbErr.message);
        }
        res.status(500).json({ msg: 'Server error during OCR processing', error: err.message });
    }
};

// @route   GET /api/ocr/history
// @desc    Get OCR history for the authenticated user
// @access  Private
exports.getHistory = async (req, res) => {
    const firebase_uid = req.user.firebase_uid; // User ID from authenticated token

    try {   
        const pool = sql.pool;  
        const request = new sql.Request(pool);
        const result = await request
            .input('firebase_uid', sql.NVarChar, firebase_uid)
            .query(`
                SELECT file_name, document_type, status, processed_text, processing_time_ms, image_mime_type, updated_at
                FROM OcrHistories 
                WHERE firebase_uid = @firebase_uid
                ORDER BY updated_at DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching OCR history:', err.message);
        res.status(500).send('Server error fetching history');
    }
};

// @route   GET /api/ocr/history/:id
// @desc    Get a single OCR history item by ID for the authenticated user
// @access  Private
exports.getHistoryItem = async (req, res) => {
    const historyId = req.params.id;
    const firebase_uid = req.user.firebase_uid; // User ID from authenticated token

    try {
        const pool = sql.pool;
        const request = new sql.Request(pool);
        const result = await request
            .input('historyId', sql.Int, historyId)
            .input('firebase_uid', sql.NVarChar, firebase_uid)
            .query(`
                SELECT file_name, document_type, status, processed_text, processing_time_ms, image_mime_type, updated_at
                FROM OcrHistories 
                WHERE ocr_history_id = @historyId AND firebase_uid = @firebase_uid
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ msg: 'History item not found or unauthorized' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching single OCR history item:', err.message);
        res.status(500).send('Server error fetching history item');
    }
};