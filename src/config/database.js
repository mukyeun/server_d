const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'hospital_db'  // 데이터베이스 이름 명시
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB; 