const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chat = sequelize.define(
    'Chat',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      chatId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      chatName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      chatType: {
        type: DataTypes.ENUM('appointment', 'one-to-one'),
        allowNull: false,
        defaultValue: 'one-to-one',
      },
      patientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      practitionerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'inactive',
      },
    },
    {
      tableName: 'chats',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['chatId', 'status'],
        },
      ],
    },
  );
  return Chat;
};
