import { NextFunction, Request, Response } from 'express'
import { Pool } from 'pg'
import { Fox, User } from '../types'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URI
})

export const getUser = async (id: string): Promise<User|null> => {
  const client = await pool.connect()
  try {
    let session = await client.query<User>(`SELECT * FROM users WHERE id = '${id}'`)
    if (Array.isArray(session)) {
      session = session[session.length - 1]
    }
    if (session.rows.length === 0) {
      return null
    }
    return session.rows[0]
  } catch (err) {
    return null
  } finally {
    client.release()
  }
}

export const getUserByUsername = async (username: string): Promise<User|null> => {
  const client = await pool.connect()
  try {
    let session = await client.query<User>(`SELECT * FROM users WHERE username = '${username}'`)
    if (Array.isArray(session)) {
      session = session[session.length - 1]
    }
    if (session.rows.length === 0) {
      return null
    }
    return session.rows[0]
  } catch (err) {
    return null
  } finally {
    client.release()
  }
}

export const getFox = async (id: string): Promise<Fox|null> => {
  const client = await pool.connect()
  try {
    let session = await client.query<Fox>(`SELECT * FROM foxes WHERE id = '${id}'`)
    if (Array.isArray(session)) {
      session = session[session.length - 1]
    }
    if (session.rows.length === 0) {
      return null
    }
    return session.rows[0]
  } catch (err) {
    return null
  } finally {
    client.release()
  }
}

export const getFoxes = async (search = ''): Promise<Fox[]> => {
  const client = await pool.connect()
  try {
    let session = await client.query<Fox>(`SELECT * FROM foxes WHERE description LIKE '%${search}%'`)
    if (Array.isArray(session)) {
      session = session[session.length - 1]
    }
    return session.rows
  } catch (err) {
    console.log(search)
    console.log(err)
    return []
  } finally {
    client.release()
  }
}

export const isAuthenticated = async (req: Request): Promise<User|null> => {
  if (req.cookies.session === undefined) {
    return null
  }
  return await getUser(req.cookies.session)
}

export const accountMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  req.user = await isAuthenticated(req)
  next()
}

export default pool
