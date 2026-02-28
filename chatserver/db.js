// db.js  hoặc models/index.js
const { Sequelize, DataTypes, Op } = require('sequelize');

// Kết nối MySQL
const sequelize = new Sequelize('chatapp', 'root', '6723', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,           // Tắt log SQL để gọn console (bật true khi debug)
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// ────────────────────────────────────────────────
// Model User
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  reloginCode: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'Users',
  timestamps: false,
});

// ────────────────────────────────────────────────
// Model ActiveUserSession (mới – quản lý phiên đăng nhập active)
const ActiveUserSession = sequelize.define('ActiveUserSession', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  device_info: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  last_heartbeat: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  tableName: 'ActiveUserSessions',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['username'] },
    { fields: ['last_heartbeat'] },
  ],
});

// ────────────────────────────────────────────────
// Model Room
const Room = sequelize.define('Room', {
  name: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false,
  },
}, {
  tableName: 'Rooms',
  timestamps: false,
});

// ────────────────────────────────────────────────
// Model RoomMember
const RoomMember = sequelize.define('RoomMember', {
  roomName: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'RoomMembers',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['roomName', 'username'] },
    { fields: ['username'] },
    { fields: ['roomName'] },
  ],
});

// ────────────────────────────────────────────────
// Model Message
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.ENUM('people', 'room'),
    allowNull: false,
  },
  fromUser: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  toTarget: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
}, {
  tableName: 'Messages',
  timestamps: false,
  indexes: [
    { fields: ['type', 'toTarget', 'timestamp'] },                    // lấy lịch sử theo phòng/người
    { fields: ['type', 'fromUser', 'toTarget', 'timestamp'] },        // lấy lịch sử 2 người
    { fields: ['timestamp'] },
  ],
});

// ────────────────────────────────────────────────
// Quan hệ (associations)
RoomMember.belongsTo(Room,   { foreignKey: 'roomName', targetKey: 'name' });
RoomMember.belongsTo(User,   { foreignKey: 'username', targetKey: 'username' });
Message.belongsTo(User,      { foreignKey: 'fromUser', targetKey: 'username', as: 'Sender' });

// ────────────────────────────────────────────────
// Export tất cả
module.exports = {
  sequelize,
  Sequelize,
  Op,
  User,
  ActiveUserSession,
  Room,
  RoomMember,
  Message,
};

// ────────────────────────────────────────────────
// Đồng bộ database (chỉ chạy 1 lần đầu hoặc khi phát triển)
// Trong production → nên dùng migration thay vì sync
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync()   // alter: true → tự cập nhật schema mà không xóa dữ liệu
    .then(() => console.log('🗄️  Database synced successfully'))
    .catch(err => console.error('❌  Database sync error:', err));
}