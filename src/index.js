﻿const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes.js');
const reservationsRouter = require('./routes/reservations');
const XLSX = require('xlsx');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// 싱글톤 패턴으로 변경
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    this.db = null;
    this.client = null;
    Database.instance = this;
  }

  async connect() {
    if (this.db) {
      return this.db;
    }

    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      const dbName = process.env.DB_NAME || 'dowon_app';
      
      this.client = await MongoClient.connect(mongoUri);
      this.db = this.client.db(dbName);
      console.log('MongoDB 연결 성공');
      return this.db;
    } catch (error) {
      console.error('MongoDB 연결 실패:', error);
      process.exit(1);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.db = null;
      this.client = null;
      console.log('MongoDB 연결 종료');
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('데이터베이스가 연결되지 않았습니다.');
    }
    return this.db;
  }
}

const database = new Database();
const app = express();

// 환경 변수 설정
const port = process.env.PORT || 5003;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'healthdb';

// 미들웨어 순서 중요
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 디버깅을 위한 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});

// 라우트 등록
app.use('/api/patients', patientRoutes);
app.use('/api/patients', appointmentRoutes);
app.use('/api/reservations', reservationsRouter);

// MongoDB 연결 상태 모니터링
let isConnected = false;

const connectDB = async () => {
  // 이미 연결된 경우 조기 반환
  if (mongoose.connection.readyState === 1) {
    const { host, port, name } = mongoose.connection;
    console.log(`MongoDB 기존 연결 사용: ${host}:${port}/${name}`);
    return;
  }

  try {
    // MongoDB 연결
    await mongoose.connect('mongodb://127.0.0.1:27017/pulsedb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 연결 정보 안전하게 추출
    const { host, port, name } = mongoose.connection;
    console.log(`MongoDB 연결 성공: ${host}:${port}/${name}`);

  } catch (error) {
    console.error('MongoDB 연결 실패:', error.message);
    process.exit(1);
  }
};

// 서버 시작
const PORT = process.env.PORT || 5003;

const startServer = async () => {
  try {
    // MongoDB 연결 (한 번만 실행)
    await connectDB();
    
    // 서버 시작
    app.listen(PORT, () => {
      console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
    });
  } catch (error) {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  }
};

// 프로세스 종료 처리
process.on('SIGINT', async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB 연결 종료');
    }
    process.exit(0);
  } catch (err) {
    console.error('MongoDB 연결 종료 실패:', err);
    process.exit(1);
  }
});

// 서버 시작 (connectDB는 여기서만 호출)
startServer();

// 다른 모듈에서 사용할 수 있도록 export
module.exports = { app, mongoose };

// Excel 파일 경로
const EXCEL_FILE_PATH = 'D:\\uBioMacpaData\\유비오측정맥파.xlsx';

// 엑셀 데이터 읽기 API
app.get('/api/excel-data', async (req, res) => {
  try {
    const { userName } = req.query;

    if (!userName) {
      return res.status(400).json({ error: '사용자 이름이 필요합니다.' });
    }

    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      return res.status(404).json({ error: '엑셀 파일을 찾을 수 없습니다.' });
    }

    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const userRows = data.filter(row => row && row[0] === userName);

    if (userRows.length === 0) {
      return res.status(404).json({ error: `${userName}님의 데이터를 찾을 수 없습니다.` });
    }

    const latestRow = userRows[userRows.length - 1];

    // 맥파 데이터 매핑 (HR을 S열(인덱스 18)에서 가져오도록 수정)
    const result = {
      ab_ms: latestRow[9]?.toString() || '',     // J열: a-b
      ac_ms: latestRow[10]?.toString() || '',    // K열: a-c
      ad_ms: latestRow[11]?.toString() || '',    // L열: a-d
      ae_ms: latestRow[12]?.toString() || '',    // M열: a-e
      ba_ratio: latestRow[13]?.toString() || '', // N열: b/a
      ca_ratio: latestRow[14]?.toString() || '', // O열: c/a
      da_ratio: latestRow[15]?.toString() || '', // P열: d/a
      ea_ratio: latestRow[16]?.toString() || '', // Q열: e/a
      pvc: latestRow[17]?.toString() || '',      // R열: PVC
      hr: latestRow[18]?.toString() || ''        // S열: HR (맥박수)
    };

    console.log('엑셀에서 읽은 데이터:', result); // 디버깅용 로그

    res.json(result);

  } catch (error) {
    console.error('엑셀 데이터 읽기 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// MongoDB 저장 API
app.post('/api/user-data', async (req, res) => {
  console.log('받은 요청 데이터:', req.body);
  
  try {
    const db = await getDb();
    const collection = db.collection('patients');

    // BMI 계산 로직 수정
    let bmi = null;
    if (req.body.height && req.body.weight) {
      const heightInM = parseFloat(req.body.height) / 100;
      const weight = parseFloat(req.body.weight);
      bmi = parseFloat((weight / (heightInM * heightInM)).toFixed(1));
    }

    const userData = {
      name: req.body.name,
      residentNumber: req.body.residentNumber,
      phone: req.body.phone || null,
      gender: req.body.gender,
      personality: req.body.personality || null,
      workIntensity: req.body.workIntensity,
      height: req.body.height ? parseFloat(req.body.height) : null,
      weight: req.body.weight ? parseFloat(req.body.weight) : null,
      bmi: bmi,  // 계산된 BMI 저장
      bloodPressure: {
        diastolic: req.body.diastolicBP,
        systolic: req.body.systolicBP
      },
      selectedSymptoms: Array.isArray(req.body.selectedSymptoms) 
        ? req.body.selectedSymptoms 
        : [],
      stressLevel: req.body.stressLevel,
      medication: req.body.medication,
      preference: req.body.preference,
      ab_ms: req.body.ab_ms,
      ac_ms: req.body.ac_ms,
      ad_ms: req.body.ad_ms,
      ae_ms: req.body.ae_ms,
      ba_ratio: req.body.ba_ratio,
      ca_ratio: req.body.ca_ratio,
      da_ratio: req.body.da_ratio,
      ea_ratio: req.body.ea_ratio,
      pvc: req.body.pvc,
      bv: req.body.bv,
      sv: req.body.sv,
      hr: req.body.hr,
      memo: req.body.memo || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('MongoDB에 저장할 데이터:', userData);
    const result = await collection.insertOne(userData);

    res.status(201).json({ 
      success: true, 
      id: result.insertedId,
      data: userData,
      message: '데이터가 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    console.error('MongoDB 저장 오류:', error);
    res.status(500).json({ 
      success: false,
      error: '데이터 저장 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// API 라우트 핸들러
app.get('/api/user-data', async (req, res) => {
  try {
    console.log('사용자 데이터 요청 받음');
    
    // mongoose 모델을 사용하여 데이터 조회
    const collection = mongoose.connection.db.collection('users');
    const users = await collection.find({}).toArray();
    
    console.log('조회된 사용자 수:', users.length);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('MongoDB 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '서버 내부 오류'
    });
  }
});

// 서버 상태 확인 API
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    res.json({ status: 'ok', message: '서버가 정상적으로 실행 중입니다.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 404 핸들러
app.use((req, res) => {
  console.log('404 요청:', req.method, req.url);
  res.status(404).json({
    success: false,
    message: '요청한 리소스를 찾을 수 없습니다.'
  });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('서버 에러:', err);
  res.status(500).json({
    success: false,
    error: '서버 내부 오류',
    details: err.message
  });
});

// 프로세스 에러 처리
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 데이터 조회 API
app.get('/api/pulse-records', async (req, res) => {
  try {
    const records = await PulseRecord.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return res.json({
      success: true,
      data: records,
      count: records.length
    });

  } catch (error) {
    console.error('데이터 조회 에러:', error);
    return res.status(500).json({
      success: false,
      error: '데이터 조회 실패',
      details: error.message
    });
  }
});

// POST /api/pulse-records
app.post('/api/pulse-records', async (req, res) => {
  try {
    const record = new PulseRecord(req.body);
    const savedRecord = await record.save();

    return res.status(201).json({
      success: true,
      data: savedRecord
    });

  } catch (error) {
    console.error('데이터 저장 에러:', error);
    return res.status(500).json({
      success: false,
      error: '데이터 저장 실패',
      details: error.message
    });
  }
});

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: '서버가 정상적으로 실행 중입니다.' });
});