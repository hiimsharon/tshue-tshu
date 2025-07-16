require("dotenv").config();
const puppeteer = require("puppeteer");
const { MongoClient } = require("mongodb");

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto("https://www.facebook.com/groups/2391145197642950", { waitUntil: "networkidle2" });

  const content = await page.evaluate(() => {
    const posts = [];
    document.querySelectorAll("div[role=article]").forEach(el => {
      posts.push(el.innerText);
    });
    return posts;
  });

  await browser.close();

  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("tshue_tshu");
  const collection = db.collection("posts");

  const insertResult = await collection.insertMany(content.map(text => ({ text, createdAt: new Date() })));
  console.log("Inserted documents:", insertResult.insertedCount);

  await client.close();
})();
