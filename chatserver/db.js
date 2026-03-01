// db.js
require('dotenv').config();
const { Sequelize, DataTypes, Op } = require('sequelize');

// Lấy giá trị từ biến môi trường
const DB_NAME = process.env.DB_NAME || 'chatapp';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '6723';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_DIALECT = process.env.DB_DIALECT || 'mysql';
const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX) || 10;
const DB_POOL_MIN = parseInt(process.env.DB_POOL_MIN) || 0;
const DB_POOL_ACQUIRE = parseInt(process.env.DB_POOL_ACQUIRE) || 30000;
const DB_POOL_IDLE = parseInt(process.env.DB_POOL_IDLE) || 10000;

// Kết nối MySQL
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  logging: false,
  pool: {
    max: DB_POOL_MAX,
    min: DB_POOL_MIN,
    acquire: DB_POOL_ACQUIRE,
    idle: DB_POOL_IDLE
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
// Model ActiveUserSession
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
    { fields: ['type', 'toTarget', 'timestamp'] },
    { fields: ['type', 'fromUser', 'toTarget', 'timestamp'] },
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
// Đồng bộ database
if (process.env.NODE_ENV !== 'production') {
  sequelize.sync()
      .then(() => console.log('🗄️  Database synced successfully'))
      .catch(err => console.error('❌  Database sync error:', err));
}