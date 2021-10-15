import { Router } from 'express'
import pool, { getFox, getFoxes, getUserByUsername } from '../config/postgres'
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
  const userExists = await getUserByUsername(req.body.username)
  if (userExists !== null) {
    res.render('create-account', { req, flash: 'User already exists' })
    return
  }
  const id = snowflake.next()
  const client = await pool.connect()
  try {
    await client.query(`INSERT INTO users VALUES (${id}, '${username}', '${password}', false)`)
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
        res.redirect(`/foxes?fox=${actionId}`)
      } catch (err) {
        res.status(500)
        res.render('admin', { req, flash: 'Unknown database error!' })
      } finally {
        client.release()
      }
    } else {
      const id = snowflake.next()
      const client = await pool.connect()
      try {
        await client.query(`INSERT INTO foxes VALUES (${id}, '${url}', '${description}', 0)`)
        res.redirect(`/foxes?fox=${id}`)
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
  const fox = await getFox(req.query.id as string)
  if (fox === undefined) {
    res.status(404)
  }
  res.render('fox', { req, fox })
})

router.post('/foxes', async (req, res) => {
  const { actionId } = req.body as { [key: string]: string }
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
  const foxes = await getFoxes(req.body.query)
  res.render('search', { req, foxes, query })
})

export default router
