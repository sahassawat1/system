# Swagger UI Documentation

## การใช้งาน Swagger UI

### การเข้าถึง Swagger UI

1. เริ่มต้น backend server:

   ```bash
   cd backend
   npm start
   ```

2. เปิดเบราว์เซอร์และไปที่:

   ```
   http://localhost:3001/api-docs
   ```

### ฟีเจอร์ที่ใช้งานได้

#### 1. Authentication Endpoints

- **POST /api/auth/verify** - ตรวจสอบ Firebase ID token
- **GET /api/auth/me** - ดูข้อมูลผู้ใช้ปัจจุบัน
- **POST /api/auth/set-role** - ตั้งค่าสิทธิ์ผู้ใช้ (Admin only)

#### 2. OCR Endpoints

- **POST /api/ocr** - อัปโหลดไฟล์สำหรับ OCR
- **GET /api/ocr/status/{jobId}** - ดูสถานะการประมวลผล
- **GET /api/ocr/history** - ดูประวัติการประมวลผล

#### 3. Dashboard Endpoints

- **GET /api/dashboard/stats** - ดูสถิติระบบ
- **GET /api/dashboard/users** - ดูรายชื่อผู้ใช้ (Admin only)
- **GET /api/dashboard/alerts** - ดูการแจ้งเตือนระบบ (Admin only)
- **GET /api/dashboard/jobs** - ดูงานที่กำลังประมวลผล (Admin only)

### การทดสอบ API

#### 1. การ Authentication

1. ใช้ Firebase ID token ใน Authorization header
2. Format: `Bearer <your-firebase-token>`

#### 2. การอัปโหลดไฟล์

- รองรับไฟล์: PDF, JPG, PNG, TIFF
- ขนาดไฟล์สูงสุด: 10MB

#### 3. การทดสอบ Endpoints

1. คลิกที่ endpoint ที่ต้องการทดสอบ
2. คลิก "Try it out"
3. กรอกข้อมูลที่จำเป็น
4. คลิก "Execute"

### หมายเหตุ

- Swagger UI จะแสดงเฉพาะ endpoints ที่มีการกำหนด documentation
- ต้องมี Firebase ID token ที่ถูกต้องสำหรับ endpoints ที่ต้องการ authentication
- Admin endpoints ต้องการสิทธิ์ admin เท่านั้น
