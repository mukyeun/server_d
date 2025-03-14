﻿const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const connectDB = require('./config/database');
const securityMiddleware = require('./middleware/security.middleware');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 라우트 파일 불러오기
const patientRoutes = require('./routes/patientRoutes');
const pulseRecordRoutes = require('./routes/pulseRecordRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

// CORS 옵션 설정
const corsOptions = {
    origin: 'http://localhost:3000', // React 앱의 주소
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

const app = express();

// CORS 적용
app.use(cors(corsOptions));
app.use(express.json());

// 보안 미들웨어 적용
securityMiddleware(app);

// 데이터베이스 연결
connectDB();

// 라우트 설정
app.use('/api/patients', patientRoutes);
app.use('/api/pulse-records', pulseRecordRoutes);
app.use('/api/appointments', appointmentRoutes);

// 유비오맥파 프로그램 실행 라우트
app.post('/api/launch-ubio', (req, res) => {
  const programPath = '"C:\\Program Files (x86)\\uBioMacpa Pro\\bin\\uBioMacpaPro.exe"';
  
  exec(programPath, (error, stdout, stderr) => {
    if (error) {
      console.error(`실행 오류: ${error}`);
      return res.status(500).json({ error: '프로그램 실행 실패' });
    }
    res.json({ message: '프로그램이 실행되었습니다.' });
  });
});

// 기본 라우트
app.get('/', (req, res) => {
    res.json({ message: '도원한의원 API 서버가 실행중입니다.' });
});

// 에러 핸들링 미들웨어 사용
app.use(require('./middleware/error.middleware'));

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행중입니다.`);
});
