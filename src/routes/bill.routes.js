const express = require('express');
const router = express.Router();
const BillController = require('../controllers/bills.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const PaymentNotifyController = require('../controllers/payment.notify.controller');

router.post(
  '/notify',
  express.urlencoded({ extended: true }),
  PaymentNotifyController.payHereNotify,
);

const redirectHtml = (appUrl, webUrl) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Redirecting...</title>
    <script>
      function redirect() {
        // Try opening the app
        window.location.href = "${appUrl}";

        // Fallback to web after 2s (iOS requirement)
        setTimeout(function () {
          window.location.href = "${webUrl}";
        }, 2000);
      }
      window.onload = redirect;
    </script>
  </head>
  <body style="text-align:center;padding-top:40px;font-family:sans-serif;">
    <h3>Redirecting…</h3>
    <p>Please wait</p>
  </body>
</html>
`;

const getRedirectUrls = (userAgent, path) => {
  const isMobile = /android|iphone|ipad|ipod|ios/i.test(userAgent);

  const webUrl = `${process.env.FRONTEND_URL}/${path}`;

  if (isMobile) {
    return {
      appUrl: `${process.env.HEALTHIFY_FRONTEND_NATIVE_SCHEME}://${path}`,
      webUrl,
    };
  }

  return {
    appUrl: webUrl,
    webUrl,
  };
};

router.all('/payhere/return', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const { appUrl, webUrl } = getRedirectUrls(ua, 'profile/payment-success');

  res.status(200).send(redirectHtml(appUrl, webUrl));
});

router.all('/payhere/cancel', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const { appUrl, webUrl } = getRedirectUrls(ua, 'profile/payment-cancel');

  res.status(200).send(redirectHtml(appUrl, webUrl));
});

router.use(authMiddleware);
router.get('/', BillController.getBills);
router.get('/:billId', BillController.getBillDetails);
router.post('/pay', BillController.pay);

module.exports = router;
