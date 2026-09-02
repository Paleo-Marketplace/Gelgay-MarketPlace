const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['buyer', 'vendor', 'admin'],
      default: 'buyer',
      required: true,
      index: true
    },
    telegramId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true
    },
    googleId: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true
    },
    authProvider: {
      type: String,
      enum: ['telegram', 'google', 'email', 'dev'],
      default: 'email'
    },
    telegramUsername: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true,
      default: 'Adama, Ethiopia'
    },
    password: {
      type: String,
      required: false,
      select: false
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isProfileComplete: {
      type: Boolean,
      default: false
    },
    emailVerificationCode: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ]
  },
  {
    timestamps: { createdAt: true, updatedAt: true }
  }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

