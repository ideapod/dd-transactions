import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGO_URI || "";
console.log("About to connect with: " && uri);
const client = new MongoClient(uri);

try {
  // Connect the client to the server
  await client.connect();
  // Send a ping to confirm a successful connection
  console.log("Checking DocumentDB connection");
  // not supported by Amazon DocDB: await client.db("admin").command({ ping: 1 });
  const hostInfo = await client.db("admin").command({ hostInfo: 1 });
  console.log(
   "Successfully connected to hostname: " + hostInfo.system.hostname
  );
} catch(err) {
  console.error(err);
}

let db = client.db("employees");

export default db;