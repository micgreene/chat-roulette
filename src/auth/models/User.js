'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// including below useCreateIndex to suppress deprecation warning
mongoose.set("useCreateIndex", true);

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, require: true },
  role: { type: String, required: true, default: 'user', enum: ['user', 'superuser', 'admin'] }
}, { toJSON: { virtuals: true }});

// Adding the virtual field to the schema, visible, but does not persist
// Every user object will have this.token
UserSchema.virtual('token').get(function() {
  let tokenObject = {
    username: this.username,
  }
  return jwt.sign(tokenObject, process.env.SECRET)
});

UserSchema.virtual('capabilities').get(function() {
  let acl = {
    user: ['read'],
    superuser: ['read', 'create', 'update'],
    admin: ['read', 'create', 'update', 'delete'],
  }
  return acl[this.role];
});

UserSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 5);
  }
});

// Basic authorization
UserSchema.statics.authenticateBasic = async function(username, password) {
  const user = await this.findOne({ username });
  console.log("inside USER MODEL", user);
  const valid = await bcrypt.compare(password, user.password);
  console.log("Valid", valid);
  if (valid) { return user }
  throw new Error('Invalid User');
}

// Bearer authorization
UserSchema.statics.authenticateWithTokens = async function(token) {
  try {
    const parsedToken = jwt.verify(token, process.env.SECRET);
    const user = this.findOne({ username: parsedToken.username })
    if (user) { return user }
    throw new Error("User not found!")
  } catch (e) {
    throw new Error(e.message);
  }
}

module.exports = mongoose.model('users', UserSchema);
