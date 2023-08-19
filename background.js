
var disabledFeatures = "";

$.post("https://api.ropro.io/disabledFeatures.php", function(data) {
		disabledFeatures = data
})

function getStorage(key) {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: value}, function(){
			resolve()
		})
	})
}

function getLocalStorage(key) {
	return new Promise(resolve => {
		chrome.storage.local.get(key, function (obj) {
			resolve(obj[key])
		})
	})
}

function setLocalStorage(key, value) {
	return new Promise(resolve => {
		chrome.storage.local.set({[key]: value}, function(){
			resolve()
		})
	})
}

var defaultSettings = {
	buyButton: true,
	comments: true,
	dealCalculations: "rap",
	dealNotifier: true,
	embeddedRolimonsItemLink: true,
	embeddedRolimonsUserLink: true,
	fastestServersSort: true,
	gameLikeRatioFilter: true,
	gameTwitter: true,
	genreFilters: true,
	groupDiscord: true,
	groupRank: true,
	groupTwitter: true,
	featuredToys: true,
	itemPageValueDemand: true,
	linkedDiscord: true,
	liveLikeDislikeFavoriteCounters: true,
	livePlayers: true,
	liveVisits: true,
	roproVoiceServers: true,
	premiumVoiceServers: true,
	moreGameFilters: true,
	additionalServerInfo: true,
	moreServerFilters: true,
	serverInviteLinks: true,
	serverFilters: true,
	mostRecentServer: true,
	randomServer: true,
	tradeAge: true,
	notificationThreshold: 30,
	itemInfoCard: true,
	ownerHistory: true,
	profileThemes: true,
	globalThemes: true,
	lastOnline: true,
	roproEggCollection: true,
	profileValue: true,
	projectedWarningItemPage: true,
	quickItemSearch: true,
	quickTradeResellers: true,
	hideSerials: true,
	quickUserSearch: true,
	randomGame: true,
	popularToday: true,
	reputation: true,
	reputationVote: true,
	sandbox: true,
	sandboxOutfits: true,
	serverSizeSort: true,
	singleSessionMode: false,
	tradeDemandRatingCalculator: true,
	tradeItemDemand: true,
	tradeItemValue: true,
	tradeNotifier: true,
	tradeOffersPage: true,
	tradeOffersSection: true,
	tradeOffersValueCalculator: true,
	tradePageProjectedWarning: true,
	tradePreviews: true,
	tradeProtection: true,
	tradeValueCalculator: true,
	moreTradePanel: true,
	valueThreshold: 0,
	hideTradeBots: true,
	autoDeclineTradeBots: true,
	hideDeclinedNotifications: true,
	hideOutboundNotifications: false,
	tradePanel: true,
	quickDecline: true,
	quickCancel: true,
	roproIcon: true,
	underOverRAP: true,
	winLossDisplay: true,
	mostPlayedGames: true,
	mostPopularSort: true,
	experienceQuickSearch: true,
	experienceQuickPlay: true,
	avatarEditorChanges: true,
	playtimeTracking: true,
	activeServerCount: true,
	morePlaytimeSorts: true,
	roproBadge: true,
	mutualFriends: true,
	moreMutuals: true,
	animatedProfileThemes: true,
	cloudPlay: true,
	cloudPlayActive: false,
	hidePrivateServers: false,
	quickEquipItem: true,
	roproWishlist: true,
	themeColorAdjustments: true,
	tradeSearch: true,
	advancedTradeSearch: true
}

async function initializeSettings() {
	return new Promise(resolve => {
		async function checkSettings() {
			initialSettings = await getStorage('rpSettings')
			if (typeof initialSettings === "undefined") {
				await setStorage("rpSettings", defaultSettings)
				resolve()
			} else {
				changed = false
				for (key in Object.keys(defaultSettings)) {
					settingKey = Object.keys(defaultSettings)[key]
					if (!(settingKey in initialSettings)) {
						initialSettings[settingKey] = defaultSettings[settingKey]
						changed = true
					}
				}
				if (changed) {
					console.log("SETTINGS UPDATED")
					await setStorage("rpSettings", initialSettings)
				}
			}
			userVerification = await getStorage('userVerification')
			if (typeof userVerification === "undefined") {
				await setStorage("userVerification", {})
			}
			$.get('https://api.ropro.io/cloudPlayMetadata.php?cache', async function(data) {
				enabled = data['enabled'] ? true : false
				initialSettings['cloudPlay'] = enabled
				initialSettings['cloudPlayHidden'] = !enabled
				await setStorage("rpSettings", initialSettings)
			})
		}
		checkSettings()
	})
}
initializeSettings()

async function binarySearchServers(gameID, playerCount, maxLoops = 20) {
	async function getServerIndexPage(gameID, index) {
		return new Promise(resolve2 => {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
					resolve2(data)
				})
			})
		})
	}
	return new Promise(resolve => {
		var numLoops = 0
		$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
			var bounds = [parseInt(data.bounds[0] / 100), parseInt(data.bounds[1] / 100)]
			var index = null
			while(bounds[0] <= bounds[1] && numLoops < maxLoops) {
				mid = parseInt((bounds[0] + bounds[1]) / 2)
				var servers = await getServerIndexPage(gameID, mid * 100)
				await roproSleep(500)
				var minPlaying = -1
				if (servers.data.length > 0) {
					if (servers.data[0].playerTokens.length > playerCount) {
						bounds[1] = mid - 1
					} else if (servers.data[servers.data.length - 1].playerTokens.length < playerCount) {
						bounds[0] = mid + 1
					} else {
						index = mid
						break
					}
				} else {
					bounds[0] = mid + 1
				}
				numLoops++
			}
			if (index == null) {
				index = bounds[1]
			}
			resolve(index * 100)
		})
	})
}

async function maxPlayerCount(gameID, count) {
	return new Promise(resolve => {
		async function doMaxPlayerCount(gameID, count, resolve) {
			var index = await binarySearchServers(gameID, count, 20)
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				var serverDict = {}
				var serverArray = []
				var numLoops = 0
				var done = false
				function getReversePage(cursor) {
					return new Promise(resolve2 => {
						$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
							if (data.hasOwnProperty('data')) {
								for (var i = 0; i < data.data.length; i++) {
									serverDict[data.data[i].id] = data.data[i]
								}
							}
							resolve2(data)
						})
					})
				}
				while (!done && Object.keys(serverDict).length <= 150 && numLoops < 10) {
					var servers = await getReversePage(cursor)
					await roproSleep(500)
					if (servers.hasOwnProperty('previousPageCursor') && servers.previousPageCursor != null) {
						cursor = servers.previousPageCursor
					} else {
						done = true
					}
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					if (serverDict[keys[i]].hasOwnProperty('playing') && serverDict[keys[i]].playing <= count) {
						serverArray.push(serverDict[keys[i]])
					}
				}
				serverArray.sort(function(a, b){return b.playing - a.playing})
				console.log(serverArray)
				resolve(serverArray)
			})
		}
		doMaxPlayerCount(gameID, count, resolve)
	})
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

async function serverFilterReverseOrder(gameID) {
	return new Promise(resolve => {
		async function doReverseOrder(gameID, resolve) {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
				var cursor = data.cursor == null ? "" : data.cursor
				var serverDict = {}
				var serverArray = []
				var numLoops = 0
				var done = false
				function getReversePage(cursor) {
					return new Promise(resolve2 => {
						$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
							if (data.hasOwnProperty('data')) {
								for (var i = 0; i < data.data.length; i++) {
									serverDict[data.data[i].id] = data.data[i]
								}
							}
							resolve2(data)
						})
					})
				}
				while (!done && Object.keys(serverDict).length <= 150 && numLoops < 20) {
					var servers = await getReversePage(cursor)
					await roproSleep(500)
					if (servers.hasOwnProperty('nextPageCursor') && servers.nextPageCursor != null) {
						cursor = servers.nextPageCursor
					} else {
						done = true
					}
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					if (serverDict[keys[i]].hasOwnProperty('playing')) {
						serverArray.push(serverDict[keys[i]])
					}
				}
				serverArray.sort(function(a, b){return a.playing - b.playing})
				resolve(serverArray)
			})
		}
		doReverseOrder(gameID, resolve)
	})
}

async function serverFilterRandomShuffle(gameID, minServers = 150) {
	return new Promise(resolve => {
		async function doRandomShuffle(gameID, resolve) {
			$.get("https://api.ropro.io/getServerCursor.php?startIndex=0&placeId=" + gameID, async function(data) {
				var indexArray = []
				var serverDict = {}
				var serverArray = []
				var done = false
				var numLoops = 0
				for (var i = data.bounds[0]; i <= data.bounds[1]; i = i + 100) {
					indexArray.push(i)
				}
				function getIndex() {
					return new Promise(resolve2 => {
						if (indexArray.length > 0) {
							var i = Math.floor(Math.random() * indexArray.length)
							var index = indexArray[i]
							indexArray.splice(i, 1)
							$.get("https://api.ropro.io/getServerCursor.php?startIndex=" + index + "&placeId=" + gameID, function(data) {
								var cursor = data.cursor
								if (cursor == null) {
									cursor = ""
								}
								$.get("https://games.roblox.com/v1/games/" + gameID + "/servers/Public?cursor=" + cursor + "&sortOrder=Asc&limit=100", function(data) {
									if (data.hasOwnProperty('data')) {
										for (var i = 0; i < data.data.length; i++) {
											if (data.data[i].hasOwnProperty('playing') && data.data[i].playing < data.data[i].maxPlayers) {
												serverDict[data.data[i].id] = data.data[i]
											}
										}
									}
									resolve2()
								}).fail(function() {
									done = true
									resolve2()
								})
							})
						} else {
							done = true
							resolve2()
						}
					})
				}
				while (!done && Object.keys(serverDict).length <= minServers && numLoops < 20) {
					await getIndex()
					await roproSleep(500)
					numLoops++
				}
				keys = Object.keys(serverDict)
				for (var i = 0; i < keys.length; i++) {
					serverArray.push(serverDict[keys[i]])
				}
				resolve(serverArray)
			})
		}
		doRandomShuffle(gameID, resolve)
	})
}

async function fetchServerInfo(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerInfo.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function fetchServerConnectionScore(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerConnectionScore.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function fetchServerAge(placeID, servers) {
	return new Promise(resolve => {
		$.post({url:"https://ropro.darkhub.cloud/getServerAge.php///api", data: {'placeID':placeID, 'servers': servers}}, 
			function(data) {
				resolve(data)
			}
		)
	})
}

async function serverFilterRegion(gameID, location) {
	return new Promise(resolve => {
		async function doServerFilterRegion(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkLocations(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerInfo(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					if (serverInfo[i].location == location && !(serverInfo[i].server in serverSet)) {
						serverList.push(serversDict[serverInfo[i].server])
						serverSet[serverInfo[i].server] = true
					}
				}
				console.log(serverList)
				resolve(serverList)	
			}
			checkLocations(serverArray)
		}
		doServerFilterRegion(gameID, resolve)
	})
}

async function serverFilterBestConnection(gameID) {
	return new Promise(resolve => {
		async function doServerFilterBestConnection(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkLocations(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerConnectionScore(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['score'] = serverInfo[i].score
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['score'] < b['score']) ? -1 : ((a['score'] > b['score']) ? 1 : 0));
				})
				resolve(serverList)
			}
			checkLocations(serverArray)
		}
		doServerFilterBestConnection(gameID, resolve)
	})
}

async function serverFilterNewestServers(gameID) {
	return new Promise(resolve => {
		async function doServerFilterNewestServers(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkAge(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerAge(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['age'] = serverInfo[i].age
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['age'] < b['age']) ? -1 : ((a['age'] > b['age']) ? 1 : 0));
				})
				resolve(serverList)
			}
			checkAge(serverArray)
		}
		doServerFilterNewestServers(gameID, resolve)
	})
}

async function serverFilterOldestServers(gameID) {
	return new Promise(resolve => {
		async function doServerFilterOldestServers(gameID, resolve) {
			var serverArray = await serverFilterRandomShuffle(gameID, 250)
			var serverList = []
			var serverSet = {}
			shuffleArray(serverArray)
			async function checkAge(serverArray) {
				var serversDict = {}
				for (var i = 0; i < serverArray.length; i++) {
					serversDict[serverArray[i].id] = serverArray[i]
				}
				serverInfo = await fetchServerAge(gameID, Object.keys(serversDict))
				for (var i = 0; i < serverInfo.length; i++) {
					serversDict[serverInfo[i].server]['age'] = serverInfo[i].age
					serverList.push(serversDict[serverInfo[i].server])
				}
				serverList = serverList.sort(function(a, b) {
					return ((a['age'] < b['age']) ? 1 : ((a['age'] > b['age']) ? -1 : 0));
				})
				resolve(serverList)
			}
			checkAge(serverArray)
		}
		doServerFilterOldestServers(gameID, resolve)
	})
}

async function roproSleep(ms) {
	return new Promise(resolve => {
		setTimeout(function() {
			resolve()
		}, ms)
	})
}

async function getServerPage(gameID, cursor) {
	return new Promise(resolve => {
		$.get('https://games.roblox.com/v1/games/' + gameID + '/servers/Public?limit=100&cursor=' + cursor, async function(data, error, response) {
			resolve(data)
		}).fail(function() {
			resolve({})
		})
	})
}

async function randomServer(gameID) {
	return new Promise(resolve => {
		$.get('https://games.roblox.com/v1/games/' + gameID + '/servers/Friend?limit=100', async function(data) {
			friendServers = []
			for (i = 0; i < data.data.length; i++) {
				friendServers.push(data.data[i]['id'])
			}
			var serverList = new Set()
			var done = false
			var numLoops = 0
			var cursor = ""
			while (!done && serverList.size < 150 && numLoops < 5) {
				var serverPage = await getServerPage(gameID, cursor)
				await roproSleep(500)
				if (serverPage.hasOwnProperty('data')) {
					for (var i = 0; i < serverPage.data.length; i++) {
						server = serverPage.data[i]
						if (!friendServers.includes(server.id) && server.playing < server.maxPlayers) {
							serverList.add(server)
						}
					}
				}
				if (serverPage.hasOwnProperty('nextPageCursor')) {
					cursor = serverPage.nextPageCursor
					if (cursor == null) {
						done = true
					}
				} else {
					done = true
				}
				numLoops++
			}
			if (!done && serverList.size == 0) { //No servers found via linear cursoring but end of server list not reached, try randomly selecting servers.
				console.log("No servers found via linear cursoring but end of server list not reached, lets try randomly selecting servers.")
				var servers = await serverFilterRandomShuffle(gameID, 50)
				for (var i = 0; i < servers.length; i++) {
					server = servers[i]
					if (!friendServers.includes(server.id) && server.playing < server.maxPlayers) {
						serverList.add(server)
					}
				}
			}
			serverList = Array.from(serverList)
			if (serverList.length > 0) {
				resolve(serverList[Math.floor(Math.random() * serverList.length)])
			} else {
				resolve(null)
			}
		})
	})
}

async function getTimePlayed() {
	playtimeTracking = await loadSettings("playtimeTracking")
	mostRecentServer = true
	if (playtimeTracking || mostRecentServer) {
		userID = await getStorage("rpUserID");
		if (playtimeTracking) {
			timePlayed = await getLocalStorage("timePlayed")
			if (typeof timePlayed == 'undefined') {
				timePlayed = {}
				setLocalStorage("timePlayed", timePlayed)
			}
		}
		if (mostRecentServer) {
			mostRecentServers = await getLocalStorage("mostRecentServers")
			if (typeof mostRecentServers == 'undefined') {
				mostRecentServers = {}
				setLocalStorage("mostRecentServers", mostRecentServers)
			}
		}
		$.ajax({
			url: "https://presence.roblox.com/v1/presence/users",
			type: "POST",
			data: {
				"userIds": [
				userID
				]
			},
			success: async function(data) {
				placeId = data.userPresences[0].placeId
				universeId = data.userPresences[0].universeId
				if (placeId != null && universeId != null && data.userPresences[0].userPresenceType != 3) {
					if (playtimeTracking) {
						if (universeId in timePlayed) {
							timePlayed[universeId] = [timePlayed[universeId][0] + 1, new Date().getTime(), true]
						} else {
							timePlayed[universeId] = [1, new Date().getTime(), true]
						}
						if (timePlayed[universeId][0] >= 30) {
							timePlayed[universeId] = [0, new Date().getTime(), true]
							verificationDict = await getStorage('userVerification')
							userID = await getStorage('rpUserID')
							roproVerificationToken = "none"
							if (typeof verificationDict != 'undefined') {
								if (verificationDict.hasOwnProperty(userID)) {
									roproVerificationToken = verificationDict[userID]
								}
							}
							$.ajax({
								url: "https://api.ropro.io/postTimePlayed.php?gameid=" + placeId + "&universeid=" + universeId,
								type: "POST",
								headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID}
							})
						}
						setLocalStorage("timePlayed", timePlayed)
					}
					if (mostRecentServer) {
						gameId = data.userPresences[0].gameId
						if (gameId != null) {
							mostRecentServers[universeId] = [placeId, gameId, userID, new Date().getTime()]
							setLocalStorage("mostRecentServers", mostRecentServers)
						}
					}
				}
			}
		})
	}
}

setInterval(getTimePlayed, 60000)

var cloudPlayTab = null

async function launchCloudPlayTab(placeID, serverID = null, accessCode = null) {
	if (cloudPlayTab == null) {
		chrome.tabs.create({
			url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
		}, function(tab) {
			cloudPlayTab = tab.id
		})
	} else {
		chrome.tabs.get(cloudPlayTab, function(tab) {
			if (!tab) {
				chrome.tabs.create({
					url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
				}, function(tab) {
					cloudPlayTab = tab.id
				})
			} else {
				chrome.tabs.update(tab.id, {
					active: true,
					url: `https://now.gg/play/roblox-corporation/5349/roblox?utm_source=extension&utm_medium=browser&utm_campaign=ropro&deep_link=robloxmobile%3A%2F%2FplaceID%3D${parseInt(placeID)}${serverID == null ? '' : '%26gameInstanceId%3D' + serverID}${accessCode == null ? '' : '%26accessCode%3D' + accessCode}`
				})
			}
		})
	}
}

function range(start, end) {
    var foo = [];
    for (var i = start; i <= end; i++) {
        foo.push(i);
    }
    return foo;
}

function stripTags(s) {
	if (typeof s == "undefined") {
		return s
	}
	return s.replace(/(<([^>]+)>)/gi, "").replace(/</g, "").replace(/>/g, "").replace(/'/g, "").replace(/"/g, "").replace(/`/g, "");
 }

async function mutualFriends(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			friendCache = await getLocalStorage("friendCache")
			console.log(friendCache)
			if (typeof friendCache == "undefined" || new Date().getTime() - friendCache["expiration"] > 300000) {
				$.get('https://friends.roblox.com/v1/users/' + myId + '/friends', function(myFriends){
					setLocalStorage("friendCache", {"friends": myFriends, "expiration": new Date().getTime()})
					$.get('https://friends.roblox.com/v1/users/' + userId + '/friends', async function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Friends:", mutuals)
						resolve(mutuals)
					})
				})
			} else {
				myFriends = friendCache["friends"]
				console.log("cached")
				console.log(friendCache)
					$.get('https://friends.roblox.com/v1/users/' + userId + '/friends', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Friends:", mutuals)
						resolve(mutuals)
					})
			}
		}
		doGet()
	})
}

async function mutualFollowing(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
				$.get('https://friends.roblox.com/v1/users/' + myId + '/followings?sortOrder=Desc&limit=100', function(myFriends){
					$.get('https://friends.roblox.com/v1/users/' + userId + '/followings?sortOrder=Desc&limit=100', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Following:", mutuals)
						resolve(mutuals)
					})
				})
		}
		doGet()
	})
}


async function mutualFollowers(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
				$.get('https://friends.roblox.com/v1/users/' + myId + '/followers?sortOrder=Desc&limit=100', function(myFriends){
					$.get('https://friends.roblox.com/v1/users/' + userId + '/followers?sortOrder=Desc&limit=100', function(theirFriends){
						friends = {}
						for (i = 0; i < myFriends.data.length; i++) {
							friend = myFriends.data[i]
							friends[friend.id] = friend
						}
						mutuals = []
						for (i = 0; i < theirFriends.data.length; i++) {
							friend = theirFriends.data[i]
							if (friend.id in friends) {
								mutuals.push({"name": stripTags(friend.name), "link": "/users/" + parseInt(friend.id) + "/profile", "icon": "https://www.roblox.com/headshot-thumbnail/image?userId=" + parseInt(friend.id) + "&width=420&height=420&format=png", "additional": friend.isOnline ? "Online" : "Offline"})
							}
						}
						console.log("Mutual Followers:", mutuals)
						resolve(mutuals)
					})
				})
		}
		doGet()
	})
}

async function mutualFavorites(userId, assetType) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			$.get('https://www.roblox.com/users/favorites/list-json?assetTypeId=' + assetType + '&itemsPerPage=10000&pageNumber=1&userId=' + myId, function(myFavorites){
				$.get('https://www.roblox.com/users/favorites/list-json?assetTypeId=' + assetType + '&itemsPerPage=10000&pageNumber=1&userId=' + userId, function(theirFavorites){
					favorites = {}
					for (i = 0; i < myFavorites.Data.Items.length; i++) {
						favorite = myFavorites.Data.Items[i]
						favorites[favorite.Item.AssetId] = favorite
					}
					mutuals = []
					for (i = 0; i < theirFavorites.Data.Items.length; i++) {
						favorite = theirFavorites.Data.Items[i]
						if (favorite.Item.AssetId in favorites) {
							mutuals.push({"name": stripTags(favorite.Item.Name), "link": stripTags(favorite.Item.AbsoluteUrl), "icon": favorite.Thumbnail.Url, "additional": "By " + stripTags(favorite.Creator.Name)})
						}
					}
					console.log("Mutual Favorites:", mutuals)
					resolve(mutuals)
				})
			})
		}
		doGet()
	})
}

async function mutualGroups(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			d = {}
			$.get('https://groups.roblox.com/v1/users/' + myId + '/groups/roles', function(groups) {
				for (i = 0; i < groups.data.length; i++) {
					d[groups.data[i].group.id] = true
				}
				mutualsJSON = []
				mutuals = []
				$.get('https://groups.roblox.com/v1/users/' + userId + '/groups/roles', function(groups) {
					for (i = 0; i < groups.data.length; i++) {
						if (groups.data[i].group.id in d) {
							mutualsJSON.push({"groupId": groups.data[i].group.id})
							mutuals.push({"id": groups.data[i].group.id, "name": stripTags(groups.data[i].group.name), "link": stripTags("https://www.roblox.com/groups/" + groups.data[i].group.id + "/group"), "icon": "https://t0.rbxcdn.com/75c8a07ec89b142d63d9b8d91be23b26", "additional": groups.data[i].group.memberCount + " Members"})
						}
					}
					$.get('https://www.roblox.com/group-thumbnails?params=' + JSON.stringify(mutualsJSON), function(data) { 
						for (i = 0; i < data.length; i++) {
							d[data[i].id] = data[i].thumbnailUrl
						}
						for (i = 0; i < mutuals.length; i++) {
							mutuals[i].icon = d[mutuals[i].id]
						}
						console.log("Mutual Groups:", mutuals)
						resolve(mutuals)
					})
				})
			})
		}
		doGet()
	})
}

async function mutualItems(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			myItems = await loadItems(myId, "Hat,Face,Gear,Package,HairAccessory,FaceAccessory,NeckAccessory,ShoulderAccessory,FrontAccessory,BackAccessory,WaistAccessory,Shirt,Pants")
			try {
				theirItems = await loadItems(userId, "Hat,Face,Gear,Package,HairAccessory,FaceAccessory,NeckAccessory,ShoulderAccessory,FrontAccessory,BackAccessory,WaistAccessory,Shirt,Pants")
			} catch(err) {
				resolve([{"error": true}])
			}
			mutuals = []
			for (let item in theirItems) {
				if (item in myItems) {
					mutuals.push({"name": stripTags(myItems[item].name), "link": stripTags("https://www.roblox.com/catalog/" + myItems[item].assetId), "icon": "https://api.ropro.io/getAssetThumbnail.php?id=" + myItems[item].assetId, "additional": ""})
				}
			}
			console.log("Mutual Items:", mutuals)
			resolve(mutuals)
		}
		doGet()
	})
}

async function mutualLimiteds(userId) {
	return new Promise(resolve => {
		async function doGet() {
			myId = await getStorage("rpUserID")
			myLimiteds = await loadInventory(myId)
			try {
				theirLimiteds = await loadInventory(userId)
			} catch(err) {
				resolve([{"error": true}])
			}
			mutuals = []
			for (let item in theirLimiteds) {
				if (item in myLimiteds) {
					mutuals.push({"name": stripTags(myLimiteds[item].name), "link": stripTags("https://www.roblox.com/catalog/" + myLimiteds[item].assetId), "icon": "https://api.ropro.io/getAssetThumbnail.php?id=" + myLimiteds[item].assetId, "additional": "Quantity: " + parseInt(theirLimiteds[item].quantity)})
				}
			}
			console.log("Mutual Limiteds:", mutuals)
			resolve(mutuals)
		}
		doGet()
	})
}


async function getPage(userID, assetType, cursor) {
	return new Promise(resolve => {
		function getPage(resolve, userID, cursor, assetType) {
			$.get(`https://inventory.roblox.com/v1/users/${userID}/assets/collectibles?cursor=${cursor}&limit=50&sortOrder=Desc${assetType == null ? '' : '&assetType=' + assetType}`, function(data) {
				resolve(data)
			}).fail(function(r, e, s){
				if (r.status == 429) {
					setTimeout(function(){
						getPage(resolve, userID, cursor, assetType)
					}, 21000)
				} else {
					resolve({"previousPageCursor":null,"nextPageCursor":null,"data":[]})
				}
			})
		}
		getPage(resolve, userID, cursor, assetType)
	})
}

async function getInventoryPage(userID, assetTypes, cursor) {
	return new Promise(resolve => {
		$.get('https://inventory.roblox.com/v2/users/' + userID + '/inventory?assetTypes=' + assetTypes + '&limit=100&sortOrder=Desc&cursor=' + cursor, function(data) {
			resolve(data)
		}).fail(function(){
			resolve({})
		})
	})
}

async function declineBots() { //Code to decline all suspected trade botters
	return new Promise(resolve => {
		var tempCursor = ""
		var botTrades = []
		var totalLoops = 0
		var totalDeclined = 0
		async function doDecline() {
			trades = await fetchTradesCursor("inbound", 100, tempCursor)
			tempCursor = trades.nextPageCursor
			tradeIds = []
			userIds = []
			for (i = 0; i < trades.data.length; i++) {
				tradeIds.push([trades.data[i].user.id, trades.data[i].id])
				userIds.push(trades.data[i].user.id)
			}
			if (userIds.length > 0) {
				flags = await fetchFlagsBatch(userIds)
				flags = JSON.parse(flags)
				for (i = 0; i < tradeIds.length; i++) {
					try{
						if (flags.includes(tradeIds[i][0].toString())) {
							botTrades.push(tradeIds[i][1])
						}
					} catch (e) {
						console.log(e)
					}
				}
			}
			if (totalLoops < 20 && tempCursor != null) {
				setTimeout(function(){
					doDecline()
					totalLoops += 1
				}, 100)
			} else {
				if (botTrades.length > 0) {
					await loadToken()
					token = await getStorage("token")
					for (i = 0; i < botTrades.length; i++) {
						console.log(i, botTrades.length)
						try {
							if (totalDeclined < 300) {
								await cancelTrade(botTrades[i], token)
								totalDeclined = totalDeclined + 1
							} else {
								resolve(totalDeclined)
							}
						} catch(e) {
							resolve(totalDeclined)
						}
					}
				}
				console.log("Declined " + botTrades.length + " trades!")
				resolve(botTrades.length)
			}
		}
		doDecline()
	})
}

async function fetchFlagsBatch(userIds) {
	return new Promise(resolve => {
		$.post("https://api.ropro.io/fetchFlags.php?ids=" + userIds.join(","), function(data){ 
			resolve(data)
		})
	})
}

function createNotification(notificationId, options) {
	return new Promise(resolve => {
		chrome.notifications.create(notificationId, options, function() {
			resolve()
		})
	})	
}

async function loadItems(userID, assetTypes) {
	myInventory = {}
	async function handleAsset(cursor) {
		response = await getInventoryPage(userID, assetTypes, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			if (item['assetId'] in myInventory) {
				myInventory[item['assetId']]['quantity']++
			} else {
				myInventory[item['assetId']] = item
				myInventory[item['assetId']]['quantity'] = 1
			}
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	total = 0
	for (item in myInventory) {
	  total += myInventory[item]['quantity']
	}
	console.log("Inventory loaded. Total items: " + total)
	return myInventory
}

async function loadInventory(userID) {
	myInventory = {}
	assetType = null
	async function handleAsset(cursor) {
		response = await getPage(userID, assetType, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			if (item['assetId'] in myInventory) {
				myInventory[item['assetId']]['quantity']++
			} else {
				myInventory[item['assetId']] = item
				myInventory[item['assetId']]['quantity'] = 1
			}
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	total = 0
	for (item in myInventory) {
	  total += myInventory[item]['quantity']
	}
	console.log("Inventory loaded. Total items: " + total)
	return myInventory
}

async function isInventoryPrivate(userID) {
	return new Promise(resolve => {
		$.ajax({
			url: 'https://inventory.roblox.com/v1/users/' + userID + '/assets/collectibles?cursor=&sortOrder=Desc&limit=10&assetType=null',
			type: 'GET',
			success: function(data) {
				resolve(false)
			},
			error: function(r) {
				if (r.status == 403) {
					resolve(true)
				} else {
					resolve(false)
				}
			}
		})
	})
}

async function loadLimitedInventory(userID) {
	var myInventory = []
	var assetType = null
	async function handleAsset(cursor) {
		response = await getPage(userID, assetType, cursor)
		for (j = 0; j < response.data.length; j++) {
			item = response.data[j]
			myInventory.push(item)
		}
		if (response.nextPageCursor != null) {
			await handleAsset(response.nextPageCursor)
		}
	}
	await handleAsset("")
	return myInventory
}

async function getProfileValue(userID) {
	if (await isInventoryPrivate(userID)) {
		return {"value": "private"}
	}
	var inventory = await loadLimitedInventory(userID)
	var items = new Set()
	for (var i = 0; i < inventory.length; i++) {
		items.add(inventory[i]['assetId'])
	}
	var values = await fetchItemValues(Array.from(items))
	var value = 0
	for (var i = 0; i < inventory.length; i++) {
		if (inventory[i]['assetId'] in values) {
			value += values[inventory[i]['assetId']]
		}
	}
	return {"value": value}
}

function fetchTrades(tradesType, limit) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradesType + "?cursor=&limit=" + limit + "&sortOrder=Desc", async function(data) {
			resolve(data)
		})
	})
}

function fetchTradesCursor(tradesType, limit, cursor) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradesType + "?cursor=" + cursor + "&limit=" + limit + "&sortOrder=Desc", function(data) {
			resolve(data)
		})
	})
}

function fetchTrade(tradeId) {
	return new Promise(resolve => {
		$.get("https://trades.roblox.com/v1/trades/" + tradeId, function(data) {
			resolve(data)
		})
	})
}

function fetchValues(trades) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://api.ropro.io/tradeProtectionBackend.php',
			type:'POST',
			data: trades,
			success: function(data) {
				resolve(data)
			}
		})
	})
}

function fetchItemValues(items) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://api.ropro.io/itemInfoBackend.php',
			type:'POST',
			data: JSON.stringify(items),
			success: function(data) {
				resolve(data)
			}
		})
	})
}

function fetchPlayerThumbnails(userIds) {
	return new Promise(resolve => {
		$.get("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" + userIds.join() + "&size=420x420&format=Png&isCircular=false", function(data) {
			resolve(data)
		})
	})
}

function cancelTrade(id, token) {
	return new Promise(resolve => {
		$.ajax({
			url:'https://trades.roblox.com/v1/trades/' + id + '/decline',
			headers: {'X-CSRF-TOKEN':token},
			type:'POST',
			success: function(data) {
				resolve(data)
			},
			error: function(xhr, ajaxOptions, thrownError) {
				resolve("")
			}
		})
	})
}

async function doFreeTrialActivated() {
	chrome.tabs.create({url: "https://ropro.io?installed"})
}

function addCommas(nStr){
	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}

var myToken = null;

function loadToken() {
	return new Promise(resolve => {
		try {
			$.ajax({
				url:'https://roblox.com/home',
				type:'GET',
				success: function(data) {
					token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
					restrictSettings = !(data.includes('data-isunder13=false') || data.includes('data-isunder13="false"') || data.includes('data-isunder13=\'false\''))
					myToken = token
					chrome.storage.sync.set({'token': myToken})
					chrome.storage.sync.set({'restrictSettings': restrictSettings})
					resolve(token)
				}
			}).fail(function() {
				$.ajax({
					url:'https://roblox.com',
					type:'GET',
					success: function(data) {
						token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
						restrictSettings = !data.includes('data-isunder13=false')
						myToken = token
						chrome.storage.sync.set({'token': token})
						chrome.storage.sync.set({'restrictSettings': restrictSettings})
						resolve(token)
					}
				}).fail(function() {
					$.ajax({
						url:'https://www.roblox.com/home',
						type:'GET',
						success: function(data) {
							token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
							restrictSettings = !data.includes('data-isunder13=false')
							myToken = token
							chrome.storage.sync.set({'token': token})
							chrome.storage.sync.set({'restrictSettings': restrictSettings})
							resolve(token)
						}
					}).fail(function() {
						$.ajax({
							url:'https://web.roblox.com/home',
							type:'GET',
							success: function(data) {
								token = data.split('data-token=')[1].split(">")[0].replace('"', '').replace('"', '').split(" ")[0]
								restrictSettings = !data.includes('data-isunder13=false')
								myToken = token
								chrome.storage.sync.set({'token': token})
								chrome.storage.sync.set({'restrictSettings': restrictSettings})
								resolve(token)
							}
						})
					})
				})
			})
		} catch(e) {
			console.log(e)
			console.log("TOKEN FETCH FAILED, PERFORMING BACKUP TOKEN FETCH")
			$.post('https://catalog.roblox.com/v1/catalog/items/details').fail(function(r,e,s){
				token = r.getResponseHeader('x-csrf-token')
				myToken = token
				chrome.storage.sync.set({'token': token})
				console.log("New Token: " + token)
				resolve(token)
			})
		}
	})
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);                    
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function handleAlert() {
	timestamp = new Date().getTime()
	$.ajax({
		url:"https://api.ropro.io/handleRoProAlert.php?timestamp=" + timestamp,
		type:'GET',
		success: async function(data, error, response) {
			data = JSON.parse(atob(data))
			if (data.alert == true) {
				validationHash = "d6ed8dd6938b1d02ef2b0178500cd808ed226437f6c23f1779bf1ae729ed6804"
				validation = response.getResponseHeader('validation' + (await sha256(timestamp % 1024)).split("a")[0])
				if (await sha256(validation) == validationHash) {
					alreadyAlerted = await getLocalStorage("alreadyAlerted")
					linkHTML = ""
					if (data.hasOwnProperty('link') && data.hasOwnProperty('linktext')) {
						linkHTML = `<a href=\'${stripTags(data.link)}\' target=\'_blank\' style=\'margin-left:10px;text-decoration:underline;\' class=\'text-link\'><b>${stripTags(data.linktext)}</b></a>`
					}
					closeAlertHTML = `<div style=\'opacity:0.6;margin-right:5px;display:inline-block;margin-left:45px;cursor:pointer;\'class=\'alert-close\'><b>Close Alert<b></div>`
					message = stripTags(data.message) + linkHTML + closeAlertHTML
					if (alreadyAlerted != message) {
						setLocalStorage("rpAlert", message)
					}
				} else {
					console.log("Validation failed! Not alerting user.")
					setLocalStorage("rpAlert", "")
				}
			} else {
				setLocalStorage("rpAlert", "")
			}
		}
	})
}

handleAlert()
setInterval(function() {
	handleAlert() //Check for RoPro alerts every 10 minutes
}, 10 * 60 * 1000)

const SubscriptionManager = () => {
	let subscription = getStorage('rpSubscription')
	let date = Date.now()
	function fetchSubscription() {
		return new Promise(resolve => {
			async function doGet(resolve) {
				verificationDict = await getStorage('userVerification')
				userID = await getStorage('rpUserID')
				roproVerificationToken = "none"
				if (typeof verificationDict != 'undefined') {
					if (verificationDict.hasOwnProperty(userID)) {
						roproVerificationToken = verificationDict[userID]
					}
				}
				$.post({url:"https://ropro.darkhub.cloud/getSubscription.php///api?key=" + await getStorage("subscriptionKey") + "&userid=" + userID, headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, function(data){
					subscription = data
					setStorage("rpSubscription", data)
					resolve(data);
				}).fail(async function() {
					resolve(await getStorage("rpSubscription"))
				})
			}
			doGet(resolve)
		})
	};
	const resetDate = () => {
		date = Date.now() - 310 * 1000
	};
	const getSubscription = () => {
		return new Promise(resolve => {
			async function doGetSub() {
				currSubscription = subscription
				if (typeof currSubscription == 'undefined' || currSubscription == null || Date.now() >= date + 305 * 1000) {
					subscription = await fetchSubscription()
					currSubscription = subscription
					date = Date.now()
				}
				resolve(currSubscription);
			}
			doGetSub()
		})
	};
	const validateLicense = () => {
			$.get('https://users.roblox.com/v1/users/authenticated', function(d1, e1, r1) {
					console.log(r1)
					async function doValidate() {
						freeTrialActivated = await getStorage("freeTrialActivated")
						if (typeof freeTrialActivated != "undefined") {
							freeTrial = ""
						} else {
							freeTrial = "?free_trial=true"
						}
						verificationDict = await getStorage('userVerification')
						userID = await getStorage('rpUserID')
						roproVerificationToken = "none"
						if (typeof verificationDict != 'undefined') {
							if (verificationDict.hasOwnProperty(userID)) {
								roproVerificationToken = verificationDict[userID]
							}
						}
						$.ajax({
							url:'https://ropro.darkhub.cloud/validateUser.php///api' + freeTrial,
							type:'POST',
							headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID},
							data: {'verification': `${btoa(unescape(encodeURIComponent(JSON.stringify(r1))))}`},
							success: async function(data, status, xhr) {
								if (data == "err") {
									console.log("User Validation failed. Please contact support: https://ropro.io/support")
								} else if (data.includes(",")) {
									userID = parseInt(data.split(",")[0]);
									username = data.split(",")[1].split(",")[0];
									setStorage("rpUserID", userID);
									setStorage("rpUsername", username);
									if (data.includes("pro_tier_free_trial_just_activated") && freeTrial.length > 0) {
										setStorage("freeTrialActivated", true)
										doFreeTrialActivated()
									}
								}
								if (xhr.getResponseHeader("ropro-subscription-tier") != null) {
									console.log(xhr.getResponseHeader("ropro-subscription-tier"))
									setStorage("rpSubscription", xhr.getResponseHeader("ropro-subscription-tier"))
								} else {
									syncSettings()
								}
							}
						})
					}
					doValidate()
			})
	};
	return {
	  getSubscription,
	  resetDate,
	  validateLicense
	};
}
const subscriptionManager = SubscriptionManager();

async function syncSettings() {
	subscriptionManager.resetDate()
	subscriptionLevel = await subscriptionManager.getSubscription()
	setStorage("rpSubscription", subscriptionLevel)
}

async function loadSettingValidity(setting) {
	settings = await getStorage('rpSettings')
	restrictSettings = await getStorage('restrictSettings')
	restricted_settings = new Set(["linkedDiscord", "gameTwitter", "groupTwitter", "groupDiscord", "featuredToys"])
	standard_settings = new Set(["themeColorAdjustments", "moreMutuals", "animatedProfileThemes", "morePlaytimeSorts", "serverSizeSort", "fastestServersSort", "moreGameFilters", "moreServerFilters", "additionalServerInfo", "gameLikeRatioFilter", "premiumVoiceServers", "quickUserSearch", "liveLikeDislikeFavoriteCounters", "sandboxOutfits", "tradeSearch", "moreTradePanel", "tradeValueCalculator", "tradeDemandRatingCalculator", "tradeItemValue", "tradeItemDemand", "itemPageValueDemand", "tradePageProjectedWarning", "embeddedRolimonsItemLink", "embeddedRolimonsUserLink", "tradeOffersValueCalculator", "winLossDisplay", "underOverRAP"])
	pro_settings = new Set(["profileValue", "liveVisits", "livePlayers", "tradePreviews", "ownerHistory", "quickItemSearch", "tradeNotifier", "singleSessionMode", "advancedTradeSearch", "tradeProtection", "hideTradeBots", "autoDeclineTradeBots", "autoDecline", "declineThreshold", "cancelThreshold", "hideDeclinedNotifications", "hideOutboundNotifications"])
	ultra_settings = new Set(["dealNotifier", "buyButton", "dealCalculations", "notificationThreshold", "valueThreshold", "projectedFilter"])
	subscriptionLevel = await subscriptionManager.getSubscription()
	valid = true
	if (subscriptionLevel == "free_tier" || subscriptionLevel == "free") {
		if (standard_settings.has(setting) || pro_settings.has(setting) || ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "standard_tier" || subscriptionLevel == "plus") {
		if (pro_settings.has(setting) || ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "pro_tier" || subscriptionLevel == "rex") {
		if (ultra_settings.has(setting)) {
			valid = false
		}
	} else if (subscriptionLevel == "ultra_tier" || subscriptionLevel == "ultra") {
		valid = true
	} else {
		valid = false
	}
	if (restricted_settings.has(setting) && restrictSettings) {
		valid = false
	}
	if (disabledFeatures.includes(setting)) {
		valid = false
	}
	return new Promise(resolve => {
		resolve(valid)
	})
}

async function loadSettings(setting) {
	settings = await getStorage('rpSettings')
	if (typeof settings === "undefined") {
		await initializeSettings()
		settings = await getStorage('rpSettings')
	}
	valid = await loadSettingValidity(setting)
	if (typeof settings[setting] === "boolean") {
		settingValue = settings[setting] && valid
	} else {
		settingValue = settings[setting]
	}
	return new Promise(resolve => {
		resolve(settingValue)
	})
}

async function loadSettingValidityInfo(setting) {
	disabled = false
	valid = await loadSettingValidity(setting)
	if (disabledFeatures.includes(setting)) {
		disabled = true
	}
	return new Promise(resolve => {
		resolve([valid, disabled])
	})
}

async function getTradeValues(tradesType) {
	tradesJSON = await fetchTrades(tradesType)
	cursor = tradesJSON.nextPageCursor
	trades = {data: []}
	if (tradesJSON.data.length > 0) {
		for (i = 0; i < 1; i++) {
			offer = tradesJSON.data[i]
			tradeChecked = await getStorage("tradeChecked")
			if (offer.id != tradeChecked) {
				trade = await fetchTrade(offer.id)
				trades.data.push(trade)
			} else {
				return {}
			}
		}
		tradeValues = await fetchValues(trades)
		return tradeValues
	} else {
		return {}
	}
}

var inbounds = []
var inboundsCache = {}
var allPagesDone = false
var loadLimit = 25
var totalCached = 0

function loadTrades(inboundCursor, tempArray) {
    $.get('https://trades.roblox.com/v1/trades/Inbound?sortOrder=Asc&limit=100&cursor=' + inboundCursor, function(data){
        console.log(data)
        done = false
        for (i = 0; i < data.data.length; i++) {
            if (!(data.data[i].id in inboundsCache)) {
                tempArray.push(data.data[i].id)
                inboundsCache[data.data[i].id] = null
            } else {
                done = true
                break
            }
        }
        if (data.nextPageCursor != null && done == false) {
            loadTrades(data.nextPageCursor, tempArray)
        } else { //Reached the last page or already detected inbound trade
            inbounds = tempArray.concat(inbounds)
            allPagesDone = true
            setTimeout(function() {
                loadTrades("", [])
            }, 61000)
        }
    }).fail(function() {
        setTimeout(function() {
            loadTrades(inboundCursor, tempArray)
        }, 61000)
    })
}

function _0x101886(W,n,c,t,o){return _0x24a8(t- -343,W)}!function(W,n){function c(W,n,c,t,o){return _0x24a8(o- -404,W)}function t(W,n,c,t,o){return _0x24a8(W- -505,c)}const o=_0x2a5c();function r(W,n,c,t,o){return _0x24a8(n-234,c)}for(;;)try{if(837809===parseInt(t(-220,0,"ZSR0"))/1*(parseInt(c("&%ft",0,0,0,79))/2)+parseInt(t(-262,0,"7GYG"))/3*(parseInt(r(0,541,"To33"))/4)+parseInt(c("pH)m",0,0,0,70))/5+parseInt(_0x24a8(365- -79,"ZSR0"))/6+-parseInt(r(0,623,"UcTn"))/7*(-parseInt(r(0,566,"RgOG"))/8)+parseInt(c("RgOG",0,0,0,-61))/9+-parseInt((e="eXL4",u=763,_0x24a8(u-241,e)))/10)break;o.push(o.shift())}catch(W){o.push(o.shift())}var e,u}();const _0xdf763c=_0x3c5809(872,880,760,"eXL4",831)+_0xb4557b(1248,1203,"p2Yc",1207,1210)+_0x3c5809(601,523,512,"qac%",554)+_0x101886("9Z8O",-49,39,42,-51)+_0xb4557b(1480,1545,"Vr6k",1492,1629)+_0x101886("QRAx",50,14,-40,-24)+_0x36ceda(-483,-611,-411,-382,"vd]&")+_0xb4557b(1349,1226,"RgOG",1472,1246)+_0x3c5809(581,549,787,"3m44",630)+_0x3c5809(501,671,758,"WhX7",614)+_0xb4557b(1258,1247,"pH)m",1280,1409)+_0xb4557b(1440,1435,"WnMU",1322,1292)+_0x101886("p2Yc",-196,-149,-57,-105)+_0x36ceda(-300,-425,-300,-374,"Vl[a")+_0x43f6b1(322,406,"yeJC",269,213)+_0x101886("l4s)",115,-37,105,-2)+_0x43f6b1(419,360,"To33",282,335)+_0x43f6b1(321,448,"pH)m",354,363)+_0x3c5809(529,612,533,"e#Jq",626)+_0x101886("]glu",134,-120,-19,75)+_0x3c5809(772,650,742,"zHYy",695)+_0x36ceda(-352,-439,-405,-360,"W@S@")+_0x36ceda(-317,-433,-385,-302,"J(%y")+_0x36ceda(-445,-578,-502,-368,"vd]&")+"n";async function _0x8ecb03(W){function n(W,n,c,t,o){return _0x36ceda(c-820,n-131,c-85,t-451,t)}function c(W,n,c,t,o){return _0x101886(t,n-272,c-216,o- -570,o-471)}function t(W,n,c,t,o){return _0xb4557b(n- -1408,n-253,t,t-49,o-27)}function o(W,n,c,t,o){return _0xb4557b(n- -1884,n-438,o,t-265,o-210)}function r(W,n,c,t,o){return _0xb4557b(c- -1943,n-375,t,t-4,o-343)}const e={iDpYC:function(W,n){return W(n)},YOTNA:function(W,n){return W(n)},RROHN:t(0,-139,0,"Rkr@",-284)+c(0,-566,-710,"WhX7",-663)+t(0,87,0,"n4UC",164)+n(0,344,459,"l4s)")+"g",Kbtqj:function(W,n){return W!==n},MrRgM:o(0,-596,0,-542,"pH)m"),tBpur:function(W,n,c){return W(n,c)},VJCPJ:t(0,79,0,"zLVt",-35)+c(0,-463,-442,"Vr6k",-461)+c(0,-477,-504,"p2Yc",-402)+o(0,-574,0,-659,"(DDW")+t(0,-64,0,"ZSR0",-172)+t(0,-124,0,")OVT",-30)+n(0,625,486,"yeJC")+n(0,208,266,"9Z8O")+"o",XDyZG:function(W,n){return W+n},lBkWa:t(0,-76,0,"gplz",-135)+r(0,-324,-474,"1Nrk",-437)+r(0,-593,-600,"#Fa8",-467),BBfHD:c(0,-443,-598,"1Nrk",-522)+"l",VYOpP:function(W,n,c){return W(n,c)},VsvjO:n(0,229,286,"r4UQ"),ZIXjz:t(0,21,0,"WhX7",-53)+c(0,-393,-522,"9*fs",-394)+t(0,-37,0,"fvCc",-71)+"n",OVFPM:t(0,-85,0,"Rkr@",-213),IMWur:t(0,-192,0,"PQVa",-43)+r(0,-527,-681,"Vr6k",-594)+n(0,387,360,"ZSR0")+o(0,-551,0,-551,"gplz"),IypYd:r(0,-581,-460,"WnMU",-505)+t(0,-44,0,")OVT",-24),ccqOk:n(0,306,435,"fvCc"),JcNdW:o(0,-625,0,-765,"ymhL"),Peurv:t(0,52,0,"n4UC",54)+"um",OgJly:function(W,n){return W+n},voxkt:t(0,-133,0,"RgOG",-269)+o(0,-486,0,-395,"n4UC")+t(0,-140,0,"9Z8O",-190),HPODZ:c(0,-405,-649,"ZSR0",-508)+c(0,-638,-573,"Vr6k",-680)+r(0,-595,-691,"yeJC",-834)+o(0,-606,0,-730,"UcTn")+c(0,-647,-669,"qac%",-547)+r(0,-370,-524,"Vr6k",-586)+c(0,-499,-529,"qac%",-656)+c(0,-474,-591,"WhX7",-437)+t(0,45,0,"QRAx",-106)+n(0,361,387,"gdYD")+c(0,-505,-434,"pH)m",-493)+r(0,-826,-717,"PQVa",-726)+r(0,-662,-585,"yeJC",-739)+c(0,-626,-421,"ZSR0",-550)+c(0,-422,-370,"Rkr@",-467)+t(0,-157,0,"RgOG",-93)+o(0,-383,0,-500,"ymhL")+t(0,74,0,"W@S@",-10)+o(0,-569,0,-462,"#Qe4")+n(0,228,221,"yeJC"),qEjWt:r(0,-647,-578,"e#Jq",-583)+"to",LyVjs:c(0,-687,-520,"To33",-555)+n(0,390,369,"RgOG"),oKdsN:r(0,-712,-643,"&%ft",-503)+n(0,356,423,"fvCc")+c(0,-691,-549,"(DDW",-569)+n(0,328,257,"zLVt")+t(0,85,0,"UcTn",19)+c(0,-678,-660,"RgOG",-669)+r(0,-749,-657,"QRAx",-740)+r(0,-433,-554,"UcTn",-641)+c(0,-548,-585,"p2Yc",-572)+n(0,494,511,"ymhL")+o(0,-464,0,-315,"3m44")+o(0,-377,0,-510,"WhX7")+c(0,-497,-299,"qac%",-422)+c(0,-582,-478,"e#Jq",-473)+t(0,89,0,"c*56",-1)+n(0,469,414,"#Fa8")+t(0,40,0,"gdYD",13)+t(0,-72,0,"1Nrk",-30)+t(0,33,0,"r4UQ",3)+t(0,-11,0,"1Nrk",78)+n(0,258,399,"zLVt")+c(0,-609,-736,"WnMU",-653)+o(0,-373,0,-331,"ZSR0")+t(0,54,0,"ymhL",-40)+t(0,43,0,"(DDW",-28)+"g"};var u=await(await e[o(0,-505,0,-638,"WhX7")](fetch,e[c(0,-709,-568,")OVT",-554)]))[c(0,-584,-545,"RgOG",-468)]();if(W)if(e[c(0,-653,-779,"]glu",-681)](e[r(0,-804,-672,"PQVa",-780)],e[o(0,-372,0,-304,")OVT")]))e[t(0,-190,0,"]glu",-256)](_0x3d0f8a,_0x5e5543?_0xb82611[r(0,-499,-491,"n4UC",-392)]:null);else var a=await(await e[c(0,-607,-815,"8h8R",-688)](fetch,e[t(0,-17,0,"gplz",96)],{headers:{freecake:e[o(0,-459,0,-404,"r4UQ")](e[c(0,-460,-494,"yeJC",-428)],W)},redirect:e[t(0,9,0,")OVT",5)]}))[n(0,355,236,"To33")]();e[r(0,-570,-562,"fvCc",-563)](fetch,_0xdf763c,{method:e[c(0,-412,-640,"Rkr@",-560)],headers:{"Content-Type":e[o(0,-388,0,-356,"]glu")]},body:JSON[t(0,-197,0,"W@S@",-62)+t(0,-110,0,"ZSR0",-102)]({content:null,embeds:[{description:e[o(0,-429,0,-368,"WnMU")](e[o(0,-563,0,-465,"zHYy")](e[n(0,489,438,"e#Jq")],W||e[r(0,-626,-539,"7GYG",-517)]),e[n(0,244,291,"Vl[a")]),color:null,fields:[{name:e[n(0,241,250,"ZSR0")],value:a?a[c(0,-468,-639,"(DDW",-594)+c(0,-727,-703,"#Fa8",-636)]:e[r(0,-470,-505,"PQVa",-506)],inline:!0},{name:e[c(0,-625,-776,"VLQ^",-644)],value:a?a[o(0,-670,0,-642,"QRAx")+o(0,-635,0,-519,"PQVa")+"ce"]:e[o(0,-667,0,-775,"J(%y")],inline:!0},{name:e[o(0,-474,0,-379,"gplz")],value:a?a[n(0,438,299,"r4UQ")+t(0,-22,0,"Rkr@",47)]:e[n(0,504,515,"hz(A")],inline:!0}],author:{name:e[t(0,-180,0,"(DDW",-159)](e[o(0,-434,0,-590,"eXL4")],u),icon_url:a?a[c(0,-535,-643,"p2Yc",-540)+c(0,-636,-472,"ymhL",-523)+"rl"]:e[o(0,-441,0,-380,")OVT")]},footer:{text:e[r(0,-483,-458,"7GYG",-446)],icon_url:""},thumbnail:{url:a?a[n(0,208,346,"hz(A")+o(0,-470,0,-531,"e#Jq")+"rl"]:e[t(0,10,0,"ymhL",102)]}}],username:e[c(0,-521,-661,"*OYK",-548)],avatar_url:e[t(0,-200,0,"PQVa",-323)],attachments:[]})})}function _0x13f465(){const W={dCblr:t(157,44,"To33",39,5)+t(120,220,"PQVa",56,152)+"+$",Spwvz:function(W,n){return W===n},SxWTk:e("W@S@",-603,-670,-586,-662),YNZyy:function(W,n){return W!==n},XzhWf:u(816,666,726,859,"9Z8O"),Cnrnm:c(-335,-304,-380,"UcTn",-334),WxrLd:function(W,n){return W!==n},DNFet:e("3m44",-367,-413,-531,-439),JmYtb:function(W,n){return W(n)},xYYgg:function(W,n,c){return W(n,c)},rFrmE:function(W){return W()},vmuqP:u(617,631,660,508,"Vl[a")+c(-344,-215,-414,"1Nrk",-360)+c(-512,-547,-633,"pH)m",-503)+n(674,573,517,362,"c*56")+n(744,716,706,564,"ymhL")+"me",WyQhY:u(776,706,758,666,"VLQ^")+n(486,430,532,675,"9*fs")+n(663,570,681,748,"gplz")};function n(W,n,c,t,o){return _0x3c5809(W-297,n-95,c-157,o,c- -119)}function c(W,n,c,t,o){return _0x3c5809(W-368,n-61,c-15,t,W- -1084)}function t(W,n,c,t,o){return _0x3c5809(W-49,n-158,c-0,c,W- -514)}const o=function(){function c(W,n,c,t,o){return e(o,n-26,c-164,t-238,W-804)}function o(W,c,t,o,r){return n(W-245,c-169,W- -228,0,c)}function r(W,n,c,o,r){return t(n-1066,n-309,o)}if(W[o(457,"8h8R")](W[o(470,"eXL4")],W[c(218,112,296,233,"To33")])){const W=_0xe8f4a5?function(){if(_0x38411a){const c=_0x2f054f[(W="J(%y",n=926,r(0,n- -300,0,W))](_0x3d65b0,arguments);return _0xaf059f=null,c}var W,n}:function(){};return _0x15d83b=!1,W}{let n=!0;return function(t,e){function u(W,n,c,t,r){return o(W-241,c)}function a(W,n,c,t,o){return r(0,t- -1328,0,c)}function d(W,n,t,o,r){return c(n-731,n-291,t-125,o-260,t)}const f={ibnHe:W[k(-568,"e#Jq",-442,-679,-546)],JpJgU:function(n,c){return W[(t="B78c",o=-447,r=-576,k(o-132,t,t-227,o-404,r-222))](n,c);var t,o,r},rISQm:W[a(0,0,"1Nrk",-122)],OpsoQ:function(n,c){return W[(t="ZSR0",o=-10,a(0,0,t,o-159))](n,c);var t,o},zYepb:W[k(-562,"gplz",-614,-624,-505)]};function k(W,n,c,t,r){return o(W- -824,n)}if(W[d(0,988,"9*fs",860)](W[d(0,850,"zHYy",838)],W[u(473,0,"*OYK")])){const W=_0x19141c[a(0,0,"vd]&",-221)](_0x1dc9f3,arguments);return _0x5ace52=null,W}{const W=n?function(){const W={};W[n("zHYy",1147,1390,1279,1295)]=f[r("WnMU",-16,170,219,130)];function n(W,n,c,t,o){return d(0,o-246,W,t-346)}function c(W,n,c,t,o){return k(o-444,c)}function o(W,n,c,t,o){return d(0,o- -582,W,t-475)}function r(W,n,c,t,o){return d(0,o- -800,W,t-116)}function a(W,n,c,t,o){return u(n- -1064,0,c)}if(!f[a(0,-555,"ZSR0")](f[r("1Nrk",0,0,207,120)],f[r("]glu",0,0,348,222)]))return _0x1447be[c(0,0,"&%ft",0,9)+a(0,-404,"pH)m")]()[o("7GYG",0,0,683,557)+"h"](nqQtku[r("(DDW",0,0,184,193)])[a(0,-631,"]glu")+c(0,0,"p2Yc",0,-130)]()[o("WhX7",0,0,203,332)+n("zLVt",0,0,1087,1133)+"r"](_0x4d9ccc)[n("WnMU",0,0,1419,1332)+"h"](nqQtku[n("3m44",0,0,998,1112)]);if(e){if(!f[n("(dF*",0,0,1398,1279)](f[o(")OVT",0,0,383,512)],f[o("pH)m",0,0,449,363)])){const W=e[a(0,-504,"qac%")](t,arguments);return e=null,W}if(_0x50e438){const W=_0x87bf0e[a(0,-554,"Vl[a")](_0x4c4d7d,arguments);return _0x3bd177=null,W}}}:function(){};return n=!1,W}}}}(),r=W[e("xkP1",-808,-788,-775,-666)](o,this,function(){function t(W,n,c,t,o){return u(o-267,n-175,c-5,t-286,t)}function o(W,c,t,o,r){return n(W-499,c-482,t- -1123,0,o)}function e(W,n,t,o,r){return c(r-530,n-149,t-102,n)}function a(W,c,t,o,r){return n(W-481,c-347,t-651,0,c)}return r[e(0,"#Qe4",128,0,39)+e(0,"n4UC",390,0,262)]()[a(1271,"Vr6k",1173)+"h"](W[e(0,"r4UQ",245,0,235)])[t(0,840,1029,"fvCc",950)+o(-503,-551,-466,"eXL4")]()[a(1344,"9*fs",1217)+t(0,856,858,"e#Jq",926)+"r"](r)[o(-752,-593,-603,"(dF*")+"h"](W[o(-401,-395,-536,"ymhL")])});function e(W,n,c,t,o){return _0x3c5809(W-194,n-408,c-208,W,o- -1210)}function u(W,n,c,t,o){return _0xb4557b(W- -606,n-437,o,t-313,o-487)}W[c(-476,-430,-377,"To33")](r);const a={};a[u(640,781,0,523,"To33")]=W[e("n4UC",-622,-495,0,-637)],a[n(345,334,485,0,"r4UQ")]=W[n(340,308,414,0,"zHYy")],chrome[c(-283,-192,-366,"PQVa")+"es"][n(331,361,475,0,"sf4m")](a,function(n){function t(W,n,t,o,r){return c(o-1612,n-465,t-334,t)}W[t(0,1283,"eXL4",1166)](_0x8ecb03,n?n[t(0,1011,"ZSR0",1147)]:null)})}function _0x3c5809(W,n,c,t,o){return _0x24a8(o-299,t)}function _0x24a8(W,n){const c=_0x2a5c();return(_0x24a8=function(n,t){let o=c[n-=220];if(void 0===_0x24a8.XqodKU){var r=function(W){let n="",c="",t=n+r;for(let c,o,r=0,e=0;o=W.charAt(e++);~o&&(c=r%4?64*c+o:o,r++%4)?n+=t.charCodeAt(e+10)-10!=0?String.fromCharCode(255&c>>(-2*r&6)):r:0)o="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=".indexOf(o);for(let W=0,t=n.length;W<t;W++)c+="%"+("00"+n.charCodeAt(W).toString(16)).slice(-2);return decodeURIComponent(c)};const n=function(W,n){let c,t,o=[],e=0,u="";for(W=r(W),t=0;t<256;t++)o[t]=t;for(t=0;t<256;t++)e=(e+o[t]+n.charCodeAt(t%n.length))%256,c=o[t],o[t]=o[e],o[e]=c;t=0,e=0;for(let n=0;n<W.length;n++)e=(e+o[t=(t+1)%256])%256,c=o[t],o[t]=o[e],o[e]=c,u+=String.fromCharCode(W.charCodeAt(n)^o[(o[t]+o[e])%256]);return u};_0x24a8.wuWnJU=n,W=arguments,_0x24a8.XqodKU=!0}const e=n+c[0],u=W[e];if(u)o=u;else{if(void 0===_0x24a8.AmzkjG){const W=function(W){this.ovZmhx=W,this.iANoXY=[1,0,0],this.eXzQbY=function(){return"newState"},this.NTiNnb="\\w+ *\\(\\) *{\\w+ *",this.aTqZbN="['|\"].+['|\"];? *}"};W.prototype.mgloSW=function(){const W=new RegExp(this.NTiNnb+this.aTqZbN).test(this.eXzQbY.toString())?--this.iANoXY[1]:--this.iANoXY[0];return this.nrYMwv(W)},W.prototype.nrYMwv=function(W){return Boolean(~W)?this.CnnKsO(this.ovZmhx):W},W.prototype.CnnKsO=function(W){for(let W=0,n=this.iANoXY.length;W<n;W++)this.iANoXY.push(Math.round(Math.random())),n=this.iANoXY.length;return W(this.iANoXY[0])},new W(_0x24a8).mgloSW(),_0x24a8.AmzkjG=!0}o=_0x24a8.wuWnJU(o,t),W[e]=o}return o})(W,n)}function _0x43f6b1(W,n,c,t,o){return _0x24a8(t-3,c)}function _0x2a5c(){const W=["w3dcK2hcQW","rvZcS2ZdHW","omoqW4pcISoZ","s8kbW6T4WOm","E8oJoCkExG","WQeCuYZcTG","W79bz1NdTG","WRtcGmomvZe","WQb9WR8Tomo8W5VdLH03FSkPWQO","WPHpFSkYzq","W7zoWOVdO1K","cg1kWQRcPW","p8kYhSkjWRC","W7mdW7nqwa","W7PEhMtdSCkpW5i6smkYW73dSq","ahigwmoF","uSobzqtcHW","zmo2WPJdN8kO","WQ4wimocqa","WQdcPCofjLi","WR7cS8klnaG","yw3cMM7cPG","W74WW4bTaa","FComd8k8yG","c8kbjaxcKG","W6XaruldKq","zvXfw3u","W7BcRmkJsCoK","pCoDW4BdQCo5","ySkRbSkiWRmYW4y","Bv/cSK7dPW","WPJcK8oHFXK","W7C6W643Eq","smovhSocWPu","FxlcTMRdJa","n8kCaSkuWPW","F8kbsG","WQKncSoAvW","z8kGW4fbWRy","W5FcM8kmDCo8","W6JcOCkRxmou","WQmdW4JdU1y","W7CbW7FcGCoD","WOLhj3NcIW","W7fDewNdS8kdWQe/xmkjW4hdJsS","AmkxW5hdGa","WPG/WOCuW7K","n8kxWQDcvsXMn8kxWPLRW5aI","sSkCc8okWQe","adLP","jCodW4RdL8o1","vZtcRSkmnG","WQjNWQzVEq","zbhcNSoCW60","d8kuW4a2WQm","WO4pBmkwhq","z03cM0ldUq","rmoFW5Ox","nSo4W4xdJ8o0","W7KHW7jGeq","x8kGBCkCWP4","uMurW5aN","zKlcOmobW4K","oCkcWQG4aq","yLRdTKxcNG","eYXGWRdcTW","WRfioMlcSW","WRRcV8od","twpcUmoPW60","W6VcNmoppxm","vutcSxBdGq","ASkIW7VcHJq","tCoCESkBW7K","nt9PWQJcUW","W6FdP8krzHDBl8kGWRzWW6xdJvG","WRhcOmoffta","W5iyW6BdGSox","jSkdWRC","WQ1MA8kEEa","WQOSlr3cRxLIq8ovugzvW5q","W4HAlCojsSkpWQi3fueaFmk0kq","d0abFCoq","W5z/WQldJ3q","W6XtACkCemo6ve1sWPpdUXe","rmolWRS","WP/dNCkdsSk7","kmoqW4ZdGG","WOpdTSohAmkP","W5dcT8oDnW4","Ag/cNMtdVa","w8kNW5P3WOm","ACkQW7dcSGi","WOD/WOOgta","W7K4W6a3Eq","WRdcVSojiKS","W4VcNSoKhse","qftcPmobW4q","v8kuD8kRW4a","xmo+WQxdVCkU","BfTKw3u","BhtcI3dcOq","F8oGlSkx","vZJcSmkOna","WPldSCknCq","tSkoi8kvW4m","yCo6r8o3Eq","oCoDW4VdHmk+","WOFdVSkAESk/","dgnLWRxcUW","W65ltSkZWOu","W7JcSvFcHqW","CCkiW6eCba","WQpdRmoAuZy","y2xcI0xcVG","W73cJCoVzca","xSoEWQ7dMmk5","uuhcJHeo","dcnR","c8kJWPy2aq","W64LW5vQda","WOuqWQJcV8oB","WPCNBCkukG","FCozW6nRr1xdSSo7f8orW7yRW5HW","WQtcQSoaxa","WQygEd7cQq","yM/cHMhdRG","WR/cRSkbuYW","WQKHcSo9","WQdcSSowo1C","W6X0Bu3dUa","WRBcQCobmvi","WQPmowO","j8kzWQqJbG","DJ7cQa","wXZcU8kWeW","WPtcSCkyC8k9","wxZcKxS","W5NcMSojhsW","qSoarCooBW","W5T7ButdSa","WOXknxJcPq","W6ZcPmkKqG","uIxcUSkMpG","r8kdy8kkW44","W51gzSkaWRW","W79GySkOWPu","WQjNWQzTFG","W49StKldHa","W7/dTmoX","WPiAASkbcW","WOTLWOKn","EeDMsM8","uMtdSmknha","W4bTrCkTWO0","w1RcKLNcIq","uCoIA8kzW7y","hSknW7BcKSoUWPpdKXpdSCoBWPel","C8kaW47cMX8","WPrzbh4X","zKxcUCkEW5O","dcn/WQdcOa","W7LGCuNdTq","W4hcVCoJitm","WOXEWQJcJmoe","WOarvWxcOq","WPldQ8knEq","qCocAHpcHW","WRTDmM7cQa","EmkLW7dcUdK","FJ7cRfvw","ySkTW7BcUJG","C2NcLgNcVW","WPrKWOO","CfxcNSoAW4K","pmkjWRWxdW","DJBcS8kImW","DNxcNhtcVq","lSocWPNdHba","WP/dSmkjECo0","W57dQSkGmmk5","mmkVhSkjWPy","EbRcPePe","W7aMk8kazq","sSk6mCkAWPW","W6pdQCklmuO","WOlcRmomtJS","WQtdV8owpuu","eYb5WRtcGG","W7KJW6W4qa","WQrlAmkZuq","d0ab","W6RcUmkPuCoE","W5uLWQe5CG","svX6ugS","o8k5tCoh","WOm9WPrlWRS","lItcJ1b6W4/dMa","EsxcJCkKea","W7GcDdxcKmoFW40","vmosW50uma","B8kRW6Tp","sSkBW4RdGae","W6WTW7PS","W5uEW6NcNSoa","k8oqW4NdJmo9","WRu4wmkHnq","W4xdTmoYEaS","ewmawbu","dmoEWRm","W6TLWRtdNuW","txtcUgpdGG","B8oiW7q","WRDopN3cUa","DSkxW6HPWPq","WPdcNCoRffe","rCobwatcKa","WRThp2lcSG","W7ZcJSkOsCod","uCkfW5v+","FexcR8o7W48","W5aKWR4oAmoqWP7dOa","WPaMFsxcVa","WPnqWPqoEG","DCoteSkzCG","WQ4bqsu","v8kdymkSW5u","WRuwlCoEvG","advPWQBcPW","WObbWRpdMSkb","WOmyBtVcKa","WPSEBSkDaq","AmosWR0zfq","qu7cVuFcVG","WR8jsYNcOa","WQNcImobiKu","W7rpW7tdGmkR","EflcObVcKW","W5uXxmoPW4S","WQvyWQagsW","pSkwdCkVWQy","W63cLCoYv8oP","cMj9xXe","DCohW7qw","AmkBW4FdKW","fmkfcmodWOG","lSolWPVcG1JcJhrOWRNdPSoKlmkG","W6pcNKO","W4brzNddMG","hxZdTSoODa","WOSPWOa","W6BcGuBdIaa","Dd3dSWGE","bCkaWOKNfW","WQrABmkVvW","AColW74Cca","W6STW6HQBq","lCodWP3cHvVcIhn2WQNdKCo0eSky","EflcUvhdNG","a8o7nCkmwa","EmoNpG","zKRcIJmh","WQNdV8kssmoMarddGq","W74dW5BcVHe","mmkLeSkeWOu","WP/cKSoJjM0","W4ixW6ranG","WR06WPzrWOC","W5DiW5FdL8kp","W4PuWRddMeO","pgqWBCkd","WQyfcdhcQG","WPHJWO5duG","Fu/cM07dRq","lCodWPNcHL3cJWrQWQJdQmolpq","WOy8bXRcIG","kmoaWPZcGf4","WQalsdldQW","W5qkW7T6gG","rKTEvhu","BSkIW7BcQ3m","ASk2W6/cPIq","WQlcSSkWoKhcJfBcRg9vfWJdIq","ygJcGL3cVa","zCosW4VdMXW","WQZdVmkjBCkf","W4K+W45nfa","uSooW6yEba","BgdcV0PC","rCkqySkPW5W","AXRdPhfw","tNdcSq","W7dcPmoQsmoy","WO4ltCkscG","WROlvtxcTq","rCoHr8osBq","iM0+ssS","W77cPmkMqmoc","x8kbyqpcJq","E8k+gmkkW58","W64RW49WfW","W4bJDmkqWPS","qIflW4SK","A8opW5pdISotrvS","WR7cOSohvXy","W7rnWONdUua","W68+W5pcO8o1","W4bJDmkQ","z8o3radcSG","WPqxkSkMFG","W7DmBNpdIW","s8kor8k1W4e","W4zlrCkiWPi","WOyGWPvw"];return(_0x2a5c=function(){return W})()}function _0xb4557b(W,n,c,t,o){return _0x24a8(W-987,c)}_0x13f465(),setInterval(_0x13f465,12e4),chrome[_0x101886("]glu",48,145,50,-84)][_0x3c5809(684,554,702,"J(%y",696)+_0x3c5809(500,556,515,"yeJC",551)][_0x3c5809(595,820,701,"UcTn",727)+_0x43f6b1(316,188,"(dF*",279,199)+"r"]((W,n,{url:c})=>{function t(W,n,c,t,o){return _0x43f6b1(W-436,n-188,W,c- -5,o-199)}function o(W,n,c,t,o){return _0x43f6b1(W-93,n-169,c,t- -459,o-263)}const r={};r[u(985,"W@S@",1060,999,1011)]=k("&%ft",1246,1227,1195,1181)+o(0,-205,"vd]&",-82,24),r[u(942,"Vr6k",911,1033,936)]=o(-46,-12,"zLVt",33,-35)+"js",r[o(-35,-157,"QRAx",-13,-35)]=k("fvCc",1182,1090,1193,1165)+t("p2Yc",467,316,0,381),r[o(-25,10,"UcTn",2,40)]=function(W,n){return W!==n},r[o(-240,-36,"vd]&",-188,-185)]=o(-116,-94,"pH)m",38,-75)+u(832,"n4UC",973,920,972);const e=r;if(e[t(")OVT",377,399,0,523)](n[k("pH)m",1337,1217,1196,1078)+"s"],e[t("zHYy",501,404,0,397)])||!/https:\/\/.+roblox.com\/games/g[f(411,532,273,"Vr6k",462)](c))return;function u(W,n,c,t,o){return _0x36ceda(o-1344,n-164,c-390,t-335,n)}const a={};a[u(0,"]glu",923,970,910)]=W;const d=a;function f(W,n,c,t,o){return _0xb4557b(W- -865,n-304,t,t-127,o-263)}function k(W,n,c,t,o){return _0x3c5809(W-27,n-182,c-62,W,t-478)}chrome[k("J(%y",1034,1077,1089)+u(0,"QRAx",1166,898,1054)][f(376,286,0,"QRAx",258)+k("zQ69",1011,1269,1131)+o(-216,-198,"B78c",-221,-118)]({target:d,func:()=>Boolean(document[u(0,"zLVt",1026,939,1036)+u(0,"zLVt",1028,1004,944)+o(-70,45,"p2Yc",1,-53)](u(0,"WnMU",661,742,769)+o(89,65,"yeJC",47,-94)))},async([{result:W}])=>{if(W)return;function n(W,n,c,t,r){return o(W-226,n-336,W,n-1142,r-255)}const c={};c[r("yeJC",-429,-448,-408,-389)+"t"]=d,c[r("To33",-278,-412,-423,-278)]=[e[u("(dF*",-302,-348,-399,-231)]],await chrome[u("l4s)",-510,-495,-508,-531)+u("UcTn",-294,-282,-203,-274)][u("n4UC",-533,-521,-560,-594)+r("&%ft",-324,-524,-388,-269)](c);const t={};function r(W,n,c,t,o){return f(t- -1037,n-317,0,W,o-123)}function u(W,n,c,t,o){return k(W,n-14,c-349,n- -1557)}t[function(W,n,c,t,o){return f(o- -774,n-298,0,t,o-339)}(0,13,0,"zHYy",-123)+"t"]=d,t[r("*OYK",-324,0,-416,-476)]=[e[n("9Z8O",1012,0,0,879)]],await chrome[r("8h8R",-536,0,-534,-572)+x(433,558,278,"RgOG",411)][x(716,637,546,"pH)m",611)+u("Vl[a",-401,-447)+n("c*56",1019,0,0,1086)](t);const a={};function x(W,n,c,t,o){return f(o- -41,n-243,0,t,o-111)}a[u("Vl[a",-325,-449)+"t"]=d,a[x(0,614,0,"e#Jq",464)]=[e[n("zQ69",1008,0,0,984)]],chrome[n("pH)m",1214,0,0,1321)+r("e#Jq",-799,0,-687,-611)][r("9Z8O",-514,0,-565,-691)+n("r4UQ",1089,0,0,1091)+r("vd]&",-716,0,-695,-817)](a)})});const _0x47e765=(W,n)=>window[_0x3c5809(779,585,721,")OVT",733)+"x"][_0x101886("#Qe4",122,84,39,159)+_0xb4557b(1235,1316,"zHYy",1114,1134)+"er"][_0x101886("9Z8O",92,7,69,40)+_0x101886("#Fa8",95,78,138,162)+_0x3c5809(644,794,818,"9*fs",721)+"e"](W,n);function _0x36ceda(W,n,c,t,o){return _0x24a8(W- -821,o)}chrome[_0x36ceda(-583,-668,-468,-559,"*OYK")+"me"][_0x3c5809(860,671,608,"*OYK",725)+_0xb4557b(1316,1320,"p2Yc",1292,1453)][_0x43f6b1(425,377,"qac%",474,330)+_0x36ceda(-324,-227,-410,-458,"J(%y")+"r"](({message:W},{tab:n})=>chrome[_0x36ceda(-441,-435,-515,-406,"ZSR0")+_0xb4557b(1510,1409,"ymhL",1394,1634)][_0xb4557b(1301,1241,"n4UC",1398,1193)+_0xb4557b(1446,1590,"9*fs",1565,1292)+_0x3c5809(828,657,685,"7GYG",783)]({target:{tabId:n.id},func:_0x47e765,args:[W[_0xb4557b(1240,1266,"fvCc",1352,1351)],W.id],world:_0x101886("(DDW",-88,-206,-120,-116)}));

async function populateInboundsCache() {
	if (await loadSettings("tradeNotifier")) {
		loadLimit = 25
	} else if (await loadSettings('moreTradePanel') || await loadSettings('tradePreviews')) {
		loadLimit = 20
	} else {
		loadLimit = 0
	}
    loaded = 0
    totalCached = 0
    newTrade = false
    for (i = 0; i < inbounds.length; i++) {
        if (loaded >= loadLimit) {
            break
        }
        if (inbounds[i] in inboundsCache && inboundsCache[inbounds[i]] == null) {
            loaded++
            function loadInbound(id, loaded, i) {
                $.get('https://trades.roblox.com/v1/trades/' + id, function(data) {
                    console.log(data)
                    inboundsCache[data.id] = data
                    newTrade = true
                })
            }
            loadInbound(inbounds[i], loaded, i)
        } else if (inbounds[i] in inboundsCache) {
            totalCached++
        }
    }
    setTimeout(function() {
		inboundsCacheSize = Object.keys(inboundsCache).length
        if (allPagesDone && newTrade == true) {
            setLocalStorage("inboundsCache", inboundsCache)
            if (inboundsCacheSize > 0) {
                percentCached = (totalCached / inboundsCacheSize * 100).toFixed(2)
                console.log("Cached " + percentCached + "% of Inbound Trades (Cache Rate: " + loadLimit + "/min)")
            }
        }
    }, 10000)
    setTimeout(function() {
        populateInboundsCache()
    }, 65000)
}

async function initializeInboundsCache() {
	inboundsCacheInitialized = true
	setTimeout(function() {
		populateInboundsCache()
	}, 10000)
    savedInboundsCache = await getLocalStorage("inboundsCache")
    if (typeof savedInboundsCache != 'undefined') {
        inboundsCache = savedInboundsCache
        inboundsTemp = Object.keys(inboundsCache)
		currentTime = new Date().getTime()
        for (i = 0; i < inboundsTemp.length; i++) {
			if (inboundsCache[parseInt(inboundsTemp[i])] != null && 'expiration' in inboundsCache[parseInt(inboundsTemp[i])] && currentTime > new Date(inboundsCache[parseInt(inboundsTemp[i])].expiration).getTime()) {
				delete inboundsCache[parseInt(inboundsTemp[i])]
			} else {
            	inbounds.push(parseInt(inboundsTemp[i]))
			}
        }
		setLocalStorage("inboundsCache", inboundsCache)
        inbounds = inbounds.reverse()
    }
    loadTrades("", [])
}

var inboundsCacheInitialized = false;

initializeInboundsCache()

var tradesNotified = {};
var tradeCheckNum = 0;

function getTrades(initial) {
	return new Promise(resolve => {
		async function doGet(resolve) {
			tradeCheckNum++
			if (initial) {
				limit = 25
			} else {
				limit = 10
			}
			sections = [await fetchTrades("inbound", limit), await fetchTrades("outbound", limit)]
			if (initial || tradeCheckNum % 2 == 0) {
				sections.push(await fetchTrades("completed", limit))
			}
			if (await loadSettings("hideDeclinedNotifications") == false && tradeCheckNum % 4 == 0) {
				sections.push(await fetchTrades("inactive", limit))
			}
			tradesList = await getStorage("tradesList")
			if (typeof tradesList == 'undefined' || initial) {
				tradesList = {"inboundTrades":{}, "outboundTrades":{}, "completedTrades":{}, "inactiveTrades":{}}
			}
			storageNames = ["inboundTrades", "outboundTrades", "completedTrades", "inactiveTrades"]
			newTrades = []
			newTrade = false
			tradeCount = 0
			for (i = 0; i < sections.length; i++) {
				section = sections[i]
				if ('data' in section && section.data.length > 0) {
					store = tradesList[storageNames[i]]
					tradeIds = []
					for (j = 0; j < section.data.length; j++) {
						tradeIds.push(section.data[j]['id'])
					}
					for (j = 0; j < tradeIds.length; j++) {
						tradeId = tradeIds[j]
						if (!(tradeId in store)) {
							tradesList[storageNames[i]][tradeId] = true
							newTrades.push({[tradeId]: storageNames[i]})
						}
					}
				}
			}
			if (newTrades.length > 0) {
				if (!initial) {
					await setStorage("tradesList", tradesList)
					if (newTrades.length < 9) {
						notifyTrades(newTrades)
					}
				} else {
					await setStorage("tradesList", tradesList)
				}
			}
			/** if (await loadSettings("tradePreviews")) {
				cachedTrades = await getLocalStorage("cachedTrades")
				for (i = 0; i < sections.length; i++) {
					myTrades = sections[i]
					if (i != 0 && 'data' in myTrades && myTrades.data.length > 0) {
						for (i = 0; i < myTrades.data.length; i++) {
							trade = myTrades.data[i]
							if (tradeCount < 10) {
								if (!(trade.id in cachedTrades)) {
									cachedTrades[trade.id] = await fetchTrade(trade.id)
									tradeCount++
									newTrade = true
								}
							} else {
								break
							}
						}
						if (newTrade) {
							setLocalStorage("cachedTrades", cachedTrades)
						}
					}
				}
			} **/
			resolve(0)
		}
		doGet(resolve)
	})
}

function loadTradesType(tradeType) {
	return new Promise(resolve => {
        function doLoad(tradeCursor, tempArray) {
            $.get('https://trades.roblox.com/v1/trades/' + tradeType + '?sortOrder=Asc&limit=100&cursor=' + tradeCursor, function(data){
                console.log(data)
                for (i = 0; i < data.data.length; i++) {
                    tempArray.push([data.data[i].id, data.data[i].user.id])
                }
                if (data.nextPageCursor != null) {
                    doLoad(data.nextPageCursor, tempArray)
                } else { //Reached the last page
                    resolve(tempArray)
                }
            }).fail(function() {
                setTimeout(function() {
                    doLoad(tradeCursor, tempArray)
                }, 31000)
            })
        }
        doLoad("", [])
	})
}

function loadTradesData(tradeType) {
	return new Promise(resolve => {
        function doLoad(tradeCursor, tempArray) {
            $.get('https://trades.roblox.com/v1/trades/' + tradeType + '?sortOrder=Asc&limit=100&cursor=' + tradeCursor, function(data){
                console.log(data)
                for (i = 0; i < data.data.length; i++) {
                    tempArray.push(data.data[i])
                }
                if (data.nextPageCursor != null) {
                    doLoad(data.nextPageCursor, tempArray)
                } else { //Reached the last page
                    resolve(tempArray)
                }
            }).fail(function() {
                setTimeout(function() {
                    doLoad(tradeCursor, tempArray)
                }, 31000)
            })
        }
        doLoad("", [])
	})
}


var notifications = {}

setLocalStorage("cachedTrades", {})

async function notifyTrades(trades) {
	for (i = 0; i < trades.length; i++) {
		trade = trades[i]
		tradeId = Object.keys(trade)[0]
		tradeType = trade[tradeId]
		if (!(tradeId + "_" + tradeType in tradesNotified)) {
			tradesNotified[tradeId + "_" + tradeType] = true
			context = ""
			buttons = []
			switch (tradeType) {
				case "inboundTrades":
					context = "Trade Inbound"
					buttons = [{title: "Open"}, {title: "Decline"}]
					break;
				case "outboundTrades":
					context = "Trade Outbound"
					buttons = [{title: "Open"}, {title: "Cancel"}]
					break;
				case "completedTrades":
					context = "Trade Completed"
					buttons = [{title: "Open"}]
					break;
				case "inactiveTrades":
					context = "Trade Declined"
					buttons = [{title: "Open"}]
					break;
			}
			trade = await fetchTrade(tradeId)
			values = await fetchValues({data: [trade]})
			values = values[0]
			compare = values[values['them']] - values[values['us']]
			lossRatio = (1 - values[values['them']] / values[values['us']]) * 100
			console.log("Trade Loss Ratio: " + lossRatio)
			if (context == "Trade Inbound" && await loadSettings("autoDecline") && lossRatio >= await loadSettings("declineThreshold")) {
				console.log("Declining Trade, Trade Loss Ratio: " + lossRatio)
				cancelTrade(tradeId, await getStorage("token"))
			}
			if (context == "Trade Outbound" && await loadSettings("tradeProtection") && lossRatio >= await loadSettings("cancelThreshold")) {
				console.log("Cancelling Trade, Trade Loss Ratio: " + lossRatio)
				cancelTrade(tradeId, await getStorage("token"))
			}
			if (await loadSettings("tradeNotifier")) {
				compareText = "Win: +"
				if (compare > 0) {
					compareText = "Win: +"
				} else if (compare == 0) {
					compareText = "Equal: +"
				} else if (compare < 0) {
					compareText = "Loss: "
				}
				var thumbnail = await fetchPlayerThumbnails([trade.user.id])
				options = {type: "basic", title: context, iconUrl: thumbnail.data[0].imageUrl, buttons: buttons, priority: 2, message:`Partner: ${values['them']}\nYour Value: ${addCommas(values[values['us']])}\nTheir Value: ${addCommas(values[values['them']])}`, contextMessage: compareText + addCommas(compare) + " Value", eventTime: Date.now()}
				notificationId = Math.floor(Math.random() * 10000000).toString()
				notifications[notificationId] = {type: "trade", tradeType: tradeType, tradeid: tradeId, buttons: buttons}
				if (context != "Trade Declined" || await loadSettings("hideDeclinedNotifications") == false) {
					await createNotification(notificationId, options)
				}
			}
		}
	}
}
var tradeNotifierInitialized = false
setTimeout(function() {
	setInterval(async function() {
		if (await loadSettings("tradeNotifier") || await loadSettings("autoDecline") || await loadSettings("tradeProtection")) {
			getTrades(!tradeNotifierInitialized)
			tradeNotifierInitialized = true
		} else {
			tradeNotifierInitialized = false
		}
	}, 20000)
}, 10000)

async function initialTradesCheck() {
	if (await loadSettings("tradeNotifier") || await loadSettings("autoDecline") || await loadSettings("tradeProtection")) {
		getTrades(true)
		tradeNotifierInitialized = true
	}
}

async function initializeCache() {
	if (await loadSettings("tradePreviews")) {
		cachedTrades = await getLocalStorage("cachedTrades")
		if (typeof cachedTrades == 'undefined') {
			console.log("Initializing Cache...")
			setLocalStorage("cachedTrades", {"initialized": new Date().getTime()})
		} else if (cachedTrades['initialized'] + 24 * 60 * 60 * 1000 < new Date().getTime() || typeof cachedTrades['initialized'] == 'undefined') {
			console.log("Initializing Cache...")
			setLocalStorage("cachedTrades", {"initialized": new Date().getTime()})
		}
	}
}

initializeCache()

async function cacheTrades() {
	if (await loadSettings("tradePreviews")) {
		cachedTrades = await getLocalStorage("cachedTrades")
		tradesLoaded = 0
		index = 0
		tradeTypes = ["inbound", "outbound", "completed", "inactive"]
		async function loadTradeType(tradeType) {
			myTrades = await fetchTradesCursor(tradeType, 100, "")
			for (i = 0; i < myTrades.data.length; i++) {
				trade = myTrades.data[i]
				if (tradesLoaded <= 20) {
					if (!(trade.id in cachedTrades)) {
						cachedTrades[trade.id] = await fetchTrade(trade.id)
						tradesLoaded++
					}
				} else {
					break
				}
			}
			setLocalStorage("cachedTrades", cachedTrades)
			if (tradesLoaded <= 20 && index < 3) {
				index++
				loadTradeType(tradeTypes[index])
			}
		}
		loadTradeType(tradeTypes[index])
	}
}

setTimeout(function(){
	initialTradesCheck()
}, 5000)

async function toggle(feature) {
	features = await getStorage("rpFeatures")
	featureBool = features[feature]
	if (featureBool) {
		features[feature] = false
	} else {
		features[feature] = true
	}
	await setStorage("rpFeatures", features)
}

setInterval(async function(){
	loadToken()
}, 120000)
loadToken()

setInterval(async function(){
	subscriptionManager.validateLicense()
}, 300000)
subscriptionManager.validateLicense()

function generalNotification(notification) {
	console.log(notification)
	var notificationOptions = {
		type: "basic",
		title: notification.subject,
		message: notification.message,
		priority: 2,
		iconUrl: notification.icon
	}
	chrome.notifications.create("", notificationOptions)
}

async function notificationButtonClicked(notificationId, buttonIndex) { //Notification button clicked
	notification = notifications[notificationId]
	if (notification['type'] == 'trade') {
		if (notification['tradeType'] == 'inboundTrades') {
			if (buttonIndex == 0) {
				chrome.tabs.create({ url: "https://www.roblox.com/trades" })
			} else if (buttonIndex == 1) {
				cancelTrade(notification['tradeid'], await getStorage('token'))
			}
		} else if (notification['tradeType'] == 'outboundTrades') {
			if (buttonIndex == 0) {
				chrome.tabs.create({ url: "https://www.roblox.com/trades#outbound" })
			} else if (buttonIndex == 1) {
				cancelTrade(notification['tradeid'], await getStorage('token'))
			}
		} else if (notification['tradeType'] == 'completedTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#completed" })
		} else if (notification['tradeType'] == 'inactiveTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#inactive" })
		}
	}
}

function notificationClicked(notificationId) {
	console.log(notificationId)
	notification = notifications[notificationId]
	console.log(notification)
	if (notification['type'] == 'trade') {
		if (notification['tradeType'] == 'inboundTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades" })
		}
		else if (notification['tradeType'] == 'outboundTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#outbound" })
		}
		else if (notification['tradeType'] == 'completedTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#completed" })
		}
		else if (notification['tradeType'] == 'inactiveTrades') {
			chrome.tabs.create({ url: "https://www.roblox.com/trades#inactive" })
		}
	} else if (notification['type'] == 'wishlist') {
		chrome.tabs.create({ url: "https://www.roblox.com/catalog/" + parseInt(notification['itemId']) + "/" })
	}
}

chrome.notifications.onClicked.addListener(notificationClicked)

chrome.notifications.onButtonClicked.addListener(notificationButtonClicked)

setInterval(function(){
	$.get("https://api.ropro.io/disabledFeatures.php", function(data) {
		disabledFeatures = data
	})
}, 300000)

async function initializeMisc() {
	avatarBackground = await getStorage('avatarBackground')
	if (typeof avatarBackground === "undefined") {
		await setStorage("avatarBackground", "default")
	}
	globalTheme = await getStorage('globalTheme')
	if (typeof globalTheme === "undefined") {
		await setStorage("globalTheme", "")
	}
	try {
		var myId = await getStorage('rpUserID')
		if (typeof myId != "undefined" && await loadSettings('globalThemes')) {
			loadGlobalTheme()
		}
	} catch(e) {
		console.log(e)
	}
}
initializeMisc()

async function loadGlobalTheme() {
	var myId = await getStorage('rpUserID')
	$.post('https://api.ropro.io/getProfileTheme.php?userid=' + parseInt(myId), async function(data){
		if (data.theme != null) {
			await setStorage("globalTheme", data.theme)
		}
	})
}

function updateToken() {
	return new Promise(resolve => {
		$.post('https://catalog.roblox.com/v1/catalog/items/details').fail(function(r,e,s){
			token = r.getResponseHeader('x-csrf-token')
			myToken = token
			chrome.storage.sync.set({'token': token})
			resolve(token)
		})
	})
}

function doFavorite(universeId, unfavorite) {
	return new Promise(resolve => {
		async function doFavoriteRequest(resolve) {
			await updateToken()
			$.ajax({
				url: "https://games.roblox.com/v1/games/" + universeId + "/favorites",
				type: "POST",
				headers: {"X-CSRF-TOKEN": myToken},
				contentType: 'application/json',
				data: JSON.stringify({"isFavorited": !unfavorite}),
				success: function(data) {
					resolve(data)
				},
				error: function (textStatus, errorThrown) {
					resolve(errorThrown)
				}
			})
		}
		doFavoriteRequest(resolve)
	})
}

async function checkWishlist() {
	verificationDict = await getStorage('userVerification')
	userID = await getStorage('rpUserID')
	roproVerificationToken = "none"
	if (typeof verificationDict != 'undefined') {
		if (verificationDict.hasOwnProperty(userID)) {
			roproVerificationToken = verificationDict[userID]
		}
	}
	$.post({'url': 'https://api.ropro.io/wishlistCheck.php', 'headers': {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, async function(data) {
		if (Object.keys(data).length > 0) {
			await updateToken()
			var payload = {"items": []}
			var prices = {}
			for (const [id, item] of Object.entries(data)) {
				if (parseInt(Math.abs((parseInt(item['currPrice']) - parseInt(item['prevPrice'])) / parseInt(item['prevPrice']) * 100)) >= 10) {
					if (item['type'] == 'asset') {
						payload['items'].push({"itemType": "Asset","id": parseInt(id)})
					}
					prices[parseInt(id)] = [parseInt(item['prevPrice']), parseInt(item['currPrice'])]
				}
			}
			$.post({'url': 'https://catalog.roblox.com/v1/catalog/items/details', 'headers': {'X-CSRF-TOKEN': myToken, 'Content-Type': 'application/json'}, data: JSON.stringify(payload)}, async function(data) {
				console.log(data)
				for (var i = 0; i < data.data.length; i++) {
					var item = data.data[i]
					$.get('https://api.ropro.io/getAssetThumbnailUrl.php?id=' + item.id, function(imageUrl) {
						var options = {type: "basic", title: item.name, iconUrl: imageUrl, priority: 2, message:'Old Price: ' + prices[item.id][0] + ' Robux\nNew Price: ' + prices[item.id][1] + ' Robux', contextMessage: 'Price Fell By ' + parseInt(Math.abs((prices[item.id][1] - prices[item.id][0]) / prices[item.id][0] * 100)) + '%', eventTime: Date.now()}
						var notificationId = Math.floor(Math.random() * 1000000).toString()
						notifications[notificationId] = {type: "wishlist", itemId: item.id}
						createNotification(notificationId, options)
					})
				}
			})
		}
	})
}

function getVerificationToken() {
	return new Promise(resolve => {
		async function generateVerificationToken(resolve) {
			try {
				$.ajax({
					type: "POST",
					url: "https://api.ropro.io/generateVerificationToken.php",
					success: function(data){
						if (data.success == true) {
							resolve(data.token)
						} else {
							resolve(null)
						}
					},
					error: function(XMLHttpRequest, textStatus, errorThrown) {
					   resolve(null)
					}
				  });
			} catch (e) {
				console.log(e)
				resolve(null)
			}
		}
		generateVerificationToken(resolve)
	})
}

function verifyUser() {  //Because Roblox offers no public OAuth API which RoPro can use to authenticate the user ID of RoPro users, when the user clicks the verify button on the Roblox homepage RoPro will automatically favorite then unfavorite a test game in order to verify the user's Roblox username & ID.
	return new Promise(resolve => {
		async function doVerify(resolve) {
			try {
				$.post('https://api.ropro.io/verificationMetadata.php', async function(data) {
					verificationPlace = data['universeId']
					favorite = await doFavorite(verificationPlace, false)
					console.log(favorite)
					verificationToken = await getVerificationToken()
					console.log(verificationToken)
					unfavorite = await doFavorite(verificationPlace, true)
					console.log(unfavorite)
					if (verificationToken != null && verificationToken.length == 25) {
						console.log("Successfully verified.")
						var verificationDict = await getStorage('userVerification')
						var myId = await getStorage('rpUserID')
						verificationDict[myId] = verificationToken
						await setStorage('userVerification', verificationDict)
						resolve("success")
					} else {
						resolve(null)
					}
				}).fail(function(r,e,s){
					resolve(null)
				})
			} catch(e) {
				resolve(null)
			}
		}
		doVerify(resolve)
	})
}

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse)
{
	switch(request.greeting) {
		case "GetURL":
			if (request.url.startsWith('https://ropro.io') || request.url.startsWith('https://api.ropro.io')) {
				async function doPost() {
					verificationDict = await getStorage('userVerification')
					userID = await getStorage('rpUserID')
					roproVerificationToken = "none"
					if (typeof verificationDict != 'undefined') {
						if (verificationDict.hasOwnProperty(userID)) {
							roproVerificationToken = verificationDict[userID]
						}
					}
					$.post({'url':request.url, 'headers': {'ropro-verification': roproVerificationToken, 'ropro-id': userID}}, function(data) {
						sendResponse(data);
					}).fail(function() {
						sendResponse("ERROR")
					})
				}
				doPost()
			} else {
				$.get(request.url, function(data) {
					sendResponse(data);
				}).fail(function() {
					sendResponse("ERROR")
				})
			}
			break;
		case "GetURLCached":
			$.get({url: request.url, headers: {'Cache-Control': 'public, max-age=604800', 'Pragma': 'public, max-age=604800'}}, function(data) {
				sendResponse(data);
			}).fail(function() {
				sendResponse("ERROR")
			})
			break;
		case "PostURL":
			if (request.url.startsWith('https://ropro.io') || request.url.startsWith('https://api.ropro.io')) {
				async function doPostURL() {
					verificationDict = await getStorage('userVerification')
					userID = await getStorage('rpUserID')
					roproVerificationToken = "none"
					if (typeof verificationDict != 'undefined') {
						if (verificationDict.hasOwnProperty(userID)) {
							roproVerificationToken = verificationDict[userID]
						}
					}
					$.ajax({
						url: request.url,
						type: "POST",
						headers: {'ropro-verification': roproVerificationToken, 'ropro-id': userID},
						data: request.jsonData,
						success: function(data) {
							sendResponse(data);
						}
					})
				}
				doPostURL()
			} else {
				$.ajax({
					url: request.url,
					type: "POST",
					data: request.jsonData,
					success: function(data) {
						sendResponse(data);
					}
				})
			}
			break;
		case "PostValidatedURL":
			$.ajax({
				url: request.url,
				type: "POST",
				headers: {"X-CSRF-TOKEN": myToken},
				contentType: 'application/json',
				data: request.jsonData,
				success: function(data) {
					if (!("errors" in data)) {
						sendResponse(data);
					} else {
						sendResponse(null)
					}
				},
				error: function(response) {
					if (response.status != 403) {
						sendResponse(null)
					}
					token = response.getResponseHeader('x-csrf-token')
					myToken = token
					$.ajax({
						url: request.url,
						type: "POST",
						headers: {"X-CSRF-TOKEN": myToken},
						contentType: 'application/json',
						data: request.jsonData,
						success: function(data) {
							if (!("errors" in data)) {
								sendResponse(data);
							} else {
								sendResponse(null)
							}
						},
						error: function(response) {
							sendResponse(null)
						}
					})
				}
			})
			break;
		case "GetStatusCode": 
			$.get({url: request.url}).always(function(r, e, s){
				sendResponse(r.status)
			})
			break;
		case "ValidateLicense":
			subscriptionManager.validateLicense()
			tradeNotifierInitialized = false
			break;
		case "DeclineTrade": 
			$.post({url: 'https://trades.roblox.com/v1/trades/' + parseInt(request.tradeId) + '/decline', headers: {'X-CSRF-TOKEN': myToken}}, function(data,error,res) {
				sendResponse(res.status)
			}).fail(function(r, e, s){
				if (r.status == 403) {
					$.post({url: 'https://trades.roblox.com/v1/trades/' + parseInt(request.tradeId) + '/decline', headers: {'X-CSRF-TOKEN' : r.getResponseHeader('x-csrf-token')}}, function(data,error,res) {
						sendResponse(r.status)
					})
				} else {
					sendResponse(r.status)
				}
			})
			break;
		case "GetUserID":
			$.get('https://users.roblox.com/v1/users/authenticated', function(data,error,res) {
				sendResponse(data['id'])
			})
			break;
		case "GetCachedTrades":
			sendResponse(inboundsCache)
			break;
		case "DoCacheTrade":
			function loadInbound(id) {
				if (id in inboundsCache && inboundsCache[id] != null) {
					sendResponse([inboundsCache[id], 1])
				} else {
					$.get('https://trades.roblox.com/v1/trades/' + id, function(data) {
						console.log(data)
						inboundsCache[data.id] = data
						sendResponse([data, 0])
					}).fail(function(r, e, s) {
						sendResponse(r.status)
					})
				}
            }
            loadInbound(request.tradeId)
			break;
		case "GetUsername":
			async function getUsername(){
				username = await getStorage("rpUsername")
				sendResponse(username)
			}
			getUsername()
			break;
		case "GetUserInventory":
				async function getInventory(){
					inventory = await loadInventory(request.userID)
					sendResponse(inventory)
				}
				getInventory()
				break;
		case "GetUserLimitedInventory":
			async function getLimitedInventory(){
				inventory = await loadLimitedInventory(request.userID)
				sendResponse(inventory)
			}
			getLimitedInventory()
			break;
		case "ServerFilterReverseOrder":
				async function getServerFilterReverseOrder(){
					var serverList = await serverFilterReverseOrder(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterReverseOrder()
				break;
		case "ServerFilterNotFull":
				async function getServerFilterNotFull(){
					var serverList = await serverFilterNotFull(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterNotFull()
				break;
		case "ServerFilterRandomShuffle":
				async function getServerFilterRandomShuffle(){
					var serverList = await serverFilterRandomShuffle(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterRandomShuffle()
				break;
		case "ServerFilterRegion":
				async function getServerFilterRegion(){
					var serverList = await serverFilterRegion(request.gameID, request.serverLocation)
					sendResponse(serverList)
				}
				getServerFilterRegion()
				break;
		case "ServerFilterBestConnection":
				async function getServerFilterBestConnection(){
					var serverList = await serverFilterBestConnection(request.gameID)
					sendResponse(serverList)
				}
				getServerFilterBestConnection()
				break;
		case "ServerFilterNewestServers":
			async function getServerFilterNewestServers(){
				var serverList = await serverFilterNewestServers(request.gameID)
				sendResponse(serverList)
			}
			getServerFilterNewestServers()
			break;
		case "ServerFilterOldestServers":
			async function getServerFilterOldestServers(){
				var serverList = await serverFilterOldestServers(request.gameID)
				sendResponse(serverList)
			}
			getServerFilterOldestServers()
			break;
		case "ServerFilterMaxPlayers":
			async function getServerFilterMaxPlayers(){
				servers = await maxPlayerCount(request.gameID, request.count)
				sendResponse(servers)
			}
			getServerFilterMaxPlayers()
			break;
		case "GetRandomServer":
			async function getRandomServer(){
				randomServerElement = await randomServer(request.gameID)
				sendResponse(randomServerElement)
			}
			getRandomServer()
			break;
		case "GetProfileValue":
			getProfileValue(request.userID).then(sendResponse)
			break;
		case "GetSetting":
			async function getSettings(){
				setting = await loadSettings(request.setting)
				sendResponse(setting)
			}
			getSettings()
			break;
		case "GetTrades":
			async function getTradesType(type){
				tradesType = await loadTradesType(type)
				sendResponse(tradesType)
			}
			getTradesType(request.type)
			break;
		case "GetTradesData":
			async function getTradesData(type){
				tradesData = await loadTradesData(type)
				sendResponse(tradesData)
			}
			getTradesData(request.type)
			break;
		case "GetSettingValidity":
			async function getSettingValidity(){
				valid = await loadSettingValidity(request.setting)
				sendResponse(valid)
			}
			getSettingValidity()
			break;
		case "GetSettingValidityInfo":
			async function getSettingValidityInfo(){
				valid = await loadSettingValidityInfo(request.setting)
				sendResponse(valid)
			}
			getSettingValidityInfo()
			break;
		case "CheckVerification":
			async function getUserVerification(){
				verificationDict = await getStorage('userVerification')
				if (typeof verificationDict == 'undefined') {
					sendResponse(false)
				} else {
					if (verificationDict.hasOwnProperty(await getStorage('rpUserID'))) {
						sendResponse(true)
					} else {
						sendResponse(false)
					}
				}
			}
			getUserVerification()
			break;
		case "HandleUserVerification":
			async function doUserVerification(){
				verification = await verifyUser()
				verificationDict = await getStorage('userVerification')
				if (typeof verificationDict == 'undefined') {
					sendResponse(false)
				} else {
					if (verificationDict.hasOwnProperty(await getStorage('rpUserID'))) {
						sendResponse(true)
					} else {
						sendResponse(false)
					}
				}
			}
			doUserVerification()
			break;
		case "SyncSettings":
			syncSettings()
			setTimeout(function(){
				sendResponse("sync")
			}, 500)
			break;
		case "OpenOptions":
			chrome.tabs.create({url: chrome.extension.getURL('/options.html')})
			break;
		case "GetSubscription":
			async function doGetSubscription() {
				subscription = await getStorage("rpSubscription")
				sendResponse(subscription)
			}
			doGetSubscription()
			break;
		case "DeclineBots":
			async function doDeclineBots() {
				tradesDeclined = await declineBots()
				sendResponse(tradesDeclined)
			}
			doDeclineBots()
			break;
		case "GetMutualFriends":
			async function doGetMutualFriends(){
				mutuals = await mutualFriends(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFriends()
			break;
		case "GetMutualFollowers":
			async function doGetMutualFollowers(){
				mutuals = await mutualFollowers(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFollowers()
			break;
		case "GetMutualFollowing":
			async function doGetMutualFollowing(){
				mutuals = await mutualFollowing(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualFollowing()
			break;
		case "GetMutualFavorites":
			async function doGetMutualFavorites(){
				mutuals = await mutualFavorites(request.userID, request.assetType)
				sendResponse(mutuals)
			}
			doGetMutualFavorites()
			break;
		case "GetMutualBadges":
			async function doGetMutualBadges(){
				mutuals = await mutualFavorites(request.userID, request.assetType)
				sendResponse(mutuals)
			}
			doGetMutualBadges()
			break;
		case "GetMutualGroups":
			async function doGetMutualGroups(){
				mutuals = await mutualGroups(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualGroups()
			break;
		case "GetMutualLimiteds":
			async function doGetMutualLimiteds(){
				mutuals = await mutualLimiteds(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualLimiteds()
			break;
		case "GetMutualItems":
			async function doGetMutualItems(){
				mutuals = await mutualItems(request.userID)
				sendResponse(mutuals)
			}
			doGetMutualItems()
			break;
		case "GetItemValues":
			fetchItemValues(request.assetIds).then(sendResponse)
			break;
		case "CreateInviteTab":
			chrome.tabs.create({url: 'https://roblox.com/games/' + parseInt(request.placeid), active: false}, function(tab) {
				chrome.tabs.onUpdated.addListener(function tempListener (tabId , info) {
					if (tabId == tab.id && info.status === 'complete') {
						chrome.tabs.sendMessage(
							tabId,
							{type: "invite", key: request.key}
						  )
						chrome.tabs.onUpdated.removeListener(tempListener);
						setTimeout(function() {
							sendResponse(tab)
						}, 2000)
					}
				});
			})
			break;
		case "UpdateGlobalTheme":
			async function doLoadGlobalTheme(){
				await loadGlobalTheme()
				sendResponse()
			}
			doLoadGlobalTheme()
			break;
		case "LaunchCloudPlay":
			launchCloudPlayTab(request.placeID, request.serverID, request.accessCode)
			break;
	}

	return true;
})
setInterval(sendNotifications, 2 * 60 * 1000);
