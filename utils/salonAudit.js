const compactObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
};

const appendAuditEntry = (document, event, currentUser = null, details = {}, at = new Date()) => {
  if (!document.auditTrail) {
    document.auditTrail = [];
  }

  const normalizedDetails = compactObject(details);

  document.auditTrail.push({
    event,
    at,
    actorUserId: currentUser?._id || null,
    actorRole: currentUser?.role || '',
    actorName: currentUser?.username || '',
    details: normalizedDetails && Object.keys(normalizedDetails).length > 0 ? normalizedDetails : null,
  });
};

module.exports = {
  appendAuditEntry,
};
