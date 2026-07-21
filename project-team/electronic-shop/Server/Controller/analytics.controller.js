const mongoose = require("mongoose");
const Order = require("../models/Orders.model");

const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    
    // Ensure the date is at the start of the day
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const dateFilter = {
      created_at: { $gte: start, $lte: end },
    };

    // 1. Key Metrics
    const metricsPipeline = [
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          grossRevenue: { $sum: "$subtotal" },
          netRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$total_amount", 0],
            },
          },
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $in: ["$status", ["cancelled", "refunded"]] }, 1, 0] },
          },
        },
      },
    ];

    const metricsResult = await Order.aggregate(metricsPipeline);
    const metrics = metricsResult[0] || {
      grossRevenue: 0,
      netRevenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };
    
    metrics.aov = metrics.completedOrders > 0 ? metrics.netRevenue / metrics.completedOrders : 0;
    metrics.cancelRate = metrics.totalOrders > 0 ? (metrics.cancelledOrders / metrics.totalOrders) * 100 : 0;

    // 2. Daily Revenue Trend
    const dailyPipeline = [
      { $match: { ...dateFilter, status: "completed" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          revenue: { $sum: "$total_amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const dailyRevenue = await Order.aggregate(dailyPipeline);

    // 3. Payment Methods
    const paymentPipeline = [
      { $match: { ...dateFilter, status: "completed" } },
      {
        $group: {
          _id: "$payment_method",
          revenue: { $sum: "$total_amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } }
    ];
    const paymentMethods = await Order.aggregate(paymentPipeline);

    // 4. Best Sellers & Category/Brand breakdown
    const itemDetailsPipeline = [
      { $match: { ...dateFilter, status: "completed" } },
      {
        $lookup: {
          from: "order_items",
          localField: "_id",
          foreignField: "order_id",
          as: "items"
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "categories",
          localField: "product.category_id",
          foreignField: "_id",
          as: "category"
        }
      },
      {
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: "brands",
          localField: "product.brand_id",
          foreignField: "_id",
          as: "brand"
        }
      },
      {
        $unwind: { path: "$brand", preserveNullAndEmptyArrays: true }
      }
    ];

    // Best Sellers
    const bestSellers = await Order.aggregate([
      ...itemDetailsPipeline,
      {
        $group: {
          _id: "$items.product_id",
          name: { $first: "$product.name" },
          sku: { $first: "$product.sku" },
          image: { $first: "$product.thumbnail" },
          totalVolume: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Category Revenue
    const categoryRevenue = await Order.aggregate([
      ...itemDetailsPipeline,
      {
        $group: {
          _id: "$category._id",
          name: { $first: { $ifNull: ["$category.name", "Uncategorized"] } },
          revenue: { $sum: "$items.subtotal" },
          volume: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Brand Revenue
    const brandRevenue = await Order.aggregate([
      ...itemDetailsPipeline,
      {
        $group: {
          _id: "$brand._id",
          name: { $first: { $ifNull: ["$brand.name", "No Brand"] } },
          revenue: { $sum: "$items.subtotal" },
          volume: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    // 5. Detailed Table Data
    const detailedData = await Order.aggregate([
      ...itemDetailsPipeline,
      {
        $project: {
          _id: "$items._id",
          order_id: "$_id",
          date: "$created_at",
          product_id: "$product._id",
          product_name: "$product.name",
          category: { $ifNull: ["$category.name", "Uncategorized"] },
          brand: { $ifNull: ["$brand.name", "No Brand"] },
          quantity: "$items.quantity",
          unit_price: "$items.unit_price",
          total_revenue: "$items.subtotal",
          order_status: "$status",
          payment_method: "$payment_method"
        }
      },
      { $sort: { date: -1 } },
      { $limit: 500 } // Limit to 500 recent items to prevent massive payloads
    ]);

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        dailyRevenue,
        paymentMethods,
        bestSellers,
        categoryRevenue,
        brandRevenue,
        detailedData
      }
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  getRevenueAnalytics
};
