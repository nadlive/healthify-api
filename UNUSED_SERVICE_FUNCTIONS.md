# Unused service functions (cleanup list)

Service functions that are **not referenced** in any controller, route, or other service. Self-references (a function only called from the same service) were checked: if the only caller is also unused, the function is listed. If a function is only called by another function that *is* used (e.g. from a controller), it is **not** listed.

---

## 1. **email.service.js**
| Function | Notes |
|----------|--------|
| `sendBillSuccessEmail` | Not exported; never called. |
| `sendPasswordResetEmail` | Exported but never called (auth flow uses `sendPasswordResetCodeEmail`). |

---

## 2. **subscriptionUsage.service.js**
| Function | Notes |
|----------|--------|
| `resetUsageForNewPeriod` | Exported; never called anywhere. |

---

## 3. **patient.identity.service.js**
| Function | Notes |
|----------|--------|
| `getPatientByUserId` | Never called. |
| `getPatientByEhrId` | Never called. |

---

## 4. **patient.ehr.service.js**
| Function | Notes |
|----------|--------|
| `getLatestVitals` | Never called. |
| `getMedications` | Never called. |
| `getAllergies` | Never called. |
| `getSocialHistory` | Never called. |

---

## 5. **invoice.operation.service.js**
| Function | Notes |
|----------|--------|
| `createInvoiceForAppointment` | Never called (only `createInvoiceForSubscription` and `addInvoiceItemToExistingInvoice` are used). |

---

## 6. **payment.service.js**
| Function | Notes |
|----------|--------|
| `findPendingPayment` | Never called. |

---

## 7. **privacy.policy.service.js**
| Function | Notes |
|----------|--------|
| `getUserRole` | Never called. |

---

## 8. **invoice.service.js**
| Function | Notes |
|----------|--------|
| `generateInvoicePDF` | Never called (only `generateInvoiceBuffer` is used by invoice controller). |

---

## 9. **practitioner.service.js**
| Function | Notes |
|----------|--------|
| `getPractitionerRoles` | Never called. |
| `buildPractitionersFromFHIRBundle` | Never called. |

---

## 10. **notification.service.js**
| Function | Notes |
|----------|--------|
| `sendExpirationNotice` | Exported; never called. |
| `sendQuotaExhaustedNotice` | Exported; never called. |

---

## 11. **subscriptionLifecycle.service.js**
| Function | Notes |
|----------|--------|
| `rolloverPeriod` | Exported; never called. |

---

## 12. **fhir.service.js**
| Function | Notes |
|----------|--------|
| `executeBundle` | Never called from outside (only `createResource` and `searchResources` are used by patient.ehr and practitioner). |
| `getResource` | Never called from outside. |
| `updateResource` | Never called from outside. |
| `deleteResource` | Never called from outside. |

---

## Summary count

| Service file | Unused functions |
|--------------|------------------|
| email.service.js | 2 |
| subscriptionUsage.service.js | 1 |
| patient.identity.service.js | 2 |
| patient.ehr.service.js | 4 |
| invoice.operation.service.js | 1 |
| payment.service.js | 1 |
| privacy.policy.service.js | 1 |
| invoice.service.js | 1 |
| practitioner.service.js | 2 |
| notification.service.js | 2 |
| subscriptionLifecycle.service.js | 1 |
| fhir.service.js | 4 |
| **Total** | **22** |

Remove or refactor these only after you’re sure no future use (e.g. not-yet-wired routes or scripts) is planned.
