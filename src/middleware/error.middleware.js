const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // MongoDB 관련 에러
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      type: 'ValidationError',
      message: '데이터 유효성 검증 실패',
      details: err.message
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      type: 'CastError',
      message: '잘못된 데이터 형식',
      details: err.message
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      status: 'error',
      type: 'DuplicateError',
      message: '중복된 데이터가 존재합니다',
      details: err.message
    });
  }

  // 기본 서버 에러
  return res.status(500).json({
    status: 'error',
    type: 'ServerError',
    message: '서버 내부 오류가 발생했습니다',
    details: process.env.NODE_ENV === 'development' ? err.message : '서버 오류'
  });
};

module.exports = errorHandler;
