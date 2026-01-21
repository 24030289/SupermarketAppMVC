const axios = require("axios");

// ============================
// 1) Generate NETS QR Code
// ============================
exports.generateQrCode = async (req, res) => {
  const { totalAmount } = req.body;

  try {
    const requestBody = {
      txn_id: "sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b",
      amt_in_dollars: Number(totalAmount),
      notify_mobile: 0,
    };

    const response = await axios.post(
      "https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/request",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.API_KEY,
          "project-id": process.env.PROJECT_ID,
        },
      }
    );

    const qrData = response.data?.result?.data;

    if (
      qrData?.response_code === "00" &&
      qrData?.txn_status === 1 &&
      qrData?.qr_code
    ) {
      const txnRetrievalRef = qrData.txn_retrieval_ref;

      req.session.pendingPayment = {
        method: "nets",
        txnRetrievalRef,
        cartTotal: totalAmount,
      };

      return res.render("netsQr", {
        title: "Scan to Pay",
        qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
        txnRetrievalRef,
      });
    }

    return res.redirect("/nets-qr/fail");
  } catch (err) {
    console.error("NETS QR error:", err.response?.data || err.message);
    return res.redirect("/nets-qr/fail");
  }
};

// ============================
// 2) SSE: Payment Status Stream
// ============================
exports.paymentStatusSSE = async (req, res) => {
  const { txnRetrievalRef } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let closed = false;
  req.on("close", () => (closed = true));

  const headers = {
    "api-key": process.env.API_KEY,
    "project-id": process.env.PROJECT_ID,
  };

  const send = (obj) => {
    if (!closed) {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    }
  };

  const queryUrl =
    "https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/query";

  const startTime = Date.now();
  let seenPendingAfterScan = false;

  const poll = async () => {
    if (closed) return;

    try {
      const resp = await axios.post(
        queryUrl,
        { txn_retrieval_ref: txnRetrievalRef },
        { headers }
      );

      const data = resp.data?.result?.data || {};
      const responseCode = data.response_code;
      const txnStatus = Number(data.txn_status);

      console.log("NETS query result:", data);

      // HARD FAIL STATES
      if (txnStatus === 3 || txnStatus === 4) {
        send({ fail: true });
        return res.end();
      }

      // PENDING AFTER SCAN → ASSUME SUCCESS
      if (responseCode === "00" && txnStatus === 1) {
        if (seenPendingAfterScan) {
          send({ success: true });
          return res.end();
        }

        // mark that scan already happened
        seenPendingAfterScan = true;
        send({ pending: true });
      } else {
        send({ pending: true });
      }
    } catch (err) {
      console.error("NETS query error:", err.message);
      send({ pending: true });
    }

    setTimeout(poll, 2000);
  };

  poll();
};