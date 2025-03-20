﻿const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes.js');
const reservationsRouter = require('./routes/reservations');

const app = express();

// 미들웨어 순서 중요
app.use(cors());
app.use(express.json());

// 디버깅을 위한 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// 라우트 등록
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reservations', reservationsRouter);

// MongoDB 연결 설정
const connectDB = async () => {
  try {
    const mongoURI = 'mongodb://127.0.0.1:27017/clinic';
    console.log('MongoDB 연결 시도:', mongoURI);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5초 타임아웃
    });
    
    console.log('✅ MongoDB 연결 성공');
  } catch (err) {
    console.error('❌ MongoDB 연결 실패:', err.message);
    console.log('MongoDB가 실행 중인지 확인해주세요.');
    process.exit(1);
  }
};

// 서버 시작
const startServer = async () => {
  try {
    // MongoDB 연결
    await connectDB();

    // 404 핸들러
    app.use((req, res) => {
      console.log(`❌ 404 에러: ${req.method} ${req.url}`);
      res.status(404).json({
        status: 'error',
        message: '요청하신 경로를 찾을 수 없습니다.'
      });
    });

    // 에러 핸들링 미들웨어
    app.use((err, req, res, next) => {
      console.error('서버 에러:', err);
      
      if (err.code === 11000) {
        return res.status(200).json({
          status: 'existing',
          message: '이미 등록된 환자입니다.',
          error: err.message
        });
      }

      res.status(err.status || 500).json({
        status: 'error',
        message: err.message || '서버 오류가 발생했습니다.'
      });
    });

    // 서버 시작
    const port = process.env.PORT || 5003;
    app.listen(port, () => {
      console.log(`🚀 서버가 ${port}번 포트에서 실행 중입니다.`);
      console.log('등록된 라우트:', app._router.stack.map(r => r.route?.path).filter(Boolean));
    });

  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

// 서버 시작
startServer();

// 프로세스 에러 처리
process.on('unhandledRejection', (err) => {
  console.error('처리되지 않은 Promise 거부:', err);
  process.exit(1);
});

module.exports = app;

