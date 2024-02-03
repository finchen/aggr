import express from 'express'
import path from 'node:path'
import { config } from 'dotenv'

config()

const __filename = new URL(import.meta.url).pathname
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.DIST_SERVER_PORT || 8060
console.log(path.join(__dirname, '..', 'dist'));
app.use(express.static('dist'));
app.get('/*', (req, res) => {
  res.sendFile('index.html', { root: './dist' })
})
app.listen(PORT, () => {
  console.log(`aggr dist server started on ${PORT}`)
})
