// backend/src/services/geminiService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
  throw new Error("GEMINI_API_KEY is required for Gemini service.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

const MODEL_NAME = "gemini-1.5-flash"; // หรือ "gemini-1.5-pro"
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const generationConfig = {
  temperature: 0.1,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
  responseMimeType: "application/json", // <--- สำคัญ: กำหนดให้ Gemini ตอบเป็น JSON
};

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// เพิ่ม documentType เป็นพารามิเตอร์
async function performGeminiOcr(imageBuffer, mimeType, ocrLanguage, documentType) { // <--- เพิ่ม documentType
  try {
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType,
      },
    };

    let prompt = '';
    const jsonFormatHint = `
    Respond strictly in JSON format.
    Example:
    {
        "document_type": "[detected_document_type]",
        "extracted_data": {
            // ... fields based on document_type
        },
        "full_text": "[full_extracted_text]"
    }
    `;

    switch (documentType.toLowerCase()) { // ใช้ toLowerCase เพื่อให้ไม่คำนึงถึงตัวพิมพ์เล็กใหญ่
      case 'invoice':
        prompt = `You are an expert OCR system for invoices.
                  Extract the following key information from this invoice:
                  "invoice_number", "date" (format YYYY-MM-DD), "due_date" (format YYYY-MM-DD),
                  "total_amount" (number), "currency", "vendor_name", "customer_name",
                  "vendor_address", "customer_address",
                  "items": [ { "description", "quantity" (number), "unit_price" (number), "line_total" (number) } ].
                  Also provide the "full_text" of the document.
                  If a field is not found, use null or an empty string as appropriate.
                  Language hint: ${ocrLanguage}.` + jsonFormatHint;
        break;
      case 'credit note':
        prompt = `You are an expert OCR system for credit notes.
                  Extract the following key information from this credit note:
                  "credit_note_number", "date" (format YYYY-MM-DD), "original_invoice_number",
                  "vendor_address", "customer_address",
                  "total_amount" (number), "currency", "reason_for_credit", "vendor_name", "customer_name".
                  Also provide the "full_text" of the document.
                  If a field is not found, use null or an empty string as appropriate.
                  Language hint: ${ocrLanguage}.` + jsonFormatHint;
        break;
      // เพิ่ม case สำหรับเอกสารประเภทอื่นๆ ที่คุณต้องการ
      case 'receipt':
        prompt = `You are an expert OCR system for receipts.
                  Extract the following key information from this receipt:
                  "merchant_name", "date" (format YYYY-MM-DD), "time" (format HH:MM),
                  "vendor_address", "customer_address",
                  "total_amount" (number), "currency", "payment_method", "items": [ { "description", "amount" (number) } ].
                  Also provide the "full_text" of the document.
                  If a field is not found, use null or an empty string as appropriate.
                  Language hint: ${ocrLanguage}.` + jsonFormatHint;
        break;
      case 'delivery note':
        prompt = `You are an expert OCR system for delivery notes.
                  Extract the following key information from this delivery note:
                  "delivery_note_number", "date" (format YYYY-MM-DD), "delivery_address", "recipient_name", "sender_name",
                  "vendor_address", "customer_address",
                  "items": [ { "description", "quantity" (number) } ].
                  Also provide the "full_text" of the document.
                  If a field is not found, use null or an empty string as appropriate.
                  Language hint: ${ocrLanguage}.` + jsonFormatHint;
        break;
      default: // default สำหรับ 'general' หรือประเภทที่ไม่รู้จัก
        prompt = `Extract all text from this image and identify the document type.
                  Provide the extracted text in a structured JSON format, including the detected "document_type" and "full_text".
                  If you can identify specific fields like dates, names, or amounts, include them in an "extracted_data" object.
                  Language hint: ${ocrLanguage}.` + jsonFormatHint;
        break;
    }

    const result = await model.generateContent({
      contents: [{ parts: [imagePart, { text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    // เนื่องจากเราตั้งค่า responseMimeType เป็น application/json, response.text() จะพยายาม parse JSON ให้แล้ว
    // แต่บางครั้งก็อาจจะต้อง parse ด้วยตัวเอง ถ้ามันยังเป็น string
    let ocrTextResult;
    try {
        ocrTextResult = JSON.parse(response.text());
        // หากต้องการให้ ocr_text_result ใน DB เป็น JSON string
        ocrTextResult = JSON.stringify(ocrTextResult, null, 2); // จัด format ให้สวยงาม
    } catch (e) {
        console.warn("Gemini did not return valid JSON, or error parsing JSON:", e);
        ocrTextResult = response.text(); // Fallback to raw text if not valid JSON
    }


    return { ocr_text_result: ocrTextResult };

  } catch (error) {
    console.error("Error calling Gemini API for OCR:", error);
    if (error.response && error.response.status) {
        throw new Error(`Gemini API Error: Status ${error.response.status} - ${error.message}`);
    }
    throw new Error(`Failed to perform OCR with Gemini: ${error.message}`);
  }
}

module.exports = { performGeminiOcr };