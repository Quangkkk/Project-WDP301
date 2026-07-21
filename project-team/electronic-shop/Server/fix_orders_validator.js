/**
 * Script to remove MongoDB collection-level JSON Schema validator
 * that requires receiver_email on the orders collection.
 * Run with: node fix_orders_validator.js
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = "mongodb://127.0.0.1:27017/WDP301";

async function fixOrdersValidator() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("WDP301");

    // List current collections to verify orders exists
    const collections = await db.listCollections({ name: "orders" }).toArray();
    console.log("Orders collection info:", JSON.stringify(collections, null, 2));

    // Remove the collection-level validator by running collMod with empty validator
    const result = await db.command({
      collMod: "orders",
      validator: {},
      validationLevel: "off",
    });

    console.log("collMod result:", result);
    console.log(
      "✅ Successfully removed collection-level validator from orders collection"
    );
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

fixOrdersValidator();
