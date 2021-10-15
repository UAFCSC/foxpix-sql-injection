import 'source-map-support/register'

import express from 'express'
import cookieParser from 'cookie-parser'

import migrate from './config/migrations'
import router from './routes'
import { join } from 'path'
import { accountMiddleware } from './config/postgres'

const app = express()

app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.set('views', join(__dirname, '../views'))
app.use(accountMiddleware)
app.use('/', router)

;(async () => {
  await migrate()

  const server = app.listen(80)
  process.on('SIGTERM', server.close)
})()
  .catch(console.error)
