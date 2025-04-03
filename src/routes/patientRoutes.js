const express = require('express');
const router = express.Router();
const xlsx = require('xlsx');
const Patient = require('../models/Patient');
const { exec } = require('child_process');
const path = require('path');

// 에러를 next로 전달하는 비동기 핸들러 래퍼
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 환자 검색 API (가장 위에 배치)
router.get('/search', asyncHandler(async (req, res) => {
    const { name, phone } = req.query;
    let query = {};

    if (name) {
        query.name = { $regex: name, $options: 'i' };
    }
    if (phone) {
        query['contact.phone'] = { $regex: phone };
    }

    const patients = await Patient.find(query);
    if (!patients.length) {
        return res.status(404).json({ 
            status: 'warning',
            message: '검색 결과가 없습니다' 
        });
    }
    res.json(patients);
}));

// 고급 검색 API (날짜 범위 추가)
router.get('/advanced-search', asyncHandler(async (req, res) => {
    const { name, phone, startDate, endDate, gender } = req.query;
    let query = {};

    if (name) query.name = { $regex: name, $options: 'i' };
    if (phone) query['contact.phone'] = { $regex: phone };
    if (gender) query.gender = gender;
    if (startDate || endDate) {
        query.birthDate = {};
        if (startDate) query.birthDate.$gte = new Date(startDate);
        if (endDate) query.birthDate.$lte = new Date(endDate);
    }

    const patients = await Patient.find(query);
    if (!patients.length) {
        return res.status(404).json({ 
            status: 'warning',
            message: '검색 결과가 없습니다' 
        });
    }
    res.json(patients);
}));

// 환자 정보 저장
router.post('/patients', async (req, res) => {
  try {
    // 1. 받은 데이터 로깅
    console.log('받은 환자 데이터:', req.body);

    // 2. MongoDB 저장
    const result = await Patient.create(req.body);
    console.log('MongoDB 저장 결과:', result);

    // 3. 성공 응답
    res.json({ 
      success: true, 
      message: '환자 정보가 성공적으로 저장되었습니다.',
      data: result 
    });

  } catch (error) {
    console.error('환자 정보 저장 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '환자 정보 저장 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 환자 정보 조회
router.get('/patients', async (req, res) => {
  try {
    // 1. 검색 조건 로깅
    console.log('환자 검색 조건:', req.query);

    // 2. MongoDB 조회
    const patients = await Patient.find(req.query)
      .sort({ createdAt: -1 }) // 최신순 정렬
      .limit(100); // 최대 100개 제한

    console.log(`조회된 환자 수: ${patients.length}`);

    // 3. 성공 응답
    res.json({ 
      success: true,
      data: patients,
      count: patients.length
    });

  } catch (error) {
    console.error('환자 정보 조회 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 특정 환자 정보 조회
router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      data: patient 
    });

  } catch (error) {
    console.error('특정 환자 조회 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 조회 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 환자 정보 수정
router.put('/patients/:id', async (req, res) => {
  try {
    const updatedPatient = await Patient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedPatient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      message: '환자 정보가 성공적으로 수정되었습니다.',
      data: updatedPatient 
    });

  } catch (error) {
    console.error('환자 정보 수정 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 수정 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 환자 정보 삭제
router.delete('/patients/:id', async (req, res) => {
  try {
    const deletedPatient = await Patient.findByIdAndDelete(req.params.id);

    if (!deletedPatient) {
      return res.status(404).json({ 
        success: false,
        message: '해당 환자를 찾을 수 없습니다.' 
      });
    }

    res.json({ 
      success: true,
      message: '환자 정보가 성공적으로 삭제되었습니다.',
      data: deletedPatient 
    });

  } catch (error) {
    console.error('환자 정보 삭제 에러:', error);
    res.status(500).json({ 
      success: false,
      message: '환자 정보 삭제 중 오류가 발생했습니다.',
      error: error.message 
    });
  }
});

// 맥파 데이터 가져오기 및 업데이트
router.post('/wave-data', async (req, res) => {
  try {
    const filePath = 'D:/uBioMacpaData/유비오측정맥파.xlsx';

    // 엑셀 파일 읽기
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // 데이터 읽기
    const rows = xlsx.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null
    });

    // 헤더 확인
    console.log('헤더 행:', rows[0]);

    // 최신 데이터 가져오기
    const dataRows = rows.slice(1).sort((a, b) => {
      const dateA = new Date(a[5]);
      const dateB = new Date(b[5]);
      return dateB - dateA;
    });

    const latestRow = dataRows[0];
    
    if (!latestRow) {
      throw new Error('데이터가 없습니다.');
    }

    // 각 열의 데이터 확인 (J~R열만)
    console.log('데이터 행 전체:', latestRow);
    console.log('열별 데이터:', {
      'J열 (9)': latestRow[9],
      'K열 (10)': latestRow[10],
      'L열 (11)': latestRow[11],
      'M열 (12)': latestRow[12],
      'N열 (13)': latestRow[13],
      'O열 (14)': latestRow[14],
      'P열 (15)': latestRow[15],
      'Q열 (16)': latestRow[16],
      'R열 (17)': latestRow[17]  // 심박수
    });

    // 데이터 매핑 (J~R열)
    const waveData = {
      ab_ms: latestRow[9]?.toString() || '',      // J열
      ac_ms: latestRow[10]?.toString() || '',     // K열
      ad_ms: latestRow[11]?.toString() || '',     // L열
      ae_ms: latestRow[12]?.toString() || '',     // M열
      ba_ratio: latestRow[13]?.toString() || '',  // N열
      ca_ratio: latestRow[14]?.toString() || '',  // O열
      da_ratio: latestRow[15]?.toString() || '',  // P열
      ea_ratio: latestRow[16]?.toString() || '',  // Q열
      hr: latestRow[17]?.toString() || '',        // R열 (심박수)
      updatedAt: new Date()
    };

    res.json({ 
      success: true, 
      data: waveData,
      measurementDate: latestRow[5]
    });

  } catch (error) {
    console.error('Wave data fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 유비오맥파기 실행
router.post('/launch-ubio', async (req, res) => {
  try {
    const ubioPath = 'C:/Program Files/uBioMacpa/uBioMacpa.exe'; // 실제 설치 경로로 수정 필요

    exec(`"${ubioPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('유비오맥파기 실행 오류:', error);
        return res.status(500).json({
          success: false,
          error: '유비오맥파기 실행 중 오류가 발생했습니다.'
        });
      }
      
      res.json({
        success: true,
        message: '유비오맥파기가 실행되었습니다.'
      });
    });

  } catch (error) {
    console.error('유비오맥파기 실행 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '유비오맥파기 실행 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 