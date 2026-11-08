const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const userModel = require('../models/user.model');
const { ok } = require('../utils/response');
const { verifyRefreshToken } = require('../utils/jwt');

const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    return ok(req, res, { status: 201, message: 'Account created! Check your inbox to verify your email.', data: { user } });
  } catch (error) {
    return next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const user = await authService.verifyEmailToken(req.body.token);
    // Only released ('active') accounts get a session. An admin-disabled
    // account gets its email verified but no cookies — it stays logged out.
    const fresh = await userModel.findById(user.id);
    if (fresh.status === 'active') await tokenService.issueSession(req, res, fresh);
    return ok(req, res, {
      message: fresh.status === 'active' ? 'Email verified successfully. You are now logged in.' : 'Email verified successfully.',
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    await authService.resendVerification(req.body.email);
    return ok(req, res, { message: 'If that email needs verification, a new link has been sent.' });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = await authService.loginUser(req.body);
    await tokenService.issueSession(req, res, await userModel.findById(user.id));
    return ok(req, res, { message: 'Logged in successfully.', data: { user } });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await tokenService.revokeAllForUser(payload.sub);
      } catch {
        // Tampered/expired refresh token — just clear cookies below.
      }
    }
    tokenService.clearAuthCookies(res);
    return ok(req, res, { message: 'Logged out successfully.' });
  } catch (error) {
    tokenService.clearAuthCookies(res);
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const user = await tokenService.rotateSession(req, res);
    return ok(req, res, { message: 'Session refreshed.', data: { user } });
  } catch (error) {
    return next(error);
  }
};

const me = (req, res) => ok(req, res, { data: { user: req.profile.toPublic() } });

const forgotPassword = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    return ok(req, res, { message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const user = await authService.resetPassword(req.body);
    return ok(req, res, { message: 'Password updated. You can now log in with your new password.', data: { user } });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, verifyEmail, resendVerification, login, logout, refresh, me, forgotPassword, resetPassword };
