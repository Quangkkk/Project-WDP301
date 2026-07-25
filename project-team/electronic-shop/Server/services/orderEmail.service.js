const Order = require("../models/Orders.model");
const OrderItem = require("../models/OrderItem.model");
const ShippingMethod = require("../models/ShippingMethod.model");
const sendMail = require("../mailtrap/nodemailer");

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getPaymentStatusLabel = (status) => {
  const labels = {
    unpaid: "Chưa thanh toán",
    pending: "Chờ thanh toán",
    paid: "Đã thanh toán",
    failed: "Thanh toán thất bại",
    refunded: "Đã hoàn tiền",
  };

  return labels[status] || status || "Không xác định";
};

const getOrderStatusLabel = (status) => {
  const labels = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
  };

  return labels[status] || status || "Không xác định";
};

const getPaymentMethodLabel = (method) => {
  const labels = {
    cod: "Thanh toán khi nhận hàng (COD)",
    bank_transfer: "Chuyển khoản ngân hàng",
    zalopay: "ZaloPay",
  };

  return labels[method] || method || "Không xác định";
};

const getProductName = (item) =>
  item.product_id?.name ||
  item.product_name ||
  "Sản phẩm";

const getVariantName = (item) =>
  item.variant_id?.variant_value ||
  item.variant_id?.sku ||
  "-";

const buildAddress = (order) =>
  [
    order.address_address_line,
    order.address_ward,
    order.address_district,
    order.address_province,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(", ");

const normalizeShippingMethodName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isStorePickupShippingMethod = (method) => {
  const fulfillmentType = String(
    method?.fulfillment_type || method?.type || method?.code || ""
  )
    .toLowerCase()
    .trim();

  if (["store_pickup", "pickup", "pick_up"].includes(fulfillmentType)) {
    return true;
  }

  const normalizedName = normalizeShippingMethodName(method?.name);

  return (
    normalizedName.includes("nhan tai cua hang") ||
    normalizedName.includes("nhan hang tai cua hang") ||
    normalizedName.includes("store pickup")
  );
};

const sendOrderCreatedEmail = async ({
  order,
  shippingFee,
  discountAmount,
}) => {
  if (!order?._id) {
    throw new Error(
      "Thiếu thông tin đơn hàng để gửi email."
    );
  }

  const receiverEmail = String(
    order.receiver_email || ""
  )
    .trim()
    .toLowerCase();

  if (!receiverEmail) {
    console.warn(
      "[orderEmail] Đơn hàng không có email:",
      order._id
    );

    return;
  }

  /*
   * Lấy lại OrderItem và populate để email có:
   * - tên sản phẩm
   * - phiên bản
   * - giá
   * - số lượng
   */
  const items = await OrderItem.find({
    order_id: order._id,
  })
    .populate(
      "product_id",
      "name sku"
    )
    .populate(
      "variant_id",
      "variant_value sku image"
    )
    .lean();

  const productRows = items
    .map((item) => {
      const quantity = Math.max(
        Number(item.quantity || 0),
        0
      );

      const unitPrice = Number(
        item.unit_price || 0
      );

      const lineTotal = Number(
        item.subtotal ??
          unitPrice * quantity
      );

      return `
        <tr>
          <td
            style="
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
            "
          >
            <div
              style="
                font-weight: 700;
                color: #111827;
              "
            >
              ${escapeHtml(
                getProductName(item)
              )}
            </div>

            <div
              style="
                margin-top: 4px;
                color: #6b7280;
                font-size: 12px;
              "
            >
              Phiên bản:
              ${escapeHtml(
                getVariantName(item)
              )}
            </div>
          </td>

          <td
            style="
              padding: 12px;
              text-align: center;
              border-bottom: 1px solid #e5e7eb;
            "
          >
            ${quantity}
          </td>

          <td
            style="
              padding: 12px;
              text-align: right;
              white-space: nowrap;
              border-bottom: 1px solid #e5e7eb;
            "
          >
            ${formatMoney(unitPrice)}
          </td>

          <td
            style="
              padding: 12px;
              text-align: right;
              white-space: nowrap;
              font-weight: 700;
              border-bottom: 1px solid #e5e7eb;
            "
          >
            ${formatMoney(lineTotal)}
          </td>
        </tr>
      `;
    })
    .join("");

  const orderCode =
    order.order_code ||
    `TS-${String(order._id)
      .slice(-8)
      .toUpperCase()}`;

  const subtotal = Number(
    order.subtotal || 0
  );

  const totalAmount = Number(
    order.total_amount || 0
  );

  const shippingMethod = order.shipping_method_id
    ? await ShippingMethod.findById(order.shipping_method_id)
        .select("name base_fee fulfillment_type type code")
        .lean()
    : null;

  const isStorePickup = isStorePickupShippingMethod(shippingMethod);

  let resolvedShippingFee =
    shippingFee === undefined || shippingFee === null
      ? order.shipping_fee === undefined || order.shipping_fee === null
        ? null
        : Number(order.shipping_fee || 0)
      : Number(shippingFee || 0);

  if (resolvedShippingFee === null) {
    resolvedShippingFee = Number(
      shippingMethod?.base_fee || 0
    );
  }

  const resolvedDiscountAmount =
    discountAmount === undefined || discountAmount === null
      ? order.discount_amount === undefined ||
        order.discount_amount === null
        ? Math.max(
            subtotal + resolvedShippingFee - totalAmount,
            0
          )
        : Math.max(Number(order.discount_amount || 0), 0)
      : Math.max(Number(discountAmount || 0), 0);

  const isOnlinePaymentConfirmed =
    ["bank_transfer", "zalopay"].includes(
      order.payment_method
    ) && order.payment_status === "paid";

  const emailTitle = isOnlinePaymentConfirmed
    ? "Thanh toán thành công"
    : "Đặt hàng thành công";

  const emailDescription = isOnlinePaymentConfirmed
    ? "TechSale đã ghi nhận thanh toán cho đơn hàng của bạn."
    : "TechSale đã nhận được đơn hàng của bạn.";

  await sendMail({
    email: receiverEmail,

    subject:
      `${emailTitle} - ${orderCode}`,

    html: `
      <div
        style="
          margin: 0 auto;
          max-width: 760px;
          padding: 24px;
          background: #f8fafc;
          color: #1f2937;
          font-family: Arial, sans-serif;
        "
      >
        <div
          style="
            overflow: hidden;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
          "
        >
          <div
            style="
              padding: 24px;
              text-align: center;
              color: white;
              background: #f97316;
            "
          >
            <h1
              style="
                margin: 0;
                font-size: 26px;
              "
            >
              ${emailTitle}
            </h1>

            <p
              style="
                margin: 8px 0 0;
              "
            >
              ${emailDescription}
            </p>
          </div>

          <div style="padding: 24px;">
            <p style="margin-top: 0;">
              Xin chào
              <strong>
                ${escapeHtml(
                  order.receiver_name ||
                    "bạn"
                )}
              </strong>,
            </p>

            <p>
              Cảm ơn bạn đã đặt hàng.
              Mã đơn hàng của bạn là:

              <strong
                style="
                  color: #ea580c;
                "
              >
                ${escapeHtml(orderCode)}
              </strong>
            </p>

            <div
              style="
                margin: 20px 0;
                padding: 16px;
                border-radius: 12px;
                background: #fff7ed;
              "
            >
              <div style="margin-bottom: 8px;">
                <strong>Trạng thái đơn:</strong>

                ${escapeHtml(
                  getOrderStatusLabel(
                    order.status
                  )
                )}
              </div>

              <div style="margin-bottom: 8px;">
                <strong>
                  Phương thức thanh toán:
                </strong>

                ${escapeHtml(
                  getPaymentMethodLabel(
                    order.payment_method
                  )
                )}
              </div>

              <div>
                <strong>
                  Trạng thái thanh toán:
                </strong>

                ${escapeHtml(
                  getPaymentStatusLabel(
                    order.payment_status
                  )
                )}
              </div>
            </div>

            <h2
              style="
                margin: 24px 0 12px;
                font-size: 18px;
              "
            >
              Sản phẩm đã đặt
            </h2>

            <div style="overflow-x: auto;">
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                  border: 1px solid #e5e7eb;
                "
              >
                <thead>
                  <tr
                    style="
                      background: #f1f5f9;
                    "
                  >
                    <th
                      style="
                        padding: 12px;
                        text-align: left;
                      "
                    >
                      Sản phẩm
                    </th>

                    <th
                      style="
                        padding: 12px;
                        text-align: center;
                      "
                    >
                      SL
                    </th>

                    <th
                      style="
                        padding: 12px;
                        text-align: right;
                      "
                    >
                      Đơn giá
                    </th>

                    <th
                      style="
                        padding: 12px;
                        text-align: right;
                      "
                    >
                      Thành tiền
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${
                    productRows ||
                    `
                      <tr>
                        <td
                          colspan="4"
                          style="
                            padding: 16px;
                            text-align: center;
                            color: #6b7280;
                          "
                        >
                          Không có dữ liệu sản phẩm.
                        </td>
                      </tr>
                    `
                  }
                </tbody>
              </table>
            </div>

            <div
              style="
                margin-top: 20px;
                margin-left: auto;
                max-width: 360px;
              "
            >
              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                "
              >
                <tr>
                  <td style="padding: 7px 0;">
                    Tạm tính
                  </td>

                  <td
                    style="
                      padding: 7px 0;
                      text-align: right;
                      font-weight: 700;
                    "
                  >
                    ${formatMoney(subtotal)}
                  </td>
                </tr>

                <tr>
                  <td style="padding: 7px 0;">
                    Phí giao hàng
                  </td>

                  <td
                    style="
                      padding: 7px 0;
                      text-align: right;
                      font-weight: 700;
                    "
                  >
                    ${formatMoney(resolvedShippingFee)}
                  </td>
                </tr>

                <tr style="color: #16a34a;">
                  <td style="padding: 7px 0;">
                    Giảm giá
                  </td>

                  <td
                    style="
                      padding: 7px 0;
                      text-align: right;
                      font-weight: 700;
                    "
                  >
                    -${formatMoney(
                      resolvedDiscountAmount
                    )}
                  </td>
                </tr>

                <tr
                  style="
                    color: #ea580c;
                    font-size: 18px;
                  "
                >
                  <td
                    style="
                      padding-top: 14px;
                      border-top: 1px solid #e5e7eb;
                    "
                  >
                    <strong>
                      Tổng thanh toán
                    </strong>
                  </td>

                  <td
                    style="
                      padding-top: 14px;
                      text-align: right;
                      border-top: 1px solid #e5e7eb;
                    "
                  >
                    <strong>
                      ${formatMoney(
                        totalAmount
                      )}
                    </strong>
                  </td>
                </tr>
              </table>
            </div>

            <div
              style="
                margin-top: 24px;
                padding: 16px;
                border-radius: 12px;
                background: #f8fafc;
              "
            >
              ${
                isStorePickup
                  ? `
                    <div>
                      <strong>Hình thức nhận hàng:</strong>
                      Nhận tại cửa hàng
                    </div>
                  `
                  : `
                    <div style="margin-bottom: 6px;">
                      <strong>Người nhận:</strong>
                      ${escapeHtml(order.receiver_name || "-")}
                    </div>

                    <div style="margin-bottom: 6px;">
                      <strong>Số điện thoại:</strong>
                      ${escapeHtml(order.receiver_phone || "-")}
                    </div>

                    <div>
                      <strong>Địa chỉ:</strong>
                      ${buildAddress(order) || "-"}
                    </div>
                  `
              }
            </div>

            <p
              style="
                margin: 24px 0 0;
                color: #64748b;
                font-size: 13px;
                line-height: 1.6;
              "
            >
              ${
                isOnlinePaymentConfirmed
                  ? "Khoản thanh toán online đã được xác nhận thành công."
                  : "Bạn sẽ thanh toán khi nhận hàng. Nhân viên sẽ sớm xử lý đơn hàng."
              }
            </p>
          </div>
        </div>
      </div>
    `,
  });
};

const sendOrderConfirmationEmailOnce = async (
  orderId,
  {
    requirePaid = false,
    shippingFee,
    discountAmount,
  } = {}
) => {
  const filter = {
    _id: orderId,
    confirmation_email_sent_at: null,
    confirmation_email_sending: { $ne: true },
  };

  if (requirePaid) {
    filter.payment_status = "paid";
  }

  const order = await Order.findOneAndUpdate(
    filter,
    {
      $set: {
        confirmation_email_sending: true,
      },
    },
    {
      new: true,
    }
  ).select(
    "+confirmation_email_sending +confirmation_email_sent_at"
  );

  if (!order) {
    return false;
  }

  try {
    await sendOrderCreatedEmail({
      order,
      shippingFee,
      discountAmount,
    });

    await Order.updateOne(
      {
        _id: order._id,
        confirmation_email_sending: true,
      },
      {
        $set: {
          confirmation_email_sent_at: new Date(),
        },
        $unset: {
          confirmation_email_sending: "",
        },
      }
    );

    return true;
  } catch (error) {
    await Order.updateOne(
      {
        _id: order._id,
        confirmation_email_sent_at: null,
      },
      {
        $unset: {
          confirmation_email_sending: "",
        },
      }
    );

    throw error;
  }
};

module.exports = {
  sendOrderCreatedEmail,
  sendOrderConfirmationEmailOnce,
};