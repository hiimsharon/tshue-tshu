
// server.js

import express from 'express'
import { crawlPublicPosts } from './tshue-tshu-crawler/publicCrawl.js'
import cron from 'node-cron'

const app = express()
const PORT = process.env.PORT || 3000

// ✅ 測試用 API
app.get('/', (req, res) => {
  res.send('🟢 TshuéTshù crawler web service running!')
})

// ✅ 每日早上 5 點自動執行爬蟲
cron.schedule('0 5 * * *', async () => {
  console.log('⏰ 正在執行爬蟲...')
  await crawlPublicPosts()
})

// ✅ 啟動 Web Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})
