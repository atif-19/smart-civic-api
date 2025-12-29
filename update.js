const { MongoClient } = require("mongodb");

async function run() {
  const uri = "mongodb+srv://atifmalik7620:07062006atiF@cluster0.buht1iu.mongodb.net/smart-civic-db?retryWrites=true&w=majority"; // change to your Mongo URI
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("yourDatabaseName");
    const users = db.collection("users");

    const result = await users.updateMany(
      { "name": { $exists: false } },
      { $set: { name: "anonymous" } }
    );

    console.log(`${result.modifiedCount} documents updated`);
  } finally {
    await client.close();
  }
}

run().catch(console.error);
