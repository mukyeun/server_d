const express = require('express');
const router = express.Router();
const PulseRecord = require('../models/PulseRecord');

// 에러를 next로 전달하는 비동기 핸들러 래퍼
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// 맥파 기록 생성 (Create)
router.post('/', asyncHandler(async (req, res) => {
    const pulseRecord = new PulseRecord(req.body);
    const savedRecord = await pulseRecord.save();
    res.status(201).json({
        status: 'success',
        data: savedRecord
    });
}));

// 모든 맥파 기록 조회 (Read)
router.get('/', asyncHandler(async (req, res) => {
    const records = await PulseRecord.find()
        .populate('patientId', 'name birthDate')
        .sort({ recordDate: -1 });
    
    if (!records.length) {
        return res.status(404).json({
            status: 'warning',
            message: '맥파 기록이 없습니다'
        });
    }
    res.json({
        status: 'success',
        count: records.length,
        data: records
    });
}));

// 특정 환자의 맥파 기록 조회
router.get('/patient/:patientId', asyncHandler(async (req, res) => {
    const records = await PulseRecord.find({ patientId: req.params.patientId })
        .sort({ recordDate: -1 });
    
    if (!records.length) {
        return res.status(404).json({
            status: 'warning',
            message: '해당 환자의 맥파 기록이 없습니다'
        });
    }
    res.json({
        status: 'success',
        count: records.length,
        data: records
    });
}));

// 특정 맥파 기록 조회 (Read)
router.get('/:id', asyncHandler(async (req, res) => {
    const record = await PulseRecord.findById(req.params.id)
        .populate('patientId');
    
    if (!record) {
        return res.status(404).json({
            status: 'error',
            message: '맥파 기록을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        data: record
    });
}));

// 맥파 기록 수정 (Update)
router.put('/:id', asyncHandler(async (req, res) => {
    const updatedRecord = await PulseRecord.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    );

    if (!updatedRecord) {
        return res.status(404).json({
            status: 'error',
            message: '수정할 맥파 기록을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        data: updatedRecord
    });
}));

// 맥파 기록 삭제 (Delete)
router.delete('/:id', asyncHandler(async (req, res) => {
    const record = await PulseRecord.findByIdAndDelete(req.params.id);
    
    if (!record) {
        return res.status(404).json({
            status: 'error',
            message: '삭제할 맥파 기록을 찾을 수 없습니다'
        });
    }
    res.json({
        status: 'success',
        message: '맥파 기록이 삭제되었습니다'
    });
}));

module.exports = router; 