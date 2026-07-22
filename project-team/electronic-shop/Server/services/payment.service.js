const crypto = require("crypto");

const Order = require(
  "../models/Orders.model"
);
const PaymentTransaction = require(
  "../models/PaymentTransaction.model"
);

const PRIVILEGED_ROLES = [
  "ADMIN",
  "MANAGER",
  "STAFF",
];

const toSafeAmount = (amount) => {
  return Math.max(
    Math.round(Number(amount || 0)),
    0
  );
};

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

const getPublicOrderCode = (order) => {
  const storedCode = String(order?.order_code || "")
    .trim()
    .replace(/^#/, "")
    .toUpperCase();

  if (storedCode) {
    return storedCode;
  }

  return `TS-${String(order?._id || order).slice(-8).toUpperCase()}`;
};

const getVietnamDatePrefix = () => {
  const now = new Date();

  const vietnamTime = new Date(
    now.getTime() +
      7 * 60 * 60 * 1000
  );

  const year = String(
    vietnamTime.getUTCFullYear()
  ).slice(-2);

  const month = String(
    vietnamTime.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    vietnamTime.getUTCDate()
  ).padStart(2, "0");

  return `${year}${month}${day}`;
};

const getCreateEndpoint = () =>
  process.env.ZALOPAY_ENDPOINT ||
  "https://sb-openapi.zalopay.vn/v2/create";

const getQueryEndpoint = () =>
  process.env.ZALOPAY_QUERY_ENDPOINT ||
  "https://sb-openapi.zalopay.vn/v2/query";

const hashGuestToken = (token) =>
  crypto
    .createHash("sha256")
    .update(String(token || ""))
    .digest("hex");

const safeEqualHex = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    leftBuffer.length > 0 &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const assertOrderAccess = (order, currentUser = {}) => {
  const role = normalizeRole(currentUser.role);

  if (PRIVILEGED_ROLES.includes(role)) {
    return;
  }

  if (order.user_id) {
    if (
      currentUser.user_id &&
      String(order.user_id) === String(currentUser.user_id)
    ) {
      return;
    }

    throw new Error(currentUser.user_id ? "Access denied" : "Unauthorized");
  }

  const suppliedHash = hashGuestToken(currentUser.guest_order_token);

  if (!safeEqualHex(suppliedHash, order.guest_access_token_hash)) {
    throw new Error("Access denied");
  }
};

const findOrderForAccess = async (orderId) =>
  Order.findById(orderId).select("+guest_access_token_hash");

const toSafeOrderObject = (order) => {
  const result = order?.toObject ? order.toObject() : { ...order };
  delete result.guest_access_token_hash;
  return result;
};

const mergeRawResponse = (
  currentValue,
  key,
  value
) => {
  const current =
    currentValue &&
    typeof currentValue === "object" &&
    !Array.isArray(currentValue)
      ? currentValue
      : {};

  return {
    ...current,
    [key]: value,
  };
};

// Tao link VietQR
const buildVietQrUrl = ({
  amount,
  transferContent,
}) => {
  const bankId =
    process.env
      .BANK_TRANSFER_BANK_ID ||
    "MB";

  const accountNo =
    process.env
      .BANK_TRANSFER_ACCOUNT_NO ||
    "123456789";

  const accountName =
    process.env
      .BANK_TRANSFER_ACCOUNT_NAME ||
    "ONLINE TECH SHOP";

  const template =
    process.env
      .BANK_TRANSFER_TEMPLATE ||
    "compact2";

  const encodedContent =
    encodeURIComponent(transferContent);

  const encodedName =
    encodeURIComponent(accountName);

  return (
    `https://img.vietqr.io/image/` +
    `${bankId}-${accountNo}-${template}.png` +
    `?amount=${amount}` +
    `&addInfo=${encodedContent}` +
    `&accountName=${encodedName}`
  );
};

// Cap nhat ZaloPay paid
const markZaloPayAsPaid = async (
  payment,
  zaloData
) => {
  const order = await Order.findOneAndUpdate(
    {
      _id: payment.order_id,
      status: { $ne: "cancelled" },
    },
    {
      $set: {
        payment_method: "zalopay",
        payment_status: "paid",
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!order) {
    payment.raw_response = mergeRawResponse(
      payment.raw_response,
      "latest_status",
      zaloData
    );
    payment.status = "failed";
    payment.markModified("raw_response");
    await payment.save();

    throw new Error(
      "Cancelled order cannot be marked as paid"
    );
  }

  payment.status = "paid";

  payment.paid_at =
    payment.paid_at || new Date();

  const zpTransId =
    zaloData?.zp_trans_id ||
    zaloData?.zptransid;

  if (zpTransId) {
    payment.provider_order_id =
      String(zpTransId);
  }

  payment.raw_response =
    mergeRawResponse(
      payment.raw_response,
      "latest_status",
      zaloData
    );

  payment.markModified(
    "raw_response"
  );

  await payment.save();

  return payment;
};

// Query trang thai ZaloPay
const queryZaloPayTransaction = async (
  payment
) => {
  if (
    !payment ||
    payment.provider !== "zalopay"
  ) {
    return payment;
  }

  if (payment.status === "paid") {
    return payment;
  }

  const appId =
    process.env.ZALOPAY_APP_ID;

  const key1 =
    process.env.ZALOPAY_KEY1;

  const appTransId =
    payment.transaction_ref ||
    payment.payment_code;

  if (
    !appId ||
    !key1 ||
    !appTransId
  ) {
    return payment;
  }

  const hmacInput =
    `${appId}|${appTransId}|${key1}`;

  const mac = crypto
    .createHmac("sha256", key1)
    .update(hmacInput)
    .digest("hex");

  const response = await fetch(
    getQueryEndpoint(),
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        app_id: Number(appId),
        app_trans_id: appTransId,
        mac,
      }),
    }
  );

  const result =
    await response.json();

  payment.raw_response =
    mergeRawResponse(
      payment.raw_response,
      "query_response",
      result
    );

  payment.markModified(
    "raw_response"
  );

  if (
    Number(result.return_code) === 1
  ) {
    return markZaloPayAsPaid(
      payment,
      result
    );
  }

  // Khong danh dau failed ngay,
  // vi giao dich co the dang xu ly.
  await payment.save();

  return payment;
};

// Lay payment theo order
const getPaymentByOrder = async (
  orderId,
  currentUser,
  {
    refreshZaloPay = true,
  } = {}
) => {
  let order =
    await findOrderForAccess(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  assertOrderAccess(
    order,
    currentUser
  );

  let payment =
    await PaymentTransaction.findOne({
      order_id: orderId,
    }).sort({
      updated_at: -1,
    });

  if (
    refreshZaloPay &&
    payment?.provider === "zalopay" &&
    payment.status !== "paid"
  ) {
    try {
      payment =
        await queryZaloPayTransaction(
          payment
        );

      order =
        await Order.findById(orderId);
    } catch (error) {
      console.error(
        "[payment.queryZaloPayTransaction]",
        error.message
      );
    }
  }

  return {
    order: toSafeOrderObject(order),
    payment: payment
      ? payment.toObject()
      : null,
  };
};

// Tao VietQR payment
const createBankTransferPayment = async (
  orderId,
  currentUser
) => {
  const order =
    await findOrderForAccess(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  assertOrderAccess(
    order,
    currentUser
  );

  if (order.status === "cancelled") {
    throw new Error(
      "Cancelled order cannot create a payment"
    );
  }

  if (order.payment_status === "paid") {
    throw new Error("Order is already paid");
  }

  const amount = toSafeAmount(
    order.total_amount
  );

  const transferContent =
    getPublicOrderCode(order);

  const qrUrl = buildVietQrUrl({
    amount,
    transferContent,
  });

  const payment =
    await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "bank_transfer",
      },
      {
        order_id: order._id,
        provider: "bank_transfer",
        amount,
        status:
          order.payment_status ===
          "paid"
            ? "paid"
            : "pending",
        payment_code:
          transferContent,
        transaction_ref:
          transferContent,
        qr_url: qrUrl,
        bank_code:
          process.env
            .BANK_TRANSFER_BANK_ID ||
          "MB",
        account_no:
          process.env
            .BANK_TRANSFER_ACCOUNT_NO ||
          "123456789",
        account_name:
          process.env
            .BANK_TRANSFER_ACCOUNT_NAME ||
          "ONLINE TECH SHOP",
        transfer_content:
          transferContent,
        raw_response: {
          source:
            "vietqr_quick_link",
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

  order.payment_method =
    "bank_transfer";

  if (
    order.payment_status !== "paid"
  ) {
    order.payment_status = "pending";
  }

  await order.save();

  return {
    order: toSafeOrderObject(order),
    payment,
  };
};

// Tao ZaloPay payment
const createZaloPayPayment = async (
  orderId,
  {
    clientBaseUrl,
    currentUser,
  }
) => {
  const order =
    await findOrderForAccess(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  assertOrderAccess(
    order,
    currentUser
  );

  if (order.status === "cancelled") {
    throw new Error(
      "Cancelled order cannot create a payment"
    );
  }

  if (order.payment_status === "paid") {
    throw new Error("Order is already paid");
  }

  const appId =
    process.env.ZALOPAY_APP_ID;

  const key1 =
    process.env.ZALOPAY_KEY1;

  if (!appId || !key1) {
    throw new Error(
      "Missing ZALOPAY_APP_ID or ZALOPAY_KEY1 in Server/.env"
    );
  }

  const amount = toSafeAmount(
    order.total_amount
  );

  if (amount <= 0) {
    throw new Error(
      "Order amount must be greater than 0 for ZaloPay payment"
    );
  }

  // Kiem tra giao dich da tao truoc do
  const existingPayment =
    await PaymentTransaction.findOne({
      order_id: order._id,
      provider: "zalopay",
    });

  if (existingPayment) {
    if (
      existingPayment.status !== "paid"
    ) {
      try {
        await queryZaloPayTransaction(
          existingPayment
        );
      } catch (error) {
        console.error(
          "[payment.queryExistingZaloPay]",
          error.message
        );
      }
    }

    const refreshed =
      await PaymentTransaction.findById(
        existingPayment._id
      );

    if (
      refreshed?.status === "paid" ||
      (
        refreshed?.status ===
          "pending" &&
        refreshed?.payment_url
      )
    ) {
      const refreshedOrder =
        await Order.findById(
          order._id
        );

      return {
        success: true,
        reused: true,
        order: toSafeOrderObject(refreshedOrder),
        payment: refreshed,
        payment_url:
          refreshed.payment_url,
        qr_url: refreshed.qr_url,
      };
    }
  }

  const uniqueSuffix =
    String(Date.now()).slice(-6);

  const appTransId =
    `${getVietnamDatePrefix()}_` +
    `${String(order._id).slice(-10)}_` +
    uniqueSuffix;

  const appTime = Date.now();

  const redirectUrl =
    `${clientBaseUrl}/payment-result/` +
    `${order._id}?provider=zalopay`;

  const embedData = JSON.stringify({
    redirecturl: redirectUrl,
    order_id: String(order._id),
    preferred_payment_method: [],
  });

  const item = JSON.stringify([
    {
      itemid: String(order._id),
      itemname:
        `Order ${getPublicOrderCode(order)}`,
      itemprice: amount,
      itemquantity: 1,
    },
  ]);

  const zaloOrder = {
    app_id: Number(appId),
    app_user: String(
      order.user_id || `guest_${order._id}`
    ).slice(0, 50),
    app_trans_id: appTransId,
    app_time: appTime,
    amount,
    item,
    embed_data: embedData,
    description:
      `Thanh toan don hang ` +
      getPublicOrderCode(order),
    bank_code: "",
  };

  const callbackUrl = String(
    process.env
      .ZALOPAY_CALLBACK_URL || ""
  ).trim();

  if (callbackUrl) {
    zaloOrder.callback_url =
      callbackUrl;
  }

  const hmacInput = [
    zaloOrder.app_id,
    zaloOrder.app_trans_id,
    zaloOrder.app_user,
    zaloOrder.amount,
    zaloOrder.app_time,
    zaloOrder.embed_data,
    zaloOrder.item,
  ].join("|");

  zaloOrder.mac = crypto
    .createHmac("sha256", key1)
    .update(hmacInput)
    .digest("hex");

  const response = await fetch(
    getCreateEndpoint(),
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(zaloOrder),
    }
  );

  const zaloResult =
    await response.json();

  const isSuccess =
    Number(
      zaloResult.return_code
    ) === 1;

  const paymentUrl =
    zaloResult.order_url ||
    zaloResult.orderurl ||
    null;

  const qrUrl =
    zaloResult.qr_code ||
    zaloResult.qr_code_url ||
    null;

  const payment =
    await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "zalopay",
      },
      {
        order_id: order._id,
        provider: "zalopay",
        amount,
        status: isSuccess
          ? "pending"
          : "failed",
        payment_code: appTransId,
        transaction_ref: appTransId,
        provider_order_id: null,
        payment_url: paymentUrl,
        qr_url: qrUrl,
        paid_at: null,
        raw_response: {
          request: {
            ...zaloOrder,
            mac: "[hidden]",
          },
          create_response:
            zaloResult,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

  order.payment_method = "zalopay";

  order.payment_status = isSuccess
    ? "pending"
    : "failed";

  await order.save();

  return {
    success: isSuccess,
    zaloResult,
    order: toSafeOrderObject(order),
    payment,
    payment_url: paymentUrl,
    qr_url: qrUrl,
  };
};

// Callback ZaloPay
const handleZaloPayCallback = async ({
  data,
  mac,
}) => {
  const key2 =
    process.env.ZALOPAY_KEY2;

  if (!key2) {
    throw new Error(
      "Missing ZALOPAY_KEY2"
    );
  }

  if (!data || !mac) {
    throw new Error(
      "data and mac are required"
    );
  }

  const expectedMac = crypto
    .createHmac("sha256", key2)
    .update(data)
    .digest("hex");

  const expectedBuffer =
    Buffer.from(
      expectedMac,
      "utf8"
    );

  const receivedBuffer =
    Buffer.from(
      String(mac),
      "utf8"
    );

  if (
    expectedBuffer.length !==
      receivedBuffer.length ||
    !crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  ) {
    throw new Error("Invalid MAC");
  }

  const callbackData =
    JSON.parse(data);

  const appTransId =
    callbackData.app_trans_id ||
    callbackData.apptransid;

  const configuredAppId = Number(
    process.env.ZALOPAY_APP_ID || 0
  );

  if (
    configuredAppId &&
    Number(
      callbackData.app_id || 0
    ) !== configuredAppId
  ) {
    throw new Error("Invalid app_id");
  }

  const payment =
    await PaymentTransaction.findOne({
      provider: "zalopay",
      transaction_ref: appTransId,
    });

  if (!payment) {
    throw new Error(
      "Payment transaction not found"
    );
  }

  if (
    callbackData.amount !==
      undefined &&
    toSafeAmount(
      callbackData.amount
    ) !==
      toSafeAmount(payment.amount)
  ) {
    throw new Error(
      "Payment amount does not match"
    );
  }

  await markZaloPayAsPaid(
    payment,
    callbackData
  );

  return {
    return_code: 1,
    return_message: "success",
  };
};

// Confirm chuyen khoan thu cong
const confirmBankTransferPayment = async (
  orderId,
  currentUser
) => {
  const order = await Order.findById(orderId)
    .select("+guest_access_token_hash");

  if (!order) {
    throw new Error("Order not found");
  }

  const role = normalizeRole(
    currentUser?.role
  );

  if (
    !PRIVILEGED_ROLES.includes(role)
  ) {
    throw new Error("Access denied");
  }

  if (order.status === "cancelled") {
    throw new Error("Cancelled order cannot be marked as paid");
  }

  const payment =
    await PaymentTransaction.findOneAndUpdate(
      {
        order_id: order._id,
        provider: "bank_transfer",
      },
      {
        $set: {
          status: "paid",
          paid_at: new Date(),
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

  if (!payment) {
    throw new Error(
      "Bank transfer payment transaction not found"
    );
  }

  const updatedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: { $ne: "cancelled" },
    },
    {
      $set: {
        payment_method: "bank_transfer",
        payment_status: "paid",
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  ).select("-guest_access_token_hash -__v");

  if (!updatedOrder) {
    throw new Error("Cancelled order cannot be marked as paid");
  }

  return {
    order: updatedOrder,
    payment,
  };
};

module.exports = {
  getPaymentByOrder,
  createBankTransferPayment,
  createZaloPayPayment,
  queryZaloPayTransaction,
  handleZaloPayCallback,
  confirmBankTransferPayment,
};