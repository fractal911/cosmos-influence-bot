const SQLite = require('better-sqlite3')
const log = require('../util/logger')
const DEFAULT_DB_FILENAME = './database.sqlite'
let sql

const initDatabase = dbFilename => {
	sql = new SQLite(dbFilename || DEFAULT_DB_FILENAME)
	// Addresses table
	let table = sql
		.prepare(
			'SELECT count(*) FROM sqlite_master WHERE type = \'table\' AND name = \'addresses\';',
		)
		.get()
	if (!table['count(*)']) {
		log.info('Creating addresses table')
		sql
			.prepare(
				'CREATE TABLE addresses (address TEXT PRIMARY KEY, discord_id TEXT);',
			)
			.run()
		sql
			.prepare('CREATE UNIQUE INDEX idx_addresses_id ON addresses (address);')
			.run()
		// Set some SQL things
		sql.pragma('synchronous = 1')
		sql.pragma('journal_mode = wal')
	}
	// Event channels table
	table = sql
		.prepare(
			'SELECT count(*) FROM sqlite_master WHERE type = \'table\' AND name = \'channel_events\';',
		)
		.get()
	if (!table['count(*)']) {
		log.info('Creating channel_events table')
		sql
			.prepare(
				'CREATE TABLE channel_events (channel TEXT PRIMARY KEY, Transfer INTEGER, AsteroidScanned INTEGER);',
			)
			.run()
		sql
			.prepare(
				'CREATE UNIQUE INDEX idx_channel_events_id ON channel_events (channel);',
			)
			.run()
		sql
			.prepare(
				'CREATE UNIQUE INDEX idx_channel_events_transfer ON channel_events (Transfer);',
			)
			.run()
		sql
			.prepare(
				'CREATE UNIQUE INDEX idx_channel_events_scanned ON channel_events (AsteroidScanned);',
			)
			.run()
	}
}

// Addresses

const getAddress = discordId => {
	let address = sql
		.prepare('SELECT * FROM addresses WHERE discord_id = ?')
		.get(discordId)
	if (address) {
		return address.address
	}
	return null
}

const getDiscordId = addr => {
	let address = sql
		.prepare('SELECT * FROM addresses WHERE address = ?')
		.get(addr)
	if (address) {
		return address.discord_id
	}
	return null
}

const setAddress = (discordId, address) => {
	sql
		.prepare(
			'INSERT OR REPLACE INTO addresses (address, discord_id) VALUES (@address, @discordId);',
		)
		.run({
			address,
			discordId,
		})
}

// Event channels

const listEventChannels = event =>
	sql.prepare(`SELECT * FROM channel_events WHERE ${event} = 1;`).all()

const getChannelEvents = channel => {
	const events = sql
		.prepare('SELECT * FROM channel_events WHERE channel = ?;')
		.get(channel)
	if (!events) {
		// Initialise
		return {
			channel,
			Transfer: 0,
			AsteroidScanned: 0,
		}
	}
	return events
}

const setChannelEvents = events =>
	sql
		.prepare(
			'INSERT OR REPLACE INTO channel_events (channel, Transfer, AsteroidScanned) VALUES (@channel, @Transfer, @AsteroidScanned);',
		)
		.run(events)

const removeChannelEvents = channel =>
	sql
		.prepare('DELETE FROM channel_events where channel = @channel;')
		.run({ channel })

module.exports = {
	initDatabase,
	// Addresses
	getAddress,
	getDiscordId,
	setAddress,
	// Event Channels
	listEventChannels,
	getChannelEvents,
	setChannelEvents,
	removeChannelEvents,
}
