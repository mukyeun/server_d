// server/controllers/patientController.js
const Patient = require('../models/Patient');

exports.createPatient = async (req, res) => {
  try {
    const { basicInfo, records } = req.body;

    if (!basicInfo?.name || !basicInfo?.residentNumber) {
      return res.status(400).json({ message: '이름과 주민등록번호는 필수입니다.' });
    }

    const newPatient = new Patient({
      basicInfo,
      records
    });

    const saved = await newPatient.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('환자 저장 실패:', err);
    res.status(500).json({ message: '서버 오류 발생' });
  }
};
