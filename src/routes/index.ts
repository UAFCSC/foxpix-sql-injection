import { Router } from 'express'
import pool, { getFox, getFoxes, getUserByUsername, isUnsafe } from '../config/postgres'
import snowflake from '../config/snowflake'

const router = Router()

router.get('/', async (req, res) => {
  const foxes = await getFoxes()
  res.render('index', { req, foxes })
})

router.get('/login', (req, res) => {
  res.render('login', { req })
})

router.post('/login', async (req, res) => {
  if (isUnsafe(req.body.username, req.body.password)) {
    res.status(400)
    return res.render('db-blocked', { req })
  }

  const user = await getUserByUsername(req.body.username)
  if (user === null) {
    res.redirect('/login-failed')
    return
  }
  if (req.body.password === user.password) {
    res.cookie('session', user.id)
    res.redirect('/')
  } else {
    res.redirect('/login-failed')
  }
})

router.get('/login-failed', (req, res) => {
  res.render('login-failed', { req })
})

router.get('/create-account', (req, res) => {
  res.render('create-account', { req })
})

router.post('/create-account', async (req, res) => {
  const { username, password } = req.body as { [key: string]: string }
  if (isUnsafe(username, password)) {
    res.status(400)
    return res.render('db-blocked', { req })
  }

  const userExists = await getUserByUsername(req.body.username)
  if (userExists !== null) {
    res.render('create-account', { req, flash: 'User already exists' })
    return
  }
  const client = await pool.connect()
  try {
    const id = snowflake.next()
    await client.query(`INSERT INTO users (id, username, password, admin) VALUES (${id}, '${username}', '${password}', false)`)
    res.cookie('session', id)
    res.redirect('/')
  } catch (err) {
    res.status(500)
    res.render('create-account', { req, flash: 'Unknown database error!' })
  } finally {
    client.release()
  }
})

router.get('/logout', (req, res) => {
  req.user = null
  res.clearCookie('session')
  res.render('logout', { req })
})

router.get('/admin', (req, res) => {
  if (req.user?.admin === true) {
    res.render('admin', { req })
    return
  } else if (req.user === null) {
    res.status(401)
  } else {
    res.status(403)
  }
  res.render('permission-denied')
})

router.post('/admin', async (req, res) => {
  const { action, actionId, description, url } = req.body as { [key: string]: string }
  if (req.user?.admin === true) {
    if (action === 'delete') {
      const client = await pool.connect()
      try {
        await client.query(`DELETE FROM foxes WHERE id = ${actionId}`)
        res.render('admin', { req, flash: 'Fox deleted' })
      } catch (err) {
        res.status(500)
        res.render('admin', { req, flash: 'Unknown database error!' })
      } finally {
        client.release()
      }
    } else if (action === 'view-edit') {
      const fox = await getFox(actionId)
      res.render('admin', { req, fox })
    } else if (action === 'edit') {
      const client = await pool.connect()
      try {
        await client.query(`UPDATE foxes SET url = '${url}', description = '${description}' WHERE id = ${actionId}`)
        res.redirect(`/foxes?id=${actionId}`)
      } catch (err) {
        res.status(500)
        res.render('admin', { req, flash: 'Unknown database error!' })
      } finally {
        client.release()
      }
    } else {
      const client = await pool.connect()
      try {
        const inserted = await client.query(`INSERT INTO foxes (url, description, likes) VALUES ('${url}', '${description}', 0) RETURNING id`)
        res.redirect(`/foxes?id=${inserted.rows[0].id as number}`)
      } catch (err) {
        res.status(500)
        res.render('admin', { req, flash: 'Unknown database error!' })
      } finally {
        client.release()
      }
    }
    return
  } else if (req.user === null) {
    res.status(401)
  } else {
    res.status(403)
  }
  res.render('permission-denied')
})

router.get('/foxes', async (req, res) => {
  if (isUnsafe(req.query.id as string)) {
    res.status(400)
    return res.render('db-blocked', { req })
  }

  const fox = await getFox(req.query.id as string)

  if (fox === undefined) {
    res.status(404)
  }
  res.render('fox', { req, fox })
})

router.post('/foxes', async (req, res) => {
  const { actionId } = req.body as { [key: string]: string }

  if (isUnsafe(actionId)) {
    res.status(400)
    return res.render('db-blocked', { req })
  }

  const client = await pool.connect()
  try {
    await client.query(`UPDATE foxes SET likes = likes + 1 WHERE id = ${actionId}`)
    const fox = await getFox(actionId)
    res.render('fox', { req, fox, flash: 'Fox liked!' })
  } catch (err) {
    const fox = await getFox(actionId)
    res.status(500)
    res.render('fox', { req, fox, flash: 'Unknown database error!' })
  } finally {
    client.release()
  }
})

router.post('/search', async (req, res) => {
  const { query } = req.body

  if (isUnsafe(query)) {
    res.status(400)
    return res.render('db-blocked', { req })
  }

  const foxes = await getFoxes(req.body.query)
  res.render('search', { req, foxes, query })
})

export default router
