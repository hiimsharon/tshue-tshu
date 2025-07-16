import puppeteer from 'puppeteer'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
dotenv.config()

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
const dbName = 'tshue_tshu'
const collectionName = 'posts'

// 🔍 NLP 簡易欄位擷取
function extractFields(text) {
  const floorMatch = text.match(/([0-9一二三四五六七八九十]+)[樓層]/)
  const rentMatch = text.match(/[$|租金[:：]?\s]*([1-9]\d{3,5})\s*[元\/月]?/)
  const locationMatch = text.match(/([\u4e00-\u9fa5]{2,5}區)/)
  return {
    floor: floorMatch ? floorMatch[1] : null,
    rent: rentMatch ? parseInt(rentMatch[1]) : null,
    location: locationMatch ? locationMatch[1] : null
  }
}

export async function crawlPublicPosts() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0'
  )

  const url = process.env.CRAWL_URL || 'https://www.facebook.com/groups/2391145197642950/'
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 })

  const posts = await page.evaluate(() => {
    const results = []
    const postElements = document.querySelectorAll('div[role=article]')
    postElements.forEach(postEl => {
      const textEl = postEl.querySelector('div[data-ad-preview="message"]')
      const imgEl = postEl.querySelector('img')
      const aEl = postEl.querySelector('a[href*="/posts/"]')

      const text = textEl?.innerText?.trim() || ''
      const image = imgEl?.src || null
      const url = aEl ? 'https://www.facebook.com' + aEl.getAttribute('href') : null

      if (text) {
        results.push({
          text,
          image,
          url,
          createdAt: new Date().toISOString()
        })
      }
    })
    return results
  })

  const now = new Date().toLocaleString()
  console.log(`[${now}] ✅ 擷取 ${posts.length} 筆貼文，準備寫入`)

  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    let inserted = 0

    for (const post of posts) {
      const exists = await collection.findOne({ text: post.text })
      if (exists) continue

      const { floor, rent, location } = extractFields(post.text)

      await collection.insertOne({
        ...post,
        floor,
        rent,
        location
      })

      inserted++
    }

    console.log(`[${now}] 📥 寫入成功 ${inserted} 筆，略過 ${posts.length - inserted} 筆重複資料`)
  } catch (err) {
    console.error(`[${now}] ❌ MongoDB 錯誤：`, err)
  } finally {
    await client.close()
    await browser.close()
  }
}
