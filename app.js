const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, `cricketMatchDetails.db`)

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertCamalCame = eachPlayer => {
  return {
    playerId: eachPlayer.player_id,
    playerName: eachPlayer.player_name,
  }
}

app.get('/players/', async (request, response) => {
  const getAllPlayersQuery = `
        SELECT *
        FROM player_details;`
  const getPlayesDetails = await database.all(getAllPlayersQuery)
  response.send(
    getPlayesDetails.map(eachPlayer => convertCamalCame(eachPlayer)),
  )
})

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const getPlayerQuery = `
    SELECT *
    FROM player_details
    WHERE player_id = ${playerId};`
  const getPlayer = await database.get(getPlayerQuery)

  const convertCamelCase = playerObject => {
    return {
      playerId: playerObject.player_id,
      playerName: playerObject.player_name,
    }
  }
  response.send(convertCamelCase(getPlayer))
})

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const {playerName} = request.body
  const updatePlayerName = `
    UPDATE 
      player_details
    SET 
      player_name = '${playerName}'
    WHERE player_id = ${playerId};`
  await database.run(updatePlayerName)
  response.send('Player Details Updated')
})

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params
  const getMatchQuery = `
    SELECT *
    FROM match_details
    WHERE match_id = ${matchId};`
  const getMatchDetails = await database.get(getMatchQuery)

  const ConvetCamelCase = matchObject => {
    return {
      matchId: matchObject.match_id,
      match: matchObject.match,
      year: matchObject.year,
    }
  }
  response.send(ConvetCamelCase(getMatchDetails))
})

const convertDbObjectToResponseObject = dbObject => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  }
}

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  const getMatchQuery = `
    SELECT
      *
    FROM
      player_match_score NATURAL JOIN match_details
    WHERE player_id = ${playerId};`
  const matchArray = await database.all(getMatchQuery)
  response.send(
    matchArray.map(eachMatch => convertDbObjectToResponseObject(eachMatch)),
  )
})

const returningObjects = dbobjects => {
  return {
    playerId: dbobjects.playerId,
    playerName: dbobjects.playerName,
  }
}

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  const getMatchPlayersQuery = `
	    SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`
  const allPlayers = await database.all(getMatchPlayersQuery)
  response.send(allPlayers.map(eachPlayer => returningObjects(eachPlayer)))
})

const getTotalStatistic = dbObject => {
  return {
    playerId: dbObject.playerId,
    playerName: dbObject.playerName,
    totalScore: dbObject.totalScore,
    totalFours: dbObject.totalFours,
    totalSixes: dbObject.totalSixes,
  }
}

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  const getPlayerScored = `
    SELECT
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(player_match_score.score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes FROM 
      player_details INNER JOIN player_match_score ON
      player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};`
  const getStatistic = await database.get(getPlayerScored)
  response.send(getTotalStatistic(getStatistic))
})

module.exports = app
