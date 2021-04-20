require('dotenv').config()
const log = require('./util/logger')
const Discord = require('discord.js')
const ethers = require('ethers')
const { initDatabase } = require('./db/database')
const asteroids = require('./commands/asteroids')
const help = require('./commands/help')
const verify = require('./commands/verify')
const userInfo = require('./commands/userInfo')
const { initEvents } = require('./events/events')

// Get token
const TOKEN = process.env.DISCORD_TOKEN
if (!TOKEN) {
	for (let i = 0; i < 5; i++) {
		log.error('NO DISCORD TOKEN!!!')
	}
	process.exit(1)
}

// Intialise database
initDatabase()

// Prepare env vars
const PREFIX = process.env.PREFIX || '#'
log.info(`Prefix is ${PREFIX}`)
const TEST_USER = process.env.TEST_USER || null
if (TEST_USER) {
	log.warn(`Running with access only for ${TEST_USER}`)
}
const {
	VERIFICATION_LINK,
	INFURA_PROJECT_ID,
	INFURA_PROJECT_SECRET,
} = process.env
if (!VERIFICATION_LINK) {
	log.error(
		'Running without verification link. Users will not be able to verify their address',
	)
}
if (!INFURA_PROJECT_ID || !INFURA_PROJECT_SECRET) {
	log.error(
		'Running without Infura API details. You will not be able to do anything on chain',
	)
}

// Spin up bot
const bot = new Discord.Client()
const provider = new ethers.providers.InfuraProvider(
	'homestead',
	INFURA_PROJECT_ID,
)
provider.ready.then(() => {
	log.info('Infura provider is ready')
})
bot.on('ready', () => {
	log.info('Discord login successful!')
	// Initialise commands
	help.initHelp(bot, PREFIX)
	verify.initVerify(VERIFICATION_LINK)
	userInfo.initUserInfo(bot)
	asteroids.initAsteroids(bot, provider)
	initEvents(bot, provider)
	log.info('Commands initialised')
})

bot.on('message', message => {
	// Ignore bots
	if (message.author.bot) {
		return
	}

	// Slide into those DMs
	if (!message.guild) {
		if (verify.isPending(message)) {
			// Complete verification
			return verify.completeVerification(message, [message.content])
		}
	}

	// Check for bot command
	if (message.content.indexOf(PREFIX) !== 0) {
		return
	}

	// Get args for handling bot command
	const args = message.content.slice(PREFIX.length).trim().split(/ +/g)
	const command = args.shift().toLowerCase()

	// Ignore if running in test user mode and isn't test user
	if (TEST_USER && message.author.username !== TEST_USER) {
		return
	}

	if (command === 'help') {
		return help.showHelp(message, args)
	}
	if (command === 'about') {
		// Alias for 'help about'
		return help.showHelp(message, ['about'])
	}
	if (command === 'ping') {
		log.info('ping')
		return message.reply('pong')
	}
	// Verification commands
	if (command === 'verify') {
		return verify.prepareVerification(message, args)
	}
	// User Info commands
	if (command === 'address') {
		return userInfo.showAddress(message, args)
	}
	if (command === 'user') {
		return userInfo.showUser(message, args)
	}
	// Asteroid commands
	if (command === 'asteroid' || command === 'roid') {
		return asteroids.showAsteroidDetails(message, args)
	}
	if (command === 'owned') {
		return asteroids.showUserAsteroids(message, args)
	}
})

bot.login(TOKEN)
