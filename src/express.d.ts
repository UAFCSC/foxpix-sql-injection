import { User } from './types'

declare module 'express-serve-static-core' {
  export interface Request {
    cookies: { [key: string]: string }
    user: User|null
  }
}
