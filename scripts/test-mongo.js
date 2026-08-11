const mongoose = require("mongoose");
const uri = "mongodb+srv://poddarchandni5_db_user:svOgKULo3Ya6UMgw@cluster0.djnac60.mongodb.net/";

async function testConnection() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB successfully!");
    
    // Optionally check if we can list collections or insert a test doc
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
}

testConnection();
