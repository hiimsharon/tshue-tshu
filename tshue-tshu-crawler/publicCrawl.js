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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()

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

  console.log('✅ 抓到貼文數量:', posts.length)

  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    if (posts.length > 0) {
      await collection.insertMany(posts)
      console.log('📥 成功寫入 MongoDB')
    } else {
      console.log('⚠️ 沒有找到貼文，略過寫入')
    }
  } catch (err) {
    console.error('❌ MongoDB 寫入失敗：', err)
  } finally {
    await client.close()
    await browser.close()
  }
}
