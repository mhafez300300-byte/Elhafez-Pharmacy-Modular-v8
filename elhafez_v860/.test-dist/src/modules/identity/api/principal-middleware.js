export const hydratePrincipal = (identity) => (req, _res, next) => { if (!req.auth)
    return next(); const auth = req.auth; Promise.all([identity.validateSession(auth.tenantId, auth.userId, auth.sessionId), identity.findUser(auth.tenantId, auth.userId)]).then(async ([valid, user]) => { if (!valid || !user || !user.active) {
    req.auth = undefined;
    return next();
} req.auth = { ...auth, role: user.role, permissions: user.permissions, maxDiscountPercent: user.maxDiscountPercent }; void identity.touchSession(auth.tenantId, auth.userId, auth.sessionId).catch(() => { }); next(); }).catch(next); };
