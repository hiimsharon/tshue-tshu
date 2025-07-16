// publicCrawl.js

import puppeteer from 'puppeteer'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
const dbName = 'tshue_tshu'
const collectionName = 'posts'

export async function crawlPublicPosts() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()

  // ✅ 加入 User-Agent（提升穩定性）
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
  )

  // 👉 目標網址
  const url = process.env.CRAWL_URL || 'https://www.facebook.com/groups/2391145197642950/'
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 })

  // 👉 擷取貼文資料（可自訂邏輯）
  const posts = await page.evaluate(() => {
    const data = []
    document.querySelectorAll('div[data-ad-preview="message"]').forEach(post => {
      const text = post.innerText.trim()
      if (text) data.push({ text, createdAt: new Date().toISOString() })
    })
    return data
  })

  const now = new Date().toLocaleString()
  console.log(`[${now}] ✅ 擷取到 ${posts.length} 筆貼文`)

  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    let insertedCount = 0

    for (const post of posts) {
      const exists = await collection.findOne({ text: post.text })
      if (!exists) {
        await collection.insertOne(post)
        insertedCount++
      }
    }

    console.log(`[${now}] 📥 成功寫入 ${insertedCount} 筆新貼文，略過 ${posts.length - insertedCount} 筆重複貼文`)
  } catch (err) {
    console.error(`[${now}] ❌ MongoDB 寫入失敗：`, err)
  } finally {
    await client.close()
    await browser.close()
  }
}
