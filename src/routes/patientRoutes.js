const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');

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

// 환자 생성 (Create)
router.post('/', asyncHandler(async (req, res) => {
    const patient = new Patient(req.body);
    const savedPatient = await patient.save();
    res.status(201).json(savedPatient);
}));

// 모든 환자 조회 (Read)
router.get('/', async (req, res) => {
    try {
        const patients = await Patient.find();
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 특정 환자 조회 (Read)
router.get('/:id', asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
        return res.status(404).json({ 
            status: 'error',
            message: '환자를 찾을 수 없습니다' 
        });
    }
    res.json(patient);
}));

// 환자 정보 수정 (Update)
router.put('/:id', asyncHandler(async (req, res) => {
    const updatedPatient = await Patient.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );
    if (!updatedPatient) {
        return res.status(404).json({ 
            status: 'error',
            message: '수정할 환자 정보를 찾을 수 없습니다' 
        });
    }
    res.json(updatedPatient);
}));

// 환자 삭제 (Delete)
router.delete('/:id', asyncHandler(async (req, res) => {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
        return res.status(404).json({ 
            status: 'error',
            message: '삭제할 환자를 찾을 수 없습니다' 
        });
    }
    res.json({ 
        status: 'success',
        message: '환자 정보가 삭제되었습니다' 
    });
}));

module.exports = router; 