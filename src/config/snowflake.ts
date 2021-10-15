import FlakeID from 'flake-idgen'

const snowflake = new FlakeID({
  // Raidbot's account creation date.
  epoch: 0,
  datacenter: 0,
  worker: 0
})

const getString = (): string => {
  const flake = snowflake.next()
  return flake.readBigInt64BE().toString()
}

export default {
  next: getString
}
